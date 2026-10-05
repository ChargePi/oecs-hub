package mcp

import (
	"context"
	"fmt"
	"net/http"
	"sort"
	"strings"
	"time"

	"github.com/ChargePi/oecs-hub/internal/auth"
	"github.com/ChargePi/oecs-hub/internal/useraction"
	"github.com/ChargePi/oecs-hub/internal/userchargers"
	"github.com/google/uuid"
	"github.com/mark3labs/mcp-go/mcp"
	"github.com/mark3labs/mcp-go/server"
	"google.golang.org/grpc/status"
)

// conversationIDHeader names the chat conversation an MCP call is made from. Set by the
// agent from its own workflow state, never from model output, and trusted only alongside
// a valid gateway secret - the same rule as the identity headers.
const conversationIDHeader = "x-conversation-id"

// HTTPContextFunc resolves the caller of an MCP request the same way the gRPC
// interceptor does: x-user-* headers count only with a matching x-gateway-secret,
// otherwise the request is anonymous. Anonymous callers can still use the catalogue
// tools; the user tools refuse them.
func HTTPContextFunc(gatewaySecret string) server.HTTPContextFunc {
	return func(ctx context.Context, r *http.Request) context.Context {
		identity := auth.IdentityFromHeaders(r.Header.Get, gatewaySecret)
		if identity == nil {
			return ctx
		}

		ctx = auth.WithIdentity(ctx, identity)

		return useraction.WithConversationID(ctx, r.Header.Get(conversationIDHeader))
	}
}

// The user tools' descriptions, documenting each for the calling model. The write tools
// all stress that they only propose: nothing changes until the user confirms in the chat.
const (
	listMyProjectsDescription = `List the signed-in user's own charger projects (named shortlists), with each project's id,
name, description and charger ids. Use this to find the id of a project the user refers to
by name before proposing a change to it. Projects require a paid plan; on a free plan this
returns an error saying so.`

	listMyFavoritesDescription = `List the chargers the signed-in user has favorited, newest first, with each charger's id,
manufacturer and model. Use this to check whether a charger is already a favorite, or to
find the id of a favorite the user wants removed.`

	proposeFavoriteChangeDescription = `Propose adding a charger to, or removing it from, the signed-in user's favorites. This does
NOT change anything yet: it creates a pending action that the user must confirm in the chat
before it runs, and returns its id and a summary of what will happen. The charger must be a
verified charger id from search_chargers or get_chargers.`

	proposeProjectChangeDescription = `Propose a change to one of the signed-in user's charger projects: add chargers to or remove
chargers from an existing project (projectId, from list_my_projects), or create a new project
(newProject), optionally with chargers added to it. Set exactly one of projectId and
newProject. Removed chargers must currently be in the project. This does NOT change anything
yet: it creates a pending action that the user must confirm in the chat before it runs, and
returns its id and a summary of what will happen. Projects require a paid plan.`

	listConversationActionsDescription = `List the actions proposed to the signed-in user in the current conversation that haven't
expired yet, with each one's id, summary and status (pending, confirmed, rejected or
failed). Use this to learn whether the user confirmed or rejected an earlier proposal before
proposing something again. Confirming and rejecting are only ever done by the user.`
)

// proposeRatingDescription documents propose_rating, listing the valid categories from
// userchargers.ValidRatingCategories so the model never has to guess them.
func proposeRatingDescription() string {
	categories := make([]string, 0, len(userchargers.ValidRatingCategories))
	for category := range userchargers.ValidRatingCategories {
		categories = append(categories, category)
	}

	sort.Strings(categories)

	return fmt.Sprintf(`Propose rating a charger on the signed-in user's behalf, with a score from 1 to 5 for one or
more categories. Valid categories are: %s. Rating a category
the user already rated overwrites their previous score. Only use scores the user actually
stated - never infer or invent one. This does NOT change anything yet: it creates a pending
action that the user must confirm in the chat before it runs, and returns its id and a
summary of what will happen.`, strings.Join(categories, ", "))
}

// UserChargersReader is the subset of userchargers.Service the read-only user tools need.
type UserChargersReader interface {
	ListFavorites(ctx context.Context, identityID uuid.UUID, limit, offset uint32) ([]userchargers.FavoriteEntry, int64, error)
	ListProjects(ctx context.Context, identityID uuid.UUID, limit, offset uint32) ([]*userchargers.Project, int64, error)
}

