# ConcordRouter ⚔️

> **Multi-Model Prompt Arena & Synthesis Platform**  
> Fan out a single prompt concurrently across multiple LLM providers (Anthropic Claude, OpenAI, Google Gemini, Ollama, OpenRouter), stream outputs side-by-side in real-time, and reconcile divergent responses using interactive cherry-pick merging.

---

## ⚡ Core Features

- **Concurrent Multi-Model Fan-Out**: Compose a prompt once and dispatch it simultaneously across 2+ foundation models without blocking or head-of-line delay.
- **Independent Real-Time SSE Streams**: Each response pane streams its own Server-Sent Events channel with dynamic token counters, latency timers, and isolated retry controls.
- **BYOA (Bring Your Own Account)**: Zero platform markups or token quota limits. Connect your own API keys for Anthropic, OpenAI, Google Gemini, or connect to local Ollama (`localhost:11434`). Keys are encrypted at rest with **AES-256-GCM**.
- **Interactive Cherry-Pick Merge Workbench (Phase 3)**: Segment responses into structured paragraph, sentence, and code blocks. Click blocks from either model to build an authoritative reconciled draft and seamlessly continue the conversation.
- **Zero-Dependency Local Architecture**: Runs out of the box with embedded pure-Go SQLite with WAL mode, with optional PostgreSQL + Redis support via `docker-compose`.

---

## 📐 Architecture

```
┌────────────────────────────────────────────────────────┐
│                   Next.js 14 Frontend                  │
│  - Prompt Composer & Turn History Sidebar              │
│  - Responsive Multi-Pane Grid (1–4 columns)            │
│  - BYOA Credential Management & Test Modal             │
│  - Interactive Cherry-Pick Merge Workspace             │
└───────────────────────────┬────────────────────────────┘
                            │ SSE / REST API
┌───────────────────────────▼────────────────────────────┐
│              Go Backend Service (:8080)                │
│  ┌──────────────────────────────────────────────────┐  │
│  │ HTTP Router (Chi v5 + SSE Broker)                │  │
│  │ - /api/v1/threads, /api/v1/threads/{id}/turns    │  │
│  │ - /api/v1/providers/keys, /api/v1/segment        │  │
│  └──────────────────────────┬───────────────────────┘  │
│                             │                          │
│  ┌──────────────────────────▼───────────────────────┐  │
│  │ Fan-Out Orchestrator                             │  │
│  │ - Goroutine Concurrency with Context Isolation   │  │
│  │ - Multiplexed Chunk Streaming & Resiliency       │  │
│  └──────────────────────────┬───────────────────────┘  │
│                             │                          │
│  ┌──────────────────────────▼───────────────────────┐  │
│  │ Provider Adapters (internal/providers/*)         │  │
│  │ - Anthropic, OpenAI, Gemini, Ollama, OpenRouter  │  │
│  │ - Simulated Mock Arena (for instant offline dev) │  │
│  └──────────────────────────────────────────────────┘  │
└───────────────────────────┬────────────────────────────┘
                            │
┌───────────────────────────▼────────────────────────────┐
│                   Storage Layer                        │
│  - SQLite (WAL Mode, zero-config) / PostgreSQL         │
│  - AES-256-GCM Encrypted Key Storage                   │
└────────────────────────────────────────────────────────┘
```

---

## 🚀 Quickstart

### Prerequisites
- **Go 1.22+**
- **Node.js 18+** & `npm`
- (Optional) **Ollama** running locally on `http://localhost:11434`

### 1. Clone & Setup

```bash
git clone https://github.com/your-username/concordrouter.git
cd concordrouter
```

### 2. Run Locally

Start both the Go backend and Next.js frontend in parallel with one command:

```bash
make dev
```

- **Frontend UI**: [http://localhost:3000](http://localhost:3000)
- **Backend API**: [http://localhost:8080](http://localhost:8080)

---

## 🔒 BYOA Security Model

ConcordRouter does **not** proxy billing or mark up model tokens.
1. **At-Rest Encryption**: User-entered API keys are encrypted with **AES-256-GCM** using a derived 256-bit key from `CONCORD_ENCRYPTION_KEY`.
2. **Masked Previews**: Plaintext keys are never returned back to the browser; only masked previews (e.g. `sk-ant-api...4x9f`) are shown.
3. **Instant Validation**: Keys are tested against provider validation endpoints before being committed to the database.

---

## 🧪 Testing

Run backend unit and integration test suites:

```bash
make test
```

Build production binaries and frontend assets:

```bash
make build
```

---

## 📡 API Reference

| Endpoint | Method | Description |
|---|---|---|
| `/api/v1/health` | `GET` | Health check endpoint |
| `/api/v1/providers` | `GET` | List all providers, supported models, and connection status |
| `/api/v1/providers/keys` | `POST` | Validate and store encrypted API key for a provider |
| `/api/v1/providers/keys/{id}` | `DELETE` | Disconnect/remove a provider key |
| `/api/v1/threads` | `GET` | List all conversation threads |
| `/api/v1/threads` | `POST` | Create a new conversation thread |
| `/api/v1/threads/{id}` | `GET` | Get thread details with turns, model responses, and merges |
| `/api/v1/threads/{id}/turns` | `POST` | Submit prompt and stream concurrent SSE fan-out |
| `/api/v1/threads/{id}/retry` | `POST` | Retry streaming a single model pane |
| `/api/v1/segment` | `POST` | Segment response prose into interactive merge chunks |
| `/api/v1/threads/{id}/merge` | `POST` | Save a merged reconciled record |

---

## 🛣️ Roadmap (Phased Build Plan)

- [x] **Phase 0 — Foundations**: Go backend scaffold, Next.js frontend, SQLite persistence, SSE streaming.
- [x] **Phase 1 — BYOA Credentials**: AES-256-GCM encryption, live key validation, settings UI.
- [x] **Phase 2 — Multi-Provider Fan-Out**: Concurrent goroutine dispatch, independent streaming panes, per-pane retries.
- [x] **Phase 3 — Manual Cherry-Pick Merge**: Prose segmentation (paragraphs, sentences, code blocks, lists), 3-column interactive merge workbench, turn continuation.
- [ ] **Phase 4 — Merge Gating Heuristics**: Length-based skip & cosine similarity duplicate detection.
- [ ] **Phase 5 — Semantic Diff & Alignment**: Sequence alignment (Needleman-Wunsch) with NLI classification (agree, paraphrase, conflict).
- [ ] **Phase 6 — AI-Assisted Synthesis Merge**: Reconciled AI synthesis generation with custom merge prompt.

---

## 📄 License

MIT License. See [LICENSE](file:///Users/nilutpal/Documents/projects/concordrouter/LICENSE) for details.
