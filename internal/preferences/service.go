package preferences

import (
	"context"
	"errors"
	"fmt"
	"regexp"

	"github.com/google/uuid"
	"go.opentelemetry.io/otel"
	"go.opentelemetry.io/otel/attribute"
	"go.opentelemetry.io/otel/codes"
	"go.opentelemetry.io/otel/trace"
)

var tracer = otel.Tracer("preferences.service")

var (
	ErrInvalidCurrency     = errors.New("currency must be an ISO 4217 code")
	ErrUnsupportedLanguage = errors.New("unsupported language")
	ErrInvalidPreferences  = errors.New("invalid preferences")
)

var currencyPattern = regexp.MustCompile(`^[A-Z]{3}$`)

type Service struct {
	repo Repository
}

func NewService(repo Repository) *Service {
	return &Service{repo: repo}
}

func (s *Service) Get(ctx context.Context, identityID uuid.UUID) (*Preferences, error) {
	ctx, span := tracer.Start(ctx, "preferences.Get", trace.WithAttributes(identityAttr(identityID)))
	defer span.End()

	p, err := s.repo.Get(ctx, identityID)
	switch {
	case errors.Is(err, ErrNotFound):
		span.SetAttributes(attribute.Bool("preferences.defaults", true))

		return Defaults(identityID), nil
	case err != nil:
		span.RecordError(err)
		span.SetStatus(codes.Error, err.Error())

		return nil, fmt.Errorf("get preferences: %w", err)
	}

	return p, nil
}

func (s *Service) Update(ctx context.Context, p *Preferences) (*Preferences, error) {
	ctx, span := tracer.Start(ctx, "preferences.Update", trace.WithAttributes(identityAttr(p.IdentityID)))
	defer span.End()

	err := validate(p)
	if err != nil {
		span.RecordError(err)
		span.SetStatus(codes.Error, err.Error())

		return nil, err
	}

	saved, err := s.repo.Upsert(ctx, p)
	if err != nil {
		span.RecordError(err)
		span.SetStatus(codes.Error, err.Error())

		return nil, fmt.Errorf("upsert preferences: %w", err)
	}

	return saved, nil
}

func validate(p *Preferences) error {
	if !currencyPattern.MatchString(p.Currency) {
		return ErrInvalidCurrency
	}

	if _, ok := supportedLanguages[p.Language]; !ok {
		return fmt.Errorf("%w: %q", ErrUnsupportedLanguage, p.Language)
	}

	switch p.UnitSystem {
	case UnitSystemMetric, UnitSystemImperial:
	default:
		return fmt.Errorf("%w: unit system %q", ErrInvalidPreferences, p.UnitSystem)
	}

	switch p.ViewMode {
	case ViewModeSimplified, ViewModeAdvanced:
	default:
		return fmt.Errorf("%w: view mode %q", ErrInvalidPreferences, p.ViewMode)
	}

	switch p.ChatLayout {
	case ChatLayoutAuto, ChatLayoutDrawer, ChatLayoutPage:
	default:
		return fmt.Errorf("%w: chat layout %q", ErrInvalidPreferences, p.ChatLayout)
	}

	return nil
}
