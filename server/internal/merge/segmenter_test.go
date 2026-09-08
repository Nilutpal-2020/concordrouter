package merge

import (
	"testing"
)

func TestSegmentText(t *testing.T) {
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
