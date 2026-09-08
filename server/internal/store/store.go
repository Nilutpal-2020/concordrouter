package store

import (
	"database/sql"
	"encoding/json"
	"fmt"
	"os"
	"path/filepath"
	"strings"
	"sync"
	"time"

	"concordrouter/server/internal/domain"
	_ "modernc.org/sqlite"
)

type Store interface {
	// Provider Keys
	SaveProviderKey(providerID string, encryptedKey string, customURL string) error
	GetProviderKey(providerID string) (encryptedKey string, customURL string, err error)
	DeleteProviderKey(providerID string) error
	ListConfiguredProviders() (map[string]struct{ CustomURL string }, error)

	// Threads
	CreateThread(title string) (*domain.Thread, error)
	GetThread(id string) (*domain.Thread, error)
	ListThreads() ([]domain.Thread, error)
	SearchThreads(query string) ([]domain.Thread, error)
	DeleteThread(id string) error

	// Turns & Responses
	CreateTurn(threadID string, userPrompt string) (*domain.MessageTurn, error)
	GetTurn(turnID string) (*domain.MessageTurn, error)
	ListTurns(threadID string) ([]domain.MessageTurn, error)
	SaveModelResponse(resp domain.ModelResponse) error

	// Merges
	SaveMerge(record domain.MergeRecord) error
	ListMerges(threadID string) ([]domain.MergeRecord, error)
}

type SQLiteStore struct {
	db *sql.DB
	mu sync.Mutex
}

func NewSQLiteStore(dbPath string) (*SQLiteStore, error) {
	if dbPath == "" {
		dbPath = "concordrouter.db"
	}

	dir := filepath.Dir(dbPath)
	if dir != "." && dir != "" {
		if err := os.MkdirAll(dir, 0755); err != nil {
			return nil, err
		}
	}

	db, err := sql.Open("sqlite", dbPath+"?_pragma=busy_timeout(5000)&_pragma=journal_mode(WAL)")
	if err != nil {
		return nil, fmt.Errorf("failed to open sqlite database: %w", err)
	}

	s := &SQLiteStore{db: db}
	if err := s.migrate(); err != nil {
		db.Close()
		return nil, fmt.Errorf("database migration failed: %w", err)
	}

	return s, nil
}

func (s *SQLiteStore) migrate() error {
	schema := `
	CREATE TABLE IF NOT EXISTS provider_keys (
		provider_id TEXT PRIMARY KEY,
		encrypted_key TEXT NOT NULL,
		custom_url TEXT NOT NULL DEFAULT '',
		created_at TIMESTAMP NOT NULL,
		updated_at TIMESTAMP NOT NULL
	);

	CREATE TABLE IF NOT EXISTS threads (
		id TEXT PRIMARY KEY,
		title TEXT NOT NULL,
		created_at TIMESTAMP NOT NULL,
		updated_at TIMESTAMP NOT NULL
	);

	CREATE TABLE IF NOT EXISTS turns (
		id TEXT PRIMARY KEY,
		thread_id TEXT NOT NULL,
		user_prompt TEXT NOT NULL,
		created_at TIMESTAMP NOT NULL,
		FOREIGN KEY (thread_id) REFERENCES threads(id) ON DELETE CASCADE
	);

	CREATE TABLE IF NOT EXISTS model_responses (
		id TEXT PRIMARY KEY,
		turn_id TEXT NOT NULL,
		provider_id TEXT NOT NULL,
		model TEXT NOT NULL,
		content TEXT NOT NULL,
		status TEXT NOT NULL,
		error TEXT NOT NULL DEFAULT '',
		latency_ms INTEGER NOT NULL DEFAULT 0,
		tokens INTEGER NOT NULL DEFAULT 0,
		created_at TIMESTAMP NOT NULL,
		FOREIGN KEY (turn_id) REFERENCES turns(id) ON DELETE CASCADE
	);

	CREATE TABLE IF NOT EXISTS merge_records (
		id TEXT PRIMARY KEY,
		thread_id TEXT NOT NULL,
		turn_id TEXT NOT NULL,
		source_models_json TEXT NOT NULL,
		merged_text TEXT NOT NULL,
		segments_json TEXT NOT NULL DEFAULT '[]',
		strategy TEXT NOT NULL,
		created_at TIMESTAMP NOT NULL,
		FOREIGN KEY (thread_id) REFERENCES threads(id) ON DELETE CASCADE
	);
	CREATE INDEX IF NOT EXISTS idx_merge_records_thread_id ON merge_records(thread_id);
	`
	if _, err := s.db.Exec(schema); err != nil {
		return err
	}

	// Migrate legacy "New Arena Session" titles to "New Session"
	_, _ = s.db.Exec(`UPDATE threads SET title = 'New Session' WHERE title = 'New Arena Session'`)

	return nil
}

