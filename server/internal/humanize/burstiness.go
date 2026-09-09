package humanize

import (
	"math"
	"regexp"
	"strings"
)

// SentenceStats represents the statistical distribution of sentence lengths
type SentenceStats struct {
	Count       int     `json:"count"`
	MeanWords   float64 `json:"meanWords"`
	StdDev      float64 `json:"stdDev"`
	Variance    float64 `json:"variance"`
	Burstiness  float64 `json:"burstiness"` // Normalized burstiness [-1, 1]
	MinWords    int     `json:"minWords"`
	MaxWords    int     `json:"maxWords"`
}

var wordSplitRegex = regexp.MustCompile(`\s+`)

// Coordinating conjunctions suitable for sentence splitting
var conjSplitRegex = regexp.MustCompile(`(?i),\s+(and|but|yet|so|while|whereas|although)\s+`)

// Abbreviations to avoid false splits
var abbrevRegex = regexp.MustCompile(`(?i)\b(e\.g|i\.e|vs|etc|mr|mrs|ms|dr|prof|inc|ltd|approx|dept|govt|fig|no)\.\s*$`)

// ExtractSentences splits text into clean sentences, preserving structural integrity
func ExtractSentences(text string) []string {
	var sentences []string
	paragraphs := strings.Split(text, "\n")
	for _, p := range paragraphs {
		trimmed := strings.TrimSpace(p)
		if trimmed == "" {
			continue
		}
		// Avoid breaking fenced code or markdown headers
		if strings.HasPrefix(trimmed, "```") || strings.HasPrefix(trimmed, "#") {
			sentences = append(sentences, trimmed)
			continue
		}

		rawSentences := splitProseSentences(trimmed)
		for _, s := range rawSentences {
			sTrimmed := strings.TrimSpace(s)
			if sTrimmed != "" {
				sentences = append(sentences, sTrimmed)
			}
		}
	}
	return sentences
}

func splitProseSentences(paragraph string) []string {
	var res []string
	var cur strings.Builder
	runes := []rune(paragraph)
	n := len(runes)

	for i := 0; i < n; i++ {
		ch := runes[i]
		cur.WriteRune(ch)

		if ch == '.' || ch == '!' || ch == '?' {
			// Check if part of an ellipsis
			if i+1 < n && (runes[i+1] == '.' || runes[i+1] == '!' || runes[i+1] == '?') {
				continue
			}
			// Check abbreviation
			currentStr := cur.String()
			if abbrevRegex.MatchString(currentStr) {
				continue
			}
			// If followed by space or end
			if i+1 == n || (i+1 < n && (runes[i+1] == ' ' || runes[i+1] == '\t' || runes[i+1] == '\n')) {
				res = append(res, strings.TrimSpace(cur.String()))
				cur.Reset()
				for i+1 < n && (runes[i+1] == ' ' || runes[i+1] == '\t' || runes[i+1] == '\n') {
					i++
				}
			}
		}
	}
	if cur.Len() > 0 {
		trimmed := strings.TrimSpace(cur.String())
		if trimmed != "" {
			res = append(res, trimmed)
		}
	}
	return res
}

// CountWords returns the word count of a sentence
func CountWords(s string) int {
	words := wordSplitRegex.Split(strings.TrimSpace(s), -1)
	count := 0
	for _, w := range words {
		if strings.TrimSpace(w) != "" {
			count++
		}
	}
	return count
}

// ComputeSentenceStats calculates mean, standard deviation, and burstiness coefficient
// Burstiness is defined as (sigma - mu) / (sigma + mu)
func ComputeSentenceStats(sentences []string) SentenceStats {
	var validLengths []float64
	minW, maxW := 0, 0

	for _, s := range sentences {
		// Ignore code blocks and markdown headers
		if strings.HasPrefix(s, "```") || strings.HasPrefix(s, "#") {
			continue
		}
		wc := CountWords(s)
		if wc == 0 {
			continue
		}
		if minW == 0 || wc < minW {
			minW = wc
		}
		if wc > maxW {
			maxW = wc
		}
		validLengths = append(validLengths, float64(wc))
	}

	count := len(validLengths)
	if count == 0 {
		return SentenceStats{}
	}

	sum := 0.0
	for _, l := range validLengths {
		sum += l
	}
	mean := sum / float64(count)

	var varianceSum float64
	for _, l := range validLengths {
		diff := l - mean
		varianceSum += diff * diff
	}
	variance := varianceSum / float64(count)
	stdDev := math.Sqrt(variance)

	// Normalized burstiness in range [-1, 1]
	burstiness := 0.0
	if stdDev+mean > 0 {
		burstiness = (stdDev - mean) / (stdDev + mean)
	}

	return SentenceStats{
		Count:      count,
		MeanWords:  roundDec(mean, 2),
		StdDev:     roundDec(stdDev, 2),
		Variance:   roundDec(variance, 2),
		Burstiness: roundDec(burstiness, 3),
		MinWords:   minW,
		MaxWords:   maxW,
	}
}

