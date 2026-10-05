package mcp

import (
	"context"
	"net/http/httptest"
	"strings"
	"testing"
	"time"

	"github.com/ChargePi/oecs-hub/internal/auth"
	"github.com/ChargePi/oecs-hub/internal/useraction"
	"github.com/ChargePi/oecs-hub/internal/userchargers"
	"github.com/google/uuid"
	"github.com/mark3labs/mcp-go/mcp"
)

type recordingProposer struct {
	ActionProposer

	conversationID string
	calls          int
}

func (r *recordingProposer) ProposeFavorite(ctx context.Context, variantID uuid.UUID, favorited bool) (*useraction.Action, error) {
	r.calls++
	r.conversationID = useraction.ConversationIDFromContext(ctx)

	if _, err := auth.RequireUserChargersIdentity(ctx); err != nil {
		return nil, err
	}

	return &useraction.Action{ID: uuid.New(), Kind: useraction.KindFavorite, Summary: "Add X to your favorites", ExpiresAt: time.Now()}, nil
}

func TestHTTPContextFunc_TrustsHeadersOnlyWithGatewaySecret(t *testing.T) {
	contextFunc := HTTPContextFunc("s3cret")
	userID := uuid.NewString()

	cases := map[string]struct {
		secret       string
		wantIdentity bool
	}{
		"matching secret": {secret: "s3cret", wantIdentity: true},
		"wrong secret":    {secret: "guess", wantIdentity: false},
		"no secret":       {secret: "", wantIdentity: false},
	}

	for name, tc := range cases {
		t.Run(name, func(t *testing.T) {
			req := httptest.NewRequest("POST", "/mcp", nil)
			req.Header.Set("x-user-id", userID)
			req.Header.Set("x-user-type", auth.UserTypeIndividual)
			req.Header.Set(conversationIDHeader, "conv-1")

			if tc.secret != "" {
				req.Header.Set("x-gateway-secret", tc.secret)
			}

			ctx := contextFunc(context.Background(), req)

			identity, ok := auth.FromContext(ctx)
			if ok != tc.wantIdentity {
				t.Fatalf("identity present = %v, want %v", ok, tc.wantIdentity)
			}

			if tc.wantIdentity && identity.ID != userID {
				t.Fatalf("identity id = %q, want %q", identity.ID, userID)
			}

			// The conversation header is no more trusted than the identity headers.
			wantConversation := ""
			if tc.wantIdentity {
				wantConversation = "conv-1"
			}

			if got := useraction.ConversationIDFromContext(ctx); got != wantConversation {
				t.Fatalf("conversation id = %q, want %q", got, wantConversation)
			}
		})
	}
}

func TestProposeFavoriteChange_AnonymousCallerGetsToolError(t *testing.T) {
	proposer := &recordingProposer{}
	h := &userToolsHandler{actions: proposer}

	req := mcp.CallToolRequest{}
	req.Params.Arguments = map[string]any{"chargerVariantId": uuid.NewString(), "favorited": true}

	result, err := h.proposeFavoriteChange(context.Background(), req)
	if err != nil {
		t.Fatalf("handler returned a transport error: %v", err)
	}

	if !result.IsError {
		t.Fatalf("anonymous proposal succeeded: %+v", result)
	}
}

func TestListMyProjects_AnonymousCallerGetsToolError(t *testing.T) {
	h := &userToolsHandler{}

	result, err := h.listMyProjects(context.Background(), mcp.CallToolRequest{})
	if err != nil {
		t.Fatalf("handler returned a transport error: %v", err)
	}

	if !result.IsError {
		t.Fatalf("anonymous list succeeded: %+v", result)
	}
}

func TestProposeRatingDescription_ListsCategories(t *testing.T) {
	got := proposeRatingDescription()

	for category := range userchargers.ValidRatingCategories {
		if !strings.Contains(got, category) {
			t.Errorf("propose_rating description misses category %q:\n%s", category, got)
		}
	}
}
