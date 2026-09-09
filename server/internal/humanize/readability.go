package humanize

import (
	"regexp"
	"strings"
	"unicode"
)

// ReadabilityMetrics holds readability scores for text
type ReadabilityMetrics struct {
	FleschKincaidGrade float64 `json:"fleschKincaidGrade"`
	GunningFogIndex    float64 `json:"gunningFogIndex"`
	SyllablesPerWord   float64 `json:"syllablesPerWord"`
	ComplexWordPercent float64 `json:"complexWordPercent"`
}

var vowelRegex = regexp.MustCompile(`[aeiouy]+`)

// CountSyllables estimates the syllable count of an English word
func CountSyllables(word string) int {
	w := strings.ToLower(strings.TrimSpace(word))
	// Clean non-letters
	var sb strings.Builder
	for _, r := range w {
		if unicode.IsLetter(r) {
			sb.WriteRune(r)
		}
	}
	clean := sb.String()
	if len(clean) == 0 {
		return 1
	}
	if len(clean) <= 3 {
		return 1
	}

	// Remove trailing 'e' if preceded by consonant (silent e)
	if strings.HasSuffix(clean, "e") && !strings.HasSuffix(clean, "le") && !strings.HasSuffix(clean, "ee") {
		clean = clean[:len(clean)-1]
	}

	// Count contiguous vowel clusters
	matches := vowelRegex.FindAllString(clean, -1)
	count := len(matches)
	if count == 0 {
		return 1
	}
	return count
}

// ComputeReadability evaluates Flesch-Kincaid Grade Level and Gunning-Fog Index
func ComputeReadability(text string) ReadabilityMetrics {
	sentences := ExtractSentences(text)
	totalSentences := len(sentences)
	if totalSentences == 0 {
		return ReadabilityMetrics{}
	}

	tokens := TokenizeProse(text)
	totalWords := len(tokens)
	if totalWords == 0 {
		return ReadabilityMetrics{}
	}

	totalSyllables := 0
	complexWords := 0

	for _, token := range tokens {
		syl := CountSyllables(token)
		totalSyllables += syl
		if syl >= 3 {
			complexWords++
		}
	}

	wordsPerSentence := float64(totalWords) / float64(totalSentences)
	syllablesPerWord := float64(totalSyllables) / float64(totalWords)
	complexWordPercent := (float64(complexWords) / float64(totalWords)) * 100.0

	// Flesch-Kincaid Grade Level: 0.39 * (words / sentences) + 11.8 * (syllables / words) - 15.59
	fkGrade := 0.39*wordsPerSentence + 11.8*syllablesPerWord - 15.59
	if fkGrade < 0 {
		fkGrade = 0
	}

	// Gunning-Fog: 0.4 * ((words / sentences) + 100 * (complex words / words))
	gunningFog := 0.4 * (wordsPerSentence + complexWordPercent)
	if gunningFog < 0 {
		gunningFog = 0
	}

	return ReadabilityMetrics{
		FleschKincaidGrade: roundDec(fkGrade, 1),
		GunningFogIndex:    roundDec(gunningFog, 1),
		SyllablesPerWord:   roundDec(syllablesPerWord, 2),
		ComplexWordPercent: roundDec(complexWordPercent, 1),
	}
}

// Contractions map for conversational de-stiffening
var formalToContraction = []struct {
	formal      *regexp.Regexp
	contraction string
}{
	{formal: regexp.MustCompile(`(?i)\bdo\s+not\b`), contraction: "don't"},
	{formal: regexp.MustCompile(`(?i)\bcannot\b`), contraction: "can't"},
	{formal: regexp.MustCompile(`(?i)\bcan\s+not\b`), contraction: "can't"},
	{formal: regexp.MustCompile(`(?i)\bwill\s+not\b`), contraction: "won't"},
	{formal: regexp.MustCompile(`(?i)\bshould\s+not\b`), contraction: "shouldn't"},
	{formal: regexp.MustCompile(`(?i)\bwould\s+not\b`), contraction: "wouldn't"},
	{formal: regexp.MustCompile(`(?i)\bcould\s+not\b`), contraction: "couldn't"},
	{formal: regexp.MustCompile(`(?i)\bthere\s+is\b`), contraction: "there's"},
	{formal: regexp.MustCompile(`(?i)\bthat\s+is\b`), contraction: "that's"},
	{formal: regexp.MustCompile(`(?i)\bthey\s+are\b`), contraction: "they're"},
	{formal: regexp.MustCompile(`(?i)\bwe\s+are\b`), contraction: "we're"},
	{formal: regexp.MustCompile(`(?i)\byou\s+are\b`), contraction: "you're"},
}

// ApplyNaturalContractions softens overly rigid, textbook-style prose
func ApplyNaturalContractions(text string) (string, int) {
	result := text
	count := 0

	for _, c := range formalToContraction {
		matches := c.formal.FindAllStringIndex(result, -1)
		for i := len(matches) - 1; i >= 0; i-- {
			start := matches[i][0]
			end := matches[i][1]
			matched := result[start:end]

			replacement := c.contraction
			if unicode.IsUpper([]rune(matched)[0]) {
				replacement = capitalizeFirstRune(replacement)
			}
			result = result[:start] + replacement + result[end:]
			count++
		}
	}

	return result, count
}
