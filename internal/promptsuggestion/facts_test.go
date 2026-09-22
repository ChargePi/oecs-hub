package promptsuggestion

import (
	"encoding/json"
	"math/rand/v2"
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

func TestExtractFact(t *testing.T) {
	rng := rand.New(rand.NewPCG(1, 2))

	t.Run("picks a candidate attribute when one is present", func(t *testing.T) {
		c := chargerSummary(t, "Acme", "ChargeMax 350", "CCS2_Combo2", "", "")

		fact, ok := extractFact(c, rng)
		if !ok {
			t.Fatal("expected a fact")
		}

		if fact.ManufacturerName != "Acme" || fact.ModelName != "ChargeMax 350" {
			t.Fatalf("unexpected names: %+v", fact)
		}

		if fact.Attribute == "" {
			t.Fatal("expected a non-empty attribute")
		}
	})

	t.Run("no candidate attributes returns false", func(t *testing.T) {
		c := chargerSummary(t, "Acme", "ChargeMax 350", "", "", "")

		if _, ok := extractFact(c, rng); ok {
			t.Fatal("expected no fact for a spec with no notable attributes")
		}
	})
}

func TestExtractName(t *testing.T) {
	c := chargerSummary(t, "Acme", "ChargeMax 350", "", "", "")

	name, ok := extractName(c)
	if !ok {
		t.Fatal("expected a name")
	}

	if name.ManufacturerName != "Acme" || name.ModelName != "ChargeMax 350" {
		t.Fatalf("unexpected name: %+v", name)
	}

	t.Run("missing model name returns false", func(t *testing.T) {
		empty := internalmcp.ChargerSummaryOutput{ManufacturerName: "Acme", Spec: map[string]any{}}

		if _, ok := extractName(empty); ok {
			t.Fatal("expected no name when spec has no model name")
		}
	})
}
