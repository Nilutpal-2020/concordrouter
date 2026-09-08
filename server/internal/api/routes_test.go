package api

import (
	"encoding/json"
	"net/http"
	"net/http/httptest"
	"os"
	"strings"
	"testing"

	"concordrouter/server/internal/domain"
	"concordrouter/server/internal/orchestrator"
	"concordrouter/server/internal/providers"
	"concordrouter/server/internal/providers/mock"
	"concordrouter/server/internal/store"
)

func TestAPISearchAndExport(t *testing.T) {
	dbPath := "test_api.db"
	defer os.Remove(dbPath)

	st, err := store.NewSQLiteStore(dbPath)
	if err != nil {
		t.Fatalf("Failed to initialize store: %v", err)
	}

	reg := providers.NewRegistry()
	reg.Register(mock.NewMockProvider())

	orch := orchestrator.NewOrchestrator(reg, st)
	srv := NewServer(reg, st, orch)

	// Create test thread & turn
	th, _ := st.CreateThread("Golang Concurrency Patterns")
	turn, _ := st.CreateTurn(th.ID, "Explain select statement with channels")
	_ = st.SaveModelResponse(domain.ModelResponse{
		ID:         "resp_1",
		TurnID:     turn.ID,
		ProviderID: "mock",
		Model:      "mock-concise",
		Content:    "The select statement in Go lets a goroutine wait on multiple channel operations.",
		Status:     "completed",
	})

	// 1. Test Search Endpoint
	reqSearch := httptest.NewRequest("GET", "/api/v1/threads/search?q=Concurrency", nil)
	rrSearch := httptest.NewRecorder()
	srv.Router().ServeHTTP(rrSearch, reqSearch)

	if rrSearch.Code != http.StatusOK {
		t.Fatalf("Search failed with status %d", rrSearch.Code)
	}

	var searchResp struct {
		Threads []domain.Thread `json:"threads"`
	}
	_ = json.NewDecoder(rrSearch.Body).Decode(&searchResp)
	if len(searchResp.Threads) == 0 {
		t.Fatalf("Expected search results, got 0")
	}

	// 2. Test Markdown Export Endpoint
	reqExport := httptest.NewRequest("GET", "/api/v1/threads/"+th.ID+"/export?format=markdown", nil)
	rrExport := httptest.NewRecorder()
	srv.Router().ServeHTTP(rrExport, reqExport)

	if rrExport.Code != http.StatusOK {
		t.Fatalf("Export failed with status %d", rrExport.Code)
	}

	bodyStr := rrExport.Body.String()
	if !strings.Contains(bodyStr, "Golang Concurrency Patterns") || !strings.Contains(bodyStr, "select statement") {
		t.Fatalf("Export Markdown missing expected content: %s", bodyStr)
	}
}
