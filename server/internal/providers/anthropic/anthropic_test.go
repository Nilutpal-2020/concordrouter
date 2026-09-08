package anthropic

import (
	"context"
	"fmt"
	"net/http"
	"net/http/httptest"
	"testing"
	"time"

	"concordrouter/server/internal/domain"
)

func TestAnthropicStreamingFixture(t *testing.T) {
	// Recorded cassette fixture SSE stream
	mockSSE := "data: {\"type\":\"content_block_delta\",\"delta\":{\"type\":\"text_delta\",\"text\":\"Hello from \"}}\n\n" +
		"data: {\"type\":\"content_block_delta\",\"delta\":{\"type\":\"text_delta\",\"text\":\"Claude 3.7!\"}}\n\n" +
		"data: [DONE]\n\n"

	ts := httptest.NewServer(http.HandlerFunc(func(w http.ResponseWriter, r *http.Request) {
		w.Header().Set("Content-Type", "text/event-stream")
		fmt.Fprint(w, mockSSE)
	}))
	defer ts.Close()

	p := NewAnthropicProvider()
	ctx, cancel := context.WithTimeout(context.Background(), 2*time.Second)
	defer cancel()

	stream, err := p.Stream(ctx, domain.ChatRequest{
		Prompt:  "Hello",
		APIKey:  "test-anthropic-key",
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

	if fullText != "Hello from Claude 3.7!" {
		t.Fatalf("Expected 'Hello from Claude 3.7!', got '%s'", fullText)
	}
}
