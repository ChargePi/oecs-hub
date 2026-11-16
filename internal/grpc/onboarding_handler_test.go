package grpc

import (
	"context"
	"reflect"
	"testing"

	onboardingv1 "github.com/ChargePi/oecs-hub/gen/proto/onboarding/v1"
	preferencesv1 "github.com/ChargePi/oecs-hub/gen/proto/preferences/v1"
	"github.com/ChargePi/oecs-hub/internal/auth"
	"github.com/ChargePi/oecs-hub/internal/onboarding"
	"github.com/google/uuid"
	"google.golang.org/grpc/codes"
	"google.golang.org/grpc/status"
	"google.golang.org/protobuf/types/known/emptypb"
)

type fakeOnboardingRepo struct {
	stored *onboarding.Profile
}

func (f *fakeOnboardingRepo) Get(_ context.Context, _ uuid.UUID) (*onboarding.Profile, error) {
	if f.stored == nil {
		return nil, onboarding.ErrNotFound
	}

	return f.stored, nil
}

func (f *fakeOnboardingRepo) Upsert(_ context.Context, p *onboarding.Profile) (*onboarding.Profile, error) {
	f.stored = p

	return p, nil
}

func newOnboardingHandlerFixture(t *testing.T, userType string) (context.Context, uuid.UUID, *fakeOnboardingRepo, *OnboardingHandler) {
	t.Helper()

	catalog, err := onboarding.DefaultCatalog()
	if err != nil {
		t.Fatalf("DefaultCatalog: %v", err)
	}

	id := uuid.New()
	ctx := auth.WithIdentity(context.Background(), &auth.Identity{ID: id.String(), UserType: userType})
	repo := &fakeOnboardingRepo{}

	return ctx, id, repo, NewOnboardingHandler(onboarding.NewService(repo, catalog))
}

func TestOnboardingHandler_GetOnboarding(t *testing.T) {
	ctx, _, _, h := newOnboardingHandlerFixture(t, auth.UserTypeIndividual)

	_, err := h.GetOnboarding(context.Background(), &emptypb.Empty{})
	if status.Code(err) != codes.Unauthenticated {
		t.Fatalf("got %v, want Unauthenticated", err)
	}

	resp, err := h.GetOnboarding(ctx, &emptypb.Empty{})
	if err != nil {
		t.Fatalf("GetOnboarding: %v", err)
	}

	if resp.GetProfile().GetStatus() != onboardingv1.OnboardingStatus_ONBOARDING_STATUS_UNSPECIFIED {
		t.Fatalf("got status %v, want pending", resp.GetProfile().GetStatus())
	}

	questions := resp.GetQuestionnaire().GetQuestions()
	if len(questions) == 0 {
		t.Fatal("no questions returned")
	}

	first := questions[0]
	if first.GetKind() != onboardingv1.QuestionKind_QUESTION_KIND_SINGLE_CHOICE ||
		first.GetOptions()[0].GetEffects().GetViewMode() != preferencesv1.ViewMode_VIEW_MODE_SIMPLIFIED {
		t.Fatalf("unexpected first question: %v", first)
	}
}

func TestOnboardingHandler_GetOnboardingWithoutQuestionnaire(t *testing.T) {
	ctx, _, _, h := newOnboardingHandlerFixture(t, auth.UserTypeAdmin)

	resp, err := h.GetOnboarding(ctx, &emptypb.Empty{})
	if err != nil {
		t.Fatalf("GetOnboarding: %v", err)
	}

	if len(resp.GetQuestionnaire().GetQuestions()) != 0 {
		t.Fatalf("got questions for an account type without a questionnaire: %v", resp.GetQuestionnaire())
	}
}

func TestOnboardingHandler_CompleteOnboarding(t *testing.T) {
	ctx, id, repo, h := newOnboardingHandlerFixture(t, auth.UserTypeManufacturer)

	req := &onboardingv1.CompleteOnboardingRequest{Answers: []*onboardingv1.Answer{
		{QuestionId: "platform", OptionIds: []string{"feedback"}},
	}}

	resp, err := h.CompleteOnboarding(ctx, req)
	if err != nil {
		t.Fatalf("CompleteOnboarding: %v", err)
	}

	want := &onboarding.Profile{
		IdentityID: id,
		Status:     onboarding.StatusCompleted,
		Answers:    []onboarding.Answer{{QuestionID: "platform", OptionIDs: []string{"feedback"}}},
	}
	if !reflect.DeepEqual(repo.stored, want) {
		t.Fatalf("stored %+v, want %+v", repo.stored, want)
	}

	got := resp.GetProfile()
	if got.GetStatus() != onboardingv1.OnboardingStatus_ONBOARDING_STATUS_COMPLETED ||
		got.GetAnswers()[0].GetQuestionId() != "platform" {
		t.Fatalf("unexpected response: %v", got)
	}
}

func TestOnboardingHandler_CompleteOnboardingRejected(t *testing.T) {
	manufacturerAnswers := []*onboardingv1.Answer{{QuestionId: "platform", OptionIds: []string{"feedback"}}}

	tests := map[string]struct {
		userType string
		req      *onboardingv1.CompleteOnboardingRequest
		want     codes.Code
	}{
		"no answers": {
			userType: auth.UserTypeManufacturer,
			req:      &onboardingv1.CompleteOnboardingRequest{},
			want:     codes.InvalidArgument,
		},
		"answers for another account type": {
			userType: auth.UserTypeIndividual,
			req:      &onboardingv1.CompleteOnboardingRequest{Answers: manufacturerAnswers},
			want:     codes.InvalidArgument,
		},
		"admin": {
			userType: auth.UserTypeAdmin,
			req:      &onboardingv1.CompleteOnboardingRequest{Answers: manufacturerAnswers},
			want:     codes.FailedPrecondition,
		},
	}

	for name, tt := range tests {
		t.Run(name, func(t *testing.T) {
			ctx, _, repo, h := newOnboardingHandlerFixture(t, tt.userType)

			_, err := h.CompleteOnboarding(ctx, tt.req)
			if status.Code(err) != tt.want {
				t.Fatalf("got %v, want %v", err, tt.want)
			}

			if repo.stored != nil {
				t.Fatal("rejected answers were stored")
			}
		})
	}
}

func TestOnboardingHandler_SkipOnboarding(t *testing.T) {
	ctx, _, repo, h := newOnboardingHandlerFixture(t, auth.UserTypeManufacturer)

	resp, err := h.SkipOnboarding(ctx, &emptypb.Empty{})
	if err != nil {
		t.Fatalf("SkipOnboarding: %v", err)
	}

	if resp.GetProfile().GetStatus() != onboardingv1.OnboardingStatus_ONBOARDING_STATUS_SKIPPED ||
		repo.stored.Status != onboarding.StatusSkipped {
		t.Fatalf("unexpected profile: %v", resp.GetProfile())
	}
}
