package onboarding

import (
	"context"
	"errors"
	"fmt"
	"slices"

	"github.com/google/uuid"
	"go.opentelemetry.io/otel"
	"go.opentelemetry.io/otel/attribute"
	"go.opentelemetry.io/otel/codes"
	"go.opentelemetry.io/otel/trace"
)

var tracer = otel.Tracer("onboarding.service")

var (
	ErrUnsupportedAccountType = errors.New("account type has no onboarding questionnaire")
	ErrInvalidAnswers         = errors.New("invalid onboarding answers")
)

type Service struct {
	repo    Repository
	catalog Catalog
}

func NewService(repo Repository, catalog Catalog) *Service {
	return &Service{repo: repo, catalog: catalog}
}

// Questionnaire returns the questions asked of accountType; ok is false when it has none.
func (s *Service) Questionnaire(accountType AccountType) (Questionnaire, bool) {
	q, ok := s.catalog[accountType]

	return q, ok
}

func (s *Service) Get(ctx context.Context, identityID uuid.UUID) (*Profile, error) {
	ctx, span := tracer.Start(ctx, "onboarding.Get", trace.WithAttributes(identityAttr(identityID)))
	defer span.End()

	p, err := s.get(ctx, identityID)
	if err != nil {
		span.RecordError(err)
		span.SetStatus(codes.Error, err.Error())

		return nil, fmt.Errorf("get onboarding profile: %w", err)
	}

	return p, nil
}

func (s *Service) Complete(ctx context.Context, accountType AccountType, identityID uuid.UUID, answers []Answer) (*Profile, error) {
	ctx, span := tracer.Start(ctx, "onboarding.Complete", trace.WithAttributes(
		identityAttr(identityID),
		attribute.String("onboarding.account_type", string(accountType)),
	))
	defer span.End()

	err := s.validate(accountType, answers)
	if err != nil {
		span.RecordError(err)
		span.SetStatus(codes.Error, err.Error())

		return nil, fmt.Errorf("validate onboarding answers: %w", err)
	}

	saved, err := s.repo.Upsert(ctx, &Profile{IdentityID: identityID, Status: StatusCompleted, Answers: answers})
	if err != nil {
		span.RecordError(err)
		span.SetStatus(codes.Error, err.Error())

		return nil, fmt.Errorf("upsert onboarding profile: %w", err)
	}

	return saved, nil
}

func (s *Service) Skip(ctx context.Context, identityID uuid.UUID) (*Profile, error) {
	ctx, span := tracer.Start(ctx, "onboarding.Skip", trace.WithAttributes(identityAttr(identityID)))
	defer span.End()

	current, err := s.get(ctx, identityID)
	if err != nil {
		span.RecordError(err)
		span.SetStatus(codes.Error, err.Error())

		return nil, fmt.Errorf("get onboarding profile: %w", err)
	}

	if current.Status != StatusPending {
		return current, nil
	}

	current.Status = StatusSkipped

	saved, err := s.repo.Upsert(ctx, current)
	if err != nil {
		span.RecordError(err)
		span.SetStatus(codes.Error, err.Error())

		return nil, fmt.Errorf("upsert onboarding profile: %w", err)
	}

	return saved, nil
}

func (s *Service) get(ctx context.Context, identityID uuid.UUID) (*Profile, error) {
	p, err := s.repo.Get(ctx, identityID)
	switch {
	case errors.Is(err, ErrNotFound):
		return Pending(identityID), nil
	case err != nil:
		return nil, fmt.Errorf("load profile: %w", err)
	}

	return p, nil
}

func (s *Service) validate(accountType AccountType, answers []Answer) error {
	q, ok := s.catalog[accountType]
	if !ok {
		return fmt.Errorf("%w: %q", ErrUnsupportedAccountType, accountType)
	}

	given := make(map[string][]string, len(answers))

	for _, answer := range answers {
		if _, duplicate := given[answer.QuestionID]; duplicate {
			return fmt.Errorf("%w: question %q answered twice", ErrInvalidAnswers, answer.QuestionID)
		}

		given[answer.QuestionID] = answer.OptionIDs
	}

	for _, question := range q.Questions {
		selected, answered := given[question.ID]
		delete(given, question.ID)

		asked := question.ShowIf == nil || intersects(selectedOptions(answers, question.ShowIf.QuestionID), question.ShowIf.AnyOf)

		switch {
		case !asked && answered:
			return fmt.Errorf("%w: question %q does not apply", ErrInvalidAnswers, question.ID)
		case !asked:
			continue
		}

		err := validateSelection(question, selected)
		if err != nil {
			return fmt.Errorf("question %q: %w", question.ID, err)
		}
	}

	for id := range given {
		return fmt.Errorf("%w: unknown question %q", ErrInvalidAnswers, id)
	}

	return nil
}

func selectedOptions(answers []Answer, questionID string) []string {
	for _, answer := range answers {
		if answer.QuestionID == questionID {
			return answer.OptionIDs
		}
	}

	return nil
}

func intersects(selected, anyOf []string) bool {
	for _, id := range selected {
		if slices.Contains(anyOf, id) {
			return true
		}
	}

	return false
}

func validateSelection(question Question, selected []string) error {
	switch {
	case len(selected) == 0:
		return fmt.Errorf("%w: an answer is required", ErrInvalidAnswers)
	case question.Kind == QuestionKindSingleChoice && len(selected) > 1:
		return fmt.Errorf("%w: only one option can be selected", ErrInvalidAnswers)
	}

	seen := make(map[string]struct{}, len(selected))

	for _, id := range selected {
		known := slices.ContainsFunc(question.Options, func(o Option) bool { return o.ID == id })
		_, duplicate := seen[id]

		switch {
		case !known:
			return fmt.Errorf("%w: unknown option %q", ErrInvalidAnswers, id)
		case duplicate:
			return fmt.Errorf("%w: duplicate option %q", ErrInvalidAnswers, id)
		}

		seen[id] = struct{}{}
	}

	return nil
}
