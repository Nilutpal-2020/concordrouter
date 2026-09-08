package main

import (
	"fmt"
	"log"
	"net/http"
	"os"

	"concordrouter/server/internal/api"
	"concordrouter/server/internal/orchestrator"
	"concordrouter/server/internal/providers"
	"concordrouter/server/internal/providers/anthropic"
	"concordrouter/server/internal/providers/gemini"
	"concordrouter/server/internal/providers/mock"
	"concordrouter/server/internal/providers/ollama"
	"concordrouter/server/internal/providers/openai"
	"concordrouter/server/internal/providers/openrouter"
	"concordrouter/server/internal/store"
)

func main() {
	port := os.Getenv("PORT")
	if port == "" {
		port = "8080"
	}

	dbPath := os.Getenv("DB_PATH")
	if dbPath == "" {
		dbPath = "concordrouter.db"
	}

	log.Printf("[ConcordRouter] Initializing SQLite store at %s...", dbPath)
	st, err := store.NewSQLiteStore(dbPath)
	if err != nil {
		log.Fatalf("[ConcordRouter] Failed to initialize store: %v", err)
	}

	log.Println("[ConcordRouter] Registering LLM Providers...")
	registry := providers.NewRegistry()
	registry.Register(mock.NewMockProvider())
	registry.Register(anthropic.NewAnthropicProvider())
	registry.Register(openai.NewOpenAIProvider())
	registry.Register(gemini.NewGeminiProvider())
	registry.Register(ollama.NewOllamaProvider())
	registry.Register(openrouter.NewOpenRouterProvider())

	orch := orchestrator.NewOrchestrator(registry, st)
	srv := api.NewServer(registry, st, orch)

	addr := fmt.Sprintf("0.0.0.0:%s", port)
	log.Printf("[ConcordRouter] Server starting on http://localhost:%s", port)
	if err := http.ListenAndServe(addr, srv.Router()); err != nil {
		log.Fatalf("[ConcordRouter] Server failed: %v", err)
	}
}