// ActionProposer is the subset of useraction.Service the propose/list tools need. There
// is deliberately no confirm or reject here - only the user decides, over gRPC.
type ActionProposer interface {
	ProposeFavorite(ctx context.Context, variantID uuid.UUID, favorited bool) (*useraction.Action, error)
	ProposeProject(ctx context.Context, payload useraction.ProjectPayload) (*useraction.Action, error)
	ProposeRating(ctx context.Context, variantID uuid.UUID, ratings []userchargers.RatingInput) (*useraction.Action, error)
	ListByConversation(ctx context.Context, conversationID string) ([]useraction.State, error)
}

type ListMyProjectsInput struct{}

type MyProjectOutput struct {
	ID          string   `json:"id"`
	Name        string   `json:"name"`
	Description string   `json:"description,omitempty"`
	ChargerIDs  []string `json:"chargerIds"`
}

type ListMyProjectsOutput struct {
	Projects []MyProjectOutput `json:"projects"`
}

type ListMyFavoritesInput struct{}

type MyFavoriteOutput struct {
	ID           string `json:"id"`
	Manufacturer string `json:"manufacturer"`
	Model        string `json:"model"`
}

type ListMyFavoritesOutput struct {
	Favorites []MyFavoriteOutput `json:"favorites"`
}

type ProposeFavoriteChangeInput struct {
	ChargerVariantID string `json:"chargerVariantId" jsonschema:"id (UUID) of the charger, from search_chargers or get_chargers"`
	Favorited        bool   `json:"favorited" jsonschema:"true to add the charger to favorites, false to remove it"`
}

type ProjectChargerChangeInput struct {
	ChargerVariantID string `json:"chargerVariantId" jsonschema:"id (UUID) of the charger, from search_chargers or get_chargers"`
	Action           string `json:"action" jsonschema:"add or remove"`
	Note             string `json:"note,omitempty" jsonschema:"optional note to store with an added charger"`
}

type NewProjectInput struct {
	Name        string `json:"name" jsonschema:"name of the project to create"`
	Description string `json:"description,omitempty" jsonschema:"optional project description"`
}

type ProposeProjectChangeInput struct {
	ProjectID  string                      `json:"projectId,omitempty" jsonschema:"id (UUID) of an existing project, from list_my_projects - omit when creating a new project"`
	NewProject *NewProjectInput            `json:"newProject,omitempty" jsonschema:"the project to create - omit when changing an existing project"`
	Changes    []ProjectChargerChangeInput `json:"changes,omitempty" jsonschema:"chargers to add or remove"`
}

type RatingScoreInput struct {
	Category string `json:"category" jsonschema:"rating category"`
	Score    int    `json:"score" jsonschema:"score from 1 to 5"`
}

type ProposeRatingInput struct {
	ChargerVariantID string             `json:"chargerVariantId" jsonschema:"id (UUID) of the charger, from search_chargers or get_chargers"`
	Ratings          []RatingScoreInput `json:"ratings" jsonschema:"one score per category the user rated"`
}

// ProposedActionOutput is what every propose_* tool returns: the pending action awaiting
// the user's confirmation.
type ProposedActionOutput struct {
	ActionID  string `json:"actionId"`
	Kind      string `json:"kind"`
	Summary   string `json:"summary"`
	ExpiresAt string `json:"expiresAt"`
}

type ListConversationActionsInput struct{}

type ConversationActionOutput struct {
	ActionID string `json:"actionId"`
	Kind     string `json:"kind"`
	Summary  string `json:"summary"`
	Status   string `json:"status"`
}

type ListConversationActionsOutput struct {
	Actions []ConversationActionOutput `json:"actions"`
}

