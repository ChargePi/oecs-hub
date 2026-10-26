package onboarding

import (
	"github.com/ChargePi/oecs-hub/internal/preferences"
	"github.com/google/uuid"
)

type Status string

const (
	StatusPending   Status = "pending"
	StatusSkipped   Status = "skipped"
	StatusCompleted Status = "completed"
)

type AccountType string

type QuestionKind string

const (
	QuestionKindSingleChoice   QuestionKind = "single"
	QuestionKindMultipleChoice QuestionKind = "multiple"
)

// Effects are what picking an option suggests for the account. Empty fields suggest nothing.
type Effects struct {
	ViewMode    preferences.ViewMode   `yaml:"viewMode"`
	ChatLayout  preferences.ChatLayout `yaml:"chatLayout"`
	LandingPath string                 `yaml:"landingPath"`
}

type Option struct {
	ID          string  `yaml:"id"`
	Label       string  `yaml:"label"`
	Description string  `yaml:"description"`
	Effects     Effects `yaml:"effects"`
}

// Condition holds when the referenced earlier question has any of the options selected.
type Condition struct {
	QuestionID string   `yaml:"question"`
	AnyOf      []string `yaml:"anyOf"`
}

type Question struct {
	ID      string       `yaml:"id"`
	Label   string       `yaml:"label"`
	Title   string       `yaml:"title"`
	Hint    string       `yaml:"hint"`
	Kind    QuestionKind `yaml:"kind"`
	Options []Option     `yaml:"options"`
	ShowIf  *Condition   `yaml:"showIf"`
}

type Questionnaire struct {
	Questions []Question `yaml:"questions"`
}

// Catalog holds one questionnaire per account type.
type Catalog map[AccountType]Questionnaire

type Answer struct {
	QuestionID string
	OptionIDs  []string
}

type Profile struct {
	IdentityID uuid.UUID
	Status     Status
	Answers    []Answer
}

func Pending(identityID uuid.UUID) *Profile {
	return &Profile{IdentityID: identityID, Status: StatusPending}
}
