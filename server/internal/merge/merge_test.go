package merge

import (
	"strings"
	"testing"
)

func TestSimilarityAndGating(t *testing.T) {
	textA := "Goroutines are lightweight threads managed by the Go runtime scheduler."
	textB := "Goroutines are lightweight threads managed by the Go runtime scheduler."

	// 1. Identical texts should have similarity ~1.0
	simIdentical := CosineSimilarity(textA, textB)
	if simIdentical < 0.98 {
		t.Fatalf("Expected ~1.0 similarity for identical texts, got %f", simIdentical)
	}

	// 2. Paraphrased texts
	textC := "In Go, goroutines represent lightweight concurrent threads handled by the runtime engine."
	simParaphrase := CosineSimilarity(textA, textC)
	if simParaphrase < 0.30 || simParaphrase > 0.95 {
		t.Fatalf("Expected moderate/high similarity for paraphrase, got %f", simParaphrase)
	}

	// 3. Completely unrelated texts
	textD := "Banana smoothies with Greek yogurt are high in potassium and protein."
	simUnrelated := CosineSimilarity(textA, textD)
	if simUnrelated > 0.20 {
		t.Fatalf("Expected low similarity for unrelated texts, got %f", simUnrelated)
	}

	// 4. Test Gating Heuristics
	// Short text -> not eligible
	gateShort := EvaluateMergeGating("hi", "Hello there!", "Hey!")
	if gateShort.Eligible {
		t.Fatalf("Expected short text to be ineligible for merge")
	}

	// Identical longer text -> Consensus badge, eligible=false
	longText1 := strings.Repeat("Concurrency in Go enables high throughput network services. Channels allow safe message passing. ", 4)
	longText2 := strings.Repeat("Concurrency in Go enables high throughput network services. Channels allow safe message passing. ", 4)
	gateConsensus := EvaluateMergeGating("Explain Go", longText1, longText2)
	if !gateConsensus.IsConsensus || gateConsensus.Eligible {
		t.Fatalf("Expected consensus for identical texts, got %+v", gateConsensus)
	}

	// Divergent texts -> eligible=true
	divergentText := strings.Repeat("Mutexes in Go provide low-level memory locking and synchronization for shared data structures. ", 4)
	gateDivergent := EvaluateMergeGating("Compare sync", longText1, divergentText)
	if !gateDivergent.Eligible {
		t.Fatalf("Expected divergent texts to be eligible for merge, got %+v", gateDivergent)
	}
}

func TestNeedlemanWunschAlignment(t *testing.T) {
	docA := `### Section 1
Goroutines run concurrently.

### Section 2
Channels provide message passing between goroutines.`

	docB := `### Section 1
Goroutines execute concurrently in user space.

### Section 3
Mutexes provide memory locking.`

	segsA := SegmentText(docA, "modelA")
	segsB := SegmentText(docB, "modelB")

	alignment := AlignNeedlemanWunsch(segsA, segsB)

	if len(alignment.Pairs) == 0 {
		t.Fatalf("Expected alignment pairs, got 0")
	}

	if len(alignment.SimilarityMatrix) != len(segsA) {
		t.Fatalf("Expected similarity matrix rows %d, got %d", len(segsA), len(alignment.SimilarityMatrix))
	}
}