// RegisterUserTools adds the tools that act for the signed-in user. Every one requires an
// identity resolved by HTTPContextFunc; the writes only ever propose.
func RegisterUserTools(s *server.MCPServer, userChargers UserChargersReader, actions ActionProposer) {
	h := &userToolsHandler{userChargers: userChargers, actions: actions}

	s.AddTool(mcp.NewTool("list_my_projects",
		mcp.WithDescription(listMyProjectsDescription),
		mcp.WithInputSchema[ListMyProjectsInput](),
		mcp.WithOutputSchema[ListMyProjectsOutput](),
	), h.listMyProjects)

	s.AddTool(mcp.NewTool("list_my_favorites",
		mcp.WithDescription(listMyFavoritesDescription),
		mcp.WithInputSchema[ListMyFavoritesInput](),
		mcp.WithOutputSchema[ListMyFavoritesOutput](),
	), h.listMyFavorites)

	s.AddTool(mcp.NewTool("propose_favorite_change",
		mcp.WithDescription(proposeFavoriteChangeDescription),
		mcp.WithInputSchema[ProposeFavoriteChangeInput](),
		mcp.WithOutputSchema[ProposedActionOutput](),
	), h.proposeFavoriteChange)

	s.AddTool(mcp.NewTool("propose_project_change",
		mcp.WithDescription(proposeProjectChangeDescription),
		mcp.WithInputSchema[ProposeProjectChangeInput](),
		mcp.WithOutputSchema[ProposedActionOutput](),
	), h.proposeProjectChange)

	s.AddTool(mcp.NewTool("propose_rating",
		mcp.WithDescription(proposeRatingDescription()),
		mcp.WithInputSchema[ProposeRatingInput](),
		mcp.WithOutputSchema[ProposedActionOutput](),
	), h.proposeRating)

	s.AddTool(mcp.NewTool("list_conversation_actions",
		mcp.WithDescription(listConversationActionsDescription),
		mcp.WithInputSchema[ListConversationActionsInput](),
		mcp.WithOutputSchema[ListConversationActionsOutput](),
	), h.listConversationActions)
}

type userToolsHandler struct {
	userChargers UserChargersReader
	actions      ActionProposer
}

func (h *userToolsHandler) listMyProjects(ctx context.Context, _ mcp.CallToolRequest) (*mcp.CallToolResult, error) {
	ownerID, err := auth.RequireUserChargersIdentity(ctx)
	if err != nil {
		return toolError(err), nil
	}

	projects, _, err := h.userChargers.ListProjects(ctx, ownerID, userchargers.MaxPageSize, 0)
	if err != nil {
		return toolError(err), nil
	}

	out := ListMyProjectsOutput{Projects: make([]MyProjectOutput, 0, len(projects))}

	for _, p := range projects {
		project := MyProjectOutput{ID: p.ID.String(), Name: p.Name, ChargerIDs: make([]string, 0, len(p.Chargers))}
		if p.Description != nil {
			project.Description = *p.Description
		}

		for _, member := range p.Chargers {
			project.ChargerIDs = append(project.ChargerIDs, member.ChargerVariantID.String())
		}

		out.Projects = append(out.Projects, project)
	}

	return structured(out), nil
}

func (h *userToolsHandler) listMyFavorites(ctx context.Context, _ mcp.CallToolRequest) (*mcp.CallToolResult, error) {
	ownerID, err := auth.RequireUserChargersIdentity(ctx)
	if err != nil {
		return toolError(err), nil
	}

	favorites, _, err := h.userChargers.ListFavorites(ctx, ownerID, userchargers.MaxPageSize, 0)
	if err != nil {
		return toolError(err), nil
	}

	out := ListMyFavoritesOutput{Favorites: make([]MyFavoriteOutput, 0, len(favorites))}
	for _, fav := range favorites {
		out.Favorites = append(out.Favorites, MyFavoriteOutput{
			ID:           fav.Charger.ID.String(),
			Manufacturer: fav.Charger.ManufacturerName,
			Model:        fav.Charger.ModelName,
		})
	}

	return structured(out), nil
}

func (h *userToolsHandler) proposeFavoriteChange(ctx context.Context, req mcp.CallToolRequest) (*mcp.CallToolResult, error) {
	var in ProposeFavoriteChangeInput
	if err := req.BindArguments(&in); err != nil {
		return mcp.NewToolResultError(fmt.Sprintf("failed to bind arguments: %v", err)), nil
	}

	variantID, err := uuid.Parse(in.ChargerVariantID)
	if err != nil {
		return mcp.NewToolResultError("chargerVariantId: not a valid UUID"), nil
	}

	action, err := h.actions.ProposeFavorite(ctx, variantID, in.Favorited)
	if err != nil {
		return toolError(err), nil
	}

	return structured(proposedOutput(action)), nil
}

