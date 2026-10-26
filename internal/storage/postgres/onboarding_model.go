package postgres

import (
	"encoding/json"
	"fmt"
	"time"

	"github.com/ChargePi/oecs-hub/internal/onboarding"
	"github.com/google/uuid"
)

type userOnboardingEntity struct {
	IdentityID uuid.UUID       `gorm:"column:identity_id;type:uuid;primaryKey"`
	Status     string          `gorm:"column:status;not null"`
	Answers    json.RawMessage `gorm:"column:answers;type:jsonb;not null;default:'{}'"`
	CreatedAt  time.Time       `gorm:"column:created_at;autoCreateTime"`
	UpdatedAt  time.Time       `gorm:"column:updated_at;autoUpdateTime"`
}

func (userOnboardingEntity) TableName() string {
	return "user_onboarding"
}

type storedOnboardingAnswer struct {
	QuestionID string   `json:"questionId"`
	OptionIDs  []string `json:"optionIds"`
}

type storedOnboardingAnswers struct {
	Answers []storedOnboardingAnswer `json:"answers,omitempty"`
}

func userOnboardingToEntity(p *onboarding.Profile) (*userOnboardingEntity, error) {
	stored := storedOnboardingAnswers{Answers: make([]storedOnboardingAnswer, 0, len(p.Answers))}
	for _, answer := range p.Answers {
		stored.Answers = append(stored.Answers, storedOnboardingAnswer{QuestionID: answer.QuestionID, OptionIDs: answer.OptionIDs})
	}

	raw, err := json.Marshal(stored)
	if err != nil {
		return nil, fmt.Errorf("marshal onboarding answers: %w", err)
	}

	return &userOnboardingEntity{IdentityID: p.IdentityID, Status: string(p.Status), Answers: raw}, nil
}

func (e *userOnboardingEntity) toDomain() (*onboarding.Profile, error) {
	var stored storedOnboardingAnswers

	err := json.Unmarshal(e.Answers, &stored)
	if err != nil {
		return nil, fmt.Errorf("unmarshal onboarding answers: %w", err)
	}

	p := &onboarding.Profile{IdentityID: e.IdentityID, Status: onboarding.Status(e.Status)}
	for _, answer := range stored.Answers {
		p.Answers = append(p.Answers, onboarding.Answer{QuestionID: answer.QuestionID, OptionIDs: answer.OptionIDs})
	}

	return p, nil
}
