package oecsspec

import (
	"bytes"
	"embed"
	"encoding/json"
	"fmt"

	"github.com/santhosh-tekuri/jsonschema/v5"
)

//go:embed schema/*.schema.json
var schemaFS embed.FS

const rootSchemaID = "https://oecs.dev/schema/1.1.0/charger.schema.json"

var schemaFiles = []string{
	"charger.schema.json",
	"common.schema.json",
	"connector.schema.json",
	"hardware.schema.json",
	"metadata.schema.json",
	"payment.schema.json",
	"pricing.schema.json",
	"software.schema.json",
}

// Validator validates raw JSON against the embedded OECS 1.1.0 JSON Schema.
type Validator struct {
	compiled *jsonschema.Schema
}

func NewValidator() (*Validator, error) {
	compiler := jsonschema.NewCompiler()

	for _, name := range schemaFiles {
		raw, err := schemaFS.ReadFile("schema/" + name)
		if err != nil {
			return nil, fmt.Errorf("reading embedded %s: %w", name, err)
		}

		var doc any
		if err := json.Unmarshal(raw, &doc); err != nil {
			return nil, fmt.Errorf("unmarshaling embedded %s: %w", name, err)
		}

		id, _ := doc.(map[string]any)["$id"].(string)
		if id == "" {
			return nil, fmt.Errorf("embedded %s has no $id", name)
		}

		if err := compiler.AddResource(id, bytes.NewReader(raw)); err != nil {
			return nil, fmt.Errorf("loading embedded %s: %w", name, err)
		}
	}

	compiled, err := compiler.Compile(rootSchemaID)
	if err != nil {
		return nil, fmt.Errorf("compiling embedded OECS schema: %w", err)
	}

	return &Validator{compiled: compiled}, nil
}

// Validate validates raw JSON against the OECS 1.1.0 charger schema and, on success,
// unmarshals it into a Charger.
func (v *Validator) Validate(raw []byte) (*Charger, error) {
	var doc any
	err := json.Unmarshal(raw, &doc)
	if err != nil {
		return nil, fmt.Errorf("unmarshaling charger spec: %w", err)
	}

	err = v.compiled.Validate(doc)
	if err != nil {
		return nil, fmt.Errorf("charger record does not match schema: %w", err)
	}

	var charger Charger

	err = json.Unmarshal(raw, &charger)
	if err != nil {
		return nil, fmt.Errorf("unmarshaling charger spec: %w", err)
	}

	return &charger, nil
}
