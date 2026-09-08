package merge

import (
	"fmt"
)

// BuildSynthesisPrompt generates the structured reconciliation prompt for Phase 6
func BuildSynthesisPrompt(userPrompt, modelALabel, responseA, modelBLabel, responseB string) string {
	return fmt.Sprintf(`You are an expert consensus synthesizer and editor.

A user asked the following question:
"""
%s
"""

Two different AI models produced the following responses:

--- MODEL A (%s) ---
%s

--- MODEL B (%s) ---
%s

--- TASK ---
Reconcile and synthesize both responses into a single, authoritative, and comprehensive answer:
1. Preserve unique, accurate facts, examples, and technical nuances from BOTH models.
2. Eliminate duplicate statements and stylistic fluff.
3. If there are contradictions between the two models, resolve them thoughtfully or note the distinct trade-offs.
4. Format the reconciled output cleanly in Markdown with clear headings and structure.
5. Provide ONLY the synthesized response draft directly, without conversational filler or introductory preamble.`,
		userPrompt, modelALabel, responseA, modelBLabel, responseB)
}
