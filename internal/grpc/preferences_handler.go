package grpc

import (
	"context"
	"errors"

	preferencesv1 "github.com/ChargePi/oecs-hub/gen/proto/preferences/v1"
	"github.com/ChargePi/oecs-hub/internal/auth"
	"github.com/ChargePi/oecs-hub/internal/preferences"
	"github.com/google/uuid"
	"google.golang.org/grpc/codes"
	"google.golang.org/grpc/status"
	"google.golang.org/protobuf/types/known/emptypb"
)

type PreferencesService interface {
	Get(ctx context.Context, identityID uuid.UUID) (*preferences.Preferences, error)
	Update(ctx context.Context, p *preferences.Preferences) (*preferences.Preferences, error)
}

type PreferencesHandler struct {
	preferencesv1.UnimplementedPreferencesServiceServer

	preferences PreferencesService
}

func NewPreferencesHandler(preferences PreferencesService) *PreferencesHandler {
	return &PreferencesHandler{preferences: preferences}
}

func (h *PreferencesHandler) GetPreferences(ctx context.Context, _ *emptypb.Empty) (*preferencesv1.GetPreferencesResponse, error) {
	identityID, err := auth.RequireIdentityID(ctx)
	if err != nil {
		return nil, preferencesError(err)
	}

	p, err := h.preferences.Get(ctx, identityID)
	if err != nil {
		return nil, preferencesError(err)
	}

	return &preferencesv1.GetPreferencesResponse{Preferences: preferencesToProto(p)}, nil
}

func (h *PreferencesHandler) UpdatePreferences(ctx context.Context, req *preferencesv1.UpdatePreferencesRequest) (*preferencesv1.UpdatePreferencesResponse, error) {
	identityID, err := auth.RequireIdentityID(ctx)
	if err != nil {
		return nil, preferencesError(err)
	}

	if req.GetPreferences() == nil {
		return nil, status.Error(codes.InvalidArgument, "preferences are required")
	}

	p, err := h.preferences.Update(ctx, preferencesFromProto(identityID, req.GetPreferences()))
	if err != nil {
		return nil, preferencesError(err)
	}

	return &preferencesv1.UpdatePreferencesResponse{Preferences: preferencesToProto(p)}, nil
}

func preferencesError(err error) error {
	switch {
	case errors.Is(err, preferences.ErrInvalidCurrency),
		errors.Is(err, preferences.ErrUnsupportedLanguage),
		errors.Is(err, preferences.ErrInvalidPreferences):
		return status.Error(codes.InvalidArgument, err.Error())
	case status.Code(err) != codes.Unknown:
		return status.Errorf(status.Code(err), "preferences: %s", status.Convert(err).Message())
	default:
		return status.Errorf(codes.Unavailable, "preferences: %s", err.Error())
	}
}

func preferencesToProto(p *preferences.Preferences) *preferencesv1.Preferences {
	out := &preferencesv1.Preferences{
		Currency: p.Currency,
		Language: p.Language,
	}

	switch p.UnitSystem {
	case preferences.UnitSystemMetric:
		out.UnitSystem = preferencesv1.UnitSystem_UNIT_SYSTEM_METRIC
	case preferences.UnitSystemImperial:
		out.UnitSystem = preferencesv1.UnitSystem_UNIT_SYSTEM_IMPERIAL
	}

	switch p.ViewMode {
	case preferences.ViewModeSimplified:
		out.ViewMode = preferencesv1.ViewMode_VIEW_MODE_SIMPLIFIED
	case preferences.ViewModeAdvanced:
		out.ViewMode = preferencesv1.ViewMode_VIEW_MODE_ADVANCED
	}

	switch p.ChatLayout {
	case preferences.ChatLayoutDrawer:
		out.ChatLayout = preferencesv1.ChatLayout_CHAT_LAYOUT_DRAWER
	case preferences.ChatLayoutPage:
		out.ChatLayout = preferencesv1.ChatLayout_CHAT_LAYOUT_PAGE
	}

	return out
}

func preferencesFromProto(identityID uuid.UUID, in *preferencesv1.Preferences) *preferences.Preferences {
	out := &preferences.Preferences{
		IdentityID: identityID,
		Currency:   in.GetCurrency(),
		Language:   in.GetLanguage(),
	}

	switch in.GetUnitSystem() {
	case preferencesv1.UnitSystem_UNIT_SYSTEM_METRIC:
		out.UnitSystem = preferences.UnitSystemMetric
	case preferencesv1.UnitSystem_UNIT_SYSTEM_IMPERIAL:
		out.UnitSystem = preferences.UnitSystemImperial
	}

	switch in.GetViewMode() {
	case preferencesv1.ViewMode_VIEW_MODE_SIMPLIFIED:
		out.ViewMode = preferences.ViewModeSimplified
	case preferencesv1.ViewMode_VIEW_MODE_ADVANCED:
		out.ViewMode = preferences.ViewModeAdvanced
	}

	switch in.GetChatLayout() {
	case preferencesv1.ChatLayout_CHAT_LAYOUT_DRAWER:
		out.ChatLayout = preferences.ChatLayoutDrawer
	case preferencesv1.ChatLayout_CHAT_LAYOUT_PAGE:
		out.ChatLayout = preferences.ChatLayoutPage
	}

	return out
}
