package grpc

import (
	"context"
	"errors"

	userchargersv1 "github.com/ChargePi/oecs-hub/gen/proto/userchargers/v1"
	"github.com/ChargePi/oecs-hub/internal/useraction"
	"github.com/google/uuid"
	"google.golang.org/grpc/codes"
	"google.golang.org/grpc/status"
	"google.golang.org/protobuf/types/known/timestamppb"
)

// PendingActionDecider is the subset of useraction.Service the pending-actions handler
// needs. Proposing is MCP-only - this API only reads and decides.
type PendingActionDecider interface {
	Get(ctx context.Context, id uuid.UUID) (*useraction.State, error)
	ListByConversation(ctx context.Context, conversationID string) ([]useraction.State, error)
	Confirm(ctx context.Context, id uuid.UUID) (*useraction.State, error)
	Reject(ctx context.Context, id uuid.UUID) (*useraction.State, error)
}

// PendingActionHandler implements userchargers.v1.PendingActionService. The caller and the
// scope of "their" actions come from the identity the edge forwards, checked in
// useraction.Service.
type PendingActionHandler struct {
	userchargersv1.UnimplementedPendingActionServiceServer

	actions PendingActionDecider
}

func NewPendingActionHandler(actions PendingActionDecider) *PendingActionHandler {
	return &PendingActionHandler{actions: actions}
}

func (h *PendingActionHandler) GetPendingAction(ctx context.Context, req *userchargersv1.GetPendingActionRequest) (*userchargersv1.GetPendingActionResponse, error) {
	id, err := parseActionID(req.GetActionId())
	if err != nil {
		return nil, err
	}

	state, err := h.actions.Get(ctx, id)
	if err != nil {
		return nil, pendingActionError(err)
	}

	return &userchargersv1.GetPendingActionResponse{Action: pendingActionToProto(state)}, nil
}

func (h *PendingActionHandler) ListPendingActions(ctx context.Context, req *userchargersv1.ListPendingActionsRequest) (*userchargersv1.ListPendingActionsResponse, error) {
	states, err := h.actions.ListByConversation(ctx, req.GetConversationId())
	if err != nil {
		return nil, pendingActionError(err)
	}

	actions := make([]*userchargersv1.PendingAction, 0, len(states))
	for i := range states {
		actions = append(actions, pendingActionToProto(&states[i]))
	}

	return &userchargersv1.ListPendingActionsResponse{Actions: actions}, nil
}

func (h *PendingActionHandler) ConfirmPendingAction(ctx context.Context, req *userchargersv1.ConfirmPendingActionRequest) (*userchargersv1.ConfirmPendingActionResponse, error) {
	id, err := parseActionID(req.GetActionId())
	if err != nil {
		return nil, err
	}

	state, err := h.actions.Confirm(ctx, id)
	if err != nil {
		return nil, pendingActionError(err)
	}

	return &userchargersv1.ConfirmPendingActionResponse{Action: pendingActionToProto(state)}, nil
}

func (h *PendingActionHandler) RejectPendingAction(ctx context.Context, req *userchargersv1.RejectPendingActionRequest) (*userchargersv1.RejectPendingActionResponse, error) {
	id, err := parseActionID(req.GetActionId())
	if err != nil {
		return nil, err
	}

	state, err := h.actions.Reject(ctx, id)
	if err != nil {
		return nil, pendingActionError(err)
	}

	return &userchargersv1.RejectPendingActionResponse{Action: pendingActionToProto(state)}, nil
}

func parseActionID(raw string) (uuid.UUID, error) {
	id, err := uuid.Parse(raw)
	if err != nil {
		return uuid.Nil, status.Error(codes.InvalidArgument, "invalid action_id")
	}

	return id, nil
}

// pendingActionError adds the pending-action errors to userChargersError's mapping, which
// still covers whatever the confirmed write itself returns (paid plan, missing project...).
func pendingActionError(err error) error {
	switch {
	case errors.Is(err, useraction.ErrNotFound):
		return status.Error(codes.NotFound, useraction.ErrNotFound.Error())
	case errors.Is(err, useraction.ErrNotPending):
		return status.Error(codes.FailedPrecondition, err.Error())
	case errors.Is(err, useraction.ErrInvalidAction):
		return status.Error(codes.InvalidArgument, err.Error())
	default:
		return userChargersError(err)
	}
}

func pendingActionToProto(state *useraction.State) *userchargersv1.PendingAction {
	return &userchargersv1.PendingAction{
		Id:             state.ID.String(),
		Kind:           pendingActionKindToProto(state.Kind),
		Summary:        state.Summary,
		Status:         pendingActionStatusToProto(state.Status),
		ExpiresAt:      timestamppb.New(state.ExpiresAt),
		ConversationId: state.ConversationID,
		Destructive:    state.Destructive(),
	}
}

func pendingActionKindToProto(kind useraction.Kind) userchargersv1.PendingActionKind {
	switch kind {
	case useraction.KindFavorite:
		return userchargersv1.PendingActionKind_PENDING_ACTION_KIND_FAVORITE
	case useraction.KindProject:
		return userchargersv1.PendingActionKind_PENDING_ACTION_KIND_PROJECT
	case useraction.KindRating:
		return userchargersv1.PendingActionKind_PENDING_ACTION_KIND_RATING
	default:
		return userchargersv1.PendingActionKind_PENDING_ACTION_KIND_UNSPECIFIED
	}
}

func pendingActionStatusToProto(s useraction.Status) userchargersv1.PendingActionStatus {
	switch s {
	case useraction.StatusPending:
		return userchargersv1.PendingActionStatus_PENDING_ACTION_STATUS_PENDING
	case useraction.StatusConfirmed:
		return userchargersv1.PendingActionStatus_PENDING_ACTION_STATUS_CONFIRMED
	case useraction.StatusRejected:
		return userchargersv1.PendingActionStatus_PENDING_ACTION_STATUS_REJECTED
	case useraction.StatusFailed:
		return userchargersv1.PendingActionStatus_PENDING_ACTION_STATUS_FAILED
	default:
		return userchargersv1.PendingActionStatus_PENDING_ACTION_STATUS_UNSPECIFIED
	}
}
