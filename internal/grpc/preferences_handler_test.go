package grpc

import (
	"context"
	"testing"

	preferencesv1 "github.com/ChargePi/oecs-hub/gen/proto/preferences/v1"
	"github.com/ChargePi/oecs-hub/internal/auth"
	"github.com/ChargePi/oecs-hub/internal/preferences"
	"github.com/google/uuid"
	"google.golang.org/grpc/codes"
	"google.golang.org/grpc/status"
	"google.golang.org/protobuf/types/known/emptypb"
)

type fakePreferencesRepo struct {
	stored *preferences.Preferences
}

func (f *fakePreferencesRepo) Get(_ context.Context, _ uuid.UUID) (*preferences.Preferences, error) {
	if f.stored == nil {
		return nil, preferences.ErrNotFound
	}

	return f.stored, nil
}

func (f *fakePreferencesRepo) Upsert(_ context.Context, p *preferences.Preferences) (*preferences.Preferences, error) {
	f.stored = p

	return p, nil
}

func newPreferencesHandlerFixture() (context.Context, uuid.UUID, *fakePreferencesRepo, *PreferencesHandler) {
	id := uuid.New()
	ctx := auth.WithIdentity(context.Background(), &auth.Identity{ID: id.String(), UserType: auth.UserTypeManufacturer})
	repo := &fakePreferencesRepo{}

	return ctx, id, repo, NewPreferencesHandler(preferences.NewService(repo))
}

func TestPreferencesHandler_GetPreferences(t *testing.T) {
	ctx, _, _, h := newPreferencesHandlerFixture()

	_, err := h.GetPreferences(context.Background(), &emptypb.Empty{})
	if status.Code(err) != codes.Unauthenticated {
		t.Fatalf("got %v, want Unauthenticated", err)
	}

	resp, err := h.GetPreferences(ctx, &emptypb.Empty{})
	if err != nil {
		t.Fatalf("GetPreferences: %v", err)
	}

	got := resp.GetPreferences()
	if got.GetCurrency() != "EUR" || got.GetUnitSystem() != preferencesv1.UnitSystem_UNIT_SYSTEM_METRIC ||
		got.GetViewMode() != preferencesv1.ViewMode_VIEW_MODE_ADVANCED ||
		got.GetChatLayout() != preferencesv1.ChatLayout_CHAT_LAYOUT_UNSPECIFIED || got.GetLanguage() != "en" {
		t.Fatalf("unexpected defaults: %v", got)
	}
}

func TestPreferencesHandler_UpdatePreferences(t *testing.T) {
	ctx, id, repo, h := newPreferencesHandlerFixture()

	in := &preferencesv1.Preferences{
		Currency:   "GBP",
		UnitSystem: preferencesv1.UnitSystem_UNIT_SYSTEM_IMPERIAL,
		ViewMode:   preferencesv1.ViewMode_VIEW_MODE_SIMPLIFIED,
		ChatLayout: preferencesv1.ChatLayout_CHAT_LAYOUT_PAGE,
		Language:   "en",
	}

	_, err := h.UpdatePreferences(ctx, &preferencesv1.UpdatePreferencesRequest{Preferences: in})
	if err != nil {
		t.Fatalf("UpdatePreferences: %v", err)
	}

	if repo.stored.IdentityID != id || repo.stored.UnitSystem != preferences.UnitSystemImperial ||
		repo.stored.ChatLayout != preferences.ChatLayoutPage {
		t.Fatalf("unexpected stored preferences: %+v", repo.stored)
	}
}

func TestPreferencesHandler_UpdatePreferencesInvalid(t *testing.T) {
	ctx, _, _, h := newPreferencesHandlerFixture()

	tests := map[string]*preferencesv1.UpdatePreferencesRequest{
		"missing":          {},
		"bad currency":     {Preferences: &preferencesv1.Preferences{Currency: "pounds", UnitSystem: preferencesv1.UnitSystem_UNIT_SYSTEM_METRIC, ViewMode: preferencesv1.ViewMode_VIEW_MODE_ADVANCED, Language: "en"}},
		"unspecified unit": {Preferences: &preferencesv1.Preferences{Currency: "EUR", ViewMode: preferencesv1.ViewMode_VIEW_MODE_ADVANCED, Language: "en"}},
		"bad language":     {Preferences: &preferencesv1.Preferences{Currency: "EUR", UnitSystem: preferencesv1.UnitSystem_UNIT_SYSTEM_METRIC, ViewMode: preferencesv1.ViewMode_VIEW_MODE_ADVANCED, Language: "xx"}},
	}

	for name, req := range tests {
		t.Run(name, func(t *testing.T) {
			_, err := h.UpdatePreferences(ctx, req)
			if status.Code(err) != codes.InvalidArgument {
				t.Fatalf("got %v, want InvalidArgument", err)
			}
		})
	}
}
