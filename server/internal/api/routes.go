package api

import (
	"encoding/json"
	"fmt"
	"net/http"
	"strings"
	"time"

	"github.com/go-chi/chi/v5"
	"github.com/go-chi/chi/v5/middleware"
	"github.com/go-chi/cors"

	"concordrouter/server/internal/crypto"
	"concordrouter/server/internal/domain"
	"concordrouter/server/internal/humanize"
	"concordrouter/server/internal/merge"
	"concordrouter/server/internal/orchestrator"
	"concordrouter/server/internal/providers"
	"concordrouter/server/internal/store"
)

type Server struct {
	registry         *providers.Registry
	store            store.Store
	orchestrator     *orchestrator.Orchestrator
	humanizePipeline *humanize.Pipeline
	router           chi.Router
}

func NewServer(reg *providers.Registry, st store.Store, orch *orchestrator.Orchestrator) *Server {
	s := &Server{
		registry:         reg,
		store:            st,
		orchestrator:     orch,
		humanizePipeline: humanize.NewPipeline(),
		router:           chi.NewRouter(),
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
		api.Get("/threads/search", s.handleSearchThreads)
		api.Post("/threads", s.handleCreateThread)
		api.Get("/threads/{id}", s.handleGetThread)
		api.Get("/threads/{id}/export", s.handleExportThread)
		api.Delete("/threads/{id}", s.handleDeleteThread)

		// Message Turns & Streaming Fan-out
		api.Post("/threads/{id}/turns", s.handleCreateTurnAndStream)
		api.Post("/threads/{id}/retry", s.handleRetryTurnStream)

		// Merges & Segmentation
		api.Post("/segment", s.handleSegmentText)
		api.Post("/merge/gate", s.handleMergeGate)
		api.Post("/merge/align", s.handleMergeAlign)
		api.Post("/merge/synthesize", s.handleMergeSynthesize)
		api.Post("/merge/humanize", s.handleMergeHumanize)
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

// Handler: Search Threads
func (s *Server) handleSearchThreads(w http.ResponseWriter, r *http.Request) {
	q := r.URL.Query().Get("q")
	if q == "" {
		s.handleListThreads(w, r)
		return
	}

	threads, err := s.store.SearchThreads(q)
	if err != nil {
		jsonError(w, http.StatusInternalServerError, err.Error())
		return
	}
	if threads == nil {
		threads = []domain.Thread{}
	}
	jsonResp(w, http.StatusOK, map[string]interface{}{"threads": threads})
}

// Handler: Export Thread to Markdown or JSON
func (s *Server) handleExportThread(w http.ResponseWriter, r *http.Request) {
	id := chi.URLParam(r, "id")
	format := r.URL.Query().Get("format")
	if format == "" {
		format = "markdown"
	}

	th, err := s.store.GetThread(id)
	if err != nil {
		jsonError(w, http.StatusNotFound, "Thread not found")
		return
	}

	turns, _ := s.store.ListTurns(id)
	merges, _ := s.store.ListMerges(id)

	if format == "json" {
		w.Header().Set("Content-Type", "application/json")
		w.Header().Set("Content-Disposition", fmt.Sprintf("attachment; filename=\"thread_%s.json\"", id))
		jsonResp(w, http.StatusOK, map[string]interface{}{
			"thread": th,
			"turns":  turns,
			"merges": merges,
		})
		return
	}

	// Format as clean Markdown
	var sb strings.Builder
	sb.WriteString(fmt.Sprintf("# %s\n\n", th.Title))
	sb.WriteString(fmt.Sprintf("*Exported from ConcordRouter on %s*\n\n---\n\n", time.Now().Format("2006-01-02 15:04:05")))

	for turnIdx, turn := range turns {
		sb.WriteString(fmt.Sprintf("## Turn %d\n\n", turnIdx+1))
		sb.WriteString(fmt.Sprintf("**Prompt:**\n> %s\n\n", turn.UserPrompt))

		sb.WriteString("### Model Responses\n\n")
		for modelKey, resp := range turn.Responses {
			sb.WriteString(fmt.Sprintf("#### %s\n\n", modelKey))
			sb.WriteString(resp.Content)
			sb.WriteString("\n\n")
		}

		sb.WriteString("---\n\n")
	}

	if len(merges) > 0 {
		sb.WriteString("## Reconciled Merges\n\n")
		for mergeIdx, m := range merges {
			sb.WriteString(fmt.Sprintf("### Merge %d (%s vs %s)\n\n", mergeIdx+1, strings.Join(m.SourceModels, " & "), m.Strategy))
			sb.WriteString(m.MergedText)
			sb.WriteString("\n\n---\n\n")
		}
	}

	w.Header().Set("Content-Type", "text/markdown; charset=utf-8")
	w.Header().Set("Content-Disposition", fmt.Sprintf("attachment; filename=\"thread_%s.md\"", id))
	w.WriteHeader(http.StatusOK)
	_, _ = w.Write([]byte(sb.String()))
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

// Handler: Evaluate Merge Gating Heuristics (Phase 4)
func (s *Server) handleMergeGate(w http.ResponseWriter, r *http.Request) {
	var body struct {
		Prompt    string `json:"prompt"`
		ResponseA string `json:"responseA"`
		ResponseB string `json:"responseB"`
	}
	if err := json.NewDecoder(r.Body).Decode(&body); err != nil {
		jsonError(w, http.StatusBadRequest, "Invalid payload")
		return
	}

	decision := merge.EvaluateMergeGating(body.Prompt, body.ResponseA, body.ResponseB)
	jsonResp(w, http.StatusOK, decision)
}

// Handler: Compute Semantic Alignment & Similarity Matrix (Phase 5)
func (s *Server) handleMergeAlign(w http.ResponseWriter, r *http.Request) {
	var body struct {
		ModelALabel string `json:"modelALabel"`
		ResponseA   string `json:"responseA"`
		ModelBLabel string `json:"modelBLabel"`
		ResponseB   string `json:"responseB"`
	}
	if err := json.NewDecoder(r.Body).Decode(&body); err != nil {
		jsonError(w, http.StatusBadRequest, "Invalid payload")
		return
	}

	if body.ModelALabel == "" {
		body.ModelALabel = "Model A"
	}
	if body.ModelBLabel == "" {
		body.ModelBLabel = "Model B"
	}

	segsA := merge.SegmentText(body.ResponseA, body.ModelALabel)
	segsB := merge.SegmentText(body.ResponseB, body.ModelBLabel)

	result := merge.AlignNeedlemanWunsch(segsA, segsB)
	jsonResp(w, http.StatusOK, result)
}

// Handler: AI-Assisted Synthesis Streaming (Phase 6)
func (s *Server) handleMergeSynthesize(w http.ResponseWriter, r *http.Request) {
	var body struct {
		ThreadID       string                      `json:"threadId"`
		Prompt         string                      `json:"prompt"`
		ModelALabel    string                      `json:"modelALabel"`
		ResponseA      string                      `json:"responseA"`
		ModelBLabel    string                      `json:"modelBLabel"`
		ResponseB      string                      `json:"responseB"`
		SynthesisModel orchestrator.TargetModelSpec `json:"synthesisModel"`
	}
	if err := json.NewDecoder(r.Body).Decode(&body); err != nil {
		jsonError(w, http.StatusBadRequest, "Invalid payload")
		return
	}

	if body.SynthesisModel.Model == "" {
		body.SynthesisModel = orchestrator.TargetModelSpec{
			ProviderID: domain.ProviderMock,
			Model:      "mock-concise",
		}
	}

	synthesisPrompt := merge.BuildSynthesisPrompt(
		body.Prompt,
		body.ModelALabel,
		body.ResponseA,
		body.ModelBLabel,
		body.ResponseB,
	)

	w.Header().Set("Content-Type", "text/event-stream")
	w.Header().Set("Cache-Control", "no-cache")
	w.Header().Set("Connection", "keep-alive")

	flusher, ok := w.(http.Flusher)
	if !ok {
		http.Error(w, "Streaming unsupported", http.StatusInternalServerError)
		return
	}

	stream, err := s.orchestrator.RetryModel(r.Context(), body.ThreadID, "synthesis_temp", synthesisPrompt, nil, body.SynthesisModel)
	if err != nil {
		errData, _ := json.Marshal(map[string]string{"error": err.Error()})
		fmt.Fprintf(w, "event: error\ndata: %s\n\n", errData)
		flusher.Flush()
		return
	}

	for chunk := range stream {
		data, _ := json.Marshal(chunk)
		fmt.Fprintf(w, "event: chunk\ndata: %s\n\n", data)
		flusher.Flush()
	}

	fmt.Fprintf(w, "event: complete\ndata: {\"done\":true}\n\n")
	flusher.Flush()
}

// Handler: Statistical AI-Detectability Reduction (Humanize)
func (s *Server) handleMergeHumanize(w http.ResponseWriter, r *http.Request) {
	var body humanize.HumanizeRequest
	if err := json.NewDecoder(r.Body).Decode(&body); err != nil {
		jsonError(w, http.StatusBadRequest, "Invalid payload")
		return
	}

	if strings.TrimSpace(body.Text) == "" {
		jsonError(w, http.StatusBadRequest, "Text is required for humanization")
		return
	}

	result := s.humanizePipeline.Process(r.Context(), body)
	jsonResp(w, http.StatusOK, result)
}

func jsonResp(w http.ResponseWriter, code int, data interface{}) {
	w.Header().Set("Content-Type", "application/json")
	w.WriteHeader(code)
	_ = json.NewEncoder(w).Encode(data)
}

func jsonError(w http.ResponseWriter, code int, message string) {
	jsonResp(w, code, map[string]string{"error": message})
}

