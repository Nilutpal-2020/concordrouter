package domain

import (
	"time"
)

type AuthMode string

const (
	AuthModeAPIKey      AuthMode = "api_key"
	AuthModeOAuth       AuthMode = "oauth"
	AuthModeNone        AuthMode = "none"
	AuthModeUnsupported AuthMode = "unsupported"
)

type ProviderID string

const (
	ProviderOpenAI     ProviderID = "openai"
	ProviderAnthropic  ProviderID = "anthropic"
	ProviderGemini     ProviderID = "gemini"
	ProviderOllama     ProviderID = "ollama"
	ProviderOpenRouter ProviderID = "openrouter"
	ProviderMock       ProviderID = "mock"
)

type ModelInfo struct {
	ID          string  `json:"id"`
	Name        string  `json:"name"`
	ProviderID  string  `json:"providerId"`
	Description string  `json:"description,omitempty"`
	ContextLen  int     `json:"contextLen,omitempty"`
	InputPrice  float64 `json:"inputPricePer1k,omitempty"`
	OutputPrice float64 `json:"outputPricePer1k,omitempty"`
}

type ProviderStatus struct {
	ID          string      `json:"id"`
	Name        string      `json:"name"`
	AuthMode    AuthMode    `json:"authMode"`
	IsConnected bool        `json:"isConnected"`
	CustomURL   string      `json:"customUrl,omitempty"`
	KeyPreview  string      `json:"keyPreview,omitempty"`
	Models      []ModelInfo `json:"models"`
}

type CostEstimate struct {
	EstimatedPromptTokens int     `json:"estimatedPromptTokens"`
	EstimatedCostUSD      float64 `json:"estimatedCostUsd"`
}

type ChatMessage struct {
	Role    string `json:"role"` // "user", "assistant", "system"
	Content string `json:"content"`
}

type ChatRequest struct {
	ThreadID    string        `json:"threadId"`
	MessageID   string        `json:"messageId"`
	Prompt      string        `json:"prompt"`
	History     []ChatMessage `json:"history,omitempty"`
	Model       string        `json:"model"`
	APIKey      string        `json:"-"`
	BaseURL     string        `json:"baseUrl,omitempty"`
	Temperature float64       `json:"temperature,omitempty"`
	MaxTokens   int           `json:"maxTokens,omitempty"`
}

type StreamChunk struct {
	ProviderID string    `json:"providerId"`
	Model      string    `json:"model"`
	Delta      string    `json:"delta"`
	FullText   string    `json:"fullText,omitempty"`
	Tokens     int       `json:"tokens,omitempty"`
	Done       bool      `json:"done"`
	Error      string    `json:"error,omitempty"`
	Timestamp  time.Time `json:"timestamp"`
}

type Thread struct {
	ID        string    `json:"id"`
	Title     string    `json:"title"`
	CreatedAt time.Time `json:"createdAt"`
	UpdatedAt time.Time `json:"updatedAt"`
}

type MessageTurn struct {
	ID        string                   `json:"id"`
	ThreadID  string                   `json:"threadId"`
	UserPrompt string                  `json:"userPrompt"`
	CreatedAt time.Time                `json:"createdAt"`
	Responses map[string]ModelResponse `json:"responses"` // keyed by modelKey e.g. "openai:gpt-4o"
}

type ModelResponse struct {
	ID            string    `json:"id"`
	TurnID        string    `json:"turnId"`
	ProviderID    string    `json:"providerId"`
	Model         string    `json:"model"`
	Content       string    `json:"content"`
	Status        string    `json:"status"` // "streaming", "completed", "error"
	Error         string    `json:"error,omitempty"`
	LatencyMs     int64     `json:"latencyMs"`
	Tokens        int       `json:"tokens"`
	CreatedAt     time.Time `json:"createdAt"`
}

type ChunkSegment struct {
	ID        string `json:"id"`
	Index     int    `json:"index"`
	Source    string `json:"source"` // "left" or "right" or provider/model name
	Type      string `json:"type"`   // "paragraph", "sentence", "header", "code", "bullet", "blockquote", "table", "list_group"
	Content   string `json:"content"`
}

type MergeRecord struct {
	ID           string         `json:"id"`
	ThreadID     string         `json:"threadId"`
	TurnID       string         `json:"turnId"`
	SourceModels []string       `json:"sourceModels"`
	MergedText   string         `json:"mergedText"`
	Segments     []ChunkSegment `json:"segments,omitempty"`
	Strategy     string         `json:"strategy"` // "manual_cherrypick", "diff_structured", "ai_synthesis"
	CreatedAt    time.Time      `json:"createdAt"`
}
