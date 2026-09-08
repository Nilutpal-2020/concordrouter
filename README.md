# ConcordRouter ⚔️

<div align="center">

![ConcordRouter Banner](https://raw.githubusercontent.com/nilutpal/concordrouter/main/assets/banner.png)

**Multi-Model Prompt Arena, Needleman-Wunsch Semantic Diffing & Consensus Synthesis**

[![CI](https://github.com/nilutpal/concordrouter/actions/workflows/ci.yml/badge.svg)](https://github.com/nilutpal/concordrouter/actions/workflows/ci.yml)
[![Go Version](https://img.shields.io/badge/Go-1.22+-00ADD8?style=flat&logo=go)](https://golang.org)
[![Next.js](https://img.shields.io/badge/Next.js-14_App_Router-black?style=flat&logo=next.js)](https://nextjs.org)
[![License: MIT](https://img.shields.io/badge/License-MIT-amber.svg)](https://opensource.org/licenses/MIT)
[![Database](https://img.shields.io/badge/SQLite-Pure--Go_WAL-blue.svg)](https://modernc.org/sqlite)
[![Encryption](https://img.shields.io/badge/Security-AES--256--GCM-emerald.svg)](#-byoa-security--encryption)

[Live Demo](#-quickstart) • [Architecture](#-architecture) • [Features](#-core-capabilities) • [API Docs](#-api-endpoints) • [BYOA Security](#-byoa-security--encryption)

</div>

---

## 💡 Why ConcordRouter?

Every foundation model has distinct strengths, biases, and silent hallucinations. Relying on a single LLM vendor locks developers into arbitrary blindspots. 

**ConcordRouter** treats foundation models as competing contributors. It dispatches a single prompt concurrently across leading LLMs, aligns their outputs using global sequence alignment algorithms, and provides interactive cherry-picking and AI synthesis tools to reconcile divergent responses into verified consensus.

---

## ⚡ Core Capabilities

- **Concurrent Fan-Out Concurrency**: Non-blocking Goroutine channels fan out queries simultaneously to **Anthropic Claude 3.7**, **OpenAI GPT-4o / o3-mini**, **Google Gemini 2.5**, **Ollama local models**, and **OpenRouter**.
- **Independent Real-Time SSE Streams**: Real-time token streaming with live per-pane latency timers, token counters, speed metrics ($T/s$), and single-pane retry controls.
- **Dynamic Arena Layout Switcher**:
  - 🔲 **Grid / Split View**: Responsive multi-column comparison (1 to 4 panes).
  - 👁️ **Focus Mode**: 1 model maximized with a fast tab switcher to flip between model outputs instantly with 0 latency.
  - 📑 **Stacked View**: Clean horizontal cards for fast sequential skimming.
- **Reading Typography Controls**: Adjustable font scale (`S` Compact $12\text{px}$, `M` Comfortable $14\text{px}$, `L` Spacious $16\text{px}$) with markdown syntax formatting.
- **Needleman-Wunsch Semantic Alignment**: Applies bioinformatics global sequence alignment with cosine similarity substitution scores to pair matching prose concepts (unlike line-based Myers code diffs).
- **Pairwise $M \times N$ Similarity Heatmap**: Hover over matrix cells to inspect cosine similarity scores ($0\text{--}100\%$) and inspect paragraph comparisons.
- **Hunk-by-Hunk Cherry-Pick Workbench**: 1-click `Accept Left (A)`, `Accept Right (B)`, or `Accept Both (A + B)` per aligned hunk to compose an authoritative merged draft.
- **AI-Assisted Reconciliation (Phase 6)**: Structured consensus synthesis prompt that de-duplicates prose and highlights consensus assertions with strict attribution.
- **BYOA (Bring Your Own Account) Vault**: API keys are encrypted at rest with local **AES-256-GCM**. Requests connect directly to official upstream APIs with zero proxy markups or telemetry logging.
- **Zero-CGo Local-First Persistence**: Powered by `modernc.org/sqlite` in WAL mode for frictionless local execution with zero Docker dependencies.

---

## 📐 Architecture

```
┌──────────────────────────────────────────────────────────────────────────┐
│                           Next.js 14 Frontend                            │
│  - Universal App Navigation (Arena, Features, How It Works, FAQ, About)  │
│  - Dynamic Arena (Grid, Focus, Stacked modes + Reading scale S/M/L)      │
│  - Prompt Composer with Templates Library & Active Turn Context Card    │
│  - 3-Tab Merge Workbench (Semantic Diff, Chunk Picker, AI Synthesis)     │
└────────────────────────────────────┬─────────────────────────────────────┘
                                     │ SSE / JSON REST API
┌────────────────────────────────────▼─────────────────────────────────────┐
│                       Go Backend Service (:8080)                         │
│  ┌────────────────────────────────────────────────────────────────────┐  │
│  │ HTTP Router (Chi v5 + SSE Broker)                                  │  │
│  │ - /api/v1/threads, /api/v1/threads/{id}/turns                      │  │
│  │ - /api/v1/merge/gate, /api/v1/merge/align, /api/v1/merge/synthesize │  │
│  │ - /api/v1/providers/keys, /api/v1/threads/search, /threads/export   │  │
│  └─────────────────────────────────┬──────────────────────────────────┘  │
│                                    │                                     │
│  ┌─────────────────────────────────▼──────────────────────────────────┐  │
│  │ Concurrency Fan-Out Orchestrator                                   │  │
│  │ - Goroutine Fan-Out with Isolated Child Contexts                   │  │
│  │ - Non-blocking Multiplexed SSE Streaming Channels                  │  │
│  │ - Single-Pane Resilient Error Handling & Retries                   │  │
│  └─────────────────────────────────┬──────────────────────────────────┘  │
│                                    │                                     │
│  ┌─────────────────────────────────▼──────────────────────────────────┐  │
│  │ Needleman-Wunsch Alignment & Similarity Engine (internal/merge/)    │  │
│  │ - Bigram & 3-Gram Shingle Tokenization & Cosine Matrix             │  │
│  │ - Needleman-Wunsch Global Sequence Alignment (Prose)               │  │
│  │ - Automated Phase 4 Gating Heuristics & Consensus Badging          │  │
│  └─────────────────────────────────┬──────────────────────────────────┘  │
│                                    │                                     │
│  ┌─────────────────────────────────▼──────────────────────────────────┐  │
│  │ Provider Adapters (internal/providers/*)                           │  │
│  │ - Anthropic, OpenAI, Gemini, Ollama (localhost), OpenRouter, Mock  │  │
│  └────────────────────────────────────────────────────────────────────┘  │
└────────────────────────────────────┬─────────────────────────────────────┘
                                     │
┌────────────────────────────────────▼─────────────────────────────────────┐
│                            Persistence Layer                             │
│  - SQLite (WAL Mode, Zero-CGo, Auto-Migrations)                          │
│  - AES-256-GCM Envelope Encryption for Provider API Credentials          │
└──────────────────────────────────────────────────────────────────────────┘
```

---

## 🚀 Quickstart

### Prerequisites
- **Go 1.22+**
- **Node.js 20+** & `npm`
- (Optional) **Ollama** running locally on `http://localhost:11434`

### 1. Clone the Repository

```bash
git clone https://github.com/your-username/concordrouter.git
cd concordrouter
```

### 2. Launch Local Development Server

Run both the Go backend and Next.js frontend concurrently with a single command:

```bash
make dev
```

- **Frontend App**: [http://localhost:3000](http://localhost:3000)
- **Backend API**: [http://localhost:8080](http://localhost:8080)

*Note: ConcordRouter includes a built-in **Mock Provider** so you can test fan-out streaming and merges immediately without entering any API keys.*

---

## 🔒 BYOA Security & Encryption

ConcordRouter is built from the ground up for strict credential sovereignty:
1. **AES-256-GCM Symmetric Encryption**: All API keys are encrypted at rest using Galois/Counter Mode authenticated encryption with unique 96-bit nonces.
2. **Masked Client Previews**: Plaintext keys are never returned across the wire; only masked previews (e.g., `sk-ant-...4x9f`) are sent to the client.
3. **Direct Upstream Dispatch**: All API calls dispatch directly from the server to official provider endpoints. No third-party proxy intercepts, logs, or marks up your queries.

---

## 🧪 Testing & Verification

Run the comprehensive test suite and production build:

```bash
# Run all Go tests & Next.js production build
make test && make build
```

```
✓ Compiled successfully
Route (app)                              Size     First Load JS
┌ ○ /                                    28.9 kB         116 kB
└ ○ /_not-found                          875 B          88.1 kB

ok  	concordrouter/server/internal/api	3.290s
ok  	concordrouter/server/internal/crypto	4.049s
ok  	concordrouter/server/internal/merge	1.375s
ok  	concordrouter/server/internal/orchestrator	2.489s
ok  	concordrouter/server/internal/providers/anthropic	0.785s
ok  	concordrouter/server/internal/providers/gemini	2.592s
ok  	concordrouter/server/internal/providers/ollama	4.594s
ok  	concordrouter/server/internal/providers/openai	5.254s
ok  	concordrouter/server/internal/providers/openrouter	5.152s
ok  	concordrouter/server/internal/store	5.249s
```

---

## 📡 API Endpoints

| Method | Endpoint | Description |
|---|---|---|
| `GET` | `/api/v1/providers` | List all providers, connectivity statuses, and available models |
| `POST` | `/api/v1/providers/keys` | Save & test encrypted provider API key (AES-256-GCM) |
| `DELETE`| `/api/v1/providers/keys/{id}` | Disconnect provider key |
| `GET` | `/api/v1/threads` | List all saved arena threads |
| `POST` | `/api/v1/threads` | Create a new arena thread |
| `GET` | `/api/v1/threads/search?q={query}` | Search prompts and turns across all threads |
| `POST` | `/api/v1/threads/{id}/fanout` | **SSE Stream**: Concurrent fan-out to selected models |
| `POST` | `/api/v1/threads/{id}/turns/{turnId}/retry` | **SSE Stream**: Single-pane isolated retry |
| `POST` | `/api/v1/merge/gate` | Evaluate Phase 4 gating heuristics (<20 tokens, >90% consensus) |
| `POST` | `/api/v1/merge/align` | Compute Needleman-Wunsch sequence alignment & similarity matrix |
| `POST` | `/api/v1/merge/synthesize` | **SSE Stream**: AI consensus reconciliation |
| `GET` | `/api/v1/threads/{id}/export` | Export session in Markdown or JSON format |

---

## 📄 License

This project is licensed under the [MIT License](LICENSE).