func (s *SQLiteStore) SaveProviderKey(providerID string, encryptedKey string, customURL string) error {
	s.mu.Lock()
	defer s.mu.Unlock()

	now := time.Now()
	query := `
	INSERT INTO provider_keys (provider_id, encrypted_key, custom_url, created_at, updated_at)
	VALUES (?, ?, ?, ?, ?)
	ON CONFLICT(provider_id) DO UPDATE SET
		encrypted_key = excluded.encrypted_key,
		custom_url = excluded.custom_url,
		updated_at = excluded.updated_at;
	`
	_, err := s.db.Exec(query, providerID, encryptedKey, customURL, now, now)
	return err
}

func (s *SQLiteStore) GetProviderKey(providerID string) (string, string, error) {
	s.mu.Lock()
	defer s.mu.Unlock()

	var encryptedKey, customURL string
	err := s.db.QueryRow(`SELECT encrypted_key, custom_url FROM provider_keys WHERE provider_id = ?`, providerID).
		Scan(&encryptedKey, &customURL)
	if err == sql.ErrNoRows {
		return "", "", nil
	}
	return encryptedKey, customURL, err
}

func (s *SQLiteStore) DeleteProviderKey(providerID string) error {
	s.mu.Lock()
	defer s.mu.Unlock()

	_, err := s.db.Exec(`DELETE FROM provider_keys WHERE provider_id = ?`, providerID)
	return err
}

func (s *SQLiteStore) ListConfiguredProviders() (map[string]struct{ CustomURL string }, error) {
	s.mu.Lock()
	defer s.mu.Unlock()

	rows, err := s.db.Query(`SELECT provider_id, custom_url FROM provider_keys`)
	if err != nil {
		return nil, err
	}
	defer rows.Close()

	out := make(map[string]struct{ CustomURL string })
	for rows.Next() {
		var id, url string
		if err := rows.Scan(&id, &url); err == nil {
			out[id] = struct{ CustomURL string }{CustomURL: url}
		}
	}
	return out, nil
}

func (s *SQLiteStore) CreateThread(title string) (*domain.Thread, error) {
	s.mu.Lock()
	defer s.mu.Unlock()

	now := time.Now()
	id := fmt.Sprintf("th_%d", now.UnixNano())
	if title == "" {
		title = "New Session"
	}

	_, err := s.db.Exec(`INSERT INTO threads (id, title, created_at, updated_at) VALUES (?, ?, ?, ?)`,
		id, title, now, now)
	if err != nil {
		return nil, err
	}

	return &domain.Thread{
		ID:        id,
		Title:     title,
		CreatedAt: now,
		UpdatedAt: now,
	}, nil
}

func cleanTitleFromPrompt(prompt string) string {
	lines := strings.Split(prompt, "\n")
	firstLine := strings.TrimSpace(lines[0])
	for _, l := range lines {
		trimmed := strings.TrimSpace(l)
		if trimmed != "" && !strings.HasPrefix(trimmed, "#") {
			firstLine = trimmed
			break
		}
	}
	if len(firstLine) > 48 {
		return firstLine[:45] + "..."
	}
	if firstLine == "" {
		return "Arena Session"
	}
	return firstLine
}

func (s *SQLiteStore) GetThread(id string) (*domain.Thread, error) {
	s.mu.Lock()
	defer s.mu.Unlock()

	var th domain.Thread
	err := s.db.QueryRow(`
		SELECT 
			t.id, 
			t.title, 
			t.created_at, 
			t.updated_at,
			COALESCE(
				(SELECT tu.user_prompt FROM turns tu WHERE tu.thread_id = t.id ORDER BY tu.created_at ASC LIMIT 1),
				''
			) AS first_prompt,
			(SELECT COUNT(*) FROM turns tu WHERE tu.thread_id = t.id) AS turn_count
		FROM threads t WHERE t.id = ?`, id).
		Scan(&th.ID, &th.Title, &th.CreatedAt, &th.UpdatedAt, &th.FirstPrompt, &th.TurnCount)
	if err != nil {
		return nil, err
	}
	return &th, nil
}

