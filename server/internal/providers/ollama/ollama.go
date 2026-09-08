package ollama

import (
	"bufio"
	"bytes"
	"context"
	"encoding/json"
	"fmt"
	"net/http"
	"strings"
	"time"

	"concordrouter/server/internal/domain"
)

type OllamaProvider struct {
	client *http.Client
}

func NewOllamaProvider() *OllamaProvider {
	return &OllamaProvider{
		client: &http.Client{Timeout: 300 * time.Second},
	}
}

func (p *OllamaProvider) ID() domain.ProviderID {
	return domain.ProviderOllama
}

func (p *OllamaProvider) Name() string {
	return "Ollama (Local Models)"
}

func (p *OllamaProvider) AuthMode() domain.AuthMode {
	return domain.AuthModeNone
}

func (p *OllamaProvider) SupportedModels() []domain.ModelInfo {
	return []domain.ModelInfo{
		{
			ID:          "llama3.2",
			Name:        "Llama 3.2 (Local)",
			ProviderID:  string(domain.ProviderOllama),
			Description: "Meta's efficient local open-weights model running completely offline.",
			ContextLen:  128000,
			InputPrice:  0,
			OutputPrice: 0,
		},
		{
			ID:          "deepseek-r1:latest",
			Name:        "DeepSeek R1 (Local)",
			ProviderID:  string(domain.ProviderOllama),
			Description: "Local open-weights reasoning model with chain-of-thought introspection.",
			ContextLen:  64000,
			InputPrice:  0,
			OutputPrice: 0,
		},
		{
			ID:          "mistral:latest",
			Name:        "Mistral 7B (Local)",
			ProviderID:  string(domain.ProviderOllama),
			Description: "Fast, versatile generalist local model.",
			ContextLen:  32000,
			InputPrice:  0,
			OutputPrice: 0,
		},
	}
}

func (p *OllamaProvider) ValidateKey(ctx context.Context, apiKey string, customURL string) error {
	baseURL := "http://localhost:11434"
	if customURL != "" {
		baseURL = strings.TrimRight(customURL, "/")
	}

	req, err := http.NewRequestWithContext(ctx, "GET", baseURL+"/api/tags", nil)
	if err != nil {
		return err
	}

	resp, err := p.client.Do(req)
	if err != nil {
		return fmt.Errorf("could not connect to Ollama at %s. Ensure Ollama is running (`ollama serve`)", baseURL)
	}
	defer resp.Body.Close()

	if resp.StatusCode != http.StatusOK {
		return fmt.Errorf("ollama returned status %d", resp.StatusCode)
	}
	return nil
}

func (p *OllamaProvider) EstimateCost(req domain.ChatRequest) domain.CostEstimate {
	tokens := len(strings.Fields(req.Prompt)) * 2
	return domain.CostEstimate{
		EstimatedPromptTokens: tokens,
		EstimatedCostUSD:      0,
	}
}

func (p *OllamaProvider) Stream(ctx context.Context, req domain.ChatRequest) (<-chan domain.StreamChunk, error) {
	out := make(chan domain.StreamChunk, 20)

	baseURL := "http://localhost:11434"
	if req.BaseURL != "" {
		baseURL = strings.TrimRight(req.BaseURL, "/")
	}

	model := req.Model
	if model == "" {
		model = "llama3.2"
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
		"messages": messages,
		"stream":   true,
	}
	body, err := json.Marshal(payload)
	if err != nil {
		return nil, err
	}

	httpReq, err := http.NewRequestWithContext(ctx, "POST", baseURL+"/api/chat", bytes.NewReader(body))
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
				Error:      fmt.Sprintf("Failed to connect to Ollama (%s): %v", baseURL, err),
				Done:       true,
				Timestamp:  time.Now(),
			}
			return
		}
		defer resp.Body.Close()

		if resp.StatusCode != http.StatusOK {
			out <- domain.StreamChunk{
				ProviderID: string(p.ID()),
				Model:      model,
				Error:      fmt.Sprintf("Ollama returned HTTP %d", resp.StatusCode),
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
			var chunk struct {
				Message struct {
					Content string `json:"content"`
				} `json:"message"`
				Done  bool   `json:"done"`
				Error string `json:"error"`
			}
			if err := json.Unmarshal([]byte(line), &chunk); err == nil {
				if chunk.Error != "" {
					out <- domain.StreamChunk{
						ProviderID: string(p.ID()),
						Model:      model,
						Error:      chunk.Error,
						Done:       true,
						Timestamp:  time.Now(),
					}
					return
				}
				if chunk.Message.Content != "" {
					fullText += chunk.Message.Content
					tokens++
					out <- domain.StreamChunk{
						ProviderID: string(p.ID()),
						Model:      model,
						Delta:      chunk.Message.Content,
						FullText:   fullText,
						Tokens:     tokens,
						Done:       false,
						Timestamp:  time.Now(),
					}
				}
				if chunk.Done {
					break
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
