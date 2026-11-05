package onboarding

import (
	"bytes"
	_ "embed"
	"errors"
	"fmt"
	"os"
	"strings"

	"github.com/ChargePi/oecs-hub/internal/preferences"
	"gopkg.in/yaml.v3"
)

//go:embed questionnaires.yaml
var defaultCatalogSrc []byte

var ErrInvalidCatalog = errors.New("invalid onboarding questionnaires")

func DefaultCatalog() (Catalog, error) {
	return ParseCatalog(defaultCatalogSrc)
}

// LoadCatalog reads the questionnaires from path, or the built-in ones when path is empty.
func LoadCatalog(path string) (Catalog, error) {
	if path == "" {
		return DefaultCatalog()
	}

	src, err := os.ReadFile(path)
	if err != nil {
		return nil, fmt.Errorf("read onboarding questionnaires: %w", err)
	}

	return ParseCatalog(src)
}

func ParseCatalog(src []byte) (Catalog, error) {
	var catalog Catalog

	dec := yaml.NewDecoder(bytes.NewReader(src))
	dec.KnownFields(true)

	err := dec.Decode(&catalog)
	if err != nil {
		return nil, fmt.Errorf("%w: %w", ErrInvalidCatalog, err)
	}

	for accountType, q := range catalog {
		err = validateQuestionnaire(q)
		if err != nil {
			return nil, fmt.Errorf("%w: %s: %w", ErrInvalidCatalog, accountType, err)
		}
	}

	return catalog, nil
}

func validateQuestionnaire(q Questionnaire) error {
	if len(q.Questions) == 0 {
		return errors.New("no questions")
	}

	seen := make(map[string]map[string]struct{}, len(q.Questions))

	for _, question := range q.Questions {
		if _, duplicate := seen[question.ID]; duplicate {
			return fmt.Errorf("duplicate question %q", question.ID)
		}

		options, err := validateQuestion(question, seen)
		if err != nil {
			return fmt.Errorf("question %q: %w", question.ID, err)
		}

		seen[question.ID] = options
	}

	return nil
}

// validateQuestion returns the question's option ids. earlier holds the option ids of the questions before it.
func validateQuestion(question Question, earlier map[string]map[string]struct{}) (map[string]struct{}, error) {
	switch {
	case question.ID == "" || question.Label == "" || question.Title == "":
		return nil, errors.New("id, label and title are required")
	case question.Kind != QuestionKindSingleChoice && question.Kind != QuestionKindMultipleChoice:
		return nil, fmt.Errorf("unknown kind %q", question.Kind)
	case len(question.Options) == 0:
		return nil, errors.New("no options")
	}

	options := make(map[string]struct{}, len(question.Options))

	for _, option := range question.Options {
		_, duplicate := options[option.ID]

		switch {
		case option.ID == "" || option.Label == "":
			return nil, errors.New("option id and label are required")
		case duplicate:
			return nil, fmt.Errorf("duplicate option %q", option.ID)
		}

		err := validateEffects(option.Effects)
		if err != nil {
			return nil, fmt.Errorf("option %q: %w", option.ID, err)
		}

		options[option.ID] = struct{}{}
	}

	if question.ShowIf == nil {
		return options, nil
	}

	target, ok := earlier[question.ShowIf.QuestionID]

	switch {
	case !ok:
		return nil, fmt.Errorf("showIf references %q, which is not an earlier question", question.ShowIf.QuestionID)
	case len(question.ShowIf.AnyOf) == 0:
		return nil, errors.New("showIf lists no options")
	}

	for _, id := range question.ShowIf.AnyOf {
		if _, ok := target[id]; !ok {
			return nil, fmt.Errorf("showIf references unknown option %q", id)
		}
	}

	return options, nil
}

func validateEffects(e Effects) error {
	switch e.ViewMode {
	case "", preferences.ViewModeSimplified, preferences.ViewModeAdvanced:
	default:
		return fmt.Errorf("unknown view mode %q", e.ViewMode)
	}

	switch e.ChatLayout {
	case preferences.ChatLayoutAuto, preferences.ChatLayoutDrawer, preferences.ChatLayoutPage:
	default:
		return fmt.Errorf("unknown chat layout %q", e.ChatLayout)
	}

	if e.LandingPath != "" && (!strings.HasPrefix(e.LandingPath, "/") || strings.HasPrefix(e.LandingPath, "//")) {
		return fmt.Errorf("landing path %q must be a same-origin path", e.LandingPath)
	}

	return nil
}
