package orchestrator

import (
	"context"
	"os"
	"testing"
	"time"

	"concordrouter/server/internal/domain"
	"concordrouter/server/internal/providers"
	"concordrouter/server/internal/providers/mock"
	"concordrouter/server/internal/store"
)

func TestOrchestratorFanOut(t *testing.T) {
	dbPath := "test_orchestrator.db"
	defer os.Remove(dbPath)

	st, err := store.NewSQLiteStore(dbPath)
	if err != nil {
		t.Fatalf("Failed to initialize store: %v", err)
	}

	reg := providers.NewRegistry()
	mockP := mock.NewMockProvider()
	reg.Register(mockP)

	orch := NewOrchestrator(reg, st)

	th, err := st.CreateThread("Fan-out test")
	if err != nil {
		t.Fatalf("Failed to create thread: %v", err)
	}

	turn, err := st.CreateTurn(th.ID, "Benchmark fan-out streaming")
	if err != nil {
		t.Fatalf("Failed to create turn: %v", err)
	}

	req := FanOutRequest{
		ThreadID: th.ID,
		TurnID:   turn.ID,
		Prompt:   "Benchmark fan-out streaming",
		TargetModels: []TargetModelSpec{
			{ProviderID: domain.ProviderMock, Model: "mock-concise"},
			{ProviderID: domain.ProviderMock, Model: "mock-creative"},
		},
	}

	ctx, cancel := context.WithTimeout(context.Background(), 5*time.Second)
	defer cancel()

	chunkStream, err := orch.FanOut(ctx, req)
	if err != nil {
		t.Fatalf("FanOut failed: %v", err)
	}

	receivedCounts := make(map[string]int)
	doneCounts := make(map[string]bool)

	for chunk := range chunkStream {
		receivedCounts[chunk.Model]++
		if chunk.Done {
			doneCounts[chunk.Model] = true
		}
	}

	if len(doneCounts) != 2 {
		t.Fatalf("Expected 2 models to complete, got %d", len(doneCounts))
	}
	if !doneCounts["mock-concise"] || !doneCounts["mock-creative"] {
		t.Fatalf("Expected both mock-concise and mock-creative to be done")
	}

	// Verify persistence
	updatedTurn, err := st.GetTurn(turn.ID)
	if err != nil {
		t.Fatalf("Failed to get updated turn: %v", err)
	}
	if len(updatedTurn.Responses) != 2 {
		t.Fatalf("Expected 2 stored model responses, got %d", len(updatedTurn.Responses))
	}
}
