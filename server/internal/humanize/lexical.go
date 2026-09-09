package humanize

import (
	"math/rand"
	"regexp"
	"unicode"
)

// TellReplacement defines a search pattern, replacements, and grammatical classification
type TellReplacement struct {
	Pattern     *regexp.Regexp
	Name        string
	Options     []string
	IsPhrase    bool
	DropOption  bool // If true, phrase can simply be cleanly removed with capitalization fix
}

var tellReplacements = []TellReplacement{
	// Phrases (Ordered first to catch multi-word markers before single-word matches)
	{
		Pattern:    regexp.MustCompile(`(?i)\b(?:it\s+is|it's)\s+important\s+to\s+(?:note|remember|keep\s+in\s+mind)\s+(?:that\s+)?`),
		Name:       "it is important to note",
		Options:    []string{"Notably, ", "Notice that ", "Importantly, "},
		IsPhrase:   true,
		DropOption: true,
	},
	{
		Pattern:    regexp.MustCompile(`(?i)\b(?:it\s+is|it's)\s+worth\s+noting\s+(?:that\s+)?`),
		Name:       "it is worth noting",
		Options:    []string{"Notably, ", "Worth observing, "},
		IsPhrase:   true,
		DropOption: true,
	},
	{
		Pattern:    regexp.MustCompile(`(?i)\b(?:serves|stands)\s+as\s+a\s+testament\s+to\b`),
		Name:       "serves as a testament to",
		Options:    []string{"shows", "highlights", "reflects", "demonstrates"},
		IsPhrase:   true,
	},
	{
		Pattern:    regexp.MustCompile(`(?i)\bplays?\s+a\s+(?:pivotal|crucial|vital|key)\s+role\s+in\b`),
		Name:       "plays a pivotal role in",
		Options:    []string{"is central to", "shapes", "strongly influences", "matters for"},
		IsPhrase:   true,
	},
	{
		Pattern:    regexp.MustCompile(`(?i)\bin\s+conclusion,?\s*`),
		Name:       "in conclusion",
		Options:    []string{"Overall, ", "In short, ", "To wrap up, ", "Taken together, "},
		IsPhrase:   true,
	},
	{
		Pattern:    regexp.MustCompile(`(?i)\bin\s+summary,?\s*`),
		Name:       "in summary",
		Options:    []string{"In brief, ", "All in all, ", "Put simply, "},
		IsPhrase:   true,
	},
	{
		Pattern:    regexp.MustCompile(`(?i)\bat\s+its\s+core,?\s*`),
		Name:       "at its core",
		Options:    []string{"Fundamentally, ", "Basically, ", "Essentially, "},
		IsPhrase:   true,
	},
	{
		Pattern:    regexp.MustCompile(`(?i)\bdelve(?:s|d)?\s+into\b`),
		Name:       "delve into",
		Options:    []string{"explore", "look into", "examine", "investigate"},
		IsPhrase:   true,
	},
	{
		Pattern:    regexp.MustCompile(`(?i)\bdelve\b`),
		Name:       "delve",
		Options:    []string{"dig", "explore", "look deeper", "examine"},
		IsPhrase:   false,
	},

	// Adverbial transition markers
	{
		Pattern:  regexp.MustCompile(`(?i)\bmoreover,?\b`),
		Name:     "moreover",
		Options:  []string{"also,", "plus,", "further,", "in addition,"},
		IsPhrase: false,
	},
	{
		Pattern:  regexp.MustCompile(`(?i)\bfurthermore,?\b`),
		Name:     "furthermore",
		Options:  []string{"also,", "on top of that,", "besides,", "what's more,"},
		IsPhrase: false,
	},
	{
		Pattern:  regexp.MustCompile(`(?i)\bseamlessly\b`),
		Name:     "seamlessly",
		Options:  []string{"smoothly", "cleanly", "directly", "without friction"},
		IsPhrase: false,
	},
	{
		Pattern:  regexp.MustCompile(`(?i)\bmeticulously\b`),
		Name:     "meticulously",
		Options:  []string{"carefully", "thoroughly", "closely", "in detail"},
		IsPhrase: false,
	},

	// Overused AI Nouns & Adjectives
	{
		Pattern:  regexp.MustCompile(`(?i)\btapestry\b`),
		Name:     "tapestry",
		Options:  []string{"network", "mix", "mosaic", "fabric", "interplay"},
		IsPhrase: false,
	},
	{
		Pattern:  regexp.MustCompile(`(?i)\btestament\b`),
		Name:     "testament",
		Options:  []string{"sign", "evidence", "proof", "reflection"},
		IsPhrase: false,
	},
	{
		Pattern:  regexp.MustCompile(`(?i)\bmultifaceted\b`),
		Name:     "multifaceted",
		Options:  []string{"varied", "broad", "complex", "nuanced"},
		IsPhrase: false,
	},
	{
		Pattern:  regexp.MustCompile(`(?i)\bpivotal\b`),
		Name:     "pivotal",
		Options:  []string{"crucial", "critical", "essential", "central"},
		IsPhrase: false,
	},
	{
		Pattern:  regexp.MustCompile(`(?i)\bbeacon\b`),
		Name:     "beacon",
		Options:  []string{"guide", "model", "touchstone", "example"},
		IsPhrase: false,
	},
	{
		Pattern:  regexp.MustCompile(`(?i)\bparamount\b`),
		Name:     "paramount",
		Options:  []string{"top priority", "vital", "essential", "primary"},
		IsPhrase: false,
	},
	{
		Pattern:  regexp.MustCompile(`(?i)\bnuance(?:s|d)?\b`),
		Name:     "nuance",
		Options:  []string{"subtlety", "detail", "distinction", "shade"},
		IsPhrase: false,
	},
	{
		Pattern:  regexp.MustCompile(`(?i)\bburgeoning\b`),
		Name:     "burgeoning",
		Options:  []string{"growing", "expanding", "rising", "fast-developing"},
		IsPhrase: false,
	},
	{
		Pattern:  regexp.MustCompile(`(?i)\bindomitable\b`),
		Name:     "indomitable",
		Options:  []string{"unyielding", "resolute", "strong"},
		IsPhrase: false,
	},
}

