package charger

import (
	"encoding/json"
	"fmt"
)

type jsonObject map[string]json.RawMessage

// withManufacturer returns raw with manufacturer.name and manufacturer.country replaced,
// leaving every other key untouched. An empty country removes the key.
func withManufacturer(raw []byte, name, country string) ([]byte, error) {
	var spec jsonObject
	if err := json.Unmarshal(raw, &spec); err != nil {
		return nil, fmt.Errorf("decode spec: %w", err)
	}

	manufacturerBlock := jsonObject{}
	if existing, ok := spec["manufacturer"]; ok {
		if err := json.Unmarshal(existing, &manufacturerBlock); err != nil {
			return nil, fmt.Errorf("decode spec manufacturer: %w", err)
		}
	}

	if err := manufacturerBlock.setString("name", name); err != nil {
		return nil, fmt.Errorf("set spec manufacturer: %w", err)
	}

	switch country {
	case "":
		delete(manufacturerBlock, "country")
	default:
		if err := manufacturerBlock.setString("country", country); err != nil {
			return nil, fmt.Errorf("set spec manufacturer: %w", err)
		}
	}

	encoded, err := json.Marshal(manufacturerBlock)
	if err != nil {
		return nil, fmt.Errorf("encode spec manufacturer: %w", err)
	}

	spec["manufacturer"] = encoded

	out, err := json.Marshal(spec)
	if err != nil {
		return nil, fmt.Errorf("encode spec: %w", err)
	}

	return out, nil
}

func (o jsonObject) setString(key, value string) error {
	encoded, err := json.Marshal(value)
	if err != nil {
		return fmt.Errorf("encode %s: %w", key, err)
	}

	o[key] = encoded

	return nil
}
