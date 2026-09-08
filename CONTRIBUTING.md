# Contributing to ConcordRouter

Thank you for your interest in contributing to ConcordRouter! We welcome contributions from the community to improve multi-model consensus, sequence alignment algorithms, provider adapters, and developer ergonomics.

---

## 🛠️ Development Setup

### Prerequisites
- **Go 1.22+**
- **Node.js 20+** & `npm`
- (Optional) **Ollama** running on `localhost:11434` for local offline testing

### Running the App Locally

1. Clone the repository:
   ```bash
   git clone https://github.com/your-username/concordrouter.git
   cd concordrouter
   ```

2. Start the Go backend and Next.js frontend concurrently:
   ```bash
   make dev
   ```

   - **Frontend UI**: [http://localhost:3000](http://localhost:3000)
   - **Backend API**: [http://localhost:8080](http://localhost:8080)

---

## 🧪 Testing & Verification

Before submitting a pull request, ensure all tests and builds pass:

```bash
# Run both frontend build and backend tests
make test && make build
```

Or run them individually:
```bash
# Backend unit & integration tests
cd server && go test -v -race ./...

# Frontend Next.js production build
cd client && npm run build
```

---

## 📐 Project Structure

```
concordrouter/
├── client/                     # Next.js 14 App Router Frontend
│   ├── src/app/                # App layout & main arena page
│   ├── src/components/         # ArenaPanes, Navbar, Sidebar, Modals, Views
│   └── src/lib/                # API client, TypeScript domain types
├── server/                     # Go 1.22 Backend Service
│   ├── cmd/server/main.go      # Main application entrypoint
│   └── internal/
│       ├── api/                # Chi REST + SSE route handlers
│       ├── crypto/             # AES-256-GCM symmetric encryption
│       ├── domain/             # Domain models & entities
│       ├── merge/              # Needleman-Wunsch diff, similarity, synthesis
│       ├── orchestrator/       # Concurrent fan-out dispatch engine
│       ├── providers/          # Anthropic, OpenAI, Gemini, Ollama, OpenRouter, Mock
│       └── store/              # Pure-Go SQLite WAL persistence
├── Makefile                    # Unified build & developer targets
└── .github/workflows/ci.yml    # Continuous integration pipeline
```

---

## 🤝 Pull Request Guidelines

1. **Create a Feature Branch**:
   ```bash
   git checkout -b feature/my-cool-feature
   ```
2. **Keep Commits Focused & Descriptive**:
   Explain the rationale behind architectural and UX decisions.
3. **Ensure Tests Pass**:
   Add test coverage for new provider adapters or alignment algorithms.
4. **Submit PR**:
   Open a pull request against the `main` branch with a clear description and screenshots/test output.
