package api

import (
	"encoding/json"
	"fmt"
	"net/http"
	"time"

	"github.com/go-chi/chi/v5"
	"github.com/go-chi/chi/v5/middleware"
	"github.com/go-chi/cors"

	"concordrouter/server/internal/crypto"
	"concordrouter/server/internal/domain"
	"concordrouter/server/internal/merge"
	"concordrouter/server/internal/orchestrator"
	"concordrouter/server/internal/providers"
	"concordrouter/server/internal/store"
)

type Server struct {
	registry     *providers.Registry
	store        store.Store
	orchestrator *orchestrator.Orchestrator
	router       chi.Router
}

func NewServer(reg *providers.Registry, st store.Store, orch *orchestrator.Orchestrator) *Server {
	s := &Server{
		registry:     reg,
		store:        st,
		orchestrator: orch,
		router:       chi.NewRouter(),
	}
	s.setupRoutes()
	return s
}

func (s *Server) Router() http.Handler {
	return s.router
}

func (s *Server) setupRoutes() {
	r := s.router

	r.Use(middleware.RequestID)
	r.Use(middleware.RealIP)
	r.Use(middleware.Logger)
	r.Use(middleware.Recoverer)
	r.Use(middleware.Timeout(300 * time.Second))

	r.Use(cors.Handler(cors.Options{
		AllowedOrigins:   []string{"*"},
		AllowedMethods:   []string{"GET", "POST", "PUT", "DELETE", "OPTIONS"},
		AllowedHeaders:   []string{"Accept", "Authorization", "Content-Type", "X-CSRF-Token"},
		ExposedHeaders:   []string{"Link"},
		AllowCredentials: true,
		MaxAge:           300,
	}))

	r.Route("/api/v1", func(api chi.Router) {
		// Health
		api.Get("/health", func(w http.ResponseWriter, r *http.Request) {
			jsonResp(w, http.StatusOK, map[string]string{"status": "ok", "time": time.Now().UTC().Format(time.RFC3339)})
		})

		// Providers & BYOA Credentials
		api.Get("/providers", s.handleListProviders)
		api.Post("/providers/keys", s.handleSaveProviderKey)
		api.Delete("/providers/keys/{providerId}", s.handleDeleteProviderKey)

		// Threads & Conversations
		api.Get("/threads", s.handleListThreads)
		api.Post("/threads", s.handleCreateThread)
		api.Get("/threads/{id}", s.handleGetThread)
		api.Delete("/threads/{id}", s.handleDeleteThread)

		// Message Turns & Streaming Fan-out
		api.Post("/threads/{id}/turns", s.handleCreateTurnAndStream)
		api.Post("/threads/{id}/retry", s.handleRetryTurnStream)

		// Merges & Segmentation
		api.Post("/segment", s.handleSegmentText)
		api.Post("/threads/{id}/merge", s.handleSaveMerge)
		api.Get("/threads/{id}/merges", s.handleListMerges)
	})
}

// Handler: List Providers with live configuration status
func (s *Server) handleListProviders(w http.ResponseWriter, r *http.Request) {
	configured, err := s.store.ListConfiguredProviders()
	if err != nil {
		jsonError(w, http.StatusInternalServerError, err.Error())
		return
	}

	var statuses []domain.ProviderStatus
	for _, p := range s.registry.All() {
		idStr := string(p.ID())
		cfg, isConfigured := configured[idStr]

		// Mock is always considered connected
		if p.ID() == domain.ProviderMock {
			isConfigured = true
		}

		keyPreview := ""
		if isConfigured && p.AuthMode() == domain.AuthModeAPIKey {
			encKey, _, _ := s.store.GetProviderKey(idStr)
			if encKey != "" {
				decKey, _ := crypto.Decrypt(encKey)
				keyPreview = crypto.MaskKey(decKey)
			}
		}

		statuses = append(statuses, domain.ProviderStatus{
			ID:          idStr,
			Name:        p.Name(),
			AuthMode:    p.AuthMode(),
			IsConnected: isConfigured,
			CustomURL:   cfg.CustomURL,
			KeyPreview:  keyPreview,
			Models:      p.SupportedModels(),
		})
	}

	jsonResp(w, http.StatusOK, map[string]interface{}{"providers": statuses})
}

