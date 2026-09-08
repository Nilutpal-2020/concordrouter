package openrouter

import (
	"bufio"
	"bytes"
	"context"
	"encoding/json"
	"errors"
	"fmt"
	"net/http"
	"strings"
	"time"

	"concordrouter/server/internal/domain"
)

type OpenRouterProvider struct {
	client *http.Client
}

func NewOpenRouterProvider() *OpenRouterProvider {
	return &OpenRouterProvider{
		client: &http.Client{Timeout: 120 * time.Second},
	}
}

func (p *OpenRouterProvider) ID() domain.ProviderID {
	return domain.ProviderOpenRouter
}

func (p *OpenRouterProvider) Name() string {
	return "OpenRouter"
}

func (p *OpenRouterProvider) AuthMode() domain.AuthMode {
	return domain.AuthModeAPIKey
}

func (p *OpenRouterProvider) SupportedModels() []domain.ModelInfo {
	return []domain.ModelInfo{
		{
			ID:          "deepseek/deepseek-r1",
			Name:        "DeepSeek R1 (OpenRouter)",
			ProviderID:  string(domain.ProviderOpenRouter),
			Description: "Hosted DeepSeek R1 reasoning model.",
			ContextLen:  64000,
			InputPrice:  0.00055,
			OutputPrice: 0.00219,
		},
		{
			ID:          "meta-llama/llama-3.3-70b-instruct",
			Name:        "Llama 3.3 70B (OpenRouter)",
			ProviderID:  string(domain.ProviderOpenRouter),
			Description: "Meta's flagship 70B open model hosted on OpenRouter.",
			ContextLen:  128000,
			InputPrice:  0.00013,
			OutputPrice: 0.0004,
		},
		{
			ID:          "anthropic/claude-3.7-sonnet",
			Name:        "Claude 3.7 Sonnet (OpenRouter)",
			ProviderID:  string(domain.ProviderOpenRouter),
			Description: "Claude 3.7 Sonnet via unified OpenRouter gateway.",
			ContextLen:  200000,
			InputPrice:  0.003,
			OutputPrice: 0.015,
		},
	}
}

func (p *OpenRouterProvider) ValidateKey(ctx context.Context, apiKey string, customURL string) error {
	if apiKey == "" {
		return errors.New("OpenRouter API key is required")
	}

	url := "https://openrouter.ai/api/v1/auth/key"
	if customURL != "" {
		url = strings.TrimRight(customURL, "/") + "/auth/key"
	}

	req, err := http.NewRequestWithContext(ctx, "GET", url, nil)
	if err != nil {
		return err
	}
	req.Header.Set("Authorization", "Bearer "+apiKey)

	resp, err := p.client.Do(req)
	if err != nil {
		return fmt.Errorf("network error contacting OpenRouter: %w", err)
	}
	defer resp.Body.Close()

	if resp.StatusCode == 401 {
		return errors.New("invalid OpenRouter API key")
	}
	if resp.StatusCode >= 400 && resp.StatusCode != 429 {
		return fmt.Errorf("OpenRouter API returned status %d", resp.StatusCode)
	}
	return nil
}

func (p *OpenRouterProvider) EstimateCost(req domain.ChatRequest) domain.CostEstimate {
	tokens := len(strings.Fields(req.Prompt)) * 2
	rate := 0.001 / 1000.0
	return domain.CostEstimate{
		EstimatedPromptTokens: tokens,
		EstimatedCostUSD:      float64(tokens) * rate,
	}
}

func (p *OpenRouterProvider) Stream(ctx context.Context, req domain.ChatRequest) (<-chan domain.StreamChunk, error) {
	out := make(chan domain.StreamChunk, 20)
	if req.APIKey == "" {
		return nil, errors.New("OpenRouter API key is missing. Configure your key in Settings.")
	}

	model := req.Model
	if model == "" {
		model = "deepseek/deepseek-r1"
	}

	url := "https://openrouter.ai/api/v1/chat/completions"
	if req.BaseURL != "" {
		url = strings.TrimRight(req.BaseURL, "/") + "/chat/completions"
	}

	var messages []map[string]string
	for _, h := range req.History {
		messages = append(messages, map[string]string{
			"role":    h.Role,
			"content": h.Content,
		})
	}
	messages = append(messages, map[string]string{
		"role":    "user",
		"content": req.Prompt,
	})

	payload := map[string]interface{}{
		"model":    model,
		"stream":   true,
		"messages": messages,
	}
	body, err := json.Marshal(payload)
	if err != nil {
		return nil, err
	}

	httpReq, err := http.NewRequestWithContext(ctx, "POST", url, bytes.NewReader(body))
	if err != nil {
		return nil, err
	}
	httpReq.Header.Set("Authorization", "Bearer "+req.APIKey)
	httpReq.Header.Set("Content-Type", "application/json")
	httpReq.Header.Set("HTTP-Referer", "https://github.com/concordrouter")
	httpReq.Header.Set("X-Title", "ConcordRouter")

	go func() {
		defer close(out)

		resp, err := p.client.Do(httpReq)
		if err != nil {
			out <- domain.StreamChunk{
				ProviderID: string(p.ID()),
				Model:      model,
				Error:      fmt.Sprintf("Failed to connect to OpenRouter: %v", err),
				Done:       true,
				Timestamp:  time.Now(),
			}
			return
		}
		defer resp.Body.Close()

		if resp.StatusCode != http.StatusOK {
			var errBody bytes.Buffer
			_, _ = errBody.ReadFrom(resp.Body)
			out <- domain.StreamChunk{
				ProviderID: string(p.ID()),
				Model:      model,
				Error:      fmt.Sprintf("OpenRouter error (HTTP %d): %s", resp.StatusCode, errBody.String()),
				Done:       true,
				Timestamp:  time.Now(),
			}
			return
		}

		scanner := bufio.NewScanner(resp.Body)
		fullText := ""
		tokens := 0

		for scanner.Scan() {
			line := scanner.Text()
			if strings.HasPrefix(line, "data: ") {
				data := strings.TrimPrefix(line, "data: ")
				if data == "[DONE]" {
					break
				}
				var chunk struct {
					Choices []struct {
						Delta struct {
							Content string `json:"content"`
						} `json:"delta"`
					} `json:"choices"`
					Error *struct {
						Message string `json:"message"`
					} `json:"error"`
				}
				if err := json.Unmarshal([]byte(data), &chunk); err == nil {
					if chunk.Error != nil && chunk.Error.Message != "" {
						out <- domain.StreamChunk{
							ProviderID: string(p.ID()),
							Model:      model,
							Error:      chunk.Error.Message,
							Done:       true,
							Timestamp:  time.Now(),
						}
						return
					}
					if len(chunk.Choices) > 0 && chunk.Choices[0].Delta.Content != "" {
						delta := chunk.Choices[0].Delta.Content
						fullText += delta
						tokens++
						out <- domain.StreamChunk{
							ProviderID: string(p.ID()),
							Model:      model,
							Delta:      delta,
							FullText:   fullText,
							Tokens:     tokens,
							Done:       false,
							Timestamp:  time.Now(),
						}
					}
				}
			}
		}

		out <- domain.StreamChunk{
			ProviderID: string(p.ID()),
			Model:      model,
			FullText:   fullText,
			Tokens:     tokens,
			Done:       true,
			Timestamp:  time.Now(),
		}
	}()

	return out, nil
}
