package mcp

import (
	"context"
	"encoding/json"
	"strings"
	"testing"

	"github.com/ChargePi/oecs-hub/internal/auth"
	"github.com/ChargePi/oecs-hub/internal/preferences"
	"github.com/google/uuid"
	"github.com/mark3labs/mcp-go/mcp"
	"go.uber.org/zap"
)

type stubPreferences struct{}

func (stubPreferences) Get(_ context.Context, identityID uuid.UUID) (*preferences.Preferences, error) {
	p := preferences.Defaults(identityID)
	p.Currency = "GBP"
	p.UnitSystem = preferences.UnitSystemImperial
	p.ViewMode = preferences.ViewModeSimplified

	return p, nil
}

func TestGetMyPreferences_ExposesOnlyAnswerPreferences(t *testing.T) {
	handler := getMyPreferencesHandler(zap.NewNop(), stubPreferences{})
	ctx := auth.WithIdentity(context.Background(), &auth.Identity{ID: uuid.NewString(), UserType: auth.UserTypeManufacturer})

	result, err := handler(ctx, mcp.CallToolRequest{})
	if err != nil || result.IsError {
		t.Fatalf("handler: err=%v result=%+v", err, result)
	}

	raw, err := json.Marshal(result.StructuredContent)
	if err != nil {
		t.Fatalf("marshal: %v", err)
	}

	want := `{"language":"en","currency":"GBP","unitSystem":"imperial"}`
	if string(raw) != want {
		t.Fatalf("got %s, want %s", raw, want)
	}
}

func TestGetMyPreferences_RequiresIdentity(t *testing.T) {
	result, err := getMyPreferencesHandler(zap.NewNop(), stubPreferences{})(context.Background(), mcp.CallToolRequest{})
	if err != nil {
		t.Fatalf("handler: %v", err)
	}

	if !result.IsError {
		t.Fatalf("expected a tool error for an anonymous caller")
	}
}

func TestGetMyPreferencesDescription_StatesDefaults(t *testing.T) {
	want := "language `en`, currency `EUR` and unit system `metric`"
	if !strings.Contains(getMyPreferencesDescription, want) {
		t.Fatalf("description %q does not state defaults %q", getMyPreferencesDescription, want)
	}
}
