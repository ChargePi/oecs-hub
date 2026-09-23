package promptsuggestion

import (
	"context"
	"encoding/json"
	"fmt"
	"strconv"
	"strings"

	"github.com/cloudwego/eino/components/model"
	"github.com/cloudwego/eino/schema"
	"go.opentelemetry.io/otel/attribute"
	"go.opentelemetry.io/otel/codes"
	"go.opentelemetry.io/otel/trace"
)

// ChatModel is the narrow slice of eino's model.BaseChatModel this package depends on -
// implemented by *openai.ChatModel (github.com/cloudwego/eino-ext/components/model/openai),
// pointed at Bifrost - and easily faked in tests.
type ChatModel interface {
	Generate(ctx context.Context, messages []*schema.Message, opts ...model.Option) (*schema.Message, error)
}

// generateSuggestionPool asks chatModel for exactly want distinct suggestion strings in one
// call, given systemPrompt/userPrompt. The model is instructed to answer with a JSON array of
// strings; if it doesn't comply, generateSuggestionPool falls back to treating each non-empty
// line of the response as one suggestion, stripping common list-item prefixes ("1.", "-", "*").
func generateSuggestionPool(ctx context.Context, chatModel ChatModel, systemPrompt, userPrompt string, want int) ([]string, error) {
	ctx, span := tracer.Start(ctx, "promptsuggestion.generateSuggestionPool", trace.WithAttributes(poolSizeAttr(want)))
	defer span.End()

	messages := []*schema.Message{
		schema.SystemMessage(systemPrompt),
		schema.UserMessage(userPrompt),
	}

	resp, err := chatModel.Generate(ctx, messages)
	if err != nil {
		span.RecordError(err)
		span.SetStatus(codes.Error, err.Error())

		return nil, fmt.Errorf("generate: %w", err)
	}

	suggestions := parseSuggestions(resp.Content)

	truncated := len(suggestions) > want
	if truncated {
		suggestions = suggestions[:want]
	}

	span.SetAttributes(
		suggestionCountAttr(len(suggestions)),
		attribute.Bool("promptsuggestion.llm_response_truncated", truncated),
	)

	if resp.ResponseMeta != nil && resp.ResponseMeta.Usage != nil {
		span.SetAttributes(
			attribute.Int("promptsuggestion.llm_prompt_tokens", int(resp.ResponseMeta.Usage.PromptTokens)),
			attribute.Int("promptsuggestion.llm_completion_tokens", int(resp.ResponseMeta.Usage.CompletionTokens)),
		)
	}

	return suggestions, nil
}

func parseSuggestions(content string) []string {
	content = strings.TrimSpace(content)

	// The model sometimes wraps JSON in a markdown code fence despite instructions not to.
	if strings.HasPrefix(content, "```") {
		content = strings.TrimPrefix(content, "```json")
		content = strings.TrimPrefix(content, "```")
		content = strings.TrimSuffix(content, "```")
		content = strings.TrimSpace(content)
	}

	var asJSON []string
	if err := json.Unmarshal([]byte(content), &asJSON); err == nil {
		return trimEmpty(asJSON)
	}

	return trimEmpty(stripListPrefixes(strings.Split(content, "\n")))
}

// stripListPrefixes removes a leading numbered/bulleted list marker ("1.", "1)", "-", "*") from
// each line, if present - used only for the line-based fallback parse, never for an
// already-clean JSON array element (which may legitimately start with a digit, e.g. "350 kW").
func stripListPrefixes(lines []string) []string {
	out := make([]string, len(lines))

	for i, line := range lines {
		line = strings.TrimSpace(line)
		if rest, ok := strings.CutPrefix(line, "-"); ok {
			line = rest
		} else if rest, ok := strings.CutPrefix(line, "*"); ok {
			line = rest
		} else if idx := strings.IndexAny(line, ".)"); idx > 0 && idx <= 3 {
			if _, err := strconv.Atoi(line[:idx]); err == nil {
				line = line[idx+1:]
			}
		}

		out[i] = strings.TrimSpace(line)
	}

	return out
}

func trimEmpty(lines []string) []string {
	out := make([]string, 0, len(lines))

	for _, line := range lines {
		line = strings.TrimSpace(line)
		if line != "" {
			out = append(out, line)
		}
	}

	return out
}
