package merge

import (
	"strings"
	"testing"
)

func TestSegmentText_BasicTypes(t *testing.T) {
	sampleText := `### Overview

ConcordRouter enables multi-provider prompt fan-out. Each response streams independently.

- Feature 1: Concurrent goroutines
- Feature 2: Independent SSE channels

` + "```go\nfunc main() {}\n```"

	segments := SegmentText(sampleText, "left")
	if len(segments) == 0 {
		t.Fatalf("Expected segments, got 0")
	}

	hasHeader := false
	hasBullet := false
	hasCode := false

	for _, seg := range segments {
		if seg.Type == "header" {
			hasHeader = true
		}
		if seg.Type == "bullet" {
			hasBullet = true
		}
		if seg.Type == "code" {
			hasCode = true
		}
		if seg.Source != "left" {
			t.Errorf("Expected source 'left', got '%s'", seg.Source)
		}
	}

	if !hasHeader || !hasBullet || !hasCode {
		t.Errorf("Segmentation failed to categorize elements correctly: header=%v, bullet=%v, code=%v", hasHeader, hasBullet, hasCode)
	}
}

func TestSegmentText_MultiLineFencedCode(t *testing.T) {
	text := "Some intro text.\n\n```python\ndef hello():\n    print(\"hello\")\n\n# A comment inside code\ndef world():\n    pass\n```\n\nSome conclusion."

	segments := SegmentText(text, "test")
	if len(segments) == 0 {
		t.Fatalf("Expected segments, got 0")
	}

	codeCount := 0
	for _, seg := range segments {
		if seg.Type == "code" {
			codeCount++
			// Must contain the blank line inside the fence
			if !strings.Contains(seg.Content, "# A comment inside code") {
				t.Errorf("Code segment should preserve content across blank lines, got: %s", seg.Content)
			}
		}
	}

	if codeCount != 1 {
		t.Errorf("Expected exactly 1 code segment for multi-line fenced block, got %d", codeCount)
	}
}

func TestSegmentText_TildeFence(t *testing.T) {
	text := "Before.\n\n~~~\nsome code\nmore code\n~~~\n\nAfter."

	segments := SegmentText(text, "test")
	codeCount := 0
	for _, seg := range segments {
		if seg.Type == "code" {
			codeCount++
		}
	}
	if codeCount != 1 {
		t.Errorf("Expected 1 code segment for tilde fence, got %d", codeCount)
	}
}

func TestSegmentText_MarkdownTable(t *testing.T) {
	text := "Here is a comparison:\n\n| Feature | Go | Rust |\n| --- | --- | --- |\n| Concurrency | Goroutines | async/await |\n| Memory | GC | Ownership |\n\nConclusion paragraph."

	segments := SegmentText(text, "test")

	hasTable := false
	for _, seg := range segments {
		if seg.Type == "table" {
			hasTable = true
			if !strings.Contains(seg.Content, "Goroutines") {
				t.Errorf("Table should contain row data, got: %s", seg.Content)
			}
		}
	}

	if !hasTable {
		t.Errorf("Expected a table segment")
		for i, seg := range segments {
			t.Logf("  seg[%d] type=%s content=%q", i, seg.Type, seg.Content[:min(50, len(seg.Content))])
		}
	}
}

func TestSegmentText_Blockquote(t *testing.T) {
	text := "Some text.\n\n> This is a quote.\n> It spans multiple lines.\n\nMore text after."

	segments := SegmentText(text, "test")

	hasBlockquote := false
	for _, seg := range segments {
		if seg.Type == "blockquote" {
			hasBlockquote = true
			if !strings.Contains(seg.Content, "spans multiple lines") {
				t.Errorf("Blockquote should contain full content, got: %s", seg.Content)
			}
		}
	}

	if !hasBlockquote {
		t.Errorf("Expected a blockquote segment")
		for i, seg := range segments {
			t.Logf("  seg[%d] type=%s content=%q", i, seg.Type, seg.Content)
		}
	}
}

func TestSegmentText_NestedList(t *testing.T) {
	text := "Features:\n\n- Top level item 1\n  - Sub-item A\n  - Sub-item B\n- Top level item 2"

	segments := SegmentText(text, "test")

	bulletCount := 0
	for _, seg := range segments {
		if seg.Type == "bullet" {
			bulletCount++
		}
	}

	// Should have 2 top-level bullets (sub-items grouped with parent)
	if bulletCount < 2 {
		t.Errorf("Expected at least 2 bullet segments, got %d", bulletCount)
		for i, seg := range segments {
			t.Logf("  seg[%d] type=%s content=%q", i, seg.Type, seg.Content)
		}
	}
}

func TestSegmentText_URLPreservation(t *testing.T) {
	longText := "ConcordRouter is available at https://example.com/page.html for download. " +
		"It supports version v2.0.1 of the protocol. " +
		"The documentation is comprehensive and covers all features including e.g. streaming, " +
		"fan-out, and merge capabilities. Users should visit the site for more information. " +
		"Additionally the API reference is at https://api.example.com/docs.html which provides " +
		"detailed endpoint specifications and usage examples for developers."

	segments := SegmentText(longText, "test")

	for _, seg := range segments {
		// No sentence should start mid-URL
		if strings.HasPrefix(seg.Content, "com/page") || strings.HasPrefix(seg.Content, "html") {
			t.Errorf("Sentence split broke a URL: %q", seg.Content)
		}
		// No sentence should start after "e.g"
		if strings.HasPrefix(seg.Content, "streaming") {
			t.Errorf("Sentence split broke on abbreviation 'e.g.': %q", seg.Content)
		}
	}
}

func TestSegmentText_MixedDocument(t *testing.T) {
	text := `# Architecture Overview

ConcordRouter uses a fan-out pattern for concurrent streaming.

## Components

- Orchestrator: Manages fan-out
- Provider Adapters: Per-provider implementations

> Note: All providers implement the same interface.

| Component | Language |
| --- | --- |
| Backend | Go |
| Frontend | TypeScript |

` + "```go\ntype Provider interface {\n\tStream(ctx context.Context) (<-chan Chunk, error)\n}\n```" + `

Final summary paragraph.`

	segments := SegmentText(text, "mixed")

	types := make(map[string]int)
	for _, seg := range segments {
		types[seg.Type]++
		if seg.Source != "mixed" {
			t.Errorf("Expected source 'mixed', got '%s'", seg.Source)
		}
	}

	// Verify we got at least one of each important type
	for _, expectedType := range []string{"header", "bullet", "blockquote", "table", "code", "paragraph"} {
		if types[expectedType] == 0 {
			t.Errorf("Expected at least one %q segment in mixed document, types found: %v", expectedType, types)
		}
	}
}

func TestSegmentText_EmptyInput(t *testing.T) {
	segments := SegmentText("", "test")
	if segments != nil {
		t.Errorf("Expected nil for empty input, got %v", segments)
	}

	segments2 := SegmentText("   \n\n  ", "test")
	if segments2 != nil {
		t.Errorf("Expected nil for whitespace-only input, got %v", segments2)
	}
}

func min(a, b int) int {
	if a < b {
		return a
	}
	return b
}
