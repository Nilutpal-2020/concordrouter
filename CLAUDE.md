# CLAUDE.md — Multi-Model Prompt Arena

Guidance for Claude Code when working in this repository. This project is a web app where a
user writes one prompt/chat message and it fans out to multiple LLM providers
(OpenAI, Anthropic, Google, local/OSS models via Ollama, etc.), shows the responses side by
side, and lets the user "merge" two or more responses into a single reconciled answer
(git-merge-style).

---

## 1. Product Summary

- User composes a prompt (or continues a chat thread).
- User selects 2+ target models/agents.
- Request fans out concurrently; each response streams into its own pane.
- User can diff any two responses and produce a merged output by accepting/rejecting
  chunks, or by asking an LLM to synthesize a merge.
- Merged output can be saved, re-submitted as a new turn, or exported.

## 2. Non-Goals (v1)

- No fine-tuning, no agent/tool-use orchestration across providers, no multi-user
  real-time collaboration (single-user sessions only), no mobile app (responsive web only).

## 3. Suggested Architecture

```
┌─────────────┐      ┌───────────────────┐      ┌─────────────────────┐
│   Frontend   │◄────►│   API Gateway /    │◄────►│  Provider Adapters   │
│  (Next.js /  │ SSE  │   Orchestrator     │      │  (OpenAI, Anthropic, │
│   React)     │      │  (Go service)      │      │   Gemini, Ollama...) │
└─────────────┘      └─────────┬─────────┘      └─────────────────────┘
                                │
                     ┌──────────┴──────────┐
                     │  Postgres (threads,  │
                     │  messages, merges)   │
                     │  + Redis (streaming  │
                     │  fan-out, rate       │
                     │  limit state)        │
                     └─────────────────────┘
```

**Backend**: Go, since it handles concurrent streaming fan-out cleanly with goroutines +
channels, and each provider adapter is a small, well-isolated interface implementation
(`Provider.Stream(ctx, req) <-chan Chunk`). Use SSE or WebSockets to push each provider's
stream to the browser independently so panes update at their own pace.

**Auth model: bring-your-own-account (BYOA), not platform-managed keys.** The app never
holds provider billing/quota — each user connects their own OpenAI/Anthropic/Google/etc.
account and the app uses *their* credentials for every call. This removes platform-side
cost and rate-limit management, but shifts complexity into per-provider auth handling —
see §4a, this is not a uniform "just store a token" problem.

**Frontend**: React/Next.js. Each response pane is an independent streaming consumer;
don't block one pane's render on another's completion.

**Data layer**: Postgres for threads/messages/provider-responses/merge-records. Redis for
ephemeral streaming/session state and per-provider rate-limit token buckets.

**Provider adapter interface** (illustrative):
```go
type Provider interface {
    Name() string
    Stream(ctx context.Context, req ChatRequest) (<-chan Chunk, error)
    EstimateCost(req ChatRequest) Cost
}
```
Every provider (OpenAI, Anthropic, Gemini, Ollama, OpenRouter as a meta-provider) implements
this. Add new providers by adding an adapter — nothing else in the system should know
provider-specific details.

## 4a. BYOA (Bring Your Own Account) — Critical Notes

"Use their own account token" means different things per provider, and the difference is
the single biggest feasibility risk in this project:

- **Anthropic / OpenAI / Google — API keys**: these are official, sanctioned, metered
  separately from any chat-app subscription (a ChatGPT Plus or Claude Pro subscription
  does **not** include API access or API quota — it's a different product with different
  billing). If "their own account" means "their own API key," this is clean: standard
  OAuth-less flow, user pastes a key, app stores it encrypted, app calls the official API
  as them. Rate limits and cost are entirely theirs. This is the supported, low-risk path.
