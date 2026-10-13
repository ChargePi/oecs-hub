package grpc

import (
	"context"
	"errors"

	onboardingv1 "github.com/ChargePi/oecs-hub/gen/proto/onboarding/v1"
	preferencesv1 "github.com/ChargePi/oecs-hub/gen/proto/preferences/v1"
	"github.com/ChargePi/oecs-hub/internal/auth"
	"github.com/ChargePi/oecs-hub/internal/onboarding"
	"github.com/ChargePi/oecs-hub/internal/preferences"
	"github.com/google/uuid"
	"google.golang.org/grpc/codes"
	"google.golang.org/grpc/status"
	"google.golang.org/protobuf/types/known/emptypb"
)

type OnboardingService interface {
	Get(ctx context.Context, identityID uuid.UUID) (*onboarding.Profile, error)
	Questionnaire(accountType onboarding.AccountType) (onboarding.Questionnaire, bool)
	Complete(ctx context.Context, accountType onboarding.AccountType, identityID uuid.UUID, answers []onboarding.Answer) (*onboarding.Profile, error)
	Skip(ctx context.Context, identityID uuid.UUID) (*onboarding.Profile, error)
}

type OnboardingHandler struct {
	onboardingv1.UnimplementedOnboardingServiceServer

	onboarding OnboardingService
}

func NewOnboardingHandler(onboarding OnboardingService) *OnboardingHandler {
	return &OnboardingHandler{onboarding: onboarding}
}

func (h *OnboardingHandler) GetOnboarding(ctx context.Context, _ *emptypb.Empty) (*onboardingv1.GetOnboardingResponse, error) {
	identity, err := auth.RequireIdentity(ctx)
	if err != nil {
		return nil, onboardingError(err)
	}

	identityID, err := auth.RequireIdentityID(ctx)
	if err != nil {
		return nil, onboardingError(err)
	}

	p, err := h.onboarding.Get(ctx, identityID)
	if err != nil {
		return nil, onboardingError(err)
	}

	questionnaire, _ := h.onboarding.Questionnaire(onboarding.AccountType(identity.UserType))

	return &onboardingv1.GetOnboardingResponse{
		Profile:       onboardingToProto(p),
		Questionnaire: questionnaireToProto(questionnaire),
	}, nil
}

func (h *OnboardingHandler) CompleteOnboarding(ctx context.Context, req *onboardingv1.CompleteOnboardingRequest) (*onboardingv1.CompleteOnboardingResponse, error) {
	identity, err := auth.RequireIdentity(ctx)
	if err != nil {
		return nil, onboardingError(err)
	}

	identityID, err := auth.RequireIdentityID(ctx)
	if err != nil {
		return nil, onboardingError(err)
	}

	answers := make([]onboarding.Answer, 0, len(req.GetAnswers()))
	for _, answer := range req.GetAnswers() {
		answers = append(answers, onboarding.Answer{QuestionID: answer.GetQuestionId(), OptionIDs: answer.GetOptionIds()})
	}

	p, err := h.onboarding.Complete(ctx, onboarding.AccountType(identity.UserType), identityID, answers)
	if err != nil {
		return nil, onboardingError(err)
	}

	return &onboardingv1.CompleteOnboardingResponse{Profile: onboardingToProto(p)}, nil
}

func (h *OnboardingHandler) SkipOnboarding(ctx context.Context, _ *emptypb.Empty) (*onboardingv1.SkipOnboardingResponse, error) {
	identityID, err := auth.RequireIdentityID(ctx)
	if err != nil {
		return nil, onboardingError(err)
	}

	p, err := h.onboarding.Skip(ctx, identityID)
	if err != nil {
		return nil, onboardingError(err)
	}

	return &onboardingv1.SkipOnboardingResponse{Profile: onboardingToProto(p)}, nil
}

func onboardingError(err error) error {
	switch {
	case errors.Is(err, onboarding.ErrInvalidAnswers):
		return status.Error(codes.InvalidArgument, err.Error())
	case errors.Is(err, onboarding.ErrUnsupportedAccountType):
		return status.Error(codes.FailedPrecondition, err.Error())
	case status.Code(err) != codes.Unknown:
		return status.Errorf(status.Code(err), "onboarding: %s", status.Convert(err).Message())
	default:
		return status.Errorf(codes.Unavailable, "onboarding: %s", err.Error())
	}
}

var onboardingStatusToProto = map[onboarding.Status]onboardingv1.OnboardingStatus{
	onboarding.StatusSkipped:   onboardingv1.OnboardingStatus_ONBOARDING_STATUS_SKIPPED,
	onboarding.StatusCompleted: onboardingv1.OnboardingStatus_ONBOARDING_STATUS_COMPLETED,
}

var questionKindToProto = map[onboarding.QuestionKind]onboardingv1.QuestionKind{
	onboarding.QuestionKindSingleChoice:   onboardingv1.QuestionKind_QUESTION_KIND_SINGLE_CHOICE,
	onboarding.QuestionKindMultipleChoice: onboardingv1.QuestionKind_QUESTION_KIND_MULTIPLE_CHOICE,
}

var effectViewModeToProto = map[preferences.ViewMode]preferencesv1.ViewMode{
	preferences.ViewModeSimplified: preferencesv1.ViewMode_VIEW_MODE_SIMPLIFIED,
	preferences.ViewModeAdvanced:   preferencesv1.ViewMode_VIEW_MODE_ADVANCED,
}

var effectChatLayoutToProto = map[preferences.ChatLayout]preferencesv1.ChatLayout{
	preferences.ChatLayoutDrawer: preferencesv1.ChatLayout_CHAT_LAYOUT_DRAWER,
	preferences.ChatLayoutPage:   preferencesv1.ChatLayout_CHAT_LAYOUT_PAGE,
}

func onboardingToProto(p *onboarding.Profile) *onboardingv1.OnboardingProfile {
	out := &onboardingv1.OnboardingProfile{
		Status:  onboardingStatusToProto[p.Status],
		Answers: make([]*onboardingv1.Answer, 0, len(p.Answers)),
	}

	for _, answer := range p.Answers {
		out.Answers = append(out.Answers, &onboardingv1.Answer{QuestionId: answer.QuestionID, OptionIds: answer.OptionIDs})
	}

	return out
}

func questionnaireToProto(q onboarding.Questionnaire) *onboardingv1.Questionnaire {
	out := &onboardingv1.Questionnaire{Questions: make([]*onboardingv1.Question, 0, len(q.Questions))}

	for _, question := range q.Questions {
		pq := &onboardingv1.Question{
			Id:      question.ID,
			Label:   question.Label,
			Title:   question.Title,
			Hint:    question.Hint,
			Kind:    questionKindToProto[question.Kind],
			Options: make([]*onboardingv1.Option, 0, len(question.Options)),
		}

		for _, option := range question.Options {
			pq.Options = append(pq.Options, &onboardingv1.Option{
				Id:          option.ID,
				Label:       option.Label,
				Description: option.Description,
				Effects: &onboardingv1.OptionEffects{
					ViewMode:    effectViewModeToProto[option.Effects.ViewMode],
					ChatLayout:  effectChatLayoutToProto[option.Effects.ChatLayout],
					LandingPath: option.Effects.LandingPath,
				},
			})
		}

		if question.ShowIf != nil {
			pq.ShowIf = &onboardingv1.Condition{QuestionId: question.ShowIf.QuestionID, OptionIds: question.ShowIf.AnyOf}
		}

		out.Questions = append(out.Questions, pq)
	}

	return out
}
