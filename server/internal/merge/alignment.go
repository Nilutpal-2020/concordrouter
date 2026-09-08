package merge

import (
	"concordrouter/server/internal/domain"
	"fmt"
	"math"
	"strings"
)

type AlignedPair struct {
	ID         string               `json:"id"`
	LeftChunk  *domain.ChunkSegment `json:"leftChunk,omitempty"`
	RightChunk *domain.ChunkSegment `json:"rightChunk,omitempty"`
	Score      float64              `json:"score"`
	Relation   string               `json:"relation"` // "agree", "paraphrase", "conflict", "unique_left", "unique_right"
}

type AlignmentResult struct {
	Pairs            []AlignedPair `json:"pairs"`
	SimilarityMatrix [][]float64   `json:"similarityMatrix"`
	LeftSegments     []domain.ChunkSegment `json:"leftSegments"`
	RightSegments    []domain.ChunkSegment `json:"rightSegments"`
	OverallAgreement float64       `json:"overallAgreement"`
}

// ComputeSimilarityMatrix creates an M x N matrix comparing each segment of A against each of B
func ComputeSimilarityMatrix(segsA, segsB []domain.ChunkSegment) [][]float64 {
	matrix := make([][]float64, len(segsA))
	for i := range segsA {
		matrix[i] = make([]float64, len(segsB))
		for j := range segsB {
			matrix[i][j] = CosineSimilarity(segsA[i].Content, segsB[j].Content)
		}
	}
	return matrix
}

// AlignNeedlemanWunsch pairs up segments between response A and response B using semantic similarity
func AlignNeedlemanWunsch(segsA, segsB []domain.ChunkSegment) AlignmentResult {
	if len(segsA) == 0 && len(segsB) == 0 {
		return AlignmentResult{}
	}

	matrix := ComputeSimilarityMatrix(segsA, segsB)

	// In Needleman-Wunsch:
	// Gap penalty: -0.2
	// Substitution score: scaled similarity (sim * 2.0 - 0.5)
	gapPenalty := -0.2

	m := len(segsA)
	n := len(segsB)

	dp := make([][]float64, m+1)
	trace := make([][]int, m+1) // 1: Diagonal (Match/Mismatch), 2: Up (Gap B), 3: Left (Gap A)

	for i := 0; i <= m; i++ {
		dp[i] = make([]float64, n+1)
		trace[i] = make([]int, n+1)
		dp[i][0] = float64(i) * gapPenalty
		trace[i][0] = 2 // Up
	}
	for j := 0; j <= n; j++ {
		dp[0][j] = float64(j) * gapPenalty
		trace[0][j] = 3 // Left
	}
	trace[0][0] = 0

	for i := 1; i <= m; i++ {
		for j := 1; j <= n; j++ {
			sim := matrix[i-1][j-1]
			// Score mapping: high similarity gives positive score, low similarity gives negative
			matchScore := sim*2.0 - 0.4

			scoreDiag := dp[i-1][j-1] + matchScore
			scoreUp := dp[i-1][j] + gapPenalty
			scoreLeft := dp[i][j-1] + gapPenalty

			best := scoreDiag
			dir := 1 // Diag

			if scoreUp > best {
				best = scoreUp
				dir = 2 // Up
			}
			if scoreLeft > best {
				best = scoreLeft
				dir = 3 // Left
			}

			dp[i][j] = best
			trace[i][j] = dir
		}
	}

	// Traceback
	var rawPairs []AlignedPair
	i, j := m, n

	for i > 0 || j > 0 {
		if i > 0 && j > 0 && trace[i][j] == 1 {
			sim := matrix[i-1][j-1]
			leftSeg := segsA[i-1]
			rightSeg := segsB[j-1]

			relation := classifyRelationTyped(leftSeg.Content, rightSeg.Content, sim, leftSeg.Type, rightSeg.Type)

			rawPairs = append(rawPairs, AlignedPair{
				ID:         fmt.Sprintf("pair_%d_%d", i-1, j-1),
				LeftChunk:  &leftSeg,
				RightChunk: &rightSeg,
				Score:      math.Round(sim*100) / 100,
				Relation:   relation,
			})
			i--
			j--
		} else if i > 0 && (j == 0 || trace[i][j] == 2) {
			leftSeg := segsA[i-1]
			rawPairs = append(rawPairs, AlignedPair{
				ID:        fmt.Sprintf("pair_%d_gap", i-1),
				LeftChunk: &leftSeg,
				Score:     0.0,
				Relation:  "unique_left",
			})
			i--
		} else {
			rightSeg := segsB[j-1]
			rawPairs = append(rawPairs, AlignedPair{
				ID:         fmt.Sprintf("gap_%d", j-1),
				RightChunk: &rightSeg,
				Score:      0.0,
				Relation:   "unique_right",
			})
			j--
		}
	}

	// Reverse to restore forward chronological order
	var orderedPairs []AlignedPair
	var totalScore float64
	matchCount := 0

	for idx := len(rawPairs) - 1; idx >= 0; idx-- {
		p := rawPairs[idx]
		orderedPairs = append(orderedPairs, p)
		if p.Relation == "agree" || p.Relation == "paraphrase" {
			totalScore += p.Score
			matchCount++
		}
	}

	overallAgreement := 0.0
	if matchCount > 0 {
		overallAgreement = math.Round((totalScore/float64(matchCount))*100) / 100
	}

	return AlignmentResult{
		Pairs:            orderedPairs,
		SimilarityMatrix: matrix,
		LeftSegments:     segsA,
		RightSegments:    segsB,
		OverallAgreement: overallAgreement,
	}
}

