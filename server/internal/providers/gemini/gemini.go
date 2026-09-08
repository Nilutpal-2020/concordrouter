package gemini

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

type GeminiProvider struct {
	client *http.Client
}

func NewGeminiProvider() *GeminiProvider {
	return &GeminiProvider{
		client: &http.Client{Timeout: 120 * time.Second},
	}
}

func (p *GeminiProvider) ID() domain.ProviderID {
	return domain.ProviderGemini
}

func (p *GeminiProvider) Name() string {
	return "Google Gemini"
}

func (p *GeminiProvider) AuthMode() domain.AuthMode {
	return domain.AuthModeAPIKey
}

func (p *GeminiProvider) SupportedModels() []domain.ModelInfo {
	return []domain.ModelInfo{
		{
			ID:          "gemini-2.5-flash",
			Name:        "Gemini 2.5 Flash",
			ProviderID:  string(domain.ProviderGemini),
			Description: "High speed, ultra high context multimodal model with built-in reasoning capabilities.",
			ContextLen:  1000000,
			InputPrice:  0.0001,
			OutputPrice: 0.0004,
		},
		{
			ID:          "gemini-2.5-pro",
			Name:        "Gemini 2.5 Pro",
			ProviderID:  string(domain.ProviderGemini),
			Description: "Deep reasoning powerhouse for nuanced coding and complex synthesis.",
			ContextLen:  2000000,
			InputPrice:  0.00125,
			OutputPrice: 0.005,
		},
	}
}

func (p *GeminiProvider) ValidateKey(ctx context.Context, apiKey string, customURL string) error {
	if apiKey == "" {
		return errors.New("Gemini API key is required")
	}

	url := fmt.Sprintf("https://generativelanguage.googleapis.com/v1beta/models?key=%s", apiKey)
	if customURL != "" {
		url = strings.TrimRight(customURL, "/") + fmt.Sprintf("/v1beta/models?key=%s", apiKey)
	}

	req, err := http.NewRequestWithContext(ctx, "GET", url, nil)
	if err != nil {
		return err
	}

	resp, err := p.client.Do(req)
	if err != nil {
		return fmt.Errorf("network error contacting Google Gemini: %w", err)
	}
	defer resp.Body.Close()

	if resp.StatusCode == 400 || resp.StatusCode == 403 {
		return errors.New("invalid Google Gemini API key")
	}
	if resp.StatusCode >= 400 && resp.StatusCode != 429 {
		return fmt.Errorf("Gemini API returned status %d", resp.StatusCode)
	}
	return nil
}

func (p *GeminiProvider) EstimateCost(req domain.ChatRequest) domain.CostEstimate {
	tokens := len(strings.Fields(req.Prompt)) * 2
	rate := 0.0001 / 1000.0
	return domain.CostEstimate{
		EstimatedPromptTokens: tokens,
		EstimatedCostUSD:      float64(tokens) * rate,
	}
}

func (p *GeminiProvider) Stream(ctx context.Context, req domain.ChatRequest) (<-chan domain.StreamChunk, error) {
	out := make(chan domain.StreamChunk, 20)
	if req.APIKey == "" {
		return nil, errors.New("Gemini API key is missing. Configure your key in Settings.")
	}

	model := req.Model
	if model == "" {
		model = "gemini-2.5-flash"
	}

	endpoint := fmt.Sprintf("https://generativelanguage.googleapis.com/v1beta/models/%s:streamGenerateContent?alt=sse&key=%s", model, req.APIKey)
	if req.BaseURL != "" {
		endpoint = strings.TrimRight(req.BaseURL, "/") + fmt.Sprintf("/v1beta/models/%s:streamGenerateContent?alt=sse&key=%s", model, req.APIKey)
	}

	type Part struct {
		Text string `json:"text"`
	}
	type Content struct {
		Role  string `json:"role"`
		Parts []Part `json:"parts"`
	}

	var contents []Content
	for _, h := range req.History {
		role := h.Role
		if role == "assistant" {
			role = "model"
		} else {
			role = "user"
		}
		contents = append(contents, Content{
			Role:  role,
			Parts: []Part{{Text: h.Content}},
		})
	}
	contents = append(contents, Content{
		Role:  "user",
		Parts: []Part{{Text: req.Prompt}},
	})

	payload := map[string]interface{}{
		"contents": contents,
	}
	body, err := json.Marshal(payload)
	if err != nil {
		return nil, err
	}

	httpReq, err := http.NewRequestWithContext(ctx, "POST", endpoint, bytes.NewReader(body))
	if err != nil {
		return nil, err
	}
	httpReq.Header.Set("Content-Type", "application/json")

	go func() {
		defer close(out)

		resp, err := p.client.Do(httpReq)
		if err != nil {
			out <- domain.StreamChunk{
				ProviderID: string(p.ID()),
				Model:      model,
				Error:      fmt.Sprintf("Failed to connect to Gemini: %v", err),
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
				Error:      fmt.Sprintf("Gemini error (HTTP %d): %s", resp.StatusCode, errBody.String()),
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
				var geminiResp struct {
					Candidates []struct {
						Content struct {
							Parts []struct {
								Text string `json:"text"`
							} `json:"parts"`
						} `json:"content"`
					} `json:"candidates"`
					Error *struct {
						Message string `json:"message"`
					} `json:"error"`
				}

				if err := json.Unmarshal([]byte(data), &geminiResp); err == nil {
					if geminiResp.Error != nil && geminiResp.Error.Message != "" {
						out <- domain.StreamChunk{
							ProviderID: string(p.ID()),
							Model:      model,
							Error:      geminiResp.Error.Message,
							Done:       true,
							Timestamp:  time.Now(),
						}
						return
					}
					if len(geminiResp.Candidates) > 0 {
						for _, part := range geminiResp.Candidates[0].Content.Parts {
							if part.Text != "" {
								fullText += part.Text
								tokens++
								out <- domain.StreamChunk{
									ProviderID: string(p.ID()),
									Model:      model,
									Delta:      part.Text,
									FullText:   fullText,
									Tokens:     tokens,
									Done:       false,
									Timestamp:  time.Now(),
								}
							}
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
