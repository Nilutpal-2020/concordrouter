package humanize

import (
	"context"
	"time"
)

// HumanizeOptions configures which passes to run
type HumanizeOptions struct {
	EnableBurstiness    bool `json:"enableBurstiness"`
	EnableLexical       bool `json:"enableLexical"`
	EnableNGramSmoothing bool `json:"enableNGramSmoothing"`
	EnableContractions  bool `json:"enableContractions"`
	EnableSyntax        bool `json:"enableSyntax"`
}

// DefaultOptions provides the recommended standard humanization profile
func DefaultOptions() HumanizeOptions {
	return HumanizeOptions{
		EnableBurstiness:    true,
		EnableLexical:       true,
		EnableNGramSmoothing: true,
		EnableContractions:  true,
		EnableSyntax:        true,
	}
}

// HumanizeRequest is the input payload for the humanization pipeline
type HumanizeRequest struct {
	Text    string           `json:"text"`
	Options *HumanizeOptions `json:"options,omitempty"`
}

// HumanizeStats summarizes statistical changes to the text
type HumanizeStats struct {
	OriginalBurstiness  float64  `json:"originalBurstiness"`
	HumanizedBurstiness float64  `json:"humanizedBurstiness"`
	OriginalVariance    float64  `json:"originalVariance"`
	HumanizedVariance   float64  `json:"humanizedVariance"`
	OriginalPerplexity  float64  `json:"originalPerplexity"`
	HumanizedPerplexity float64  `json:"humanizedPerplexity"`
	FleschKincaidBefore float64  `json:"fleschKincaidBefore"`
	FleschKincaidAfter  float64  `json:"fleschKincaidAfter"`
	ReplacedTells       []string `json:"replacedTells"`
	ReplacementsCount   int      `json:"replacementsCount"`
	SentenceSplits      int      `json:"sentenceSplits"`
	SentenceJoins       int      `json:"sentenceJoins"`
}

// HumanizeResult contains the modified text and detailed diagnostic metrics
type HumanizeResult struct {
	OriginalText  string        `json:"originalText"`
	HumanizedText string        `json:"humanizedText"`
	Stats         HumanizeStats `json:"stats"`
	ExecutionMs   int64         `json:"executionMs"`
}

// Pipeline coordinates sequential perturbation and scoring passes
type Pipeline struct {
	syntaxRestructurer *SyntaxRestructurer
}

// NewPipeline initializes the humanization pipeline
func NewPipeline() *Pipeline {
	return &Pipeline{
		syntaxRestructurer: NewSyntaxRestructurer(),
	}
}

// Process runs the full statistical humanization pipeline on text
func (p *Pipeline) Process(ctx context.Context, req HumanizeRequest) HumanizeResult {
	start := time.Now()
	opts := DefaultOptions()
	if req.Options != nil {
		opts = *req.Options
	}

	origText := req.Text
	if origText == "" {
		return HumanizeResult{ExecutionMs: time.Since(start).Milliseconds()}
	}

	// 1. Initial baseline measurements
	origSentences := ExtractSentences(origText)
	origStats := ComputeSentenceStats(origSentences)
	origPerplexity := EstimatePerplexity(origText)
	origReadability := ComputeReadability(origText)

	curText := origText
	var replacedTells []string
	totalReplacements := 0
	splitsCount := 0
	joinsCount := 0

	// Pass 1: Lexical De-Patterning (Remove tells and AI cliches)
	if opts.EnableLexical {
		var tells []string
		var count int
		curText, tells, count = DePatternLexicon(curText)
		replacedTells = append(replacedTells, tells...)
		totalReplacements += count
	}

	// Pass 2: N-gram Repetition Smoothing
	if opts.EnableNGramSmoothing {
		var count int
		curText, count = SmoothNGramRepetitions(curText)
		totalReplacements += count
	}

	// Pass 3: Syntactic Restructuring
	if opts.EnableSyntax {
		var count int
		curText, count = p.syntaxRestructurer.RestructureClauses(ctx, curText)
		totalReplacements += count
	}

	// Pass 4: Burstiness Injection (Sentence length variance perturbation)
	if opts.EnableBurstiness {
		var splits, joins int
		curText, splits, joins = InjectBurstiness(curText)
		splitsCount = splits
		joinsCount = joins
	}

	// Pass 5: Contraction De-Stiffening
	if opts.EnableContractions {
		var count int
		curText, count = ApplyNaturalContractions(curText)
		totalReplacements += count
	}

	// Pass 6: Post-transform grammar & formatting sanity check
	curText = PostTransformSanityCheck(curText)

	// Post-measurements
	finalSentences := ExtractSentences(curText)
	finalStats := ComputeSentenceStats(finalSentences)
	finalPerplexity := EstimatePerplexity(curText)
	finalReadability := ComputeReadability(curText)

	return HumanizeResult{
		OriginalText:  origText,
		HumanizedText: curText,
		Stats: HumanizeStats{
			OriginalBurstiness:  origStats.Burstiness,
			HumanizedBurstiness: finalStats.Burstiness,
			OriginalVariance:    origStats.Variance,
			HumanizedVariance:   finalStats.Variance,
			OriginalPerplexity:  origPerplexity,
			HumanizedPerplexity: finalPerplexity,
			FleschKincaidBefore: origReadability.FleschKincaidGrade,
			FleschKincaidAfter:  finalReadability.FleschKincaidGrade,
			ReplacedTells:       replacedTells,
			ReplacementsCount:   totalReplacements,
			SentenceSplits:      splitsCount,
			SentenceJoins:       joinsCount,
		},
		ExecutionMs: time.Since(start).Milliseconds(),
	}
}
