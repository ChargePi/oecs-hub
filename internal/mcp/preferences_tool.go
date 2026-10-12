package mcp

import (
	"context"
	_ "embed"
	"fmt"
	"strings"
	"text/template"

	"github.com/ChargePi/oecs-hub/internal/auth"
	"github.com/ChargePi/oecs-hub/internal/preferences"
	"github.com/google/uuid"
	"github.com/mark3labs/mcp-go/mcp"
	"github.com/mark3labs/mcp-go/server"
)

//go:embed prompts/get_my_preferences_description.tmpl
var getMyPreferencesDescriptionSrc string

var getMyPreferencesDescription = mustRenderPreferencesDescription()

func mustRenderPreferencesDescription() string {
	defaults := preferences.Defaults(uuid.Nil)

	tmpl := template.Must(template.New("get_my_preferences_description.tmpl").Parse(getMyPreferencesDescriptionSrc))

	var buf strings.Builder
	if err := tmpl.Execute(&buf, GetMyPreferencesOutput{
		Language:   defaults.Language,
		Currency:   defaults.Currency,
		UnitSystem: string(defaults.UnitSystem),
	}); err != nil {
		panic(fmt.Sprintf("render get_my_preferences description: %v", err))
	}

	return strings.TrimSpace(buf.String())
}

type PreferencesReader interface {
	Get(ctx context.Context, identityID uuid.UUID) (*preferences.Preferences, error)
}

type GetMyPreferencesInput struct{}

// GetMyPreferencesOutput deliberately exposes only the preferences that shape an answer.
type GetMyPreferencesOutput struct {
	Language   string `json:"language"`
	Currency   string `json:"currency"`
	UnitSystem string `json:"unitSystem"`
}

// RegisterPreferencesTool adds get_my_preferences, available to every signed-in account type.
func RegisterPreferencesTool(s *server.MCPServer, prefs PreferencesReader) {
	s.AddTool(mcp.NewTool("get_my_preferences",
		mcp.WithDescription(getMyPreferencesDescription),
		mcp.WithInputSchema[GetMyPreferencesInput](),
		mcp.WithOutputSchema[GetMyPreferencesOutput](),
		readOnlyAnnotations(),
	), getMyPreferencesHandler(prefs))
}

func getMyPreferencesHandler(prefs PreferencesReader) server.ToolHandlerFunc {
	return func(ctx context.Context, _ mcp.CallToolRequest) (*mcp.CallToolResult, error) {
		identityID, err := auth.RequireIdentityID(ctx)
		if err != nil {
			return toolError(err), nil
		}

		p, err := prefs.Get(ctx, identityID)
		if err != nil {
			return toolError(err), nil
		}

		return structured(GetMyPreferencesOutput{
			Language:   p.Language,
			Currency:   p.Currency,
			UnitSystem: string(p.UnitSystem),
		}), nil
	}
}
