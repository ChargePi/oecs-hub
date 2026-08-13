package oecsspec

import (
	"os"
	"testing"
)

func TestValidateExamples(t *testing.T) {
	v, err := NewValidator()
	if err != nil {
		t.Fatalf("NewValidator: %v", err)
	}

	// minimal.json is pinned to schema version 1.0.0 and is intentionally excluded:
	// this service only accepts 1.1.0 documents (version is a JSON Schema const).
	examples := []string{
		"testdata/ac-wallbox-full.json",
		"testdata/dc-fast-charger-full.json",
	}

	for _, path := range examples {
		raw, err := os.ReadFile(path)
		if err != nil {
			t.Fatalf("reading %s: %v", path, err)
		}

		charger, err := v.Validate(raw)
		if err != nil {
			t.Fatalf("validating %s: %v", path, err)
		}

		if charger.Version != SchemaVersion {
			t.Errorf("%s: got version %q, want %q", path, charger.Version, SchemaVersion)
		}
	}
}

func TestValidateRejectsInvalid(t *testing.T) {
	v, err := NewValidator()
	if err != nil {
		t.Fatalf("NewValidator: %v", err)
	}

	if _, err := v.Validate([]byte(`{"version":"1.1.0"}`)); err == nil {
		t.Fatal("expected validation error for missing required fields")
	}
}
