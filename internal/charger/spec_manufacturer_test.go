package charger

import (
	"encoding/json"
	"testing"
)

type specManufacturerProbe struct {
	Manufacturer map[string]any `json:"manufacturer"`
	Model        map[string]any `json:"model"`
}

func TestWithManufacturer(t *testing.T) {
	raw := []byte(`{"model":{"name":"X"},"manufacturer":{"name":"Old","country":"FR","logoUrl":"https://old.example/logo.png"}}`)

	t.Run("sets name and country, keeps other keys", func(t *testing.T) {
		out, err := withManufacturer(raw, "New", "DE")
		if err != nil {
			t.Fatalf("unexpected error: %v", err)
		}

		var got specManufacturerProbe
		if err := json.Unmarshal(out, &got); err != nil {
			t.Fatalf("decode: %v", err)
		}

		if got.Manufacturer["name"] != "New" || got.Manufacturer["country"] != "DE" {
			t.Fatalf("unexpected manufacturer: %v", got.Manufacturer)
		}

		if got.Manufacturer["logoUrl"] != "https://old.example/logo.png" || got.Model["name"] != "X" {
			t.Fatalf("other keys not preserved: %s", out)
		}
	})

	t.Run("empty country removes it", func(t *testing.T) {
		out, err := withManufacturer(raw, "New", "")
		if err != nil {
			t.Fatalf("unexpected error: %v", err)
		}

		var got specManufacturerProbe
		if err := json.Unmarshal(out, &got); err != nil {
			t.Fatalf("decode: %v", err)
		}

		if _, ok := got.Manufacturer["country"]; ok {
			t.Fatalf("country not removed: %v", got.Manufacturer)
		}
	})

	t.Run("missing manufacturer block is created", func(t *testing.T) {
		out, err := withManufacturer([]byte(`{"model":{"name":"X"}}`), "New", "DE")
		if err != nil {
			t.Fatalf("unexpected error: %v", err)
		}

		var got specManufacturerProbe
		if err := json.Unmarshal(out, &got); err != nil {
			t.Fatalf("decode: %v", err)
		}

		if got.Manufacturer["name"] != "New" {
			t.Fatalf("unexpected manufacturer: %v", got.Manufacturer)
		}
	})

	t.Run("invalid json errors", func(t *testing.T) {
		if _, err := withManufacturer([]byte(`nope`), "New", ""); err == nil {
			t.Fatal("expected error")
		}
	})
}
