# CLAUDE.md — ConcordRouter: Multi-Model Prompt Arena

Guidance for Claude Code (and other AI assistants) when working in this repository.
ConcordRouter is a self-hosted, privacy-first web application that fans out a single
prompt to multiple LLM providers concurrently, streams responses in real time, and
provides semantic diffing and consensus synthesis tooling to reconcile divergent answers.

---

## 1. Product Summary

- User composes a prompt (or continues a chat thread).
- User selects 2+ target models/agents from connected providers.
- Request fans out concurrently via goroutine channels; each response streams
  independently into its own arena pane via Server-Sent Events (SSE).
- Real-time markdown rendering with streaming cursor, token counters, latency
  timers, and throughput metrics ($T/s$) per pane.
- User can diff any two responses using Needleman-Wunsch semantic alignment,
  cherry-pick chunks from either side, or request AI-assisted consensus synthesis.
- Merged output can be saved, re-submitted as a new turn, or exported (Markdown/JSON).

## 2. Non-Goals (v1)

- No fine-tuning, no agent/tool-use orchestration across providers, no multi-user
  real-time collaboration (single-user sessions only), no mobile app (responsive web only).

## 3. Architecture (Implemented)

```
┌──────────────────────────────────────────────────────────────────────────┐
│                         Next.js 14 Frontend (:3000)                      │
│  - Universal App Nav (Arena, Features, How It Works, Security, FAQ)       │
│  - Dynamic Arena (Grid, Focus/Tabs, Stacked + Typography S/M/L)          │
│  - Prompt Composer with Template Library & Streaming Context              │
│  - 3-Tab Merge Workbench (Semantic Diff, Chunk Picker, AI Synthesis)     │
│  - Collapsible Sidebar with Search & First-Prompt History Previews       │
│  - Dark/Light Theme (ChatGPT zinc / Claude warm linen aesthetics)        │
│  - MarkdownRenderer with GFM, code blocks, tables, streaming cursor      │
└────────────────────────────────────┬─────────────────────────────────────┘
                                     │ SSE / JSON REST
┌────────────────────────────────────▼─────────────────────────────────────┐
│                     Go Backend Service (:8080)                            │
│  ┌────────────────────────────────────────────────────────────────────┐  │
│  │ HTTP Router (Chi v5 + CORS + SSE Broker)                           │  │
│  │ - /api/v1/threads, /turns, /retry, /export, /search               │  │
│  │ - /api/v1/merge/gate, /merge/align, /merge/synthesize             │  │
│  │ - /api/v1/providers, /providers/keys                               │  │
│  │ - /api/v1/segment, /threads/{id}/merge, /threads/{id}/merges      │  │
│  │ - /api/v1/health                                                   │  │
│  └─────────────────────────────────┬──────────────────────────────────┘  │
│  ┌─────────────────────────────────▼──────────────────────────────────┐  │
│  │ Concurrency Fan-Out Orchestrator                                   │  │
│  │ - Goroutine Fan-Out with Isolated Child Contexts                   │  │
│  │ - Non-blocking Multiplexed SSE Streaming Channels                  │  │
│  │ - Single-Pane Resilient Error Handling & Retries                   │  │
│  └─────────────────────────────────┬──────────────────────────────────┘  │
│  ┌─────────────────────────────────▼──────────────────────────────────┐  │
│  │ Needleman-Wunsch Alignment & Similarity Engine (internal/merge/)   │  │
│  │ - Bigram & 3-Gram Shingle Tokenization & Cosine Matrix            │  │
│  │ - Global Sequence Alignment for Prose (not line-based Myers diff)  │  │
│  │ - Automated Gating Heuristics & Consensus Badging                 │  │
│  └─────────────────────────────────┬──────────────────────────────────┘  │
│  ┌─────────────────────────────────▼──────────────────────────────────┐  │
│  │ Provider Adapters (internal/providers/*)                           │  │
│  │ OpenAI · Anthropic · Gemini · Ollama · OpenRouter · Mock          │  │
│  └────────────────────────────────────────────────────────────────────┘  │
└────────────────────────────────────┬─────────────────────────────────────┘
┌────────────────────────────────────▼─────────────────────────────────────┐
│                          Persistence Layer                               │
│  SQLite (WAL Mode, Zero-CGo via modernc.org/sqlite, Auto-Migrations)     │
│  AES-256-GCM Envelope Encryption for Provider API Credentials            │
└──────────────────────────────────────────────────────────────────────────┘
```

