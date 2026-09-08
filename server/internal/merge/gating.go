package merge

import (
	"fmt"
	"math"
	"strings"
)

type GatingDecision struct {
	Eligible        bool    `json:"eligible"`
	IsConsensus     bool    `json:"isConsensus"`
	SimilarityScore float64 `json:"similarityScore"`
	BadgeText       string  `json:"badgeText"`
	Reason          string  `json:"reason"`
}

// EvaluateMergeGating checks if two model responses warrant a merge or consensus badge
func EvaluateMergeGating(prompt, textA, textB string) GatingDecision {
	tokensA := len(strings.Fields(textA))
	tokensB := len(strings.Fields(textB))

	// Skip for short/trivial chit-chat turns
	if tokensA < 20 || tokensB < 20 {
		return GatingDecision{
			Eligible:        false,
			IsConsensus:     false,
			SimilarityScore: 1.0,
			BadgeText:       "",
			Reason:          "Responses are too short (< 20 tokens) for meaningful reconciliation",
		}
	}

	sim := CosineSimilarity(textA, textB)
	simPercent := int(math.Round(sim * 100))

	// Near-duplicate consensus (>0.90 similarity)
	if sim >= 0.90 {
		return GatingDecision{
			Eligible:        false,
			IsConsensus:     true,
			SimilarityScore: math.Round(sim*100) / 100,
			BadgeText:       fmt.Sprintf("✨ Models in Consensus (%d%% Agreement)", simPercent),
			Reason:          "Responses are near-identical; no merge reconciliation needed",
		}
	}

	// Non-overlapping / Divergent responses: Merge affordance recommended
	return GatingDecision{
		Eligible:        true,
		IsConsensus:     false,
		SimilarityScore: math.Round(sim*100) / 100,
		BadgeText:       fmt.Sprintf("⚔️ Models Diverge (%d%% Overlap)", simPercent),
		Reason:          "Responses contain distinct points or structural differences suitable for cherry-picking",
	}
}