// Handler: Save and Validate Provider Key
func (s *Server) handleSaveProviderKey(w http.ResponseWriter, r *http.Request) {
	var body struct {
		ProviderID string `json:"providerId"`
		APIKey     string `json:"apiKey"`
		CustomURL  string `json:"customUrl"`
	}
	if err := json.NewDecoder(r.Body).Decode(&body); err != nil {
		jsonError(w, http.StatusBadRequest, "Invalid request payload")
		return
	}

	p, err := s.registry.Get(domain.ProviderID(body.ProviderID))
	if err != nil {
		jsonError(w, http.StatusNotFound, "Provider not found")
		return
	}

	// Validate key against provider
	if p.AuthMode() == domain.AuthModeAPIKey || body.APIKey != "" || body.CustomURL != "" {
		if err := p.ValidateKey(r.Context(), body.APIKey, body.CustomURL); err != nil {
			jsonError(w, http.StatusUnprocessableEntity, fmt.Sprintf("Key validation failed: %v", err))
			return
		}
	}

	encryptedKey := ""
	if body.APIKey != "" {
		encryptedKey, err = crypto.Encrypt(body.APIKey)
		if err != nil {
			jsonError(w, http.StatusInternalServerError, "Encryption failed")
			return
		}
	}

	if err := s.store.SaveProviderKey(body.ProviderID, encryptedKey, body.CustomURL); err != nil {
		jsonError(w, http.StatusInternalServerError, err.Error())
		return
	}

	jsonResp(w, http.StatusOK, map[string]interface{}{
		"success":    true,
		"providerId": body.ProviderID,
		"keyPreview": crypto.MaskKey(body.APIKey),
	})
}

// Handler: Delete Provider Key
func (s *Server) handleDeleteProviderKey(w http.ResponseWriter, r *http.Request) {
	providerID := chi.URLParam(r, "providerId")
	if err := s.store.DeleteProviderKey(providerID); err != nil {
		jsonError(w, http.StatusInternalServerError, err.Error())
		return
	}
	jsonResp(w, http.StatusOK, map[string]bool{"success": true})
}

// Handler: List Threads
func (s *Server) handleListThreads(w http.ResponseWriter, r *http.Request) {
	threads, err := s.store.ListThreads()
	if err != nil {
		jsonError(w, http.StatusInternalServerError, err.Error())
		return
	}
	if threads == nil {
		threads = []domain.Thread{}
	}
	jsonResp(w, http.StatusOK, map[string]interface{}{"threads": threads})
}

// Handler: Create Thread
func (s *Server) handleCreateThread(w http.ResponseWriter, r *http.Request) {
	var body struct {
		Title string `json:"title"`
	}
	_ = json.NewDecoder(r.Body).Decode(&body)

	th, err := s.store.CreateThread(body.Title)
	if err != nil {
		jsonError(w, http.StatusInternalServerError, err.Error())
		return
	}
	jsonResp(w, http.StatusCreated, th)
}

// Handler: Get Thread with all turns and responses
func (s *Server) handleGetThread(w http.ResponseWriter, r *http.Request) {
	id := chi.URLParam(r, "id")
	th, err := s.store.GetThread(id)
	if err != nil {
		jsonError(w, http.StatusNotFound, "Thread not found")
		return
	}

	turns, err := s.store.ListTurns(id)
	if err != nil {
		jsonError(w, http.StatusInternalServerError, err.Error())
		return
	}

	merges, _ := s.store.ListMerges(id)

	jsonResp(w, http.StatusOK, map[string]interface{}{
		"thread": th,
		"turns":  turns,
		"merges": merges,
	})
}

// Handler: Delete Thread
func (s *Server) handleDeleteThread(w http.ResponseWriter, r *http.Request) {
	id := chi.URLParam(r, "id")
	if err := s.store.DeleteThread(id); err != nil {
		jsonError(w, http.StatusInternalServerError, err.Error())
		return
	}
	jsonResp(w, http.StatusOK, map[string]bool{"success": true})
}

// Handler: Create Turn and Stream Fan-Out via SSE
func (s *Server) handleCreateTurnAndStream(w http.ResponseWriter, r *http.Request) {
	threadID := chi.URLParam(r, "id")

	var body struct {
		Prompt       string                        `json:"prompt"`
		TargetModels []orchestrator.TargetModelSpec `json:"targetModels"`
	}
	if err := json.NewDecoder(r.Body).Decode(&body); err != nil || body.Prompt == "" {
		jsonError(w, http.StatusBadRequest, "Prompt and targetModels are required")
		return
	}

	if len(body.TargetModels) == 0 {
		jsonError(w, http.StatusBadRequest, "At least one target model must be selected")
		return
	}

	// Create new Turn in DB
	turn, err := s.store.CreateTurn(threadID, body.Prompt)
	if err != nil {
		jsonError(w, http.StatusInternalServerError, fmt.Sprintf("Failed to create turn: %v", err))
		return
	}

	// Build chat history from prior turns if any
	priorTurns, _ := s.store.ListTurns(threadID)
	var history []domain.ChatMessage
	for _, pt := range priorTurns {
		if pt.ID == turn.ID {
			continue
		}
		history = append(history, domain.ChatMessage{Role: "user", Content: pt.UserPrompt})
	}

	// Set SSE Headers
	w.Header().Set("Content-Type", "text/event-stream")
	w.Header().Set("Cache-Control", "no-cache")
	w.Header().Set("Connection", "keep-alive")
	w.Header().Set("X-Accel-Buffering", "no")

	flusher, ok := w.(http.Flusher)
	if !ok {
		http.Error(w, "Streaming unsupported", http.StatusInternalServerError)
		return
	}

	// Send initial turn metadata event
	turnMeta, _ := json.Marshal(map[string]interface{}{
		"type":   "turn_init",
		"turnId": turn.ID,
		"prompt": body.Prompt,
	})
	fmt.Fprintf(w, "event: init\ndata: %s\n\n", turnMeta)
	flusher.Flush()

	fanReq := orchestrator.FanOutRequest{
		ThreadID:     threadID,
		TurnID:       turn.ID,
		Prompt:       body.Prompt,
		History:      history,
		TargetModels: body.TargetModels,
	}

	chunkStream, err := s.orchestrator.FanOut(r.Context(), fanReq)
	if err != nil {
		errData, _ := json.Marshal(map[string]string{"error": err.Error()})
		fmt.Fprintf(w, "event: error\ndata: %s\n\n", errData)
		flusher.Flush()
		return
	}

	for chunk := range chunkStream {
		data, err := json.Marshal(chunk)
		if err != nil {
			continue
		}
		fmt.Fprintf(w, "event: chunk\ndata: %s\n\n", data)
		flusher.Flush()
	}

	fmt.Fprintf(w, "event: complete\ndata: {\"done\":true}\n\n")
	flusher.Flush()
}

