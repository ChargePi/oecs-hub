package promptsuggestion

import (
	"context"
	"testing"

	internalmcp "github.com/ChargePi/oecs-hub/internal/mcp"
)

func TestGenerator_Generate_Knowledge(t *testing.T) {
	chatModel := &fakeChatModel{}
	gen := NewGenerator(chatModel, nil, GeneratorConfig{Topic: TopicGeneral, Mode: ModeKnowledge, PoolSize: 5})

	suggestions, err := gen.Generate(context.Background())
	if err != nil {
		t.Fatalf("unexpected error: %v", err)
	}

	if len(suggestions) != 5 {
		t.Fatalf("expected 5 suggestions, got %d", len(suggestions))
	}

	for _, s := range suggestions {
		if s.Topic != TopicGeneral {
			t.Fatalf("expected topic %s, got %s", TopicGeneral, s.Topic)
		}
	}
}

func TestGenerator_Generate_CatalogSingleSkipsChargersWithNoAttributes(t *testing.T) {
	// One charger has a connector (usable), one has nothing notable (skipped for
	// ModeCatalogSingle, which needs at least one attribute per item).
	chargers := []internalmcp.ChargerSummaryOutput{
		{ManufacturerName: "Acme", Spec: map[string]any{
			"model":    map[string]any{"name": "Model A"},
			"hardware": map[string]any{"connectors": []map[string]any{{"type": "CCS2_Combo2"}}},
		}},
		{ManufacturerName: "Beta", Spec: map[string]any{
			"model": map[string]any{"name": "Model B"},
		}},
	}

	chatModel := &fakeChatModel{}
	mcpCaller := &fakeMCPToolCaller{result: internalmcp.SearchChargersOutput{Chargers: chargers}}
	gen := NewGenerator(chatModel, mcpCaller, GeneratorConfig{Topic: TopicChargers, Mode: ModeCatalogSingle, PoolSize: 5})

	suggestions, err := gen.Generate(context.Background())
	if err != nil {
		t.Fatalf("unexpected error: %v", err)
	}

	if len(suggestions) != 1 {
		t.Fatalf("expected exactly 1 suggestion (only Model A has a usable attribute), got %d", len(suggestions))
	}

	if suggestions[0].Topic != TopicChargers {
		t.Fatalf("expected topic %s, got %s", TopicChargers, suggestions[0].Topic)
	}
}

func TestGenerator_Generate_CatalogPairToleratesNoAttributes(t *testing.T) {
	// Neither charger has a notable attribute - ModeCatalogPair still forms a pair from
	// names alone, unlike ModeCatalogSingle.
	chargers := []internalmcp.ChargerSummaryOutput{
		{ManufacturerName: "Acme", Spec: map[string]any{"model": map[string]any{"name": "Model A"}}},
		{ManufacturerName: "Beta", Spec: map[string]any{"model": map[string]any{"name": "Model B"}}},
	}

	chatModel := &fakeChatModel{}
	mcpCaller := &fakeMCPToolCaller{result: internalmcp.SearchChargersOutput{Chargers: chargers}}
	gen := NewGenerator(chatModel, mcpCaller, GeneratorConfig{Topic: TopicComparison, Mode: ModeCatalogPair, PoolSize: 5})

	suggestions, err := gen.Generate(context.Background())
	if err != nil {
		t.Fatalf("unexpected error: %v", err)
	}

	if len(suggestions) != 1 {
		t.Fatalf("expected exactly 1 pair-based suggestion, got %d", len(suggestions))
	}

	if suggestions[0].Topic != TopicComparison {
		t.Fatalf("expected topic %s, got %s", TopicComparison, suggestions[0].Topic)
	}
}

func TestGenerator_Generate_UnknownMode(t *testing.T) {
	gen := NewGenerator(&fakeChatModel{}, nil, GeneratorConfig{Topic: TopicGeneral, Mode: Mode("bogus"), PoolSize: 1})

	if _, err := gen.Generate(context.Background()); err == nil {
		t.Fatal("expected an error for an unknown mode")
	}
}
