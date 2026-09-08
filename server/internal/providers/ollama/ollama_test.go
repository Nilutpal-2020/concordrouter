package ollama

import (
	"context"
	"fmt"
	"net/http"
	"net/http/httptest"
	"testing"
	"time"

	"concordrouter/server/internal/domain"
)

func TestOllamaStreamingFixture(t *testing.T) {
	mockNDJSON := "{\"message\":{\"content\":\"Hello from \"},\"done\":false}\n" +
		"{\"message\":{\"content\":\"Llama 3.2!\"},\"done\":true}\n"

	ts := httptest.NewServer(http.HandlerFunc(func(w http.ResponseWriter, r *http.Request) {
		w.Header().Set("Content-Type", "application/x-ndjson")
		fmt.Fprint(w, mockNDJSON)
	}))
	defer ts.Close()

	p := NewOllamaProvider()
	ctx, cancel := context.WithTimeout(context.Background(), 2*time.Second)
	defer cancel()

	stream, err := p.Stream(ctx, domain.ChatRequest{
		Prompt:  "Hello",
		BaseURL: ts.URL,
	})
	if err != nil {
		t.Fatalf("Stream failed: %v", err)
	}

	fullText := ""
	for chunk := range stream {
		if chunk.Delta != "" {
			fullText += chunk.Delta
		}
	}

	if fullText != "Hello from Llama 3.2!" {
		t.Fatalf("Expected 'Hello from Llama 3.2!', got '%s'", fullText)
	}
}
