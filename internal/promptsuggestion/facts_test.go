package promptsuggestion

import (
	"encoding/json"
	"testing"

	internalmcp "github.com/ChargePi/oecs-hub/internal/mcp"
)

func chargerSummary(t *testing.T, manufacturer, model, connectorType, protocolName, housingMaterial string) internalmcp.ChargerSummaryOutput {
	t.Helper()

	spec := map[string]any{
		"model": map[string]any{"name": model},
	}

	if connectorType != "" {
		spec["hardware"] = map[string]any{
			"connectors": []map[string]any{{"type": connectorType}},
		}
	}

	if housingMaterial != "" {
		hw, _ := spec["hardware"].(map[string]any)
		if hw == nil {
			hw = map[string]any{}
		}
		hw["housing"] = map[string]any{"material": housingMaterial}
		spec["hardware"] = hw
	}

	if protocolName != "" {
		spec["software"] = map[string]any{
			"protocols": []map[string]any{{"name": protocolName, "version": "2.0.1"}},
		}
	}

	// Round-trip through JSON to mirror how internal/mcp's chargerToOutput decodes Spec
	// generically (json.Unmarshal into `any`), rather than handing decodeSpec a map[string]any
	// it happens to be able to use directly.
	raw, err := json.Marshal(spec)
	if err != nil {
		t.Fatalf("marshal spec fixture: %v", err)
	}

	var generic any
	if err := json.Unmarshal(raw, &generic); err != nil {
		t.Fatalf("unmarshal spec fixture: %v", err)
	}

	return internalmcp.ChargerSummaryOutput{ManufacturerName: manufacturer, Spec: generic}
}

func TestExtractFacts(t *testing.T) {
	t.Run("collects every notable attribute, not just one", func(t *testing.T) {
		c := chargerSummary(t, "Acme", "ChargeMax 350", "CCS2_Combo2", "OCPP", "aluminum")

		facts, ok := extractFacts(c)
		if !ok {
			t.Fatal("expected facts")
		}

		if facts.ManufacturerName != "Acme" || facts.ModelName != "ChargeMax 350" {
			t.Fatalf("unexpected names: %+v", facts)
		}

		if len(facts.Attributes) != 3 {
			t.Fatalf("expected 3 attributes (connector, protocol, housing), got %d: %v", len(facts.Attributes), facts.Attributes)
		}
	})

	t.Run("no attributes still returns a usable name with an empty list", func(t *testing.T) {
		c := chargerSummary(t, "Acme", "ChargeMax 350", "", "", "")

		facts, ok := extractFacts(c)
		if !ok {
			t.Fatal("expected facts (name alone is enough)")
		}

		if len(facts.Attributes) != 0 {
			t.Fatalf("expected no attributes, got %v", facts.Attributes)
		}
	})

	t.Run("missing model name returns false", func(t *testing.T) {
		empty := internalmcp.ChargerSummaryOutput{ManufacturerName: "Acme", Spec: map[string]any{}}

		if _, ok := extractFacts(empty); ok {
			t.Fatal("expected no facts when spec has no model name")
		}
	})
}