**Backend**: Go with Chi v5 router. Concurrent streaming fan-out via goroutines + channels.
Each provider adapter implements `Provider.Stream(ctx, req) <-chan Chunk`. SSE pushes each
provider's stream to the browser independently so panes update at their own pace.

**Frontend**: Next.js 14 (App Router) with Tailwind CSS. Each response pane is an independent
SSE streaming consumer with live markdown rendering. Dual-theme design system (ChatGPT-style
dark zinc / Claude-style warm linen light mode).

**Data layer**: SQLite in WAL mode (zero-CGo via `modernc.org/sqlite`) for threads, messages,
provider responses, and merge records. No Redis or Postgres required.

## 4. Provider Adapter Interface

```go
type Provider interface {
    ID() ProviderID
    Name() string
    AuthMode() AuthMode
    SupportedModels() []ModelInfo
    ValidateKey(ctx context.Context, apiKey string, customURL string) error
    EstimateCost(req ChatRequest) CostEstimate
    Stream(ctx context.Context, req ChatRequest) (<-chan StreamChunk, error)
}
```

### Implemented Providers (6)

| Provider | Auth | Models | Status |
|---|---|---|---|
| **OpenAI** | `api_key` | GPT-4o, GPT-4o Mini, o3-mini | ✅ Implemented |
| **Anthropic** | `api_key` | Claude 3.7 Sonnet, 3.5 Sonnet, 3.5 Haiku | ✅ Implemented |
| **Google Gemini** | `api_key` | Gemini 2.5 Flash, 2.5 Pro | ✅ Implemented |
| **Ollama** | `none` | Llama 3.2, DeepSeek R1, Mistral 7B | ✅ Implemented |
| **OpenRouter** | `api_key` | DeepSeek R1, Llama 3.3 70B, Claude 3.7 Sonnet | ✅ Implemented |
| **Mock** | `none` | mock-concise, mock-verbose, mock-creative | ✅ Built-in |

Each adapter lives in `internal/providers/<name>/` and implements the full streaming interface.
The Mock provider sends word-by-word tokenized markdown for realistic streaming demos
without any API keys.

## 5. BYOA (Bring Your Own Account)

**Auth model: bring-your-own-account, not platform-managed keys.** The app never holds
provider billing/quota — each user connects their own API credentials and the app uses
*their* keys for every call.

- **API keys** (OpenAI, Anthropic, Gemini, OpenRouter): User pastes a key via the Settings
  modal, app validates it with a cheap test call, stores it encrypted (AES-256-GCM), and
  displays only a masked preview (e.g., `sk-pro...JMQA`).
- **No-auth providers** (Ollama, Mock): Connect automatically, no credentials needed.
- **Provider adapter interface** includes explicit `AuthMode` (`api_key` | `none`) per
  provider, surfaced honestly in the UI.

## 6. SSE Streaming Protocol

The fan-out streaming uses Server-Sent Events with typed events:

```
event: init
data: {"prompt":"...", "turnId":"turn_...", "type":"turn_init"}

event: chunk
data: {"providerId":"mock", "model":"mock-concise", "delta":"Hello", "fullText":"Hello", "tokens":1, "done":false, "timestamp":"..."}

event: chunk
data: {"providerId":"mock", "model":"mock-concise", "delta":" world", "fullText":"Hello world", "tokens":2, "done":false, "timestamp":"..."}

event: complete
data: {"type":"complete"}
```

Client-side SSE parsing handles `\r?\n` line endings robustly and processes `delta`
(incremental) and `fullText` (cumulative) fields for real-time state updates.

## 7. The Merge Feature — Implementation Status

