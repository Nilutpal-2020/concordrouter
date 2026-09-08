package merge

import (
	"math"
	"regexp"
	"strings"
	"unicode"
)

var wordRegex = regexp.MustCompile(`[a-zA-Z0-9_\-\.]+`)

var commonStopWords = map[string]bool{
	"a": true, "an": true, "the": true, "and": true, "or": true, "but": true,
	"in": true, "on": true, "at": true, "to": true, "for": true, "of": true,
	"with": true, "is": true, "are": true, "was": true, "were": true, "be": true,
	"been": true, "this": true, "that": true, "it": true, "as": true, "by": true,
}

// Tokenize converts text into clean lowercase word tokens
func Tokenize(text string) []string {
	words := wordRegex.FindAllString(strings.ToLower(text), -1)
	var tokens []string
	for _, w := range words {
		clean := strings.TrimFunc(w, func(r rune) bool {
			return unicode.IsPunct(r)
		})
		if len(clean) > 0 {
			tokens = append(tokens, clean)
		}
	}
	return tokens
}

// ExtractCharGrams extracts character n-grams for robust subword/stemming similarity
func ExtractCharGrams(text string, n int) map[string]float64 {
	clean := strings.ToLower(strings.Join(strings.Fields(text), " "))
	grams := make(map[string]float64)
	runes := []rune(clean)
	if len(runes) < n {
		if len(runes) > 0 {
			grams[string(runes)] = 1.0
		}
		return grams
	}
	for i := 0; i <= len(runes)-n; i++ {
		g := string(runes[i : i+n])
		grams[g]++
	}
	return grams
}

// ExtractNGrams creates word n-gram shingles (e.g. bigrams)
func ExtractNGrams(tokens []string, n int) map[string]int {
	ngrams := make(map[string]int)
	if len(tokens) < n {
		for _, t := range tokens {
			ngrams[t]++
		}
		return ngrams
	}

	for i := 0; i <= len(tokens)-n; i++ {
		shingle := strings.Join(tokens[i:i+n], " ")
		ngrams[shingle]++
	}
	return ngrams
}

// CosineSimilarity computes hybrid token, word-bigram, and character-trigram cosine similarity
func CosineSimilarity(textA, textB string) float64 {
	tokensA := Tokenize(textA)
	tokensB := Tokenize(textB)

	if len(tokensA) == 0 && len(tokensB) == 0 {
		return 1.0
	}
	if len(tokensA) == 0 || len(tokensB) == 0 {
		return 0.0
	}

	// Exact string equality
	if strings.TrimSpace(textA) == strings.TrimSpace(textB) {
		return 1.0
	}

	// 1. Word Token & Bigram Vector
	vecA := make(map[string]float64)
	vecB := make(map[string]float64)

	for _, t := range tokensA {
		weight := 1.5
		if commonStopWords[t] {
			weight = 0.2
		}
		vecA["w_"+t] += weight
	}

	for _, t := range tokensB {
		weight := 1.5
		if commonStopWords[t] {
			weight = 0.2
		}
		vecB["w_"+t] += weight
	}

	bigramsA := ExtractNGrams(tokensA, 2)
	for bg, cnt := range bigramsA {
		vecA["bg_"+bg] += float64(cnt) * 2.0
	}

	bigramsB := ExtractNGrams(tokensB, 2)
	for bg, cnt := range bigramsB {
		vecB["bg_"+bg] += float64(cnt) * 2.0
	}

	// 2. Character 3-grams for morphological / paraphrase overlap
	charGramsA := ExtractCharGrams(textA, 3)
	for cg, cnt := range charGramsA {
		vecA["cg_"+cg] += cnt * 0.4
	}

	charGramsB := ExtractCharGrams(textB, 3)
	for cg, cnt := range charGramsB {
		vecB["cg_"+cg] += cnt * 0.4
	}

	// Calculate dot product and magnitudes
	var dotProduct, magA, magB float64

	for term, valA := range vecA {
		magA += valA * valA
		if valB, ok := vecB[term]; ok {
			dotProduct += valA * valB
		}
	}

	for _, valB := range vecB {
		magB += valB * valB
	}

	if magA == 0 || magB == 0 {
		return 0.0
	}

	sim := dotProduct / (math.Sqrt(magA) * math.Sqrt(magB))
	if sim > 1.0 {
		sim = 1.0
	}
	if sim < 0.0 {
		sim = 0.0
	}
	return sim
}
