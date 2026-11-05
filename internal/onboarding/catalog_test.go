package onboarding

import (
	"errors"
	"os"
	"path/filepath"
	"testing"
)

func TestDefaultCatalog(t *testing.T) {
	catalog, err := DefaultCatalog()
	if err != nil {
		t.Fatalf("DefaultCatalog: %v", err)
	}

	for _, accountType := range []AccountType{"individual", "business", "manufacturer"} {
		if len(catalog[accountType].Questions) == 0 {
			t.Fatalf("no questions for %s", accountType)
		}
	}
}

func TestLoadCatalogFromFile(t *testing.T) {
	path := filepath.Join(t.TempDir(), "questionnaires.yaml")

	err := os.WriteFile(path, []byte(testCatalogSrc), 0o600)
	if err != nil {
		t.Fatalf("write catalog: %v", err)
	}

	catalog, err := LoadCatalog(path)
	if err != nil {
		t.Fatalf("LoadCatalog: %v", err)
	}

	if got := catalog["individual"].Questions[2].ShowIf; got == nil || got.QuestionID != "goals" {
		t.Fatalf("unexpected showIf: %+v", got)
	}
}

func TestParseCatalogRejectsInvalid(t *testing.T) {
	const option = "options: [{ id: a, label: A }]"

	tests := map[string]string{
		"unknown field":               "individual: { questions: [{ id: q, label: Q, title: T, kind: single, colour: red, " + option + " }] }",
		"no questions":                "individual: { questions: [] }",
		"missing title":               "individual: { questions: [{ id: q, label: Q, kind: single, " + option + " }] }",
		"unknown kind":                "individual: { questions: [{ id: q, label: Q, title: T, kind: essay, " + option + " }] }",
		"no options":                  "individual: { questions: [{ id: q, label: Q, title: T, kind: single }] }",
		"duplicate question":          "individual: { questions: [{ id: q, label: Q, title: T, kind: single, " + option + " }, { id: q, label: Q, title: T, kind: single, " + option + " }] }",
		"duplicate option":            "individual: { questions: [{ id: q, label: Q, title: T, kind: single, options: [{ id: a, label: A }, { id: a, label: B }] }] }",
		"unknown view mode":           "individual: { questions: [{ id: q, label: Q, title: T, kind: single, options: [{ id: a, label: A, effects: { viewMode: compact } }] }] }",
		"external landing path":       "individual: { questions: [{ id: q, label: Q, title: T, kind: single, options: [{ id: a, label: A, effects: { landingPath: 'https://example.com' } }] }] }",
		"showIf on a later question":  "individual: { questions: [{ id: q, label: Q, title: T, kind: single, showIf: { question: r, anyOf: [a] }, " + option + " }, { id: r, label: R, title: T, kind: single, " + option + " }] }",
		"showIf on an unknown option": "individual: { questions: [{ id: q, label: Q, title: T, kind: single, " + option + " }, { id: r, label: R, title: T, kind: single, showIf: { question: q, anyOf: [z] }, " + option + " }] }",
	}

	for name, src := range tests {
		t.Run(name, func(t *testing.T) {
			_, err := ParseCatalog([]byte(src))
			if !errors.Is(err, ErrInvalidCatalog) {
				t.Fatalf("got %v, want ErrInvalidCatalog", err)
			}
		})
	}
}