### ✅ Tier 1: Cherry-Pick Merge (Implemented)
- Paragraph/sentence segmentation via `/api/v1/segment`.
- Hunk-by-hunk cherry-pick workbench with Accept Left (A), Accept Right (B),
  Accept Both (A + B) per aligned hunk.
- Save merged draft as its own record in the thread.

### ✅ Tier 2: Semantic Diff / Alignment (Implemented)
- Needleman-Wunsch global sequence alignment using cosine similarity as substitution
  scores (not line-based Myers diff).
- Bigram & 3-gram shingle tokenization for similarity computation.
- Pairwise $M × N$ similarity heatmap with color-coded cells (green high / red low)
  and hover-to-reveal cosine scores.
- Alignment diff view with color-coded hunks.

### ✅ Tier 3: AI-Assisted Synthesis (Implemented)
- "Synthesize" action sends both responses + alignment context to a chosen model
  with structured reconciliation prompts via SSE streaming.
- Result renders as an editable draft, visually distinct from mechanical merge.

### ✅ Merge Gating Heuristics (Implemented)
- Whole-response embedding similarity check for consensus detection.
- Length-based skip for short/trivial turns.
- "Responses agree" badge with similarity percentage for near-duplicates.
- Merge UI only appears when responses are long enough *and* diverge enough.

### ✅ Post-Processing Stage: Statistical Humanize & AI-Detectability Reduction (Implemented)
- Route: `/api/v1/merge/humanize` running on finalized merged drafts before saving or exporting.
- Non-generative deterministic statistical perturbation without requiring a secondary LLM call.
- **Burstiness injection**: analyzes sentence length distribution $(\mu, \sigma)$ and burstiness coefficient $B = (\sigma - \mu)/(\sigma + \mu)$; perturbs variance by splitting long uniform sentences ($>30$ words) and joining adjacent short clauses ($<6$ words).
- **Lexical de-patterning**: regex + POS-gated replacement of overused AI markers (*delve, testament, tapestry, landscape, pivotal, moreover, furthermore, it is important to note*, em-dash chains).
- **N-gram repetition smoothing**: detects repeated rhetorical skeletons across paragraphs and varies subsequent occurrences.
- **Markov n-gram perplexity & readability targeting**: Flesch-Kincaid Grade Level and Gunning-Fog index scoring.
- **Post-transform grammar validation**: automatic casing, spacing, and duplicate functional word cleanup.
- Pure-Go core in `server/internal/humanize/` (zero CGo) with optional sidecar interface for spaCy / LanguageTool.
- Interactive workbench UI in `MergeWorkbench.tsx` with live before/after burstiness deltas, purged tell badges, and one-click revert.

## 8. Frontend Components

| Component | Description |
|---|---|
| `page.tsx` | Main arena orchestrator: state management, streaming handlers, layout |
| `ArenaPanes.tsx` | Dynamic arena grid (Grid/Focus/Stacked), response cards, streaming UI |
| `MarkdownRenderer.tsx` | GFM markdown rendering with code blocks, tables, streaming cursor |
| `Sidebar.tsx` | Collapsible session history with search and first-prompt previews |
| `Navbar.tsx` | Universal navigation (Arena, Features, How It Works, Security, FAQ, About) |
| `MergeWorkbench.tsx` | 3-tab merge: Semantic Diff, Chunk Picker, AI Synthesis |
| `SimilarityHeatmap.tsx` | Pairwise $M × N$ cosine similarity matrix with color-coded cells |
| `AlignmentDiffView.tsx` | Needleman-Wunsch aligned paragraph diff viewer |
| `ProviderSettingsModal.tsx` | BYOA credential management (add/remove/validate API keys) |
| `ModelSelectorModal.tsx` | Multi-model selection across all connected providers |
| `ExportModal.tsx` | Export sessions as Markdown or JSON |
| `MergeHistoryModal.tsx` | Browse and restore previous merge records |
| `PromptTemplatesModal.tsx` | Curated prompt template library |

### View Pages
`FeaturesView`, `HowItWorksView`, `SecurityView`, `FaqView`, `AboutView` —
informational pages accessible from the universal navbar.

