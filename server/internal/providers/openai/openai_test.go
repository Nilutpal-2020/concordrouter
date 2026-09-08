package openai

import (
	"context"
	"fmt"
	"net/http"
	"net/http/httptest"
	"testing"
	"time"

	"concordrouter/server/internal/domain"
)

func TestOpenAIStreamingFixture(t *testing.T) {
	mockSSE := "data: {\"choices\":[{\"delta\":{\"content\":\"Hello from \"}}]}\n\n" +
		"data: {\"choices\":[{\"delta\":{\"content\":\"GPT-4o!\"}}]}\n\n" +
		"data: [DONE]\n\n"

	ts := httptest.NewServer(http.HandlerFunc(func(w http.ResponseWriter, r *http.Request) {
		w.Header().Set("Content-Type", "text/event-stream")
		fmt.Fprint(w, mockSSE)
	}))
	defer ts.Close()

	p := NewOpenAIProvider()
	ctx, cancel := context.WithTimeout(context.Background(), 2*time.Second)
	defer cancel()

	stream, err := p.Stream(ctx, domain.ChatRequest{
		Prompt:  "Hello",
		APIKey:  "test-openai-key",
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

	if fullText != "Hello from GPT-4o!" {
		t.Fatalf("Expected 'Hello from GPT-4o!', got '%s'", fullText)
	}
}
