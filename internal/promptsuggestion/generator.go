package promptsuggestion

import (
	"context"
	"fmt"

	"go.opentelemetry.io/otel/codes"
	"go.opentelemetry.io/otel/trace"
)

// Generator produces one topic's pool of suggestions. Service depends on this interface alone,
// not on topic-specific functions - each generation strategy (LLM-only knowledge, or
// MCP-catalog-grounded with one or two real chargers per item) adapts to it the same way.
type Generator interface {
	Generate(ctx context.Context) ([]Suggestion, error)
}

// Mode selects a generator's generation strategy.
type Mode string

const (
	// ModeKnowledge asks the LLM directly, with no search_chargers grounding - for general
	// EV-knowledge questions that aren't about any specific charger.
	ModeKnowledge Mode = "knowledge"
	// ModeCatalogSingle grounds each pool item in one real charger's facts.
	ModeCatalogSingle Mode = "catalog_single"
	// ModeCatalogPair grounds each pool item in a pair of real chargers' facts (comparison).
	ModeCatalogPair Mode = "catalog_pair"
)

// GeneratorConfig is what's statically configured for a topic's generator - fixed once at
// construction (NewGenerator), unlike the fresh per-call randomness (which chargers get
// sampled, in what order) each Generate call draws for itself.
type GeneratorConfig struct {
	Topic    Topic
	Mode     Mode
	PoolSize int
}

// generator is the single Generator implementation; Generate dispatches on cfg.Mode.
// mcpCaller is unused (may be nil) under ModeKnowledge.
type generator struct {
	chatModel ChatModel
	mcpCaller MCPToolCaller
	cfg       GeneratorConfig
}

func NewGenerator(chatModel ChatModel, mcpCaller MCPToolCaller, cfg GeneratorConfig) Generator {
	return &generator{chatModel: chatModel, mcpCaller: mcpCaller, cfg: cfg}
}

func (g *generator) Generate(ctx context.Context) ([]Suggestion, error) {
	ctx, span := tracer.Start(ctx, "promptsuggestion.Generate", trace.WithAttributes(
		topicAttr(g.cfg.Topic), modeAttr(g.cfg.Mode), poolSizeAttr(g.cfg.PoolSize),
	))
	defer span.End()

	var (
		suggestions []Suggestion
		err         error
	)

	switch g.cfg.Mode {
	case ModeKnowledge:
		suggestions, err = g.generateKnowledge(ctx)
	case ModeCatalogSingle:
		suggestions, err = g.generateCatalog(ctx, 1)
	case ModeCatalogPair:
		suggestions, err = g.generateCatalog(ctx, 2)
	default:
		err = fmt.Errorf("unknown generation mode %q", g.cfg.Mode)
	}

	if err != nil {
		span.RecordError(err)
		span.SetStatus(codes.Error, err.Error())

		return nil, err
	}

	span.SetAttributes(suggestionCountAttr(len(suggestions)))

	return suggestions, nil
}

func toSuggestions(topic Topic, texts []string) []Suggestion {
	out := make([]Suggestion, len(texts))
	for i, t := range texts {
		out[i] = Suggestion{Topic: topic, Text: t}
	}

	return out
}