## 9. Design System & Theme

Dual-theme CSS custom properties design system:

- **Dark mode**: ChatGPT-style neutral graphite/zinc aesthetic (`#171717` background,
  `#212121` surfaces, `#ececec` text).
- **Light mode**: Claude-style warm stone/linen aesthetic (`#faf9f5` background,
  `#ffffff` surfaces, `#1f1e1d` text).
- **Accent colors**: Terracotta (`#cc785c`), Emerald (`#10a37f`), Amber (`#d97706`),
  Blue (`#2563eb`).
- **Provider dot colors**: Each provider has a unique color dot in the arena panes.
- **Typography**: System font stack (`-apple-system, BlinkMacSystemFont, Segoe UI, Roboto`).
- **Streaming UI**: Green pulsing dot, elapsed timer, token count, skeleton loading states.

## 10. Key Engineering Decisions

- **Concurrent streaming**: `context.Context` cancellation so stopping one pane doesn't
  kill the others; a slow/failed provider must not block the rest.
- **SSE over WebSockets**: Simpler unidirectional streaming; reconnection is handled
  client-side with abort controllers.
- **SQLite over Postgres**: Zero-dependency local-first persistence. WAL mode for
  concurrent read/write. No Docker required for development.
- **Mock provider**: Built-in word-by-word tokenized streaming with markdown content
  (tables, code blocks, headers) for testing without API keys.
- **Per-pane retry**: Re-run only the failed provider, not the whole turn.
- **Credential storage**: AES-256-GCM encrypted at rest with unique nonces. Masked
  previews only returned to the client.

## 11. API Endpoints (Complete)

| Method | Endpoint | Description |
|---|---|---|
| `GET` | `/api/v1/health` | Health check with timestamp |
| `GET` | `/api/v1/providers` | List providers, statuses, and available models |
| `POST` | `/api/v1/providers/keys` | Save & validate encrypted provider API key |
| `DELETE` | `/api/v1/providers/keys/{providerId}` | Disconnect provider key |
| `GET` | `/api/v1/threads` | List all saved arena threads |
| `POST` | `/api/v1/threads` | Create a new arena thread |
| `GET` | `/api/v1/threads/{id}` | Get thread details with turns and merges |
| `DELETE` | `/api/v1/threads/{id}` | Delete a thread |
| `GET` | `/api/v1/threads/search?q={query}` | Full-text search across threads |
| `GET` | `/api/v1/threads/{id}/export` | Export session (Markdown or JSON) |
| `POST` | `/api/v1/threads/{id}/turns` | **SSE Stream**: Concurrent fan-out to models |
| `POST` | `/api/v1/threads/{id}/retry` | **SSE Stream**: Single-pane isolated retry |
| `POST` | `/api/v1/segment` | Segment text into paragraphs/sentences |
| `POST` | `/api/v1/merge/gate` | Evaluate gating heuristics (length + similarity) |
| `POST` | `/api/v1/merge/align` | Compute Needleman-Wunsch alignment & similarity matrix |
| `POST` | `/api/v1/merge/synthesize` | **SSE Stream**: AI consensus reconciliation |
| `POST` | `/api/v1/merge/humanize` | Statistical AI-detectability reduction & burstiness injection |
| `POST` | `/api/v1/threads/{id}/merge` | Save merge record |
| `GET` | `/api/v1/threads/{id}/merges` | List merge history for a thread |

## 12. Testing

```bash
# Run all Go tests & Next.js production build
make test && make build
```

- Provider adapters: unit tests with recorded fixture responses (cassette-style).
- Mock provider: `mock_test.go` verifies tokenized streaming output.
- Merge logic: tests in `internal/merge/` for alignment, similarity, and gating.
- Streaming: integration tests using the Mock provider with controllable chunk timing.
- Orchestrator: tests in `internal/orchestrator/` for fan-out concurrency.
- Crypto: tests in `internal/crypto/` for AES-256-GCM encrypt/decrypt round-trips.

## 13. Development

