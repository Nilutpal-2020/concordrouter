package providers

import (
	"context"
	"concordrouter/server/internal/domain"
	"fmt"
	"sync"
)

// Provider interface implemented by all LLM adapters
type Provider interface {
	ID() domain.ProviderID
	Name() string
	AuthMode() domain.AuthMode
	SupportedModels() []domain.ModelInfo
	ValidateKey(ctx context.Context, apiKey string, customURL string) error
	Stream(ctx context.Context, req domain.ChatRequest) (<-chan domain.StreamChunk, error)
	EstimateCost(req domain.ChatRequest) domain.CostEstimate
}

type Registry struct {
	mu        sync.RWMutex
	providers map[domain.ProviderID]Provider
}

func NewRegistry() *Registry {
	return &Registry{
		providers: make(map[domain.ProviderID]Provider),
	}
}

func (r *Registry) Register(p Provider) {
	r.mu.Lock()
	defer r.mu.Unlock()
	r.providers[p.ID()] = p
}

func (r *Registry) Get(id domain.ProviderID) (Provider, error) {
	r.mu.RLock()
	defer r.mu.RUnlock()
	p, ok := r.providers[id]
	if !ok {
		return nil, fmt.Errorf("provider %s not found", id)
	}
	return p, nil
}

func (r *Registry) All() []Provider {
	r.mu.RLock()
	defer r.mu.RUnlock()
	list := make([]Provider, 0, len(r.providers))
	for _, p := range r.providers {
		list = append(list, p)
	}
	return list
}
