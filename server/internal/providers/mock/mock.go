package mock

import (
	"context"
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
	out := make(chan domain.StreamChunk, 20)

	var chunks []string
	delay := 60 * time.Millisecond

	switch req.Model {
	case "mock-concise":
		delay = 35 * time.Millisecond
		chunks = []string{
			"Here is a concise breakdown for **", req.Prompt, "**:\n\n",
			"- **Key Point 1**: Streamlined architectural separation ensures zero blocking.\n",
			"- **Key Point 2**: Goroutines distribute requests across providers concurrently.\n",
			"- **Key Point 3**: Each pane renders independent SSE chunks in real-time.\n\n",
			"**Summary Recommendation**: Pick the strongest attributes from each model during the merge phase.",
		}
	case "mock-creative":
		delay = 55 * time.Millisecond
		chunks = []string{
			"Let's look at **", req.Prompt, "** from a first-principles perspective.\n\n",
			"Every LLM exhibits unique stylistic quirks. Model A might prioritize structural correctness, ",
			"while Model B delivers vivid analogies and novel perspectives.\n\n",
			"### Proposed Synthesis\n",
			"1. Align paragraphs by core assertion.\n",
			"2. Cherry-pick the best formulation of each argument.\n",
			"3. Reconcile contradictions with direct user oversight.",
		}
	default: // mock-verbose
		delay = 50 * time.Millisecond
		chunks = []string{
			"### Comprehensive Analysis: ", req.Prompt, "\n\n",
			"Multi-model orchestration unlocks resilience and truth-discovery. By fanning out a single query across disparate foundation models, we expose the underlying consensus as well as subtle divergences in reasoning.\n\n",
			"```go\n",
			"// Orchestrator concurrency pattern\n",
			"go func(p Provider) {\n",
			"    ch, _ := p.Stream(ctx, req)\n",
			"    for chunk := range ch {\n",
			"        sseBroker.Broadcast(chunk)\n",
			"    }\n",
			"}(provider)\n",
			"```\n\n",
			"#### Advantages of BYOA (Bring-Your-Own-Account):\n",
			"- Zero platform quota bottlenecks or marked-up API costs.\n",
			"- Client credentials remain securely encrypted at rest.\n",
			"- Unrestricted access to full model context lengths.",
		}
	}

	go func() {
		defer close(out)
		fullText := ""
		for _, part := range chunks {
			select {
			case <-ctx.Done():
				out <- domain.StreamChunk{
					ProviderID: string(m.id),
					Model:      req.Model,
					Error:      "Stream cancelled by client",
					Done:       true,
					Timestamp:  time.Now(),
				}
				return
			case <-time.After(delay):
				fullText += part
				out <- domain.StreamChunk{
					ProviderID: string(m.id),
					Model:      req.Model,
					Delta:      part,
					FullText:   fullText,
					Tokens:     len(strings.Fields(fullText)),
					Done:       false,
					Timestamp:  time.Now(),
				}
			}
		}

		// Emit final done chunk
		out <- domain.StreamChunk{
			ProviderID: string(m.id),
			Model:      req.Model,
			FullText:   fullText,
			Tokens:     len(strings.Fields(fullText)),
			Done:       true,
			Timestamp:  time.Now(),
		}
	}()

	return out, nil
}
