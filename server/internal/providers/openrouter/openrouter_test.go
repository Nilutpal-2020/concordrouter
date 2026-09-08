package openrouter

import (
	"context"
	"fmt"
	"net/http"
	"net/http/httptest"
	"testing"
	"time"

	"concordrouter/server/internal/domain"
)

func TestOpenRouterStreamingFixture(t *testing.T) {
	mockSSE := "data: {\"choices\":[{\"delta\":{\"content\":\"Hello from \"}}]}\n\n" +
		"data: {\"choices\":[{\"delta\":{\"content\":\"DeepSeek R1!\"}}]}\n\n" +
		"data: [DONE]\n\n"

	ts := httptest.NewServer(http.HandlerFunc(func(w http.ResponseWriter, r *http.Request) {
		w.Header().Set("Content-Type", "text/event-stream")
		fmt.Fprint(w, mockSSE)
	}))
	defer ts.Close()

	p := NewOpenRouterProvider()
	ctx, cancel := context.WithTimeout(context.Background(), 2*time.Second)
	defer cancel()

	stream, err := p.Stream(ctx, domain.ChatRequest{
		Prompt:  "Hello",
		APIKey:  "test-openrouter-key",
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

	if fullText != "Hello from DeepSeek R1!" {
		t.Fatalf("Expected 'Hello from DeepSeek R1!', got '%s'", fullText)
	}
}
