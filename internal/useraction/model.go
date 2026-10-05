// Package useraction holds writes to a user's favorites, projects and ratings that an
// agent has proposed on their behalf but that must not run until the user confirms them.
//
// The MCP user tools only ever create a pending Action. Confirming or rejecting it is a
// separate, user-authenticated gRPC call (PendingActionService) coming through the
// Oathkeeper edge with the user's own session - so neither the LLM nor the agent calling
// MCP can approve an action by itself. Actions live in Redis with a fixed TTL; there is no
// history beyond it.
package useraction

import (
	"context"
	"errors"
	"time"

	"github.com/ChargePi/oecs-hub/internal/userchargers"
	"github.com/google/uuid"
)

var (
	// ErrNotFound covers "no such action", "not yours" and "expired" alike - the store
	// scopes every key by owner, so the three are indistinguishable by design.
	ErrNotFound = errors.New("pending action not found")
	// ErrNotPending means the action was already confirmed, rejected or failed.
	ErrNotPending = errors.New("pending action was already decided")
	// ErrInvalidAction means a proposal is malformed in a way the caller can fix.
	ErrInvalidAction = errors.New("invalid action")
)

// Kind is which user-scoped collection an action writes to.
type Kind string

const (
	KindFavorite Kind = "favorite"
	KindProject  Kind = "project"
	KindRating   Kind = "rating"
)

// Status is where an action is in its lifecycle. There is no stored "expired": an
// expired action is simply gone (ErrNotFound).
type Status string

const (
	StatusPending   Status = "pending"
	StatusConfirmed Status = "confirmed"
	StatusRejected  Status = "rejected"
	StatusFailed    Status = "failed"
)

// FavoritePayload adds a charger to, or removes it from, the owner's favorites.
type FavoritePayload struct {
	VariantID uuid.UUID `json:"variantId"`
	Favorited bool      `json:"favorited"`
}

// NewProject is a project to create as part of a ProjectPayload.
type NewProject struct {
	Name        string  `json:"name"`
	Description *string `json:"description,omitempty"`
}

// ProjectPayload edits one existing project's chargers, or creates a project (optionally
// with chargers in it). Exactly one of ProjectID and NewProject is set.
type ProjectPayload struct {
	ProjectID  *uuid.UUID                   `json:"projectId,omitempty"`
	NewProject *NewProject                  `json:"newProject,omitempty"`
	Changes    []userchargers.ChargerChange `json:"changes,omitempty"`
}

// RatingPayload submits (or overwrites) the owner's per-category scores for a charger.
type RatingPayload struct {
	VariantID uuid.UUID                  `json:"variantId"`
	Ratings   []userchargers.RatingInput `json:"ratings"`
}

// Action is one proposed write. It is immutable once stored - its Status is kept beside
// it, not in it, so deciding never rewrites the action itself.
type Action struct {
	ID      uuid.UUID `json:"id"`
	OwnerID uuid.UUID `json:"ownerId"`
	// ConversationID is the chat conversation the action was proposed in, taken from the
	// agent's request headers rather than from tool arguments. Empty when proposed
	// outside a conversation.
	ConversationID string `json:"conversationId,omitempty"`
	Kind           Kind   `json:"kind"`
	// Summary is the human-readable description the user confirms, built by this
	// package from catalogue data - never LLM text - so it states exactly what will run.
	Summary   string    `json:"summary"`
	ExpiresAt time.Time `json:"expiresAt"`

	Favorite *FavoritePayload `json:"favorite,omitempty"`
	Project  *ProjectPayload  `json:"project,omitempty"`
	Rating   *RatingPayload   `json:"rating,omitempty"`
}

// State is an action together with its current status.
type State struct {
	Action
	Status Status
}

// Store persists actions and their decisions. Every method is scoped by owner, so one
// user can never read or decide another user's action.
type Store interface {
	// Save stores a new pending action until its ExpiresAt and, when it has a
	// ConversationID, indexes it under that conversation.
	Save(ctx context.Context, action *Action) error
	// Get returns the action and its status, or ErrNotFound.
	Get(ctx context.Context, ownerID, id uuid.UUID) (*State, error)
	// Decide atomically records the first decision for a pending action. claimed is false
	// when a decision already exists, in which case current is that decision.
	Decide(ctx context.Context, action *Action, decision Status) (claimed bool, current Status, err error)
	// MarkFailed overwrites a confirmed decision after the write itself failed.
	MarkFailed(ctx context.Context, action *Action) error
	// ListByConversation returns the owner's unexpired actions in a conversation, oldest
	// first.
	ListByConversation(ctx context.Context, ownerID uuid.UUID, conversationID string) ([]State, error)
}

type conversationIDContextKey struct{}

// WithConversationID returns a context carrying the conversation an action is proposed in.
func WithConversationID(ctx context.Context, conversationID string) context.Context {
	return context.WithValue(ctx, conversationIDContextKey{}, conversationID)
}

// ConversationIDFromContext returns the conversation set by WithConversationID, if any.
func ConversationIDFromContext(ctx context.Context) string {
	conversationID, _ := ctx.Value(conversationIDContextKey{}).(string)

	return conversationID
}