// InjectBurstiness perturbs sentence lengths to push variance closer to human baseline distributions.
// Merges adjacent short sentences (<7 words) and splits overly long sentences (>30 words).
func InjectBurstiness(text string) (string, int, int) {
	paragraphs := strings.Split(text, "\n")
	var transformedParas []string
	splitsCount := 0
	joinsCount := 0

	for _, p := range paragraphs {
		trimmed := strings.TrimSpace(p)
		if trimmed == "" || strings.HasPrefix(trimmed, "```") || strings.HasPrefix(trimmed, "#") {
			transformedParas = append(transformedParas, p)
			continue
		}

		sents := splitProseSentences(trimmed)
		if len(sents) == 0 {
			transformedParas = append(transformedParas, p)
			continue
		}

		// Step 1: Split excessively uniform or overly long sentences (> 30 words)
		var step1 []string
		for _, s := range sents {
			wCount := CountWords(s)
			if wCount > 30 && conjSplitRegex.MatchString(s) {
				splitResult := splitLongSentence(s)
				if len(splitResult) > 1 {
					step1 = append(step1, splitResult...)
					splitsCount += len(splitResult) - 1
					continue
				}
			}
			step1 = append(step1, s)
		}

		// Step 2: Combine short staccato sentences (< 6 words) if adjacent to another short sentence
		var step2 []string
		for i := 0; i < len(step1); i++ {
			cur := step1[i]
			curWords := CountWords(cur)

			if curWords < 6 && i+1 < len(step1) {
				next := step1[i+1]
				nextWords := CountWords(next)
				// If next is also short or medium (< 14 words), merge them smoothly
				if nextWords < 14 && canMergeSentences(cur, next) {
					merged := mergeSentences(cur, next)
					step2 = append(step2, merged)
					joinsCount++
					i++ // skip next
					continue
				}
			}
			step2 = append(step2, cur)
		}

		transformedParas = append(transformedParas, strings.Join(step2, " "))
	}

	return strings.Join(transformedParas, "\n"), splitsCount, joinsCount
}

func splitLongSentence(s string) []string {
	// Find the first major coordinating conjunction near the middle
	loc := conjSplitRegex.FindStringSubmatchIndex(s)
	if len(loc) >= 4 {
		matchStart := loc[0]
		matchEnd := loc[1]
		wordGroupStart := loc[2]
		wordGroupEnd := loc[3]

		conjunction := s[wordGroupStart:wordGroupEnd]
		left := strings.TrimSpace(s[:matchStart])
		right := strings.TrimSpace(s[matchEnd:])

		// Ensure both sides have enough substance (at least 5 words each)
		if CountWords(left) >= 5 && CountWords(right) >= 5 {
			capitalizedRight := capitalizeFirst(right)
			if strings.ToLower(conjunction) == "and" {
				return []string{left + ".", capitalizedRight}
			}
			return []string{left + ".", conjunctionCapitalized(conjunction) + ", " + right}
		}
	}
	return []string{s}
}

func canMergeSentences(s1, s2 string) bool {
	if strings.HasSuffix(s1, "?") || strings.HasSuffix(s1, "!") {
		return false
	}
	if strings.HasSuffix(s2, "?") || strings.HasSuffix(s2, "!") {
		return false
	}
	if strings.Contains(s1, "\"") || strings.Contains(s2, "\"") {
		return false
	}
	return true
}

func mergeSentences(s1, s2 string) string {
	s1Clean := strings.TrimRight(strings.TrimSpace(s1), ".?!;")
	s2Clean := strings.TrimSpace(s2)
	firstWord := strings.Fields(s2Clean)
	if len(firstWord) > 0 && firstWord[0] != "I" && !isAllUpper(firstWord[0]) {
		s2Clean = uncapitalizeFirst(s2Clean)
	}

	return s1Clean + ", and " + s2Clean
}

func capitalizeFirst(s string) string {
	if s == "" {
		return ""
	}
	r := []rune(s)
	return strings.ToUpper(string(r[0])) + string(r[1:])
}

func uncapitalizeFirst(s string) string {
	if s == "" {
		return ""
	}
	r := []rune(s)
	return strings.ToLower(string(r[0])) + string(r[1:])
}

func conjunctionCapitalized(conj string) string {
	c := strings.ToLower(conj)
	switch c {
	case "but":
		return "However"
	case "while":
		return "Meanwhile"
	case "although":
		return "Still"
	default:
		return capitalizeFirst(conj)
	}
}

func isAllUpper(s string) bool {
	clean := strings.Trim(s, ",.;:!?")
	return len(clean) > 1 && clean == strings.ToUpper(clean)
}

func roundDec(val float64, precision int) float64 {
	ratio := math.Pow(10, float64(precision))
	return math.Round(val*ratio) / ratio
}