func (s *SQLiteStore) ListThreads() ([]domain.Thread, error) {
	s.mu.Lock()
	defer s.mu.Unlock()

	query := `
	SELECT 
		t.id, 
		t.title, 
		t.created_at, 
		t.updated_at,
		COALESCE(
			(SELECT tu.user_prompt FROM turns tu WHERE tu.thread_id = t.id ORDER BY tu.created_at ASC LIMIT 1),
			''
		) AS first_prompt,
		(SELECT COUNT(*) FROM turns tu WHERE tu.thread_id = t.id) AS turn_count
	FROM threads t 
	ORDER BY t.updated_at DESC`

	rows, err := s.db.Query(query)
	if err != nil {
		return nil, err
	}
	defer rows.Close()

	var threads []domain.Thread
	for rows.Next() {
		var th domain.Thread
		if err := rows.Scan(&th.ID, &th.Title, &th.CreatedAt, &th.UpdatedAt, &th.FirstPrompt, &th.TurnCount); err == nil {
			threads = append(threads, th)
		}
	}
	return threads, nil
}

func (s *SQLiteStore) SearchThreads(query string) ([]domain.Thread, error) {
	s.mu.Lock()
	defer s.mu.Unlock()

	searchParam := "%" + query + "%"
	sqlQuery := `
	SELECT 
		t.id, 
		t.title, 
		t.created_at, 
		t.updated_at,
		COALESCE(
			(SELECT tu.user_prompt FROM turns tu WHERE tu.thread_id = t.id ORDER BY tu.created_at ASC LIMIT 1),
			''
		) AS first_prompt,
		(SELECT COUNT(*) FROM turns tu WHERE tu.thread_id = t.id) AS turn_count
	FROM threads t
	WHERE t.title LIKE ? 
	   OR t.id IN (SELECT DISTINCT thread_id FROM turns WHERE user_prompt LIKE ?)
	   OR t.id IN (SELECT DISTINCT tu.thread_id FROM turns tu JOIN model_responses mr ON tu.id = mr.turn_id WHERE mr.content LIKE ?)
	ORDER BY t.updated_at DESC
	`
	rows, err := s.db.Query(sqlQuery, searchParam, searchParam, searchParam)
	if err != nil {
		return nil, err
	}
	defer rows.Close()

	var threads []domain.Thread
	for rows.Next() {
		var th domain.Thread
		if err := rows.Scan(&th.ID, &th.Title, &th.CreatedAt, &th.UpdatedAt, &th.FirstPrompt, &th.TurnCount); err == nil {
			threads = append(threads, th)
		}
	}
	return threads, nil
}

func (s *SQLiteStore) DeleteThread(id string) error {
	s.mu.Lock()
	defer s.mu.Unlock()

	_, err := s.db.Exec(`DELETE FROM threads WHERE id = ?`, id)
	return err
}

func (s *SQLiteStore) CreateTurn(threadID string, userPrompt string) (*domain.MessageTurn, error) {
	s.mu.Lock()
	defer s.mu.Unlock()

	now := time.Now()
	turnID := fmt.Sprintf("turn_%d", now.UnixNano())

	_, err := s.db.Exec(`INSERT INTO turns (id, thread_id, user_prompt, created_at) VALUES (?, ?, ?, ?)`,
		turnID, threadID, userPrompt, now)
	if err != nil {
		return nil, err
	}

	// Auto-title thread from first prompt if title is default
	var currentTitle string
	_ = s.db.QueryRow(`SELECT title FROM threads WHERE id = ?`, threadID).Scan(&currentTitle)
	if currentTitle == "New Session" || currentTitle == "New Arena Session" || currentTitle == "" {
		newTitle := cleanTitleFromPrompt(userPrompt)
		_, _ = s.db.Exec(`UPDATE threads SET title = ?, updated_at = ? WHERE id = ?`, newTitle, now, threadID)
	} else {
		// Update thread updated_at timestamp
		_, _ = s.db.Exec(`UPDATE threads SET updated_at = ? WHERE id = ?`, now, threadID)
	}

	return &domain.MessageTurn{
		ID:         turnID,
		ThreadID:   threadID,
		UserPrompt: userPrompt,
		CreatedAt:  now,
		Responses:  make(map[string]domain.ModelResponse),
	}, nil
}

func (s *SQLiteStore) GetTurn(turnID string) (*domain.MessageTurn, error) {
	s.mu.Lock()
	defer s.mu.Unlock()

	var turn domain.MessageTurn
	err := s.db.QueryRow(`SELECT id, thread_id, user_prompt, created_at FROM turns WHERE id = ?`, turnID).
		Scan(&turn.ID, &turn.ThreadID, &turn.UserPrompt, &turn.CreatedAt)
	if err != nil {
		return nil, err
	}

	turn.Responses = make(map[string]domain.ModelResponse)
	rows, err := s.db.Query(`SELECT id, turn_id, provider_id, model, content, status, error, latency_ms, tokens, created_at FROM model_responses WHERE turn_id = ?`, turnID)
	if err == nil {
		defer rows.Close()
		for rows.Next() {
			var resp domain.ModelResponse
			if err := rows.Scan(&resp.ID, &resp.TurnID, &resp.ProviderID, &resp.Model, &resp.Content, &resp.Status, &resp.Error, &resp.LatencyMs, &resp.Tokens, &resp.CreatedAt); err == nil {
				key := resp.ProviderID + ":" + resp.Model
				turn.Responses[key] = resp
			}
		}
	}

	return &turn, nil
}