// Handler: Retry single model stream
func (s *Server) handleRetryTurnStream(w http.ResponseWriter, r *http.Request) {
	threadID := chi.URLParam(r, "id")

	var body struct {
		TurnID      string                      `json:"turnId"`
		Prompt      string                      `json:"prompt"`
		TargetModel orchestrator.TargetModelSpec `json:"targetModel"`
	}
	if err := json.NewDecoder(r.Body).Decode(&body); err != nil {
		jsonError(w, http.StatusBadRequest, "Invalid retry request payload")
		return
	}

	w.Header().Set("Content-Type", "text/event-stream")
	w.Header().Set("Cache-Control", "no-cache")
	w.Header().Set("Connection", "keep-alive")

	flusher, ok := w.(http.Flusher)
	if !ok {
		http.Error(w, "Streaming unsupported", http.StatusInternalServerError)
		return
	}

	chunkStream, err := s.orchestrator.RetryModel(r.Context(), threadID, body.TurnID, body.Prompt, nil, body.TargetModel)
	if err != nil {
		errData, _ := json.Marshal(map[string]string{"error": err.Error()})
		fmt.Fprintf(w, "event: error\ndata: %s\n\n", errData)
		flusher.Flush()
		return
	}

	for chunk := range chunkStream {
		data, _ := json.Marshal(chunk)
		fmt.Fprintf(w, "event: chunk\ndata: %s\n\n", data)
		flusher.Flush()
	}

	fmt.Fprintf(w, "event: complete\ndata: {\"done\":true}\n\n")
	flusher.Flush()
}

// Handler: Segment text for cherry-pick merge
func (s *Server) handleSegmentText(w http.ResponseWriter, r *http.Request) {
	var body struct {
		Text   string `json:"text"`
		Source string `json:"source"`
	}
	if err := json.NewDecoder(r.Body).Decode(&body); err != nil {
		jsonError(w, http.StatusBadRequest, "Invalid payload")
		return
	}
	if body.Source == "" {
		body.Source = "left"
	}

	segments := merge.SegmentText(body.Text, body.Source)
	jsonResp(w, http.StatusOK, map[string]interface{}{"segments": segments})
}

// Handler: Save Merged Record
func (s *Server) handleSaveMerge(w http.ResponseWriter, r *http.Request) {
	threadID := chi.URLParam(r, "id")

	var record domain.MergeRecord
	if err := json.NewDecoder(r.Body).Decode(&record); err != nil {
		jsonError(w, http.StatusBadRequest, "Invalid merge payload")
		return
	}

	record.ThreadID = threadID
	record.CreatedAt = time.Now()
	if record.ID == "" {
		record.ID = fmt.Sprintf("merge_%d", time.Now().UnixNano())
	}
	if record.Strategy == "" {
		record.Strategy = "manual_cherrypick"
	}

	if err := s.store.SaveMerge(record); err != nil {
		jsonError(w, http.StatusInternalServerError, err.Error())
		return
	}

	jsonResp(w, http.StatusCreated, record)
}

// Handler: List Merges
func (s *Server) handleListMerges(w http.ResponseWriter, r *http.Request) {
	threadID := chi.URLParam(r, "id")
	merges, err := s.store.ListMerges(threadID)
	if err != nil {
		jsonError(w, http.StatusInternalServerError, err.Error())
		return
	}
	jsonResp(w, http.StatusOK, map[string]interface{}{"merges": merges})
}

func jsonResp(w http.ResponseWriter, code int, data interface{}) {
	w.Header().Set("Content-Type", "application/json")
	w.WriteHeader(code)
	_ = json.NewEncoder(w).Encode(data)
}

func jsonError(w http.ResponseWriter, code int, message string) {
	jsonResp(w, code, map[string]string{"error": message})
}
