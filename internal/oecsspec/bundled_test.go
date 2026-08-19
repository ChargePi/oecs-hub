package oecsspec

import (
	"bytes"
	"encoding/json"
	"os"
	"testing"

	"github.com/ChargePi/oecs-hub/internal/oecsspec/schemabundle"
	"github.com/santhosh-tekuri/jsonschema/v5"
)

// TestBundledSchemaUpToDate fails if internal/oecsspec/schema/bundled/charger.schema.json
// drifts from the per-concern source files it's generated from - run `go run
// ./cmd/gen-schema-bundle` after editing anything under internal/oecsspec/schema.
func TestBundledSchemaUpToDate(t *testing.T) {
	want, err := schemabundle.Bundle(os.DirFS("schema"))
	if err != nil {
		t.Fatalf("Bundle: %v", err)
	}

	wantJSON, err := json.MarshalIndent(want, "", "  ")
	if err != nil {
		t.Fatalf("marshaling expected bundle: %v", err)
	}
	wantJSON = append(wantJSON, '\n')

	got, err := os.ReadFile("schema/bundled/charger.schema.json")
	if err != nil {
		t.Fatalf("reading checked-in bundle: %v", err)
	}

	if !bytes.Equal(got, wantJSON) {
		t.Fatal("schema/bundled/charger.schema.json is stale - run `go run ./cmd/gen-schema-bundle`")
	}
}

// TestBundledSchemaValidates confirms the flattened bundle is functionally equivalent to
// the per-concern source files by compiling it standalone (no AddResource for any other
// file - proving it's genuinely self-contained) and validating the same example specs
// TestValidateExamples checks against the source files.
func TestBundledSchemaValidates(t *testing.T) {
	raw, err := os.ReadFile("schema/bundled/charger.schema.json")
	if err != nil {
		t.Fatalf("reading bundle: %v", err)
	}

	compiler := jsonschema.NewCompiler()
	if err := compiler.AddResource(rootSchemaID, bytes.NewReader(raw)); err != nil {
		t.Fatalf("loading bundle: %v", err)
	}

	compiled, err := compiler.Compile(rootSchemaID)
	if err != nil {
		t.Fatalf("compiling bundle: %v", err)
	}

	for _, path := range []string{
		"testdata/ac-wallbox-full.json",
		"testdata/dc-fast-charger-full.json",
	} {
		data, err := os.ReadFile(path)
		if err != nil {
			t.Fatalf("reading %s: %v", path, err)
		}

		var doc any
		if err := json.Unmarshal(data, &doc); err != nil {
			t.Fatalf("unmarshaling %s: %v", path, err)
		}

		if err := compiled.Validate(doc); err != nil {
			t.Errorf("validating %s against bundle: %v", path, err)
		}
	}
}