- **"Their ChatGPT/Claude.ai web login" — session/cookie auth**: if the intent is to use
  the consumer subscription itself (so a Plus/Pro user doesn't need a separate paid API
  key), this means driving the unofficial web session (cookies/browser tokens), which is
  **not an authorized integration path** for most providers, breaks on any frontend change,
  and is against most providers' Terms of Service to automate. Treat this as out of scope
  unless a provider explicitly ships an OAuth/consumer-grant flow for it (a few products,
  e.g. some IDE plugins, have official "sign in with your Pro/Max plan" OAuth flows —
  check current docs per provider before assuming this exists).
- **OAuth-based providers**: where a provider does offer real OAuth (delegated, scoped,
  revocable), prefer that over any key-paste flow — better security posture, user can
  revoke without rotating a raw secret.

**Design implication**: the "Provider" adapter interface needs an explicit `AuthMode`
(`api_key` | `oauth` | `unsupported`) per provider, and the product should be honest in the
UI about which providers are supported via sanctioned auth and which aren't — don't quietly
build on session-scraping for a subset of providers, since that's a stability and ToS
liability that will silently break the product later.

## 4. The Merge Feature — Design Notes

This is the hardest and most novel part of the product. Natural-language responses are not
line-oriented artifacts like source code, so a literal `git merge` port will feel wrong. Build
it in layers, cheapest first:

1. **Manual block-select merge (v1, ship first)**: Segment each response into paragraphs/
   sentences. Render two/three columns. User clicks chunks from either side to build a third
   "merged draft" pane (like picking commits with cherry-pick, not auto-diffing prose).
2. **Structured diff view (v2)**: Sentence-level diff (Myers diff on tokenized sentences,
   not characters) to highlight overlapping vs. divergent content between two responses,
   with accept-left / accept-right / accept-both controls per diff hunk — modeled on a
   three-way merge tool's conflict markers, but softened for prose (no "conflict" framing,
   just "these differ").
3. **AI-assisted synthesis merge (v3)**: Send both full responses back to an LLM with a
   system prompt like "reconcile these two answers into one, preserving unique correct
   content from each, flagging contradictions" — this is not a mechanical merge, it's a new
   generation, and should be presented to the user as such (editable draft, not authoritative).

Do not conflate (2) and (3) in the UI — a deterministic diff-based merge and an
LLM-generated synthesis are different operations with different trust levels, and users
need to know which one they're looking at.

## 4b. When to Offer Merge, and Semantic Diff Tooling

**Gating heuristic** — don't show the merge affordance on every turn:
- Skip merge UI when both responses are below a length threshold (e.g. <~30 tokens) —
  short/chit-chat turns ("Hi", "thanks") have nothing to reconcile.
- Skip (or auto-collapse to "responses are essentially the same") when whole-response
  embedding cosine similarity is above a high threshold (e.g. >0.92) — near-duplicate
  answers don't need a merge tool, just a "they agree" badge.
- Show it once responses are long enough *and* diverge enough to plausibly contain
  non-overlapping content.

