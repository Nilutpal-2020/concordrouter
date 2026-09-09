package humanize

import (
	"context"
	"encoding/json"
	"net/http"
	"net/url"
	"os"
	"regexp"
	"strings"
	"time"
	"unicode"
)

var (
	doubleSpaceRegex      = regexp.MustCompile(`[ \t]{2,}`)
	doubleCommaRegex      = regexp.MustCompile(`,\s*,`)
	doublePeriodRegex     = regexp.MustCompile(`\.\s*\.`)
	spaceBeforePunctRegex = regexp.MustCompile(`\s+([,.;:!?])`)
	aBeforeVowelRegex     = regexp.MustCompile(`(?i)\ba\s+([aeiou][a-z]+)`)
	anBeforeConsonantRegex = regexp.MustCompile(`(?i)\ban\s+([bcdfghjklmnpqrstvwxyz][a-z]+)`)
)

var duplicateWordRegexes = []*regexp.Regexp{
	regexp.MustCompile(`(?i)\bthe\s+the\b`),
	regexp.MustCompile(`(?i)\ba\s+a\b`),
	regexp.MustCompile(`(?i)\ban\s+an\b`),
	regexp.MustCompile(`(?i)\bin\s+in\b`),
	regexp.MustCompile(`(?i)\bon\s+on\b`),
	regexp.MustCompile(`(?i)\bat\s+at\b`),
	regexp.MustCompile(`(?i)\bof\s+of\b`),
	regexp.MustCompile(`(?i)\bto\s+to\b`),
	regexp.MustCompile(`(?i)\bis\s+is\b`),
}

// PostTransformSanityCheck repairs any punctuation, spacing, or casing discrepancies created by rule rewrites
func PostTransformSanityCheck(text string) string {
	cleaned := text

	// 1. Remove duplicate punctuation and fix spacing before punctuation
	cleaned = spaceBeforePunctRegex.ReplaceAllString(cleaned, "$1")
	cleaned = doubleCommaRegex.ReplaceAllString(cleaned, ",")
	cleaned = doublePeriodRegex.ReplaceAllString(cleaned, ".")

	// 2. Remove accidentally duplicated functional words ("the the")
	for _, re := range duplicateWordRegexes {
		cleaned = re.ReplaceAllStringFunc(cleaned, func(m string) string {
			fields := strings.Fields(m)
			if len(fields) > 0 {
				return fields[0]
			}
			return m
		})
	}

	// 3. Fix "a/an" agreement where obvious
	cleaned = aBeforeVowelRegex.ReplaceAllStringFunc(cleaned, func(m string) string {
		parts := strings.Fields(m)
		if len(parts) == 2 {
			w := parts[1]
			// Avoid "a user", "a university", "a one"
			if strings.HasPrefix(strings.ToLower(w), "uni") || strings.HasPrefix(strings.ToLower(w), "use") || strings.HasPrefix(strings.ToLower(w), "one") {
				return m
			}
			if unicode.IsUpper([]rune(parts[0])[0]) {
				return "An " + parts[1]
			}
			return "an " + parts[1]
		}
		return m
	})

	cleaned = anBeforeConsonantRegex.ReplaceAllStringFunc(cleaned, func(m string) string {
		parts := strings.Fields(m)
		if len(parts) == 2 {
			w := parts[1]
			// Avoid "an hour", "an honest", "an honor"
			if strings.HasPrefix(strings.ToLower(w), "hour") || strings.HasPrefix(strings.ToLower(w), "honest") || strings.HasPrefix(strings.ToLower(w), "honor") {
				return m
			}
			if unicode.IsUpper([]rune(parts[0])[0]) {
				return "A " + parts[1]
			}
			return "a " + parts[1]
		}
		return m
	})

	// 4. Ensure capitalization after sentence terminal punctuation
	var sb strings.Builder
	runes := []rune(cleaned)
	n := len(runes)
	capitalizeNext := false

	for i := 0; i < n; i++ {
		r := runes[i]
		if capitalizeNext && unicode.IsLetter(r) {
			sb.WriteRune(unicode.ToUpper(r))
			capitalizeNext = false
		} else {
			sb.WriteRune(r)
			if r == '.' || r == '!' || r == '?' {
				capitalizeNext = true
			} else if !unicode.IsSpace(r) {
				capitalizeNext = false
			}
		}
	}
	cleaned = sb.String()

	// 5. Consolidate excess whitespace
	cleaned = doubleSpaceRegex.ReplaceAllString(cleaned, " ")

	return strings.TrimSpace(cleaned)
}

// CheckLanguageToolOptional queries a local LanguageTool instance if configured via LANGUAGETOOL_URL
func CheckLanguageToolOptional(ctx context.Context, text string) ([]string, error) {
	ltURL := strings.TrimRight(os.Getenv("LANGUAGETOOL_URL"), "/")
	if ltURL == "" {
		return nil, nil // Not configured, skip
	}

	data := url.Values{}
	data.Set("text", text)
	data.Set("language", "en-US")

	req, err := http.NewRequestWithContext(ctx, "POST", ltURL+"/v2/check", strings.NewReader(data.Encode()))
	if err != nil {
		return nil, err
	}
	req.Header.Set("Content-Type", "application/x-www-form-urlencoded")

	client := &http.Client{Timeout: 2 * time.Second}
	resp, err := client.Do(req)
	if err != nil {
		return nil, err
	}
	defer resp.Body.Close()

	var result struct {
		Matches []struct {
			Message string `json:"message"`
		} `json:"matches"`
	}
	if err := json.NewDecoder(resp.Body).Decode(&result); err != nil {
		return nil, err
	}

	var issues []string
	for _, m := range result.Matches {
		issues = append(issues, m.Message)
	}
	return issues, nil
}
