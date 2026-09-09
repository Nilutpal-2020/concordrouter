package humanize

import (
	"context"
	"strings"
	"testing"
)

func TestExtractSentences(t *testing.T) {
	text := "This is the first sentence. Here is Dr. Smith, who knows e.g. many things! Is this the third? Yes, it is."
	sents := ExtractSentences(text)
	if len(sents) < 3 {
		t.Fatalf("Expected at least 3 sentences, got %d: %v", len(sents), sents)
	}
}

func TestBurstinessCalculation(t *testing.T) {
	sents := []string{
		"Short sentence.",
		"This is a somewhat longer sentence that contains quite a few additional words for evaluation.",
		"Medium sentence here.",
		"An exceptionally lengthy and detailed sentence structured deliberately with multiple clauses, adverbs, and adjectives to establish high variance.",
	}
	stats := ComputeSentenceStats(sents)
	if stats.Count != 4 {
		t.Errorf("Expected 4 sentences, got %d", stats.Count)
	}
	if stats.StdDev <= 0 {
		t.Errorf("Expected positive standard deviation, got %f", stats.StdDev)
	}
}

func TestDePatternLexicon(t *testing.T) {
	input := "Moreover, it is important to note that this serves as a testament to the landscape. Furthermore, we must delve into the multifaceted implications."
	output, tells, count := DePatternLexicon(input)

	if count == 0 {
		t.Errorf("Expected tell replacements, got none")
	}
	if len(tells) == 0 {
		t.Errorf("Expected list of replaced tells, got empty")
	}

	lower := strings.ToLower(output)
	if strings.Contains(lower, "delve") {
		t.Errorf("Expected 'delve' to be removed from output: %s", output)
	}
	if strings.Contains(lower, "testament to") {
		t.Errorf("Expected 'testament to' to be replaced: %s", output)
	}
}

func TestBurstinessInjection(t *testing.T) {
	input := "This is an extraordinarily long and verbose sentence that rambles on across multiple clauses without much break, and it provides an opportunity to split into two balanced thoughts."
	transformed, splits, _ := InjectBurstiness(input)

	if splits == 0 && !strings.Contains(transformed, ".") {
		t.Errorf("Expected sentence to be split, got: %s", transformed)
	}
}

func TestReadabilityCalculation(t *testing.T) {
	text := "The distributed consensus protocol operates through mutual agreement among nodes. Deterministic algorithms guarantee safety and liveness properties."
	metrics := ComputeReadability(text)

	if metrics.FleschKincaidGrade <= 0 {
		t.Errorf("Expected valid Flesch Kincaid score, got %f", metrics.FleschKincaidGrade)
	}
	if metrics.GunningFogIndex <= 0 {
		t.Errorf("Expected valid Gunning Fog score, got %f", metrics.GunningFogIndex)
	}
}

func TestPostTransformSanityCheck(t *testing.T) {
	messy := "this is a test , with double commas ,, and a a duplicate word . new sentence begins ."
	clean := PostTransformSanityCheck(messy)

	if strings.Contains(clean, ",,") {
		t.Errorf("Failed to clean double comma: %s", clean)
	}
	if strings.Contains(clean, " ,") {
		t.Errorf("Failed to clean space before comma: %s", clean)
	}
	if strings.Contains(clean, "a a") {
		t.Errorf("Failed to clean duplicate word: %s", clean)
	}
}

func TestFullPipeline(t *testing.T) {
	pipeline := NewPipeline()
	input := "Moreover, it is important to note that this system serves as a testament to modern engineering. Furthermore, we must delve into the multifaceted landscape. We can do not ignore these results."

	result := pipeline.Process(context.Background(), HumanizeRequest{
		Text: input,
	})

	if result.HumanizedText == "" {
		t.Fatalf("Humanized text is empty")
	}
	if result.Stats.ReplacementsCount == 0 {
		t.Errorf("Expected replacements to occur in full pipeline")
	}
	if len(result.Stats.ReplacedTells) == 0 {
		t.Errorf("Expected detected tells")
	}
}

func TestNGramPerplexityAndSmoothing(t *testing.T) {
	text := "In order to complete this task, we work. In order to complete another, we rest."
	smoothed, count := SmoothNGramRepetitions(text)
	if count == 0 {
		t.Errorf("Expected repetition smoothing for recurring in order to")
	}
	if !strings.Contains(smoothed, "to complete another") {
		t.Errorf("Expected smoothed phrase: %s", smoothed)
	}

	pp := EstimatePerplexity("The quick brown fox jumps over the lazy dog.")
	if pp <= 0 {
		t.Errorf("Expected positive perplexity: %f", pp)
	}
}

func TestClauseRestructure(t *testing.T) {
	sr := NewSyntaxRestructurer()
	input := "Although the latency was high, the throughput remained acceptable."
	out, count := sr.RestructureClauses(context.Background(), input)
	if count == 0 {
		t.Errorf("Expected clause inversion, got count 0")
	}
	if !strings.Contains(out, "The throughput remained acceptable, although the latency was high.") {
		t.Errorf("Unexpected inverted clause: %s", out)
	}
}