**The core technical insight**: naive diff (Myers/`difflib`, git's algorithm) assumes exact
token/line equality, which fails on paraphrase — two paragraphs saying the same thing in
different words look "different" to a literal diff. The real pipeline is two steps, not one:

1. **Semantic alignment** — before diffing, decide *which* paragraph/sentence in response A
   corresponds to which in response B. This is a sequence-alignment problem (Needleman-Wunsch
   / Smith-Waterman) using semantic similarity as the substitution score instead of exact
   character match — i.e., align by meaning, not by position.
2. **Classify each aligned pair** — same claim / paraphrase / contradiction / one-sided
   (unique to A or B) — then render *that* as the diff, not a raw text diff.

**Tooling that already exists for this — no model training required:**
- **Sentence embeddings** (e.g. `sentence-transformers`, models like `all-MiniLM-L6-v2` or
  `bge-small`) — fast, run locally/CPU, give a cosine-similarity score (0–1) between any two
  sentences/paragraphs. This is the "score on how different two sentences are."
- **NLI / entailment-contradiction models** (e.g. `roberta-large-mnli`,
  `cross-encoder/nli-deberta-v3-base`) — give a 3-way label (entailment / neutral /
  contradiction) per sentence pair, which is more useful for merging than similarity alone:
  a high-similarity-but-contradiction pair is exactly the case a user needs flagged, while a
  low-similarity-but-neutral pair is just "unrelated, both can stay."
- **BERTScore** — another off-the-shelf metric for paraphrase-aware similarity if embeddings
  alone feel too coarse.
- Combine similarity + NLI into one label per aligned chunk (e.g. "agree," "paraphrase,"
  "conflict," "unique-to-A/B") — that label, not a raw number, is what should render in the UI.

**UI surface for this**: a paragraph × paragraph similarity matrix (heatmap) between the two
responses, hover-to-reveal the score/label on any cell, and the aligned pairs drive the
color-coding in the diff/merge pane (e.g. green = agree, amber = paraphrase, red = conflict,
gray = one-sided). This is a genuinely useful, buildable feature — it's applying existing
pretrained NLP models, not a research problem.

**Feasibility/timeline**: this tier is normal engineering effort using off-the-shelf
pretrained models (via a small local inference service or a hosted embeddings API) — no
custom model training needed. Realistic to build after the manual cherry-pick merge (§4,
tier 1) and before or alongside the AI-synthesis tier (§4, tier 3); it's the natural
implementation of §4's tier 2 ("sentence-level diff").

## 5. Key Engineering Concerns

- **Concurrent streaming**: use `context.Context` cancellation so stopping one pane doesn't
  kill the others; a slow/failed provider must not block the rest.
- **Cost/rate limits**: none of this is the platform's problem to manage — each user's
  own key/account absorbs their own usage and limits. The app should still surface
  provider-reported errors (429s, quota-exceeded) clearly per pane rather than swallowing
  them, since the user will need to act on their own account, not the platform's.
- **Credential storage**: encrypted at rest (e.g. envelope encryption via KMS), scoped so
  a compromised app database doesn't hand out plaintext API keys; support per-user key
  rotation/revocation without downtime.
- **Provider ToS**: automating a consumer web session (vs. an official API key/OAuth grant)
  is the main legal/stability risk here — see §4a. Confirm sanctioned auth exists before
  committing to a provider.
- **Latency variance**: providers finish at very different speeds; design the UI so a slow
  pane doesn't make the whole screen feel broken (skeleton states per pane).
- **Idempotency & retries**: a dropped connection mid-stream shouldn't force a full re-run
  across all providers, only the failed one.

## 6. Phased Build Plan

Each phase should be independently shippable/demoable — don't start a phase until the
previous one works end-to-end with a real provider, not mocks.

### Phase 0 — Foundations (no user-visible merge/fan-out yet)
- Repo scaffold: Go backend (`cmd/`, `internal/`), Next.js frontend, Postgres + Redis via
  docker-compose for local dev.
- Auth/session for the app itself (the user's account *on this app*, separate from their
  provider credentials).
- One provider adapter only (pick Anthropic or OpenAI) implementing `Provider.Stream`.
- Single-pane chat: compose prompt → stream response → persist thread/messages in Postgres.
- **Exit criteria**: a user can have a real streaming conversation with one provider,
  end-to-end, with history persisted and reloadable.

### Phase 1 — BYOA Credential Management
- Credential storage: encrypted-at-rest API key entry per provider (§4a `api_key` mode
  only — defer anything OAuth-based).
- Settings UI: connect/disconnect/rotate a provider key; validate key on save (cheap
  test call) so bad keys fail immediately, not mid-conversation.
- Per-provider error surfacing (invalid key, quota exceeded, network) as distinct UI states.
- **Exit criteria**: a user can connect 2+ providers with their own keys and switch which
  one handles a single-pane conversation.

### Phase 2 — Multi-Provider Fan-Out
- Extend the orchestrator to send one prompt to N connected providers concurrently.
- Side-by-side panes, each an independent SSE/WebSocket stream; one provider failing or
  being slow must not block the others (§5 concurrency/idempotency concerns apply here).
- Per-pane retry (re-run only the failed provider, not the whole turn).
- **Exit criteria**: a user selects 2–3 providers, sends one prompt, watches independent
  streaming responses render side by side, and can retry a single failed pane.

### Phase 3 — Manual Cherry-Pick Merge (§4 tier 1)
- Paragraph/sentence segmentation of each response.
- Three-pane UI: response A, response B, merged draft; click-to-add chunks from either
  side into the draft; freeform edit of the draft afterward.
- Save merged draft as its own message in the thread; allow re-submitting it as the next
  prompt.
- **Exit criteria**: a user can build a merged answer by hand from two responses and
  continue the conversation from it. This is the first release of the "merge" feature —
  ship it before any diff/ML tooling.

### Phase 4 — Merge Gating Heuristics (§4b)
- Whole-response embedding similarity check (local `sentence-transformers` model or a
  hosted embeddings endpoint) to decide whether to show the merge affordance at all.
- Length-based skip for short/chit-chat turns.
- "Responses agree" badge for the near-duplicate case instead of the merge UI.
- **Exit criteria**: merge UI only appears when it's plausibly useful; trivial prompts
  ("Hi") never show it.

### Phase 5 — Semantic Diff / Alignment (§4b, §4 tier 2)
- Sentence-level embedding similarity matrix between the two responses.
- Semantic alignment (Needleman-Wunsch style, similarity as substitution score) to pair
  up corresponding chunks across responses.
- NLI model pass (entailment/neutral/contradiction) on aligned pairs to produce labels,
  not just scores.
- Heatmap UI with hover-to-reveal score/label; color-coded diff pane (agree/paraphrase/
  conflict/unique) layered on top of the Phase 3 cherry-pick UI (accept-left/accept-right
  per aligned chunk, in addition to freeform pick).
- **Exit criteria**: a user sees *why* two responses differ (paraphrase vs. real conflict),
  not just that they differ, and can accept/reject at the chunk level.

### Phase 6 — AI-Assisted Synthesis Merge (§4 tier 3)
- "Synthesize" action sends both full responses (optionally + the alignment/conflict
  labels from Phase 5 as context) to a chosen model with an explicit reconciliation prompt.
- Result renders as an editable draft, visually distinct from the deterministic Phase 3/5
  merge output (§4's trust-level distinction) — label it clearly as AI-generated, not
  computed.
- **Exit criteria**: a user can request a synthesized merge and gets a draft they
  understand is a new generation, not a mechanical combination.

### Phase 7 — Polish / Expand
- More providers (Google, Ollama/local models, OpenRouter as meta-provider).
- OAuth-based auth for any provider that sanctions it (§4a) — additive, not required.
- Export (markdown/PDF), thread search, merged-answer history/versioning.
- Testing hardening per §7 across all phases if not already continuous.

Do not reorder phases 3 → 5 → 6 (cherry-pick → semantic diff → AI synthesis) — each is a
strict superset of trust and complexity over the last, and shipping synthesis (6) before
manual merge (3) exists would mean shipping the least trustworthy version of the feature
first.

## 7. Testing Conventions

- Provider adapters: unit test against recorded fixture responses (cassette-style), not
  live APIs, to keep CI deterministic and free.
- Merge logic: property-test the diff/merge functions with generated paragraph sets
  independent of any LLM call.
- Streaming: integration tests using a fake SSE provider that emits controllable chunk
  timing (including deliberate failure/timeout) to test pane isolation.

## 8. Style / Conventions for This Repo

- Go backend: standard project layout (`cmd/`, `internal/`, `pkg/` if anything is meant to
  be imported externally). Keep provider adapters in `internal/providers/<name>/`.
- Prefer explicit interfaces over generics-heavy abstractions for provider adapters —
  optimize for "easy to add a fourth provider," not maximal DRY-ness.
- No provider-specific logic outside its adapter package.