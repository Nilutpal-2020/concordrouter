package orchestrator

import (
	"context"
	"fmt"
	"sync"
	"time"

	"concordrouter/server/internal/crypto"
	"concordrouter/server/internal/domain"
	"concordrouter/server/internal/providers"
	"concordrouter/server/internal/store"
)

type TargetModelSpec struct {
	ProviderID domain.ProviderID `json:"providerId"`
	Model      string            `json:"model"`
}

type FanOutRequest struct {
	ThreadID     string            `json:"threadId"`
	TurnID       string            `json:"turnId"`
	Prompt       string            `json:"prompt"`
	History      []domain.ChatMessage `json:"history,omitempty"`
	TargetModels []TargetModelSpec `json:"targetModels"`
}

type Orchestrator struct {
	registry *providers.Registry
	store    store.Store
}

func NewOrchestrator(reg *providers.Registry, st store.Store) *Orchestrator {
	return &Orchestrator{
		registry: reg,
		store:    st,
	}
}

// FanOut concurrently dispatches the prompt to all target models and multiplexes their chunks into a single channel
func (o *Orchestrator) FanOut(ctx context.Context, req FanOutRequest) (<-chan domain.StreamChunk, error) {
	if len(req.TargetModels) == 0 {
		return nil, fmt.Errorf("no target models selected")
	}

	multiplexed := make(chan domain.StreamChunk, 100)
	var wg sync.WaitGroup

	for _, spec := range req.TargetModels {
		wg.Add(1)
		go func(target TargetModelSpec) {
			defer wg.Done()
			o.streamSingleModel(ctx, req.ThreadID, req.TurnID, req.Prompt, req.History, target, multiplexed)
		}(spec)
	}

	// Close multiplexed channel when all provider streams complete
	go func() {
		wg.Wait()
		close(multiplexed)
	}()

	return multiplexed, nil
}

// RetryModel re-runs only a single target model for a given turn
func (o *Orchestrator) RetryModel(ctx context.Context, threadID string, turnID string, prompt string, history []domain.ChatMessage, target TargetModelSpec) (<-chan domain.StreamChunk, error) {
	out := make(chan domain.StreamChunk, 50)
	go func() {
		defer close(out)
		o.streamSingleModel(ctx, threadID, turnID, prompt, history, target, out)
	}()
	return out, nil
}

func (o *Orchestrator) streamSingleModel(
	parentCtx context.Context,
	threadID string,
	turnID string,
	prompt string,
	history []domain.ChatMessage,
	target TargetModelSpec,
	out chan<- domain.StreamChunk,
) {
	startTime := time.Now()
	providerIDStr := string(target.ProviderID)
	responseID := fmt.Sprintf("resp_%s_%s_%d", target.ProviderID, target.Model, startTime.UnixNano())

	// Save initial streaming status in DB
	_ = o.store.SaveModelResponse(domain.ModelResponse{
		ID:         responseID,
		TurnID:     turnID,
		ProviderID: providerIDStr,
		Model:      target.Model,
		Content:    "",
		Status:     "streaming",
		CreatedAt:  startTime,
	})

	provider, err := o.registry.Get(target.ProviderID)
	if err != nil {
		emitError(out, responseID, turnID, providerIDStr, target.Model, fmt.Sprintf("Provider error: %v", err), o.store, startTime)
		return
	}

	// Lookup API key & custom URL
	var apiKey, customURL string
	if provider.AuthMode() == domain.AuthModeAPIKey {
		encKey, cURL, err := o.store.GetProviderKey(providerIDStr)
		if err != nil || encKey == "" {
			emitError(out, responseID, turnID, providerIDStr, target.Model, fmt.Sprintf("No API key configured for %s. Please add your key in Settings.", provider.Name()), o.store, startTime)
			return
		}
		apiKey, err = crypto.Decrypt(encKey)
		if err != nil {
			emitError(out, responseID, turnID, providerIDStr, target.Model, "Failed to decrypt API key", o.store, startTime)
			return
		}
		customURL = cURL
	} else if provider.AuthMode() == domain.AuthModeNone {
		_, cURL, _ := o.store.GetProviderKey(providerIDStr)
		customURL = cURL
	}

	// Per-provider isolated context with 180s timeout
	streamCtx, cancel := context.WithTimeout(parentCtx, 180*time.Second)
	defer cancel()

	chatReq := domain.ChatRequest{
		ThreadID:  threadID,
		MessageID: turnID,
		Prompt:    prompt,
		History:   history,
		Model:     target.Model,
		APIKey:    apiKey,
		BaseURL:   customURL,
	}

	chunkChan, err := provider.Stream(streamCtx, chatReq)
	if err != nil {
		emitError(out, responseID, turnID, providerIDStr, target.Model, err.Error(), o.store, startTime)
		return
	}

	fullText := ""
	tokens := 0
	hasError := false
	var lastErr string

	for chunk := range chunkChan {
		if chunk.Error != "" {
			hasError = true
			lastErr = chunk.Error
		}
		if chunk.FullText != "" {
			fullText = chunk.FullText
		}
		if chunk.Tokens > 0 {
			tokens = chunk.Tokens
		}

		select {
		case <-parentCtx.Done():
			emitError(out, responseID, turnID, providerIDStr, target.Model, "Stream interrupted by client", o.store, startTime)
			return
		case out <- chunk:
		}
	}

	latencyMs := time.Since(startTime).Milliseconds()
	finalStatus := "completed"
	if hasError {
		finalStatus = "error"
	}

	// Persist final completed response
	_ = o.store.SaveModelResponse(domain.ModelResponse{
		ID:         responseID,
		TurnID:     turnID,
		ProviderID: providerIDStr,
		Model:      target.Model,
		Content:    fullText,
		Status:     finalStatus,
		Error:      lastErr,
		LatencyMs:  latencyMs,
		Tokens:     tokens,
		CreatedAt:  startTime,
	})
}

func emitError(out chan<- domain.StreamChunk, respID, turnID, providerID, model, errMsg string, st store.Store, startTime time.Time) {
	out <- domain.StreamChunk{
		ProviderID: providerID,
		Model:      model,
		Error:      errMsg,
		Done:       true,
		Timestamp:  time.Now(),
	}

	_ = st.SaveModelResponse(domain.ModelResponse{
		ID:         respID,
		TurnID:     turnID,
		ProviderID: providerID,
		Model:      model,
		Content:    "",
		Status:     "error",
		Error:      errMsg,
		LatencyMs:  time.Since(startTime).Milliseconds(),
		Tokens:     0,
		CreatedAt:  startTime,
	})
}