// Em-dash pattern for smoothing overused — em-dashes — into commas or natural flow
var emDashChainRegex = regexp.MustCompile(`\s*—\s*([^—\n]+?)\s*—\s*`)
var isolatedEmDashRegex = regexp.MustCompile(`\s*—\s*`)

// DePatternLexicon scans the text for LLM tell-words and cliches, replacing them with natural synonyms
func DePatternLexicon(text string) (string, []string, int) {
	result := text
	replacedMap := make(map[string]bool)
	replacementTotal := 0

	// 1. Process Tell Replacements
	for _, tr := range tellReplacements {
		matches := tr.Pattern.FindAllStringIndex(result, -1)
		if len(matches) == 0 {
			continue
		}

		replacedMap[tr.Name] = true

		// Replace from end to start to preserve string indices
		for i := len(matches) - 1; i >= 0; i-- {
			start := matches[i][0]
			end := matches[i][1]
			matchedText := result[start:end]

			// Pick replacement
			var replacement string
			if tr.DropOption && (start == 0 || (start > 1 && result[start-2] == '.')) {
				// If at start of sentence and can drop, just drop it and capitalize next
				replacement = ""
			} else {
				idx := rand.Intn(len(tr.Options))
				replacement = tr.Options[idx]
			}

			// Match capitalization of original match
			if len(matchedText) > 0 && unicode.IsUpper([]rune(matchedText)[0]) {
				replacement = capitalizeFirstRune(replacement)
			} else if len(matchedText) > 0 {
				replacement = uncapitalizeFirstRune(replacement)
			}

			result = result[:start] + replacement + result[end:]
			replacementTotal++
		}
	}

	// 2. Smooth repetitive em-dashes
	if isolatedEmDashRegex.MatchString(result) {
		dashMatches := isolatedEmDashRegex.FindAllStringIndex(result, -1)
		if len(dashMatches) >= 2 {
			// Convert em-dash pairs into natural commas or parentheses
			result = emDashChainRegex.ReplaceAllString(result, ", $1, ")
			// If solitary em-dash remains, replace with colon or comma
			result = isolatedEmDashRegex.ReplaceAllString(result, " — ")
		}
	}

	var replacedList []string
	for k := range replacedMap {
		replacedList = append(replacedList, k)
	}

	return result, replacedList, replacementTotal
}

func capitalizeFirstRune(s string) string {
	if s == "" {
		return ""
	}
	runes := []rune(s)
	runes[0] = unicode.ToUpper(runes[0])
	return string(runes)
}

func uncapitalizeFirstRune(s string) string {
	if s == "" {
		return ""
	}
	runes := []rune(s)
	runes[0] = unicode.ToLower(runes[0])
	return string(runes)
}
