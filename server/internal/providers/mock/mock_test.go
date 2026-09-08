package mock

import (
	"context"
	"strings"
	"testing"
	"time"

	"concordrouter/server/internal/domain"
)

func TestMockWordByWordStreaming(t *testing.T) {
	p := NewMockProvider()
	ctx, cancel := context.WithTimeout(context.Background(), 5*time.Second)
	defer cancel()

	stream, err := p.Stream(ctx, domain.ChatRequest{
		Model:  "mock-concise",
		Prompt: "Testing streaming output",
	})
	if err != nil {
		t.Fatalf("Failed to start mock stream: %v", err)
	}

	chunkCount := 0
	fullText := ""
	lastTokens := 0

	for chunk := range stream {
		chunkCount++
		if chunk.Delta != "" {
			fullText += chunk.Delta
		}
		if chunk.Tokens > 0 {
			lastTokens = chunk.Tokens
		}
	}

	if chunkCount < 20 {
		t.Errorf("Expected at least 20 progressive word tokens, got %d", chunkCount)
	}
	if lastTokens == 0 {
		t.Errorf("Expected positive token count, got %d", lastTokens)
	}
	if !strings.Contains(fullText, "Testing streaming output") {
		t.Errorf("Expected fullText to contain prompt, got: %s", fullText)
	}
}

func TestSplitIntoStreamTokens(t *testing.T) {
	input := "Here is a test with\nmultiple lines and `code` blocks."
	tokens := splitIntoStreamTokens(input)
	reconstructed := strings.Join(tokens, "")
	if reconstructed != input {
		t.Errorf("Token reconstruction mismatch.\nExpected: %q\nGot:      %q", input, reconstructed)
	}
}
