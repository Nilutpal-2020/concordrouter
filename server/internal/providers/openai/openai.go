package openai

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

type OpenAIProvider struct {
	client *http.Client
}

func NewOpenAIProvider() *OpenAIProvider {
	return &OpenAIProvider{
		client: &http.Client{Timeout: 120 * time.Second},
	}
}

func (p *OpenAIProvider) ID() domain.ProviderID {
	return domain.ProviderOpenAI
}

func (p *OpenAIProvider) Name() string {
	return "OpenAI"
}

func (p *OpenAIProvider) AuthMode() domain.AuthMode {
	return domain.AuthModeAPIKey
}

func (p *OpenAIProvider) SupportedModels() []domain.ModelInfo {
	return []domain.ModelInfo{
		{
			ID:          "gpt-4o",
			Name:        "GPT-4o",
			ProviderID:  string(domain.ProviderOpenAI),
			Description: "OpenAI's high-intelligence, multimodal flagship model.",
			ContextLen:  128000,
			InputPrice:  0.0025,
			OutputPrice: 0.010,
		},
		{
			ID:          "gpt-4o-mini",
			Name:        "GPT-4o Mini",
			ProviderID:  string(domain.ProviderOpenAI),
			Description: "Fast, cost-efficient model for focused queries.",
			ContextLen:  128000,
			InputPrice:  0.00015,
			OutputPrice: 0.0006,
		},
		{
			ID:          "o3-mini",
			Name:        "o3-mini",
			ProviderID:  string(domain.ProviderOpenAI),
			Description: "Advanced reasoning model tailored for math, logic, and coding tasks.",
			ContextLen:  200000,
			InputPrice:  0.0011,
			OutputPrice: 0.0044,
		},
	}
}

func (p *OpenAIProvider) ValidateKey(ctx context.Context, apiKey string, customURL string) error {
	if apiKey == "" {
		return errors.New("OpenAI API key is required")
	}

	url := "https://api.openai.com/v1/models"
	if customURL != "" {
		url = strings.TrimRight(customURL, "/") + "/models"
	}

	req, err := http.NewRequestWithContext(ctx, "GET", url, nil)
	if err != nil {
		return err
	}
	req.Header.Set("Authorization", "Bearer "+apiKey)

	resp, err := p.client.Do(req)
	if err != nil {
		return fmt.Errorf("network error contacting OpenAI: %w", err)
	}
	defer resp.Body.Close()

	if resp.StatusCode == 401 {
		return errors.New("invalid OpenAI API key")
	}
	if resp.StatusCode >= 400 && resp.StatusCode != 429 {
		return fmt.Errorf("OpenAI API returned status %d", resp.StatusCode)
	}
	return nil
}

func (p *OpenAIProvider) EstimateCost(req domain.ChatRequest) domain.CostEstimate {
	tokens := len(strings.Fields(req.Prompt)) * 2
	rate := 0.0025 / 1000.0
	return domain.CostEstimate{
		EstimatedPromptTokens: tokens,
		EstimatedCostUSD:      float64(tokens) * rate,
	}
}

func (p *OpenAIProvider) Stream(ctx context.Context, req domain.ChatRequest) (<-chan domain.StreamChunk, error) {
	out := make(chan domain.StreamChunk, 20)
	if req.APIKey == "" {
		return nil, errors.New("OpenAI API key is missing. Configure your key in Settings.")
	}

	model := req.Model
	if model == "" {
		model = "gpt-4o"
	}

	url := "https://api.openai.com/v1/chat/completions"
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

	go func() {
		defer close(out)

		resp, err := p.client.Do(httpReq)
		if err != nil {
			out <- domain.StreamChunk{
				ProviderID: string(p.ID()),
				Model:      model,
				Error:      fmt.Sprintf("Failed to connect to OpenAI: %v", err),
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
				Error:      fmt.Sprintf("OpenAI error (HTTP %d): %s", resp.StatusCode, errBody.String()),
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