func (s *SQLiteStore) ListTurns(threadID string) ([]domain.MessageTurn, error) {
	s.mu.Lock()
	defer s.mu.Unlock()

	rows, err := s.db.Query(`SELECT id, thread_id, user_prompt, created_at FROM turns WHERE thread_id = ? ORDER BY created_at ASC`, threadID)
	if err != nil {
		return nil, err
	}
	defer rows.Close()

	var turns []domain.MessageTurn
	for rows.Next() {
		var turn domain.MessageTurn
		if err := rows.Scan(&turn.ID, &turn.ThreadID, &turn.UserPrompt, &turn.CreatedAt); err == nil {
			turn.Responses = make(map[string]domain.ModelResponse)
			turns = append(turns, turn)
		}
	}

	// Fetch model responses for all turns
	for i := range turns {
		respRows, err := s.db.Query(`SELECT id, turn_id, provider_id, model, content, status, error, latency_ms, tokens, created_at FROM model_responses WHERE turn_id = ?`, turns[i].ID)
		if err == nil {
			for respRows.Next() {
				var resp domain.ModelResponse
				if err := respRows.Scan(&resp.ID, &resp.TurnID, &resp.ProviderID, &resp.Model, &resp.Content, &resp.Status, &resp.Error, &resp.LatencyMs, &resp.Tokens, &resp.CreatedAt); err == nil {
					key := resp.ProviderID + ":" + resp.Model
					turns[i].Responses[key] = resp
				}
			}
			respRows.Close()
		}
	}

	return turns, nil
}

func (s *SQLiteStore) SaveModelResponse(resp domain.ModelResponse) error {
	s.mu.Lock()
	defer s.mu.Unlock()

	query := `
	INSERT INTO model_responses (id, turn_id, provider_id, model, content, status, error, latency_ms, tokens, created_at)
	VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?)
	ON CONFLICT(id) DO UPDATE SET
		content = excluded.content,
		status = excluded.status,
		error = excluded.error,
		latency_ms = excluded.latency_ms,
		tokens = excluded.tokens;
	`
	_, err := s.db.Exec(query, resp.ID, resp.TurnID, resp.ProviderID, resp.Model, resp.Content, resp.Status, resp.Error, resp.LatencyMs, resp.Tokens, resp.CreatedAt)
	return err
}

func (s *SQLiteStore) SaveMerge(record domain.MergeRecord) error {
	s.mu.Lock()
	defer s.mu.Unlock()

	sourceJSON, _ := json.Marshal(record.SourceModels)
	segmentsJSON, _ := json.Marshal(record.Segments)

	query := `
	INSERT INTO merge_records (id, thread_id, turn_id, source_models_json, merged_text, segments_json, strategy, created_at)
	VALUES (?, ?, ?, ?, ?, ?, ?, ?)
	`
	_, err := s.db.Exec(query, record.ID, record.ThreadID, record.TurnID, string(sourceJSON), record.MergedText, string(segmentsJSON), record.Strategy, record.CreatedAt)
	return err
}

func (s *SQLiteStore) ListMerges(threadID string) ([]domain.MergeRecord, error) {
	s.mu.Lock()
	defer s.mu.Unlock()

	rows, err := s.db.Query(`SELECT id, thread_id, turn_id, source_models_json, merged_text, segments_json, strategy, created_at FROM merge_records WHERE thread_id = ? ORDER BY created_at ASC`, threadID)
	if err != nil {
		return nil, err
	}
	defer rows.Close()

	var records []domain.MergeRecord
	for rows.Next() {
		var rec domain.MergeRecord
		var srcJSON, segJSON string
		if err := rows.Scan(&rec.ID, &rec.ThreadID, &rec.TurnID, &srcJSON, &rec.MergedText, &segJSON, &rec.Strategy, &rec.CreatedAt); err == nil {
			_ = json.Unmarshal([]byte(srcJSON), &rec.SourceModels)
			_ = json.Unmarshal([]byte(segJSON), &rec.Segments)
			records = append(records, rec)
		}
	}
	return records, nil
}
