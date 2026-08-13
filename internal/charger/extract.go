package charger

import (
	"sort"
	"strings"

	"github.com/ChargePi/oecs-hub/internal/oecsspec"
)

// extractedFields are the search-relevant fields extracted from a validated OECS
// document, denormalized onto the Charger row so SearchChargers/SearchSchemas can
// filter without inspecting Spec at query time.
type extractedFields struct {
	connectorTypes []string
	protocols      []string
	minPowerWatts  *float64
	maxPowerWatts  *float64
}

func extract(spec *oecsspec.Charger) extractedFields {
	var f extractedFields

	if spec.Hardware.Electrical != nil && spec.Hardware.Electrical.Output != nil {
		out := spec.Hardware.Electrical.Output
		f.minPowerWatts = quantityToWatts(out.MinPower)
		f.maxPowerWatts = quantityToWatts(out.MaxPower)
	}

	connectorTypes := make(map[string]struct{}, len(spec.Hardware.Connectors))
	for _, c := range spec.Hardware.Connectors {
		connectorTypes[c.Type] = struct{}{}

		if f.maxPowerWatts != nil && f.minPowerWatts != nil {
			continue
		}

		if w := quantityToWatts(c.MaxPower); w != nil {
			if f.maxPowerWatts == nil || *w > *f.maxPowerWatts {
				f.maxPowerWatts = w
			}

			if f.minPowerWatts == nil || *w < *f.minPowerWatts {
				f.minPowerWatts = w
			}
		}
	}

	f.connectorTypes = sortedKeys(connectorTypes)

	if spec.Software != nil {
		protocols := make(map[string]struct{}, len(spec.Software.Protocols))
		for _, p := range spec.Software.Protocols {
			protocols[p.Name] = struct{}{}
		}

		f.protocols = sortedKeys(protocols)
	}

	return f
}

// quantityToWatts normalizes a Quantity to watts. Only "W" and "kW" (case-insensitive)
// units are recognized, per common.schema.json's quantity unit examples for power
// fields; anything else is left unconverted (nil) rather than risk a wrong scale.
func quantityToWatts(q *oecsspec.Quantity) *float64 {
	if q == nil {
		return nil
	}

	var watts float64

	switch strings.ToLower(q.Unit) {
	case "w":
		watts = q.Value
	case "kw":
		watts = q.Value * 1000
	default:
		return nil
	}

	return &watts
}

func sortedKeys(m map[string]struct{}) []string {
	if len(m) == 0 {
		return nil
	}

	keys := make([]string, 0, len(m))
	for k := range m {
		keys = append(keys, k)
	}

	sort.Strings(keys)

	return keys
}
