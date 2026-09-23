package promptsuggestion

import (
	"encoding/json"
	"fmt"

	internalmcp "github.com/ChargePi/oecs-hub/internal/mcp"
	"github.com/ChargePi/oecs-hub/internal/oecsspec"
)

// chargerFacts is everything notable this package can find about one real charger - grounding
// handed to the LLM so it picks which attribute(s), if any, are worth building a suggestion
// around, rather than this package pre-selecting one itself.
type chargerFacts struct {
	ManufacturerName string
	ModelName        string
	// Attributes are every notable fact found (connector types, protocol+version, housing
	// material, ...), in no particular order - the prompt instructs the LLM to pick
	// whichever it finds most interesting, not to restate all of them. May be empty (e.g. a
	// minimal submission); callers decide whether a name-only charger is still useful to
	// them (generateChargers isn't, generateComparison is).
	Attributes []string
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

// extractFacts decodes c's spec and collects every notable connector/protocol/housing
// attribute it can find - returns false only if c has no usable name (nothing to call it by
// at all), never because it lacks attributes.
func extractFacts(c internalmcp.ChargerSummaryOutput) (chargerFacts, bool) {
	spec, ok := decodeSpec(c)
	if !ok || spec.Model.Name == "" {
		return chargerFacts{}, false
	}

	var attrs []string

	for _, conn := range spec.Hardware.Connectors {
		if conn.Type != "" {
			attrs = append(attrs, fmt.Sprintf("a %s connector", conn.Type))
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
					attrs = append(attrs, fmt.Sprintf("%s %s support", name, p.Version))
				} else {
					attrs = append(attrs, fmt.Sprintf("%s support", name))
				}
			}
		}
	}

	if spec.Hardware.Housing != nil && spec.Hardware.Housing.Material != "" {
		attrs = append(attrs, fmt.Sprintf("a %s housing", spec.Hardware.Housing.Material))
	}

	return chargerFacts{ManufacturerName: c.ManufacturerName, ModelName: spec.Model.Name, Attributes: attrs}, true
}
