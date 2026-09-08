package merge

import (
	"fmt"
	"regexp"
	"strings"

	"concordrouter/server/internal/domain"
)

var sentenceRegex = regexp.MustCompile(`(?s)[^.!?]+[.!?]+(?:\s+|$)`)

// SegmentText breaks down response markdown/prose into interactive cherry-pick segments
func SegmentText(text string, sourceLabel string) []domain.ChunkSegment {
	if strings.TrimSpace(text) == "" {
		return nil
	}

	rawParagraphs := strings.Split(text, "\n\n")
	var segments []domain.ChunkSegment
	segIndex := 0

	for _, rawP := range rawParagraphs {
		trimmed := strings.TrimSpace(rawP)
		if trimmed == "" {
			continue
		}

		// Detect Code blocks
		if strings.HasPrefix(trimmed, "```") && strings.HasSuffix(trimmed, "```") {
			segments = append(segments, domain.ChunkSegment{
				ID:      fmt.Sprintf("%s_seg_%d", sourceLabel, segIndex),
				Index:   segIndex,
				Source:  sourceLabel,
				Type:    "code",
				Content: trimmed,
			})
			segIndex++
			continue
		}

		// Detect Headers
		if strings.HasPrefix(trimmed, "#") {
			segments = append(segments, domain.ChunkSegment{
				ID:      fmt.Sprintf("%s_seg_%d", sourceLabel, segIndex),
				Index:   segIndex,
				Source:  sourceLabel,
				Type:    "header",
				Content: trimmed,
			})
			segIndex++
			continue
		}

		// Detect Bullet lists
		if strings.HasPrefix(trimmed, "- ") || strings.HasPrefix(trimmed, "* ") || strings.HasPrefix(trimmed, "1. ") {
			// Split list items into individual segments
			lines := strings.Split(trimmed, "\n")
			for _, line := range lines {
				lineTrimmed := strings.TrimSpace(line)
				if lineTrimmed == "" {
					continue
				}
				segments = append(segments, domain.ChunkSegment{
					ID:      fmt.Sprintf("%s_seg_%d", sourceLabel, segIndex),
					Index:   segIndex,
					Source:  sourceLabel,
					Type:    "bullet",
					Content: lineTrimmed,
				})
				segIndex++
			}
			continue
		}

		// Standard Paragraph: Split into sentences if paragraph is moderately long (>180 chars)
		if len(trimmed) > 180 {
			matches := sentenceRegex.FindAllString(trimmed, -1)
			if len(matches) > 1 {
				for _, match := range matches {
					sTrimmed := strings.TrimSpace(match)
					if sTrimmed == "" {
						continue
					}
					segments = append(segments, domain.ChunkSegment{
						ID:      fmt.Sprintf("%s_seg_%d", sourceLabel, segIndex),
						Index:   segIndex,
						Source:  sourceLabel,
						Type:    "sentence",
						Content: sTrimmed,
					})
					segIndex++
				}
				continue
			}
		}

		// Fallback to full paragraph segment
		segments = append(segments, domain.ChunkSegment{
			ID:      fmt.Sprintf("%s_seg_%d", sourceLabel, segIndex),
			Index:   segIndex,
			Source:  sourceLabel,
			Type:    "paragraph",
			Content: trimmed,
		})
		segIndex++
	}

	return segments
}
