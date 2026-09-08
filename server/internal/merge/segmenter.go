package merge

import (
	"fmt"
	"regexp"
	"strings"

	"concordrouter/server/internal/domain"
)

// parserState tracks the state machine during structural block extraction
type parserState int

const (
	stateNormal parserState = iota
	stateFencedCode
	stateTable
	stateBlockquote
)

// sentenceBoundaryRegex splits on sentence-ending punctuation while avoiding
// false positives from abbreviations, URLs, decimal numbers, and inline code.
//
// Strategy: split on [.!?] followed by whitespace+uppercase or end-of-string,
// but exclude known abbreviations and decimal/version patterns.
var abbreviations = regexp.MustCompile(`(?i)\b(e\.g|i\.e|vs|etc|Mr|Mrs|Ms|Dr|Prof|Inc|Ltd|Jr|Sr|St|approx|dept|govt|est|fig|vol|no|etc)\.\s*$`)
var urlPattern = regexp.MustCompile(`https?://\S+`)
var inlineCodePattern = regexp.MustCompile("`[^`]+`")
var versionPattern = regexp.MustCompile(`v?\d+\.\d+`)

// fencedCodeOpen detects opening fence lines: ``` or ~~~, optionally with a language tag
var fencedCodeOpen = regexp.MustCompile(`^(\x60{3,}|~{3,})`)

// tableHeaderSep detects markdown table separator rows like |---|---|
var tableHeaderSep = regexp.MustCompile(`^\|?\s*:?-{2,}:?\s*(\|\s*:?-{2,}:?\s*)+\|?\s*$`)

// tableRow detects markdown table content rows
var tableRow = regexp.MustCompile(`^\|.+\|`)

// listItemRegex detects list items (bullets and numbered) including indented sub-items
var listItemRegex = regexp.MustCompile(`^(\s*)([-*+]|\d+\.)\s+`)

// blockquoteRegex detects blockquote lines
var blockquoteRegex = regexp.MustCompile(`^>\s?`)

// headerRegex detects ATX-style headers
var headerRegex = regexp.MustCompile(`^#{1,6}\s+`)

// SegmentText breaks down response markdown/prose into semantic-boundary-aware
// cherry-pick segments using a two-pass architecture:
//
// Pass 1: Structural block extraction via line-by-line state machine
// Pass 2: Sentence-level splitting for long prose paragraphs
func SegmentText(text string, sourceLabel string) []domain.ChunkSegment {
	if strings.TrimSpace(text) == "" {
		return nil
	}

	// Pass 1: Extract structural blocks
	blocks := extractStructuralBlocks(text)

	// Pass 2: Split long paragraphs into sentences, emit final segments
	var segments []domain.ChunkSegment
	segIndex := 0

	for _, block := range blocks {
		if block.blockType == "paragraph" && len(block.content) > 200 {
			// Attempt sentence-level splitting
			sentences := splitSentences(block.content)
			if len(sentences) > 1 {
				for _, sent := range sentences {
					segments = append(segments, domain.ChunkSegment{
						ID:      fmt.Sprintf("%s_seg_%d", sourceLabel, segIndex),
						Index:   segIndex,
						Source:  sourceLabel,
						Type:    "sentence",
						Content: sent,
					})
					segIndex++
				}
				continue
			}
		}

		// For list_group blocks, split into individual bullet segments
		if block.blockType == "list_group" {
			bullets := splitListItems(block.content)
			for _, bullet := range bullets {
				segments = append(segments, domain.ChunkSegment{
					ID:      fmt.Sprintf("%s_seg_%d", sourceLabel, segIndex),
					Index:   segIndex,
					Source:  sourceLabel,
					Type:    "bullet",
					Content: bullet,
				})
				segIndex++
			}
			continue
		}

		segments = append(segments, domain.ChunkSegment{
			ID:      fmt.Sprintf("%s_seg_%d", sourceLabel, segIndex),
			Index:   segIndex,
			Source:  sourceLabel,
			Type:    block.blockType,
			Content: block.content,
		})
		segIndex++
	}

	return segments
}

// structuralBlock represents a block identified during Pass 1
type structuralBlock struct {
	blockType string // "paragraph", "header", "code", "table", "blockquote", "list_group"
	content   string
}