// classifyRelation determines agreement, paraphrase, conflict, or one-sided difference.
// When both chunks share the same structural type, scoring thresholds adjust accordingly:
// - Code blocks use stricter thresholds (paraphrase is less meaningful for code)
// - Tables compare structural similarity alongside content
func classifyRelation(textA, textB string, sim float64) string {
	return classifyRelationTyped(textA, textB, sim, "", "")
}

// classifyRelationTyped is the type-aware variant used by the alignment pipeline.
func classifyRelationTyped(textA, textB string, sim float64, typeA, typeB string) string {
	// Code-to-code: use stricter thresholds since paraphrase doesn't apply to code
	if typeA == "code" && typeB == "code" {
		if sim >= 0.85 {
			return "agree"
		}
		if sim >= 0.50 {
			// Even moderate code similarity is meaningful
			return "paraphrase"
		}
		return "conflict"
	}

	// Table-to-table: structural similarity matters more
	if typeA == "table" && typeB == "table" {
		colsA := countTableColumns(textA)
		colsB := countTableColumns(textB)
		if sim >= 0.65 && colsA == colsB {
			return "agree"
		}
		if sim >= 0.30 {
			return "paraphrase"
		}
		return "conflict"
	}

	// Default prose thresholds
	if sim >= 0.70 {
		return "agree"
	}
	if sim >= 0.30 {
		// Check for clear polarity contradictions (e.g. "not", "never", numbers)
		if hasContradictionMarkers(textA, textB) {
			return "conflict"
		}
		return "paraphrase"
	}
	if hasContradictionMarkers(textA, textB) {
		return "conflict"
	}
	return "conflict"
}

// countTableColumns counts the number of pipe-delimited columns in a markdown table
func countTableColumns(text string) int {
	lines := strings.Split(text, "\n")
	for _, line := range lines {
		trimmed := strings.TrimSpace(line)
		if strings.Contains(trimmed, "|") && !strings.Contains(trimmed, "---") {
			return strings.Count(trimmed, "|") + 1
		}
	}
	return 0
}

func hasContradictionMarkers(textA, textB string) bool {
	aLower := strings.ToLower(textA)
	bLower := strings.ToLower(textB)

	// Check negation presence in only one text
	negWords := []string{"not ", "never ", "no ", "cannot ", "should not ", "doesn't "}
	hasNegA := false
	hasNegB := false

	for _, nw := range negWords {
		if strings.Contains(aLower, nw) {
			hasNegA = true
		}
		if strings.Contains(bLower, nw) {
			hasNegB = true
		}
	}

	return hasNegA != hasNegB
}
