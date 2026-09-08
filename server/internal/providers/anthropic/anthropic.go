package anthropic

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

type AnthropicProvider struct {
	client *http.Client
}

func NewAnthropicProvider() *AnthropicProvider {
	return &AnthropicProvider{
		client: &http.Client{Timeout: 120 * time.Second},
	}
}

func (p *AnthropicProvider) ID() domain.ProviderID {
	return domain.ProviderAnthropic
}

func (p *AnthropicProvider) Name() string {
	return "Anthropic"
}

func (p *AnthropicProvider) AuthMode() domain.AuthMode {
	return domain.AuthModeAPIKey
}

func (p *AnthropicProvider) SupportedModels() []domain.ModelInfo {
	return []domain.ModelInfo{
		{
			ID:          "claude-3-7-sonnet-latest",
			Name:        "Claude 3.7 Sonnet",
			ProviderID:  string(domain.ProviderAnthropic),
			Description: "Anthropic's flagship hybrid reasoning model with state-of-the-art coding and prose.",
			ContextLen:  200000,
			InputPrice:  0.003,
			OutputPrice: 0.015,
		},
		{
			ID:          "claude-3-5-sonnet-latest",
			Name:        "Claude 3.5 Sonnet",
			ProviderID:  string(domain.ProviderAnthropic),
			Description: "High-intelligence workhorse with exceptional coding and analysis speed.",
			ContextLen:  200000,
			InputPrice:  0.003,
			OutputPrice: 0.015,
		},
		{
			ID:          "claude-3-5-haiku-latest",
			Name:        "Claude 3.5 Haiku",
			ProviderID:  string(domain.ProviderAnthropic),
			Description: "Ultra-fast, lightweight model ideal for quick iterations.",
			ContextLen:  200000,
			InputPrice:  0.0008,
			OutputPrice: 0.004,
		},
	}
}

func (p *AnthropicProvider) ValidateKey(ctx context.Context, apiKey string, customURL string) error {
	if apiKey == "" {
		return errors.New("Anthropic API key is required")
	}

	url := "https://api.anthropic.com/v1/messages"
	if customURL != "" {
		url = strings.TrimRight(customURL, "/") + "/v1/messages"
	}

	payload := map[string]interface{}{
		"model":      "claude-3-5-haiku-latest",
		"max_tokens": 1,
		"messages": []map[string]string{
			{"role": "user", "content": "ping"},
		},
	}
	body, _ := json.Marshal(payload)

	req, err := http.NewRequestWithContext(ctx, "POST", url, bytes.NewReader(body))
	if err != nil {
		return err
	}
	req.Header.Set("x-api-key", apiKey)
	req.Header.Set("anthropic-version", "2023-06-01")
	req.Header.Set("content-type", "application/json")

	resp, err := p.client.Do(req)
	if err != nil {
		return fmt.Errorf("network error contacting Anthropic: %w", err)
	}
	defer resp.Body.Close()

	if resp.StatusCode == 401 || resp.StatusCode == 403 {
		return errors.New("invalid Anthropic API key")
	}
	if resp.StatusCode >= 400 && resp.StatusCode != 429 {
		return fmt.Errorf("Anthropic API returned status %d", resp.StatusCode)
	}
	return nil
}

func (p *AnthropicProvider) EstimateCost(req domain.ChatRequest) domain.CostEstimate {
	tokens := len(strings.Fields(req.Prompt)) * 2
	rate := 0.003 / 1000.0
	return domain.CostEstimate{
		EstimatedPromptTokens: tokens,
		EstimatedCostUSD:      float64(tokens) * rate,
	}
}

func (p *AnthropicProvider) Stream(ctx context.Context, req domain.ChatRequest) (<-chan domain.StreamChunk, error) {
	out := make(chan domain.StreamChunk, 20)
	if req.APIKey == "" {
		return nil, errors.New("Anthropic API key is missing. Configure your key in Settings.")
	}

	model := req.Model
	if model == "" {
		model = "claude-3-7-sonnet-latest"
	}

	url := "https://api.anthropic.com/v1/messages"
	if req.BaseURL != "" {
		url = strings.TrimRight(req.BaseURL, "/") + "/v1/messages"
	}

	var messages []map[string]string
	for _, h := range req.History {
		role := h.Role
		if role != "user" && role != "assistant" {
			role = "user"
		}
		messages = append(messages, map[string]string{
			"role":    role,
			"content": h.Content,
		})
	}
	messages = append(messages, map[string]string{
		"role":    "user",
		"content": req.Prompt,
	})

	maxTokens := req.MaxTokens
	if maxTokens == 0 {
		maxTokens = 4096
	}

	payload := map[string]interface{}{
		"model":      model,
		"max_tokens": maxTokens,
		"stream":     true,
		"messages":   messages,
	}
	body, err := json.Marshal(payload)
	if err != nil {
		return nil, err
	}

	httpReq, err := http.NewRequestWithContext(ctx, "POST", url, bytes.NewReader(body))
	if err != nil {
		return nil, err
	}
	httpReq.Header.Set("x-api-key", req.APIKey)
	httpReq.Header.Set("anthropic-version", "2023-06-01")
	httpReq.Header.Set("content-type", "application/json")

	go func() {
		defer close(out)

		resp, err := p.client.Do(httpReq)
		if err != nil {
			out <- domain.StreamChunk{
				ProviderID: string(p.ID()),
				Model:      model,
				Error:      fmt.Sprintf("Failed to connect to Anthropic: %v", err),
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
				Error:      fmt.Sprintf("Anthropic error (HTTP %d): %s", resp.StatusCode, errBody.String()),
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
				var event struct {
					Type  string `json:"type"`
					Delta struct {
						Type string `json:"type"`
						Text string `json:"text"`
					} `json:"delta"`
					Error struct {
						Message string `json:"message"`
					} `json:"error"`
				}
				if err := json.Unmarshal([]byte(data), &event); err == nil {
					if event.Error.Message != "" {
						out <- domain.StreamChunk{
							ProviderID: string(p.ID()),
							Model:      model,
							Error:      event.Error.Message,
							Done:       true,
							Timestamp:  time.Now(),
						}
						return
					}
					if event.Type == "content_block_delta" && event.Delta.Text != "" {
						fullText += event.Delta.Text
						tokens++
						out <- domain.StreamChunk{
							ProviderID: string(p.ID()),
							Model:      model,
							Delta:      event.Delta.Text,
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
