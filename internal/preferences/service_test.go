package preferences

import (
	"context"
	"errors"
	"testing"

	"github.com/google/uuid"
)

type fakeRepo struct {
	stored   *Preferences
	getErr   error
	upserted *Preferences
}

func (f *fakeRepo) Get(_ context.Context, _ uuid.UUID) (*Preferences, error) {
	if f.getErr != nil {
		return nil, f.getErr
	}

	return f.stored, nil
}

func (f *fakeRepo) Upsert(_ context.Context, p *Preferences) (*Preferences, error) {
	f.upserted = p

	return p, nil
}

func TestGetReturnsDefaultsWhenMissing(t *testing.T) {
	id := uuid.New()
	svc := NewService(&fakeRepo{getErr: ErrNotFound})

	got, err := svc.Get(context.Background(), id)
	if err != nil {
		t.Fatalf("Get: %v", err)
	}

	if *got != *Defaults(id) {
		t.Fatalf("got %+v, want defaults", got)
	}
}

func TestGetWrapsRepositoryErrors(t *testing.T) {
	boom := errors.New("boom")
	svc := NewService(&fakeRepo{getErr: boom})

	_, err := svc.Get(context.Background(), uuid.New())
	if !errors.Is(err, boom) {
		t.Fatalf("got %v, want wrapped %v", err, boom)
	}
}

func TestUpdateValidation(t *testing.T) {
	tests := []struct {
		name   string
		mutate func(p *Preferences)
		want   error
	}{
		{name: "valid", mutate: func(*Preferences) {}},
		{name: "explicit chat page", mutate: func(p *Preferences) { p.ChatLayout = ChatLayoutPage }},
		{name: "lowercase currency", mutate: func(p *Preferences) { p.Currency = "eur" }, want: ErrInvalidCurrency},
		{name: "empty currency", mutate: func(p *Preferences) { p.Currency = "" }, want: ErrInvalidCurrency},
		{name: "unsupported language", mutate: func(p *Preferences) { p.Language = "de" }, want: ErrUnsupportedLanguage},
		{name: "unknown unit system", mutate: func(p *Preferences) { p.UnitSystem = "" }, want: ErrInvalidPreferences},
		{name: "unknown view mode", mutate: func(p *Preferences) { p.ViewMode = "compact" }, want: ErrInvalidPreferences},
		{name: "unknown chat layout", mutate: func(p *Preferences) { p.ChatLayout = "popup" }, want: ErrInvalidPreferences},
	}

	for _, tt := range tests {
		t.Run(tt.name, func(t *testing.T) {
			repo := &fakeRepo{}
			p := Defaults(uuid.New())
			tt.mutate(p)

			_, err := NewService(repo).Update(context.Background(), p)

			switch {
			case tt.want == nil && err != nil:
				t.Fatalf("Update: %v", err)
			case tt.want == nil && repo.upserted != p:
				t.Fatal("valid preferences were not persisted")
			case tt.want != nil && !errors.Is(err, tt.want):
				t.Fatalf("got %v, want %v", err, tt.want)
			case tt.want != nil && repo.upserted != nil:
				t.Fatal("invalid preferences reached the repository")
			}
		})
	}
}