// extractStructuralBlocks walks lines with a state machine to identify
// fenced code blocks, tables, blockquotes, headers, lists, and paragraphs.
func extractStructuralBlocks(text string) []structuralBlock {
	lines := strings.Split(text, "\n")
	var blocks []structuralBlock
	state := stateNormal
	var accumulator []string
	var fenceMarker string // tracks the specific fence string (``` or ~~~) to match closing

	flushAccumulator := func(blockType string) {
		if len(accumulator) == 0 {
			return
		}
		content := strings.TrimSpace(strings.Join(accumulator, "\n"))
		if content != "" {
			blocks = append(blocks, structuralBlock{
				blockType: blockType,
				content:   content,
			})
		}
		accumulator = nil
	}

	for i := 0; i < len(lines); i++ {
		line := lines[i]
		trimmed := strings.TrimSpace(line)

		switch state {
		case stateFencedCode:
			// Check for closing fence
			if fencedCodeOpen.MatchString(trimmed) {
				matchedFence := fencedCodeOpen.FindString(trimmed)
				// Closing fence must use the same character and be at least as long
				if len(matchedFence) >= len(fenceMarker) && matchedFence[0] == fenceMarker[0] {
					accumulator = append(accumulator, line)
					flushAccumulator("code")
					state = stateNormal
					continue
				}
			}
			accumulator = append(accumulator, line)

		case stateTable:
			// Continue accumulating table rows
			if tableRow.MatchString(trimmed) || tableHeaderSep.MatchString(trimmed) {
				accumulator = append(accumulator, line)
			} else {
				flushAccumulator("table")
				state = stateNormal
				i-- // re-process this line in normal state
			}

		case stateBlockquote:
			if blockquoteRegex.MatchString(trimmed) {
				// Strip the > prefix for clean content
				stripped := blockquoteRegex.ReplaceAllString(trimmed, "")
				accumulator = append(accumulator, stripped)
			} else if trimmed == "" {
				// Blank line ends the blockquote
				flushAccumulator("blockquote")
				state = stateNormal
			} else {
				flushAccumulator("blockquote")
				state = stateNormal
				i-- // re-process
			}

		case stateNormal:
			// Empty line: flush any pending content
			if trimmed == "" {
				if len(accumulator) > 0 && listItemRegex.MatchString(strings.TrimSpace(accumulator[0])) {
					flushAccumulator("list_group")
				} else {
					flushAccumulator("paragraph")
				}
				continue
			}

			// Fenced code block opening
			if match := fencedCodeOpen.FindString(trimmed); match != "" {
				flushAccumulator("paragraph")
				fenceMarker = match
				accumulator = append(accumulator, line)
				state = stateFencedCode
				continue
			}

			// Header
			if headerRegex.MatchString(trimmed) {
				flushAccumulator("paragraph")
				blocks = append(blocks, structuralBlock{
					blockType: "header",
					content:   trimmed,
				})
				continue
			}

			// Blockquote
			if blockquoteRegex.MatchString(trimmed) {
				flushAccumulator("paragraph")
				stripped := blockquoteRegex.ReplaceAllString(trimmed, "")
				accumulator = append(accumulator, stripped)
				state = stateBlockquote
				continue
			}

			// Table detection: look ahead for separator row
			if tableRow.MatchString(trimmed) && i+1 < len(lines) {
				nextTrimmed := strings.TrimSpace(lines[i+1])
				if tableHeaderSep.MatchString(nextTrimmed) {
					flushAccumulator("paragraph")
					accumulator = append(accumulator, line)
					state = stateTable
					continue
				}
			}

			// List items: accumulate contiguous list block
			if listItemRegex.MatchString(trimmed) {
				// If we were accumulating a paragraph, flush it first
				if len(accumulator) > 0 && !listItemRegex.MatchString(strings.TrimSpace(accumulator[0])) {
					flushAccumulator("paragraph")
				}
				accumulator = append(accumulator, line)
				// Peek ahead: if next line is not a list item or indented continuation, flush
				if i+1 < len(lines) {
					nextTrimmed := strings.TrimSpace(lines[i+1])
					if nextTrimmed != "" && !listItemRegex.MatchString(nextTrimmed) && !isIndentedContinuation(lines[i+1]) {
						flushAccumulator("list_group")
					}
				} else {
					flushAccumulator("list_group")
				}
				continue
			}

			// Check if this line is an indented continuation of a list
			if len(accumulator) > 0 && listItemRegex.MatchString(strings.TrimSpace(accumulator[0])) && isIndentedContinuation(line) {
				accumulator = append(accumulator, line)
				continue
			}

			// If we were accumulating list items but hit a non-list line, flush
			if len(accumulator) > 0 && listItemRegex.MatchString(strings.TrimSpace(accumulator[0])) {
				flushAccumulator("list_group")
			}

			// Regular paragraph text
			accumulator = append(accumulator, line)
		}
	}

	// Flush any remaining content
	switch state {
	case stateFencedCode:
		flushAccumulator("code") // unclosed fence — still treat as code
	case stateTable:
		flushAccumulator("table")
	case stateBlockquote:
		flushAccumulator("blockquote")
	default:
		// Check if remaining accumulator is a list
		if len(accumulator) > 0 && listItemRegex.MatchString(strings.TrimSpace(accumulator[0])) {
			flushAccumulator("list_group")
		} else {
			flushAccumulator("paragraph")
		}
	}

	return blocks
}

