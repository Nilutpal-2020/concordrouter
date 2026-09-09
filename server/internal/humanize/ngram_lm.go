package humanize

import (
	"math"
	"regexp"
	"strings"
)

// NGramModel provides lightweight statistical perplexity scoring and repetition smoothing
type NGramModel struct {
	unigramFreq map[string]float64
	bigramFreq  map[string]float64
	trigramFreq map[string]float64
	totalTokens float64
}

var cleanWordRegex = regexp.MustCompile(`[^\w\s]`)

// Common high-frequency English transition bigrams and trigrams for natural human prose reference
var referenceUnigramCounts = map[string]float64{
	"the": 60000, "be": 38000, "to": 32000, "of": 31000, "and": 29000,
	"a": 24000, "in": 21000, "that": 12000, "have": 11000, "i": 10500,
	"it": 10200, "for": 9500, "not": 8600, "on": 7300, "with": 7100,
	"he": 6900, "as": 6800, "you": 6600, "do": 5800, "at": 5400,
	"this": 5200, "but": 4900, "his": 4600, "by": 4400, "from": 4100,
	"they": 3900, "we": 3800, "say": 3700, "her": 3600, "she": 3500,
	"or": 3400, "an": 3200, "will": 3100, "my": 3000, "one": 2900,
	"all": 2800, "would": 2700, "there": 2600, "their": 2500, "what": 2400,
	"so": 2300, "up": 2200, "out": 2100, "if": 2000, "about": 1950,
	"who": 1900, "get": 1850, "which": 1800, "go": 1750, "me": 1700,
	"when": 1650, "make": 1600, "can": 1550, "like": 1500, "time": 1450,
	"no": 1400, "just": 1350, "him": 1300, "know": 1250, "take": 1200,
	"people": 1150, "into": 1100, "year": 1050, "your": 1000, "good": 950,
	"some": 900, "could": 880, "them": 850, "see": 820, "other": 800,
	"than": 780, "then": 760, "now": 740, "look": 720, "only": 700,
	"come": 680, "its": 660, "over": 640, "think": 620, "also": 600,
	"back": 580, "after": 560, "use": 540, "two": 520, "how": 500,
	"our": 480, "work": 460, "first": 440, "well": 420, "way": 400,
	"even": 380, "new": 360, "want": 340, "because": 320, "any": 300,
	"these": 280, "give": 260, "day": 240, "most": 220, "us": 200,
}

var referenceBigramCounts = map[string]float64{
	"of the": 8500, "in the": 7400, "to the": 5200, "on the": 3800,
	"for the": 3200, "to be": 3000, "at the": 2800, "and the": 2700,
	"with the": 2400, "is that": 2100, "it is": 2000, "that the": 1900,
	"from the": 1800, "as a": 1700, "in a": 1650, "by the": 1600,
	"this is": 1500, "will be": 1450, "one of": 1400, "such as": 1350,
	"part of": 1200, "can be": 1180, "has been": 1150, "have been": 1100,
	"as well": 1050, "well as": 1040, "there is": 1000, "there are": 980,
	"based on": 950, "more than": 920, "used to": 900, "due to": 880,
	"instead of": 750, "rather than": 720, "order to": 700,
}

// Global default n-gram model
var defaultNGramModel = newDefaultNGramModel()

func newDefaultNGramModel() *NGramModel {
	total := 0.0
	for _, c := range referenceUnigramCounts {
		total += c
	}
	return &NGramModel{
		unigramFreq: referenceUnigramCounts,
		bigramFreq:  referenceBigramCounts,
		trigramFreq: make(map[string]float64),
		totalTokens: total,
	}
}

// TokenizeProse cleans and extracts words for n-gram modeling
func TokenizeProse(text string) []string {
	lower := strings.ToLower(text)
	cleaned := cleanWordRegex.ReplaceAllString(lower, " ")
	tokens := strings.Fields(cleaned)
	return tokens
}

// EstimatePerplexity calculates cross-entropy perplexity under a human reference Markov model.
// LLM text tends to have uniformly lower perplexity, while human text exhibits higher dynamic range.
func EstimatePerplexity(text string) float64 {
	tokens := TokenizeProse(text)
	n := len(tokens)
	if n < 2 {
		return 35.0 // baseline default
	}

	model := defaultNGramModel
	logLikelihoodSum := 0.0
	evaluated := 0

	for i := 1; i < n; i++ {
		wPrev := tokens[i-1]
		wCur := tokens[i]
		bigramKey := wPrev + " " + wCur

		prob := 0.0
		if biCount, ok := model.bigramFreq[bigramKey]; ok {
			// Bigram probability with Laplace-style smoothing
			uniCount := model.unigramFreq[wPrev]
			if uniCount == 0 {
				uniCount = 10.0
			}
			prob = (biCount + 1.0) / (uniCount + 1000.0)
		} else if uniCount, ok := model.unigramFreq[wCur]; ok {
			// Backoff to unigram
			prob = (uniCount + 0.1) / (model.totalTokens + 10000.0)
		} else {
			// OOV floor
			prob = 1.0 / (model.totalTokens + 50000.0)
		}

		if prob > 0 {
			logLikelihoodSum += math.Log(prob)
			evaluated++
		}
	}

	if evaluated == 0 {
		return 35.0
	}

	entropy := -logLikelihoodSum / float64(evaluated)
	perplexity := math.Exp(entropy)

	// Clamp to reasonable human text reading bounds [10, 250]
	if perplexity < 10.0 {
		perplexity = 10.0
	} else if perplexity > 250.0 {
		perplexity = 250.0
	}

	return roundDec(perplexity, 2)
}

// RepetitivePhrasesToSmooth identifies recurring rhetorical n-grams across paragraphs
var recurringSkeletons = []struct {
	pattern     *regexp.Regexp
	replacement string
}{
	{
		pattern:     regexp.MustCompile(`(?i)\bnot\s+only\s+(.+?)\s+but\s+also\s+`),
		replacement: "both $1 and ",
	},
	{
		pattern:     regexp.MustCompile(`(?i)\bin\s+order\s+to\b`),
		replacement: "to",
	},
	{
		pattern:     regexp.MustCompile(`(?i)\ba\s+wide\s+range\s+of\b`),
		replacement: "various",
	},
	{
		pattern:     regexp.MustCompile(`(?i)\ba\s+broad\s+array\s+of\b`),
		replacement: "many different",
	},
	{
		pattern:     regexp.MustCompile(`(?i)\bwhen\s+it\s+comes\s+to\b`),
		replacement: "regarding",
	},
}

// SmoothNGramRepetitions breaks down recurring rhetorical skeletons that LLMs repeat across paragraphs
func SmoothNGramRepetitions(text string) (string, int) {
	smoothed := text
	replacementsCount := 0

	for _, rs := range recurringSkeletons {
		matches := rs.pattern.FindAllStringIndex(smoothed, -1)
		// If phrase occurs more than once in the draft, rewrite occurrences after the first
		if len(matches) > 1 {
			for i := len(matches) - 1; i >= 1; i-- {
				start := matches[i][0]
				end := matches[i][1]
				orig := smoothed[start:end]
				replaced := rs.pattern.ReplaceAllString(orig, rs.replacement)
				smoothed = smoothed[:start] + replaced + smoothed[end:]
				replacementsCount++
			}
		}
	}

	return smoothed, replacementsCount
}