```bash
# Start both services (Go :8080 + Next.js :3000)
make dev

# If ports are occupied
lsof -ti :3000,:8080 | xargs kill -9

# Run Go server only
cd server && go run cmd/server/main.go

# Run Next.js client only
cd client && npm run dev
```

## 14. Project Layout

```
concordrouter/
├── client/                          # Next.js 14 frontend
│   ├── src/
│   │   ├── app/
│   │   │   ├── page.tsx             # Main arena page (state, streaming, layout)
│   │   │   ├── globals.css          # Design system tokens (dark/light themes)
│   │   │   └── layout.tsx           # Root layout with metadata
│   │   ├── components/
│   │   │   ├── ArenaPanes.tsx       # Arena grid, response cards, streaming UI
│   │   │   ├── MarkdownRenderer.tsx # GFM markdown with code blocks & tables
│   │   │   ├── Sidebar.tsx          # Session history with search & previews
│   │   │   ├── Navbar.tsx           # Universal app navigation
│   │   │   ├── MergeWorkbench.tsx   # 3-tab merge (Diff, Cherry-Pick, Synthesis)
│   │   │   ├── SimilarityHeatmap.tsx# Pairwise cosine similarity matrix
│   │   │   ├── AlignmentDiffView.tsx# Aligned paragraph diff view
│   │   │   ├── ProviderSettingsModal.tsx
│   │   │   ├── ModelSelectorModal.tsx
│   │   │   ├── ExportModal.tsx
│   │   │   ├── MergeHistoryModal.tsx
│   │   │   ├── PromptTemplatesModal.tsx
│   │   │   └── views/              # Informational pages
│   │   └── lib/
│   │       ├── api.ts              # API client + SSE stream parsing
│   │       └── types.ts            # TypeScript type definitions
│   ├── next.config.mjs             # Proxy /api/v1 → localhost:8080
│   └── package.json
├── server/                          # Go backend
│   ├── cmd/server/main.go          # Entry point, server bootstrap
│   └── internal/
│       ├── api/routes.go           # Chi v5 HTTP routes + handlers
│       ├── crypto/                 # AES-256-GCM encryption
│       ├── domain/                 # Shared domain types
│       ├── humanize/               # Statistical AI-detectability reduction engine
│       │   ├── burstiness.go       # Sentence length variance perturbation
│       │   ├── lexical.go          # AI-tell blocklist + POS-gated replacement
│       │   ├── ngram_lm.go         # Markov n-gram perplexity & repetition smoothing
│       │   ├── readability.go      # Flesch-Kincaid & Gunning-Fog scoring
│       │   ├── syntax.go           # Clause restructuring & sidecar hook
│       │   ├── grammar_check.go    # Rule-based formatting/grammar validation
│       │   └── pipeline.go         # Orchestrator pipeline
│       ├── merge/                  # Needleman-Wunsch alignment engine
│       ├── orchestrator/           # Fan-out streaming orchestrator
│       ├── providers/              # Provider adapter interface + registry
│       │   ├── provider.go         # Interface definition
│       │   ├── anthropic/          # Claude adapter
│       │   ├── openai/             # GPT adapter
│       │   ├── gemini/             # Gemini adapter
│       │   ├── ollama/             # Local models adapter
│       │   ├── openrouter/         # OpenRouter meta-provider
│       │   └── mock/               # Built-in mock streaming provider
│       └── store/                  # SQLite persistence layer
├── Makefile                        # dev, test, build commands
├── concordrouter.db                # SQLite database (auto-created)
└── docker-compose.yml              # Optional containerized deployment
```

## 15. Style / Conventions

- Go backend: standard layout (`cmd/`, `internal/`). Provider adapters in
  `internal/providers/<name>/`.
- Prefer explicit interfaces over generics-heavy abstractions for provider adapters —
  optimize for "easy to add a new provider," not maximal DRY-ness.
- No provider-specific logic outside its adapter package.
- Frontend: Tailwind CSS with CSS custom properties for theming. Component files are
  self-contained with inline styles where appropriate.
- All streaming state managed via React `useState` + `useRef` for abort controllers.
- Preserve all existing comments and docstrings when making changes.