func (h *userToolsHandler) proposeProjectChange(ctx context.Context, req mcp.CallToolRequest) (*mcp.CallToolResult, error) {
	var in ProposeProjectChangeInput
	if err := req.BindArguments(&in); err != nil {
		return mcp.NewToolResultError(fmt.Sprintf("failed to bind arguments: %v", err)), nil
	}

	var payload useraction.ProjectPayload

	if in.ProjectID != "" {
		projectID, err := uuid.Parse(in.ProjectID)
		if err != nil {
			return mcp.NewToolResultError("projectId: not a valid UUID"), nil
		}

		payload.ProjectID = &projectID
	}

	if in.NewProject != nil {
		payload.NewProject = &useraction.NewProject{Name: in.NewProject.Name, Description: optional(in.NewProject.Description)}
	}

	for _, change := range in.Changes {
		variantID, err := uuid.Parse(change.ChargerVariantID)
		if err != nil {
			return mcp.NewToolResultError(fmt.Sprintf("changes: %q is not a valid UUID", change.ChargerVariantID)), nil
		}

		var action userchargers.ChargerChangeAction

		switch change.Action {
		case "add":
			action = userchargers.ChargerChangeAdd
		case "remove":
			action = userchargers.ChargerChangeRemove
		default:
			return mcp.NewToolResultError(fmt.Sprintf("changes: action must be add or remove, got %q", change.Action)), nil
		}

		payload.Changes = append(payload.Changes, userchargers.ChargerChange{
			ChargerVariantID: variantID,
			Action:           action,
			Note:             optional(change.Note),
		})
	}

	action, err := h.actions.ProposeProject(ctx, payload)
	if err != nil {
		return toolError(err), nil
	}

	return structured(proposedOutput(action)), nil
}

func (h *userToolsHandler) proposeRating(ctx context.Context, req mcp.CallToolRequest) (*mcp.CallToolResult, error) {
	var in ProposeRatingInput
	if err := req.BindArguments(&in); err != nil {
		return mcp.NewToolResultError(fmt.Sprintf("failed to bind arguments: %v", err)), nil
	}

	variantID, err := uuid.Parse(in.ChargerVariantID)
	if err != nil {
		return mcp.NewToolResultError("chargerVariantId: not a valid UUID"), nil
	}

	ratings := make([]userchargers.RatingInput, 0, len(in.Ratings))
	for _, r := range in.Ratings {
		ratings = append(ratings, userchargers.RatingInput{CategoryName: r.Category, Score: r.Score})
	}

	action, err := h.actions.ProposeRating(ctx, variantID, ratings)
	if err != nil {
		return toolError(err), nil
	}

	return structured(proposedOutput(action)), nil
}

func (h *userToolsHandler) listConversationActions(ctx context.Context, _ mcp.CallToolRequest) (*mcp.CallToolResult, error) {
	states, err := h.actions.ListByConversation(ctx, useraction.ConversationIDFromContext(ctx))
	if err != nil {
		return toolError(err), nil
	}

	out := ListConversationActionsOutput{Actions: make([]ConversationActionOutput, 0, len(states))}
	for _, state := range states {
		out.Actions = append(out.Actions, ConversationActionOutput{
			ActionID: state.ID.String(),
			Kind:     string(state.Kind),
			Summary:  state.Summary,
			Status:   string(state.Status),
		})
	}

	return structured(out), nil
}

func proposedOutput(action *useraction.Action) ProposedActionOutput {
	return ProposedActionOutput{
		ActionID:  action.ID.String(),
		Kind:      string(action.Kind),
		Summary:   action.Summary,
		ExpiresAt: action.ExpiresAt.UTC().Format(time.RFC3339),
	}
}

func structured(out any) *mcp.CallToolResult {
	return &mcp.CallToolResult{Content: []mcp.Content{}, StructuredContent: out}
}

// toolError reports err to the calling model as a tool error it can relay to the user,
// unwrapping gRPC status errors (auth failures) to their bare message.
func toolError(err error) *mcp.CallToolResult {
	if st, ok := status.FromError(err); ok {
		return mcp.NewToolResultError(st.Message())
	}

	return mcp.NewToolResultError(err.Error())
}

func optional(value string) *string {
	if value == "" {
		return nil
	}

	return &value
}
