package mock

import (
	"context"
	"fmt"
	"concordrouter/server/internal/domain"
	"strings"
	"time"
)

type MockProvider struct {
	id domain.ProviderID
}

func NewMockProvider() *MockProvider {
	return &MockProvider{
		id: domain.ProviderMock,
	}
}

func (m *MockProvider) ID() domain.ProviderID {
	return m.id
}

func (m *MockProvider) Name() string {
	return "Simulated / Mock Arena"
}

func (m *MockProvider) AuthMode() domain.AuthMode {
	return domain.AuthModeNone
}

func (m *MockProvider) SupportedModels() []domain.ModelInfo {
	return []domain.ModelInfo{
		{
			ID:          "mock-concise",
			Name:        "Mock Fast (Concise Analytical)",
			ProviderID:  string(domain.ProviderMock),
			Description: "Simulated rapid, structured bullet-point response for benchmarking.",
			ContextLen:  128000,
			InputPrice:  0,
			OutputPrice: 0,
		},
		{
			ID:          "mock-verbose",
			Name:        "Mock Deep (Explanatory Prose)",
			ProviderID:  string(domain.ProviderMock),
			Description: "Simulated detailed multi-paragraph response with code snippets.",
			ContextLen:  128000,
			InputPrice:  0,
			OutputPrice: 0,
		},
		{
			ID:          "mock-creative",
			Name:        "Mock Creative (Alternative Perspective)",
			ProviderID:  string(domain.ProviderMock),
			Description: "Simulated divergent creative response ideal for cherry-pick merging.",
			ContextLen:  128000,
			InputPrice:  0,
			OutputPrice: 0,
		},
	}
}

func (m *MockProvider) ValidateKey(ctx context.Context, apiKey string, customURL string) error {
	return nil // Mock is always valid
}

func (m *MockProvider) EstimateCost(req domain.ChatRequest) domain.CostEstimate {
	tokens := len(strings.Fields(req.Prompt)) * 2
	return domain.CostEstimate{
		EstimatedPromptTokens: tokens,
		EstimatedCostUSD:      0.0,
	}
}

func (m *MockProvider) Stream(ctx context.Context, req domain.ChatRequest) (<-chan domain.StreamChunk, error) {
	out := make(chan domain.StreamChunk, 100)

	prompt := strings.TrimSpace(req.Prompt)
	if prompt == "" {
		prompt = "the submitted query"
	}

	var fullMarkdown string
	delay := 28 * time.Millisecond

	switch req.Model {
	case "mock-concise":
		delay = 24 * time.Millisecond
		fullMarkdown = fmt.Sprintf(
			"Here is a concise, high-signal breakdown for **%s**:\n\n"+
				"- **Core Architecture**: Decoupled asynchronous pipelines prevent downstream bottlenecks.\n"+
				"- **Throughput & Concurrency**: Goroutines fan out concurrent requests across isolated model contexts.\n"+
				"- **Fault Tolerance**: Per-pane circuit breaking and graceful fallback if a provider stalls.\n\n"+
				"| Metric | Target | Status |\n"+
				"| :--- | :--- | :--- |\n"+
				"| Latency | < 500ms | Optimal |\n"+
				"| Streaming | Real-time SSE | Active |\n"+
				"| Accuracy | Cross-validated | Verified |\n\n"+
				"**Summary Recommendation**: Cherry-pick structural clarity from this model during the merge stage.",
			prompt,
		)
	case "mock-creative":
		delay = 32 * time.Millisecond
		fullMarkdown = fmt.Sprintf(
			"Let's explore **%s** from a first-principles, divergent perspective.\n\n"+
				"Every foundation model possesses a distinct cognitive bias. While one model leans into rigorous formality, "+
				"another discovers elegant lateral abstractions and illuminating analogies.\n\n"+
				"### Conceptual Angles\n"+
				"1. **Semantic Alignment**: Mapping shared invariants before resolving peripheral disagreements.\n"+
				"2. **Creative Synthesis**: Combining distinct strengths into a cohesive unified thesis.\n"+
				"3. **Human Oversight**: The cherry-pick workbench gives you the final editorial authority.\n\n"+
				"> *\"Consensus is not the elimination of difference, but the synthesis of divergent truths.\"*",
			prompt,
		)
	default: // mock-verbose
		delay = 26 * time.Millisecond
		fullMarkdown = fmt.Sprintf(
			"### Comprehensive Technical Analysis: %s\n\n"+
				"Multi-model orchestration unlocks resilience, eliminates vendor lock-in, and mitigates single-model hallucination blindspots. "+
				"By fanning out prompts concurrently across heterogeneous engines, we expose the underlying consensus as well as subtle divergences.\n\n"+
				"```go\n"+
				"// Orchestrator concurrent stream dispatcher\n"+
				"func (o *Orchestrator) DispatchStream(ctx context.Context, req ChatRequest) <-chan StreamChunk {\n"+
				"    out := make(chan StreamChunk, 50)\n"+
				"    go func() {\n"+
				"        defer close(out)\n"+
				"        for chunk := range provider.Stream(ctx, req) {\n"+
				"            out <- chunk // Real-time token delivery\n"+
				"        }\n"+
				"    }()\n"+
				"    return out\n"+
				"}\n"+
				"```\n\n"+
				"#### Architectural Advantages of BYOA:\n"+
				"- **Zero Proxy Markups**: Connect directly to official model APIs with zero platform overhead.\n"+
				"- **Confidential Vault**: Keys encrypted locally with symmetric AES-256-GCM at rest.\n"+
				"- **Full Model Capability**: Unrestricted access to context lengths and native tool use.",
			prompt,
		)
	}

	tokens := splitIntoStreamTokens(fullMarkdown)

	go func() {
		defer close(out)
		fullText := ""
		tokenCount := 0

		for _, tok := range tokens {
			select {
			case <-ctx.Done():
				out <- domain.StreamChunk{
					ProviderID: string(m.id),
					Model:      req.Model,
					Error:      "Stream cancelled by user",
					Done:       true,
					Timestamp:  time.Now(),
				}
				return
			case <-time.After(delay):
				fullText += tok
				tokenCount++
				out <- domain.StreamChunk{
					ProviderID: string(m.id),
					Model:      req.Model,
					Delta:      tok,
					FullText:   fullText,
					Tokens:     tokenCount,
					Done:       false,
					Timestamp:  time.Now(),
				}
			}
		}

		// Final completion chunk
		out <- domain.StreamChunk{
			ProviderID: string(m.id),
			Model:      req.Model,
			FullText:   fullText,
			Tokens:     tokenCount,
			Done:       true,
			Timestamp:  time.Now(),
		}
	}()

	return out, nil
}

// splitIntoStreamTokens breaks markdown text into word/whitespace tokens for realistic streaming
func splitIntoStreamTokens(text string) []string {
	var tokens []string
	var current strings.Builder

	runes := []rune(text)
	for i := 0; i < len(runes); i++ {
		r := runes[i]
		current.WriteRune(r)
		if r == ' ' || r == '\n' || r == '\t' {
			tokens = append(tokens, current.String())
			current.Reset()
		} else if i+1 < len(runes) && (runes[i+1] == '\n' || runes[i+1] == ' ' || runes[i+1] == '`') {
			tokens = append(tokens, current.String())
			current.Reset()
		}
	}
	if current.Len() > 0 {
		tokens = append(tokens, current.String())
	}
	return tokens
}
