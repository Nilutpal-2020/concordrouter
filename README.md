# ConcordRouter ⚔️

<div align="center">

![ConcordRouter Banner](https://raw.githubusercontent.com/nilutpal/concordrouter/main/assets/banner.png)

**Multi-Model Prompt Arena with Real-Time Streaming, Needleman-Wunsch Semantic Diffing & AI Consensus Synthesis**

[![CI](https://github.com/nilutpal/concordrouter/actions/workflows/ci.yml/badge.svg)](https://github.com/nilutpal/concordrouter/actions/workflows/ci.yml)
[![Go Version](https://img.shields.io/badge/Go-1.22+-00ADD8?style=flat&logo=go)](https://golang.org)
[![Next.js](https://img.shields.io/badge/Next.js-14_App_Router-black?style=flat&logo=next.js)](https://nextjs.org)
[![License: MIT](https://img.shields.io/badge/License-MIT-amber.svg)](https://opensource.org/licenses/MIT)
[![Database](https://img.shields.io/badge/SQLite-Pure--Go_WAL-blue.svg)](https://modernc.org/sqlite)
[![Encryption](https://img.shields.io/badge/Security-AES--256--GCM-emerald.svg)](#-byoa-security--encryption)
[![Providers](https://img.shields.io/badge/Providers-6_Adapters-blueviolet.svg)](#-supported-providers)

[Live Demo](#-quickstart) • [Architecture](#-architecture) • [Features](#-core-capabilities) • [Streaming](#-real-time-streaming) • [API Docs](#-api-endpoints) • [BYOA Security](#-byoa-security--encryption)

</div>

---

## 💡 Why ConcordRouter?

Every foundation model has distinct strengths, biases, and silent hallucinations. Relying on a single LLM vendor locks developers into arbitrary blindspots.

**ConcordRouter** treats foundation models as competing contributors. It dispatches a single prompt concurrently across leading LLMs, streams responses token-by-token in real time, aligns outputs using bioinformatics-inspired sequence alignment algorithms, and provides interactive cherry-picking and AI synthesis tools to reconcile divergent responses into verified consensus.

**Self-hosted. Privacy-first. Zero telemetry. Bring your own API keys.**

---

## ⚡ Core Capabilities

### 🏟️ Arena & Streaming
- **Concurrent Fan-Out**: Non-blocking Goroutine channels fan out queries simultaneously to **6 providers** with independent SSE streams per pane.
- **Real-Time Token Streaming**: Word-by-word streaming with live per-pane latency timers, token counters, throughput metrics ($T/s$), and streaming cursor animation.
- **Rich Markdown Rendering**: Full GitHub Flavored Markdown (GFM) rendering during streaming — headings, bold, lists, code blocks with syntax labels & copy buttons, tables, blockquotes, and horizontal rules render progressively as tokens arrive.
- **Stream Controls**: Stop button to abort active generation, per-pane retry for failed providers without re-running the entire turn.

### 📐 Arena Layout Modes
- 🔲 **Grid / Split View**: Responsive multi-column comparison (auto-adapts for 1–4 models).
- 👁️ **Focus / Tabs Mode**: Full-width single model view with instant tab switching between outputs.
- 📑 **Stacked View**: Vertical card layout for sequential reading.
- 🔤 **Typography Scale**: Adjustable font size (`S` Compact 12px, `M` Comfortable 14px, `L` Spacious 16px).

### 🔬 Semantic Diffing & Merge
- **Needleman-Wunsch Global Sequence Alignment**: Bioinformatics-inspired alignment using cosine similarity substitution scores to pair matching prose concepts (not line-based Myers code diffs).
- **Pairwise $M \times N$ Similarity Heatmap**: Color-coded matrix (green → amber → red) with hover-to-inspect cosine scores and paragraph comparisons.
- **3-Tab Merge Workbench**:
  1. **Semantic Diff**: Side-by-side aligned paragraph comparison with color-coded labels.
  2. **Chunk Picker**: Hunk-by-hunk `Accept Left (A)`, `Accept Right (B)`, or `Accept Both` to compose a merged draft.
  3. **AI Synthesis**: Structured consensus prompt sent to a chosen model via SSE streaming, clearly labeled as AI-generated.
- **Merge Gating Heuristics**: Automatic detection of consensus vs. divergence — merge UI only appears when responses are long enough and diverge enough to warrant reconciliation.
- **Statistical Humanize & AI-Detectability Reduction (`/api/v1/merge/humanize`)**: Deterministic post-processing stage running on finalized drafts before save/export. Injects burstiness variance $(\mu, \sigma)$, purges overused AI tell-words (*delve, testament, tapestry, moreover*), smooths recurring n-gram skeletons, and calculates Flesch-Kincaid & Gunning-Fog readability scores without invoking a secondary LLM.

### 🎨 UI/UX Design
- **Dual Theme System**: ChatGPT-style dark zinc aesthetic + Claude-style warm stone/linen light mode, togglable in the navbar.
- **Collapsible Sidebar**: Session history with full-text search and first-prompt preview text (similar to ChatGPT/Claude conversation lists).
- **Universal Navigation**: Arena, Features, How It Works, Security, FAQ, About — all accessible from a single navbar.
- **Prompt Templates**: Curated starter prompts for quick benchmarking across models.
- **Export**: Download sessions as Markdown or JSON.

---

## 🤖 Supported Providers

| Provider | Auth | Models | Notes |
|---|---|---|---|
| **OpenAI** | API Key | GPT-4o, GPT-4o Mini, o3-mini | Official API, streaming SSE |
| **Anthropic** | API Key | Claude 3.7 Sonnet, 3.5 Sonnet, 3.5 Haiku | Official Messages API |
| **Google Gemini** | API Key | Gemini 2.5 Flash, Gemini 2.5 Pro | GenerateContent streaming |
| **Ollama** | None | Llama 3.2, DeepSeek R1, Mistral 7B | Local models, localhost:11434 |
| **OpenRouter** | API Key | DeepSeek R1, Llama 3.3 70B, Claude 3.7 Sonnet | Meta-provider gateway |
| **Mock Arena** | None | mock-concise, mock-verbose, mock-creative | Built-in demo, no API keys needed |

> The **Mock provider** streams word-by-word tokenized markdown (tables, code blocks, headers) for realistic streaming demos. Perfect for testing the full UI without any API credentials.

---

## 🌊 Real-Time Streaming

ConcordRouter uses Server-Sent Events (SSE) for streaming. The protocol:

```
event: init
data: {"prompt":"...", "turnId":"turn_...", "type":"turn_init"}

event: chunk
data: {"providerId":"openai", "model":"gpt-4o", "delta":"Hello", "fullText":"Hello", "tokens":1, "done":false}

event: chunk
data: {"providerId":"openai", "model":"gpt-4o", "delta":" world", "fullText":"Hello world", "tokens":2, "done":false}

event: complete
data: {"type":"complete"}
```

**Key features:**
- Each provider streams independently — a slow provider never blocks others.
- `delta` contains the incremental token, `fullText` contains the cumulative text.
- Markdown renders progressively as tokens arrive (headings, tables, code blocks appear in real time).
- Green pulsing indicator with elapsed time and token count visible during generation.
- Abort/stop button to cancel active streams via `AbortController`.

---

## 📐 Architecture

```
┌──────────────────────────────────────────────────────────────────────────┐
│                       Next.js 14 Frontend (:3000)                        │
│  - Universal App Navigation (Arena, Features, How It Works, FAQ, About)  │
│  - Dynamic Arena Panes (Grid / Focus-Tabs / Stacked + S/M/L Typography)  │
│  - Real-Time Markdown Streaming with GFM Code Blocks & Tables            │
│  - Collapsible Sidebar with Search & First-Prompt History Previews       │
│  - 3-Tab Merge Workbench (Semantic Diff, Chunk Picker, AI Synthesis)     │
│  - Dual Theme: ChatGPT Dark Zinc + Claude Warm Linen Light              │
└────────────────────────────────────┬─────────────────────────────────────┘
                                     │ SSE / JSON REST API
┌────────────────────────────────────▼─────────────────────────────────────┐
│                       Go Backend Service (:8080)                         │
│  ┌────────────────────────────────────────────────────────────────────┐  │
│  │ HTTP Router (Chi v5 + CORS + SSE Broker)                           │  │
│  │ - /api/v1/threads, /turns, /retry, /export, /search               │  │
│  │ - /api/v1/merge/gate, /merge/align, /merge/synthesize             │  │
│  │ - /api/v1/providers/keys, /segment, /health                       │  │
│  └─────────────────────────────────┬──────────────────────────────────┘  │
│                                    │                                     │
│  ┌─────────────────────────────────▼──────────────────────────────────┐  │
│  │ Concurrency Fan-Out Orchestrator                                   │  │
│  │ - Goroutine Fan-Out with Isolated Child Contexts per Provider     │  │
│  │ - Non-blocking Multiplexed SSE Streaming Channels                 │  │
│  │ - Single-Pane Resilient Error Handling & Per-Pane Retries         │  │
│  └─────────────────────────────────┬──────────────────────────────────┘  │
│                                    │                                     │
│  ┌─────────────────────────────────▼──────────────────────────────────┐  │
│  │ Needleman-Wunsch Alignment & Similarity Engine (internal/merge/)   │  │
│  │ - Bigram & 3-Gram Shingle Tokenization & Cosine Similarity Matrix │  │
│  │ - Needleman-Wunsch Global Sequence Alignment (Prose, not Code)    │  │
│  │ - Automated Gating Heuristics & Consensus/Divergence Badging      │  │
│  └─────────────────────────────────┬──────────────────────────────────┘  │
│                                    │                                     │
│  ┌─────────────────────────────────▼──────────────────────────────────┐  │
│  │ Provider Adapters (internal/providers/*)                           │  │
│  │ OpenAI · Anthropic · Gemini · Ollama · OpenRouter · Mock          │  │
│  └────────────────────────────────────────────────────────────────────┘  │
└────────────────────────────────────┬─────────────────────────────────────┘
                                     │
┌────────────────────────────────────▼─────────────────────────────────────┐
│                            Persistence Layer                             │
│  - SQLite (WAL Mode, Zero-CGo via modernc.org/sqlite, Auto-Migrations)   │
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

> **Note**: ConcordRouter includes a built-in **Mock Provider** so you can test fan-out streaming, markdown rendering, and merges immediately without entering any API keys.

### 3. If ports are already in use

```bash
# Find and kill processes on ports 3000 and 8080
lsof -ti :3000,:8080 | xargs kill -9

# Then re-run
make dev
```

### 4. Connect Your Own API Keys

1. Click the **Settings** (gear icon) in the navbar.
2. Paste your API key for any provider (OpenAI, Anthropic, Gemini, OpenRouter).
3. The key is validated with a test call and encrypted at rest with AES-256-GCM.
4. Select models from the **Model Selector** to include them in fan-out.

---

## 🔒 BYOA Security & Encryption

ConcordRouter is built from the ground up for strict credential sovereignty:

1. **AES-256-GCM Symmetric Encryption**: All API keys are encrypted at rest using Galois/Counter Mode authenticated encryption with unique 96-bit nonces.
2. **Masked Client Previews**: Plaintext keys are never returned across the wire; only masked previews (e.g., `sk-ant-...4x9f`) are sent to the client.
3. **Direct Upstream Dispatch**: All API calls dispatch directly from the server to official provider endpoints. No third-party proxy intercepts, logs, or marks up your queries.
4. **Local-First**: SQLite database stored locally. No cloud dependencies, no telemetry, no data leaves your machine.

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

ok  	concordrouter/server/internal/api	        3.290s
ok  	concordrouter/server/internal/crypto	    4.049s
ok  	concordrouter/server/internal/merge	     1.375s
ok  	concordrouter/server/internal/orchestrator  2.489s
ok  	concordrouter/server/internal/providers/anthropic	0.785s
ok  	concordrouter/server/internal/providers/gemini	2.592s
ok  	concordrouter/server/internal/providers/mock	0.312s
ok  	concordrouter/server/internal/providers/ollama	4.594s
ok  	concordrouter/server/internal/providers/openai	5.254s
ok  	concordrouter/server/internal/providers/openrouter	5.152s
ok  	concordrouter/server/internal/store	       5.249s
```

---

## 📡 API Endpoints

| Method | Endpoint | Description |
|---|---|---|
| `GET` | `/api/v1/health` | Health check with server timestamp |
| `GET` | `/api/v1/providers` | List all providers, connectivity statuses, and available models |
| `POST` | `/api/v1/providers/keys` | Save & validate encrypted provider API key (AES-256-GCM) |
| `DELETE`| `/api/v1/providers/keys/{providerId}` | Disconnect provider key |
| `GET` | `/api/v1/threads` | List all saved arena threads |
| `POST` | `/api/v1/threads` | Create a new arena thread |
| `GET` | `/api/v1/threads/{id}` | Get thread details with turns and merges |
| `DELETE`| `/api/v1/threads/{id}` | Delete a thread |
| `GET` | `/api/v1/threads/search?q={query}` | Full-text search across all threads |
| `GET` | `/api/v1/threads/{id}/export` | Export session in Markdown or JSON format |
| `POST` | `/api/v1/threads/{id}/turns` | **SSE Stream**: Concurrent fan-out to selected models |
| `POST` | `/api/v1/threads/{id}/retry` | **SSE Stream**: Single-pane isolated retry |
| `POST` | `/api/v1/segment` | Segment text into paragraphs/sentences for merge |
| `POST` | `/api/v1/merge/gate` | Evaluate gating heuristics (length + similarity threshold) |
| `POST` | `/api/v1/merge/align` | Compute Needleman-Wunsch alignment & similarity matrix |
| `POST` | `/api/v1/merge/synthesize` | **SSE Stream**: AI consensus reconciliation synthesis |
| `POST` | `/api/v1/merge/humanize` | Statistical AI-detectability reduction & burstiness injection |
| `POST` | `/api/v1/threads/{id}/merge` | Save a merge record |
| `GET` | `/api/v1/threads/{id}/merges` | List merge history for a thread |

---

## 📁 Project Structure

```
concordrouter/
├── client/                              # Next.js 14 frontend
│   ├── src/
│   │   ├── app/
│   │   │   ├── page.tsx                 # Main arena (state, streaming, layout)
│   │   │   ├── globals.css              # Design system tokens (dual theme)
│   │   │   └── layout.tsx               # Root layout & metadata
│   │   ├── components/
│   │   │   ├── ArenaPanes.tsx           # Arena grid, response cards, streaming UI
│   │   │   ├── MarkdownRenderer.tsx     # GFM markdown with code & tables
│   │   │   ├── Sidebar.tsx              # Session history with search
│   │   │   ├── Navbar.tsx               # Universal navigation
│   │   │   ├── MergeWorkbench.tsx       # 3-tab merge workbench
│   │   │   ├── SimilarityHeatmap.tsx    # M×N cosine similarity matrix
│   │   │   ├── AlignmentDiffView.tsx    # Semantic paragraph diff
│   │   │   ├── ProviderSettingsModal.tsx# BYOA credential management
│   │   │   ├── ModelSelectorModal.tsx   # Multi-model selector
│   │   │   ├── ExportModal.tsx          # Markdown/JSON export
│   │   │   ├── MergeHistoryModal.tsx    # Merge history browser
│   │   │   ├── PromptTemplatesModal.tsx # Prompt template library
│   │   │   └── views/                   # Info pages (Features, FAQ, etc.)
│   │   └── lib/
│   │       ├── api.ts                   # API client + SSE stream parsing
│   │       └── types.ts                 # TypeScript type definitions
│   ├── next.config.mjs                  # Proxy /api/v1 → localhost:8080
│   └── package.json
├── server/                              # Go backend
│   ├── cmd/server/main.go              # Server bootstrap
│   └── internal/
│       ├── api/routes.go               # Chi v5 routes + HTTP handlers
│       ├── crypto/                     # AES-256-GCM encryption
│       ├── domain/                     # Domain models
│       ├── humanize/                   # Statistical AI-detectability reduction engine
│       │   ├── burstiness.go           # Sentence variance calculation & transforms
│       │   ├── lexical.go              # AI-tell blocklist + POS-gated replacement
│       │   ├── ngram_lm.go             # Markov n-gram perplexity & repetition smoothing
│       │   ├── readability.go          # Flesch-Kincaid & Gunning-Fog metrics
│       │   ├── syntax.go               # Clause restructuring & sidecar hook
│       │   ├── grammar_check.go        # Rule-based validation & repair
│       │   └── pipeline.go             # Pipeline orchestrator
│       ├── merge/                      # Needleman-Wunsch alignment & diffing
│       ├── orchestrator/               # Fan-out streaming orchestrator
│       ├── providers/                   # Provider adapters
│       │   ├── provider.go              # Interface + registry
│       │   ├── anthropic/               # Claude adapter
│       │   ├── openai/                  # GPT adapter
│       │   ├── gemini/                  # Gemini adapter
│       │   ├── ollama/                  # Local models adapter
│       │   ├── openrouter/              # OpenRouter meta-provider
│       │   └── mock/                    # Built-in mock streaming
│       └── store/                       # SQLite persistence layer
├── Makefile                             # dev, test, build commands
├── concordrouter.db                     # SQLite database (auto-created)
├── docker-compose.yml                   # Optional containerized deployment
├── CLAUDE.md                            # AI assistant guidance
├── CONTRIBUTING.md                      # Contribution guidelines
├── SECURITY.md                          # Security policy
└── LICENSE                              # MIT License
```

---

## 🤝 Contributing

See [CONTRIBUTING.md](CONTRIBUTING.md) for development guidelines.

## 🔐 Security

See [SECURITY.md](SECURITY.md) for our security policy and responsible disclosure process.

## 📄 License

This project is licensed under the [MIT License](LICENSE).