// isIndentedContinuation checks if a line is indented (sub-item or continuation)
func isIndentedContinuation(line string) bool {
	if len(line) == 0 {
		return false
	}
	return line[0] == ' ' || line[0] == '\t'
}

// splitListItems splits a list_group block into individual bullet items,
// preserving indented sub-items with their parent.
func splitListItems(content string) []string {
	lines := strings.Split(content, "\n")
	var items []string
	var currentItem []string

	for _, line := range lines {
		trimmed := strings.TrimSpace(line)
		if trimmed == "" {
			continue
		}

		if listItemRegex.MatchString(trimmed) && !isIndentedContinuation(line) {
			// New top-level item: flush previous
			if len(currentItem) > 0 {
				items = append(items, strings.TrimSpace(strings.Join(currentItem, "\n")))
			}
			currentItem = []string{trimmed}
		} else {
			// Indented continuation or sub-item
			currentItem = append(currentItem, trimmed)
		}
	}

	if len(currentItem) > 0 {
		items = append(items, strings.TrimSpace(strings.Join(currentItem, "\n")))
	}

	return items
}

// splitSentences splits prose text into sentences while respecting
// abbreviations, URLs, decimal numbers, and inline code spans.
func splitSentences(text string) []string {
	// Protect inline code spans from sentence splitting
	codeSpans := inlineCodePattern.FindAllStringIndex(text, -1)
	// Protect URLs
	urlSpans := urlPattern.FindAllStringIndex(text, -1)
	// Protect version numbers
	versionSpans := versionPattern.FindAllStringIndex(text, -1)

	// Merge all protected spans
	protected := make([][2]int, 0, len(codeSpans)+len(urlSpans)+len(versionSpans))
	for _, s := range codeSpans {
		protected = append(protected, [2]int{s[0], s[1]})
	}
	for _, s := range urlSpans {
		protected = append(protected, [2]int{s[0], s[1]})
	}
	for _, s := range versionSpans {
		protected = append(protected, [2]int{s[0], s[1]})
	}

	// Find candidate sentence boundaries: [.!?] followed by whitespace
	var boundaries []int
	runes := []rune(text)
	for i := 0; i < len(runes)-1; i++ {
		if runes[i] == '.' || runes[i] == '!' || runes[i] == '?' {
			// Check if next char is whitespace or end
			if i+1 < len(runes) && (runes[i+1] == ' ' || runes[i+1] == '\n' || runes[i+1] == '\t') {
				bytePos := len(string(runes[:i+1]))

				// Skip if inside a protected span
				if isProtected(bytePos, protected) {
					continue
				}

				// Skip if this looks like an abbreviation
				prefix := string(runes[:i+1])
				if abbreviations.MatchString(prefix) {
					continue
				}

				// Skip if this is a decimal number (digit before and after the period)
				if runes[i] == '.' && i > 0 && i+2 < len(runes) {
					if isDigit(runes[i-1]) && isDigit(runes[i+2]) {
						continue
					}
				}

				boundaries = append(boundaries, bytePos)
			}
		}
	}

	if len(boundaries) == 0 {
		return []string{strings.TrimSpace(text)}
	}

	var sentences []string
	lastStart := 0
	for _, bpos := range boundaries {
		sent := strings.TrimSpace(text[lastStart:bpos])
		if sent != "" {
			sentences = append(sentences, sent)
		}
		lastStart = bpos
		// Skip whitespace after the boundary
		for lastStart < len(text) && (text[lastStart] == ' ' || text[lastStart] == '\n' || text[lastStart] == '\t') {
			lastStart++
		}
	}

	// Remaining text after last boundary
	if lastStart < len(text) {
		remaining := strings.TrimSpace(text[lastStart:])
		if remaining != "" {
			sentences = append(sentences, remaining)
		}
	}

	return sentences
}

// isProtected checks if a byte position falls inside any protected span
func isProtected(pos int, spans [][2]int) bool {
	for _, span := range spans {
		if pos > span[0] && pos <= span[1] {
			return true
		}
	}
	return false
}

// isDigit checks if a rune is a digit 0-9
func isDigit(r rune) bool {
	return r >= '0' && r <= '9'
}
