package gemini

import (
	"context"
	"fmt"
	"net/http"
	"net/http/httptest"
	"testing"
	"time"

	"concordrouter/server/internal/domain"
)

func TestGeminiStreamingFixture(t *testing.T) {
	mockSSE := "data: {\"candidates\":[{\"content\":{\"parts\":[{\"text\":\"Hello from \"}]}}]}\n\n" +
		"data: {\"candidates\":[{\"content\":{\"parts\":[{\"text\":\"Gemini Flash!\"}]}}]}\n\n"

	ts := httptest.NewServer(http.HandlerFunc(func(w http.ResponseWriter, r *http.Request) {
		w.Header().Set("Content-Type", "text/event-stream")
		fmt.Fprint(w, mockSSE)
	}))
	defer ts.Close()

	p := NewGeminiProvider()
	ctx, cancel := context.WithTimeout(context.Background(), 2*time.Second)
	defer cancel()

	stream, err := p.Stream(ctx, domain.ChatRequest{
		Prompt:  "Hello",
		APIKey:  "test-gemini-key",
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

	if fullText != "Hello from Gemini Flash!" {
		t.Fatalf("Expected 'Hello from Gemini Flash!', got '%s'", fullText)
	}
}
