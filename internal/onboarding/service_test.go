package onboarding

import (
	"context"
	"errors"
	"reflect"
	"testing"

	"github.com/google/uuid"
)

const testCatalogSrc = `
individual:
  questions:
    - id: experience
      label: Experience
      title: How familiar are you?
      kind: single
      options:
        - { id: beginner, label: Beginner, effects: { viewMode: simplified } }
        - { id: expert, label: Expert, effects: { viewMode: advanced } }
    - id: goals
      label: Goals
      title: What brings you here?
      kind: multiple
      options:
        - { id: find, label: Find }
        - { id: learn, label: Learn }
    - id: topics
      label: Topics
      title: What do you want to learn?
      kind: single
      showIf: { question: goals, anyOf: [learn] }
      options:
        - { id: basics, label: Basics }
`

type fakeRepo struct {
	stored   *Profile
	getErr   error
	upserted *Profile
}

func (f *fakeRepo) Get(_ context.Context, _ uuid.UUID) (*Profile, error) {
	switch {
	case f.getErr != nil:
		return nil, f.getErr
	case f.stored == nil:
		return nil, ErrNotFound
	}

	return f.stored, nil
}

func (f *fakeRepo) Upsert(_ context.Context, p *Profile) (*Profile, error) {
	f.upserted = p

	return p, nil
}

func newTestService(t *testing.T, repo Repository) *Service {
	t.Helper()

	catalog, err := ParseCatalog([]byte(testCatalogSrc))
	if err != nil {
		t.Fatalf("ParseCatalog: %v", err)
	}

	return NewService(repo, catalog)
}

func TestGetReturnsPendingWhenMissing(t *testing.T) {
	id := uuid.New()

	got, err := newTestService(t, &fakeRepo{}).Get(context.Background(), id)
	if err != nil {
		t.Fatalf("Get: %v", err)
	}

	if !reflect.DeepEqual(got, Pending(id)) {
		t.Fatalf("got %+v, want pending", got)
	}
}

func TestGetWrapsRepositoryErrors(t *testing.T) {
	boom := errors.New("boom")

	_, err := newTestService(t, &fakeRepo{getErr: boom}).Get(context.Background(), uuid.New())
	if !errors.Is(err, boom) {
		t.Fatalf("got %v, want wrapped %v", err, boom)
	}
}

func TestCompleteValidation(t *testing.T) {
	experience := Answer{QuestionID: "experience", OptionIDs: []string{"beginner"}}
	find := Answer{QuestionID: "goals", OptionIDs: []string{"find"}}
	learn := Answer{QuestionID: "goals", OptionIDs: []string{"find", "learn"}}
	topics := Answer{QuestionID: "topics", OptionIDs: []string{"basics"}}

	tests := []struct {
		name        string
		accountType AccountType
		answers     []Answer
		want        error
	}{
		{name: "valid", accountType: "individual", answers: []Answer{experience, find}},
		{name: "valid with conditional question", accountType: "individual", answers: []Answer{experience, learn, topics}},
		{name: "unknown account type", accountType: "admin", answers: []Answer{experience, find}, want: ErrUnsupportedAccountType},
		{name: "missing answer", accountType: "individual", answers: []Answer{find}, want: ErrInvalidAnswers},
		{name: "missing conditional answer", accountType: "individual", answers: []Answer{experience, learn}, want: ErrInvalidAnswers},
		{name: "answer to a question that does not apply", accountType: "individual", answers: []Answer{experience, find, topics}, want: ErrInvalidAnswers},
		{name: "unknown question", accountType: "individual", answers: []Answer{experience, find, {QuestionID: "nope", OptionIDs: []string{"x"}}}, want: ErrInvalidAnswers},
		{name: "question answered twice", accountType: "individual", answers: []Answer{experience, experience, find}, want: ErrInvalidAnswers},
		{name: "unknown option", accountType: "individual", answers: []Answer{{QuestionID: "experience", OptionIDs: []string{"guru"}}, find}, want: ErrInvalidAnswers},
		{name: "several options for a single choice", accountType: "individual", answers: []Answer{{QuestionID: "experience", OptionIDs: []string{"beginner", "expert"}}, find}, want: ErrInvalidAnswers},
		{name: "duplicate option", accountType: "individual", answers: []Answer{experience, {QuestionID: "goals", OptionIDs: []string{"find", "find"}}}, want: ErrInvalidAnswers},
		{name: "empty selection", accountType: "individual", answers: []Answer{experience, {QuestionID: "goals"}}, want: ErrInvalidAnswers},
	}

	for _, tt := range tests {
		t.Run(tt.name, func(t *testing.T) {
			repo := &fakeRepo{}

			got, err := newTestService(t, repo).Complete(context.Background(), tt.accountType, uuid.New(), tt.answers)

			switch {
			case tt.want == nil && err != nil:
				t.Fatalf("Complete: %v", err)
			case tt.want == nil && (got.Status != StatusCompleted || !reflect.DeepEqual(got.Answers, tt.answers)):
				t.Fatalf("got %+v, want the completed answers", got)
			case tt.want != nil && !errors.Is(err, tt.want):
				t.Fatalf("got %v, want %v", err, tt.want)
			case tt.want != nil && repo.upserted != nil:
				t.Fatal("invalid answers reached the repository")
			}
		})
	}
}

func TestSkip(t *testing.T) {
	id := uuid.New()

	t.Run("pending becomes skipped", func(t *testing.T) {
		repo := &fakeRepo{}

		got, err := newTestService(t, repo).Skip(context.Background(), id)
		if err != nil {
			t.Fatalf("Skip: %v", err)
		}

		if got.Status != StatusSkipped || repo.upserted == nil {
			t.Fatalf("got %+v, want a persisted skipped profile", got)
		}
	})

	t.Run("completed stays completed", func(t *testing.T) {
		completed := &Profile{IdentityID: id, Status: StatusCompleted}
		repo := &fakeRepo{stored: completed}

		got, err := newTestService(t, repo).Skip(context.Background(), id)
		if err != nil {
			t.Fatalf("Skip: %v", err)
		}

		if got != completed || repo.upserted != nil {
			t.Fatalf("completed profile was overwritten: %+v", got)
		}
	})
}
