package humanize

import (
	"bytes"
	"context"
	"encoding/json"
	"net/http"
	"os"
	"regexp"
	"strings"
	"time"
)

// SyntaxRestructurer provides clause inversion and subordination variation
type SyntaxRestructurer struct {
	sidecarURL string
	httpClient *http.Client
}

// NewSyntaxRestructurer initializes the syntax processor with optional sidecar support
func NewSyntaxRestructurer() *SyntaxRestructurer {
	sidecarURL := strings.TrimRight(os.Getenv("HUMANIZE_SIDECAR_URL"), "/")
	return &SyntaxRestructurer{
		sidecarURL: sidecarURL,
		httpClient: &http.Client{Timeout: 3 * time.Second},
	}
}

// Subordinate clause introductory patterns: e.g., "Although X, Y" or "Because X, Y"
var introductoryClauseRegex = regexp.MustCompile(`^(?i)(Although|Even though|Because|Since|While)\s+([^,]+),\s+([^.!?]+)([.!?;])`)

// RestructureClauses applies syntactic restructuring to break predictable clause templates
func (sr *SyntaxRestructurer) RestructureClauses(ctx context.Context, text string) (string, int) {
	// If sidecar is available, attempt sidecar first
	if sr.sidecarURL != "" {
		transformed, count, err := sr.callSidecar(ctx, text)
		if err == nil {
			return transformed, count
		}
		// Fallback to pure Go rules on sidecar failure
	}

	return sr.applyPureGoClauseRestructuring(text)
}

func (sr *SyntaxRestructurer) applyPureGoClauseRestructuring(text string) (string, int) {
	sentences := ExtractSentences(text)
	count := 0
	var transformedSentences []string

	for _, s := range sentences {
		// Rule 1: Occasional fronting inversion: "Although A, B." -> "B, although A."
		if matches := introductoryClauseRegex.FindStringSubmatch(s); len(matches) == 5 {
			subConj := strings.ToLower(matches[1])
			clauseA := matches[2]
			clauseB := matches[3]
			punct := matches[4]

			// Capitalize clauseB, lower clauseA
			inverted := capitalizeFirstRune(clauseB) + ", " + subConj + " " + uncapitalizeFirstRune(clauseA) + punct
			transformedSentences = append(transformedSentences, inverted)
			count++
			continue
		}

		transformedSentences = append(transformedSentences, s)
	}

	if count > 0 {
		return strings.Join(transformedSentences, " "), count
	}
	return text, 0
}

func (sr *SyntaxRestructurer) callSidecar(ctx context.Context, text string) (string, int, error) {
	reqBody, _ := json.Marshal(map[string]string{"text": text})
	req, err := http.NewRequestWithContext(ctx, "POST", sr.sidecarURL+"/syntactic_restructure", bytes.NewReader(reqBody))
	if err != nil {
		return text, 0, err
	}
	req.Header.Set("Content-Type", "application/json")

	resp, err := sr.httpClient.Do(req)
	if err != nil {
		return text, 0, err
	}
	defer resp.Body.Close()

	if resp.StatusCode != http.StatusOK {
		return text, 0, err
	}

	var res struct {
		Text  string `json:"text"`
		Count int    `json:"count"`
	}
	if err := json.NewDecoder(resp.Body).Decode(&res); err != nil {
		return text, 0, err
	}

	return res.Text, res.Count, nil
}
