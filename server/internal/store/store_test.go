package store

import (
	"os"
	"testing"
	"time"

	"concordrouter/server/internal/domain"
)

func TestSQLiteStore(t *testing.T) {
	dbPath := "test_concord.db"
	defer os.Remove(dbPath)

	st, err := NewSQLiteStore(dbPath)
	if err != nil {
		t.Fatalf("Failed to create store: %v", err)
	}

	// 1. Test Provider Key Save & Retrieval
	err = st.SaveProviderKey("openai", "enc_openai_key_123", "")
	if err != nil {
		t.Fatalf("Failed to save provider key: %v", err)
	}

	encKey, customURL, err := st.GetProviderKey("openai")
	if err != nil || encKey != "enc_openai_key_123" || customURL != "" {
		t.Fatalf("Unexpected provider key: got key=%s, url=%s, err=%v", encKey, customURL, err)
	}

	// 2. Test Thread creation
	th, err := st.CreateThread("Test Comparison Thread")
	if err != nil {
		t.Fatalf("Failed to create thread: %v", err)
	}
	if th.ID == "" || th.Title != "Test Comparison Thread" {
		t.Fatalf("Unexpected thread: %+v", th)
	}

	// 3. Test Turn creation
	turn, err := st.CreateTurn(th.ID, "Explain goroutines")
	if err != nil {
		t.Fatalf("Failed to create turn: %v", err)
	}
	if turn.ID == "" || turn.UserPrompt != "Explain goroutines" {
		t.Fatalf("Unexpected turn: %+v", turn)
	}

	// 4. Test Model Response saving
	resp := domain.ModelResponse{
		ID:         "resp_1",
		TurnID:     turn.ID,
		ProviderID: "mock",
		Model:      "mock-concise",
		Content:    "Goroutines are lightweight threads managed by Go runtime.",
		Status:     "completed",
		LatencyMs:  120,
		Tokens:     15,
		CreatedAt:  time.Now(),
	}
	err = st.SaveModelResponse(resp)
	if err != nil {
		t.Fatalf("Failed to save model response: %v", err)
	}

	// 5. Test Fetch Turn with responses
	fetchedTurn, err := st.GetTurn(turn.ID)
	if err != nil {
		t.Fatalf("Failed to get turn: %v", err)
	}
	if len(fetchedTurn.Responses) != 1 {
		t.Fatalf("Expected 1 response in turn, got %d", len(fetchedTurn.Responses))
	}

	// 6. Test Merge record saving
	mergeRec := domain.MergeRecord{
		ID:           "merge_1",
		ThreadID:     th.ID,
		TurnID:       turn.ID,
		SourceModels: []string{"mock:mock-concise", "mock:mock-verbose"},
		MergedText:   "Reconciled explanation of goroutines.",
		Strategy:     "manual_cherrypick",
		CreatedAt:    time.Now(),
	}
	err = st.SaveMerge(mergeRec)
	if err != nil {
		t.Fatalf("Failed to save merge: %v", err)
	}

	merges, err := st.ListMerges(th.ID)
	if err != nil || len(merges) != 1 {
		t.Fatalf("Failed to list merges: %v, count %d", err, len(merges))
	}
}
