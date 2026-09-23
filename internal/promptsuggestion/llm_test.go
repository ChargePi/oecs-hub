package promptsuggestion

import (
	"reflect"
	"testing"
)

func TestParseSuggestions(t *testing.T) {
	t.Run("JSON array", func(t *testing.T) {
		got := parseSuggestions(`["What is OCPP?", "What is CCS2?"]`)
		want := []string{"What is OCPP?", "What is CCS2?"}

		if !reflect.DeepEqual(got, want) {
			t.Fatalf("got %v, want %v", got, want)
		}
	})

	t.Run("JSON array wrapped in a markdown fence", func(t *testing.T) {
		got := parseSuggestions("```json\n[\"What is OCPP?\"]\n```")
		want := []string{"What is OCPP?"}

		if !reflect.DeepEqual(got, want) {
			t.Fatalf("got %v, want %v", got, want)
		}
	})

	t.Run("falls back to numbered lines, stripping the number but not leading digits in text", func(t *testing.T) {
		got := parseSuggestions("1. What is OCPP?\n2. How fast is 350 kW charging?\n")
		want := []string{"What is OCPP?", "How fast is 350 kW charging?"}

		if !reflect.DeepEqual(got, want) {
			t.Fatalf("got %v, want %v", got, want)
		}
	})

	t.Run("falls back to bulleted lines", func(t *testing.T) {
		got := parseSuggestions("- What is OCPP?\n* How does CCS2 work?\n")
		want := []string{"What is OCPP?", "How does CCS2 work?"}

		if !reflect.DeepEqual(got, want) {
			t.Fatalf("got %v, want %v", got, want)
		}
	})
}
