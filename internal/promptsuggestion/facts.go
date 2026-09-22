package promptsuggestion

import (
	"encoding/json"
	"fmt"
	"math/rand/v2"

	internalmcp "github.com/ChargePi/oecs-hub/internal/mcp"
	"github.com/ChargePi/oecs-hub/internal/oecsspec"
)

// chargerFact is one concrete, real fact about a charger - grounding text handed to the LLM so
// the suggestion it writes references something that actually exists in the catalog, not an
// invented attribute.
type chargerFact struct {
	ManufacturerName string
	ModelName        string
	// Attribute is a short human-readable fact, e.g. "a CCS2_Combo2 connector",
	// "OCPP 2.0.1 support", "an aluminum housing".
	Attribute string
}

// decodeSpec re-marshals c.Spec (decoded generically by internal/mcp's chargerToOutput) into the
// typed oecsspec.Charger, giving structured access to hardware/software fields - returns false
// if c's spec doesn't decode (should not happen for a verified charger, but callers must not
// assume it).
func decodeSpec(c internalmcp.ChargerSummaryOutput) (oecsspec.Charger, bool) {
	specJSON, err := json.Marshal(c.Spec)
	if err != nil {
		return oecsspec.Charger{}, false
	}

	var spec oecsspec.Charger
	if err := json.Unmarshal(specJSON, &spec); err != nil {
		return oecsspec.Charger{}, false
	}

	return spec, true
}

// chargerName is just enough to name a charger in a suggestion - used by the comparison
// generator, which doesn't need a specific attribute, only two chargers' names.
type chargerName struct {
	ManufacturerName string
	ModelName        string
}

func extractName(c internalmcp.ChargerSummaryOutput) (chargerName, bool) {
	spec, ok := decodeSpec(c)
	if !ok || spec.Model.Name == "" {
		return chargerName{}, false
	}

	return chargerName{ManufacturerName: c.ManufacturerName, ModelName: spec.Model.Name}, true
}

// extractFact decodes c's spec and picks one random notable attribute from whichever of
// connector type, protocol, or housing material are present - returns false if c's spec has
// none of them (e.g. a minimal/incomplete submission), so callers can skip it rather than hand
// the LLM an empty fact.
func extractFact(c internalmcp.ChargerSummaryOutput, rng *rand.Rand) (chargerFact, bool) {
	spec, ok := decodeSpec(c)
	if !ok {
		return chargerFact{}, false
	}

	var candidates []string

	for _, conn := range spec.Hardware.Connectors {
		if conn.Type != "" {
			candidates = append(candidates, fmt.Sprintf("a %s connector", conn.Type))
		}
	}

	if spec.Software != nil {
		for _, p := range spec.Software.Protocols {
			name := p.Name
			if name == "other" && p.OtherName != "" {
				name = p.OtherName
			}
			if name != "" && name != "other" {
				if p.Version != "" {
					candidates = append(candidates, fmt.Sprintf("%s %s support", name, p.Version))
				} else {
					candidates = append(candidates, fmt.Sprintf("%s support", name))
				}
			}
		}
	}

	if spec.Hardware.Housing != nil && spec.Hardware.Housing.Material != "" {
		candidates = append(candidates, fmt.Sprintf("a %s housing", spec.Hardware.Housing.Material))
	}

	if len(candidates) == 0 {
		return chargerFact{}, false
	}

	return chargerFact{
		ManufacturerName: c.ManufacturerName,
		ModelName:        spec.Model.Name,
		Attribute:        candidates[rng.IntN(len(candidates))],
	}, true
}
