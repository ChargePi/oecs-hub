package redis

import (
	"context"
	"encoding/json"
	"errors"
	"fmt"
	"sort"
	"time"

	"github.com/ChargePi/oecs-hub/internal/useraction"
	"github.com/google/uuid"
	"github.com/redis/go-redis/v9"
	"go.opentelemetry.io/otel"
	"go.opentelemetry.io/otel/codes"
	"go.opentelemetry.io/otel/trace"
)

var pendingActionTracer = otel.Tracer("useraction.store")

// PendingActionStore keeps useraction.Actions in Redis. Every key embeds the owner's id,
// so a lookup by anyone else misses - ownership is enforced by the key itself rather than
// by a check that could be forgotten. Plain commands are enough for atomicity: the action
// record is write-once, and the decision is a separate key claimed with SET NX.
//
//	pending_action:<owner>:<id>                     action JSON, expires at ExpiresAt
//	pending_action:<owner>:<id>:decision            confirmed|rejected|failed, same expiry
//	pending_actions:<owner>:conv:<conversationId>   set of action ids in that conversation
type PendingActionStore struct {
	client *redis.Client
}

func NewPendingActionStore(client *redis.Client) *PendingActionStore {
	return &PendingActionStore{client: client}
}

func pendingActionKey(ownerID, id uuid.UUID) string {
	return fmt.Sprintf("pending_action:%s:%s", ownerID, id)
}

func pendingActionDecisionKey(ownerID, id uuid.UUID) string {
	return pendingActionKey(ownerID, id) + ":decision"
}

func conversationActionsKey(ownerID uuid.UUID, conversationID string) string {
	return fmt.Sprintf("pending_actions:%s:conv:%s", ownerID, conversationID)
}

func (s *PendingActionStore) Save(ctx context.Context, action *useraction.Action) error {
	ctx, span := pendingActionTracer.Start(ctx, "store.Save")
	defer span.End()

	data, err := json.Marshal(action)
	if err != nil {
		return failSpan(span, fmt.Errorf("marshal action: %w", err))
	}

	_, err = s.client.TxPipelined(ctx, func(pipe redis.Pipeliner) error {
		pipe.Set(ctx, pendingActionKey(action.OwnerID, action.ID), data, time.Until(action.ExpiresAt))

		if action.ConversationID != "" {
			key := conversationActionsKey(action.OwnerID, action.ConversationID)
			pipe.SAdd(ctx, key, action.ID.String())
			// Every action gets the same TTL, so the newest one always expires last -
			// pushing the index's expiry to it keeps the index alive exactly as long as
			// anything in it can still be read.
			pipe.ExpireAt(ctx, key, action.ExpiresAt)
		}

		return nil
	})
	if err != nil {
		return failSpan(span, fmt.Errorf("save action: %w", err))
	}

	return nil
}

func (s *PendingActionStore) Get(ctx context.Context, ownerID, id uuid.UUID) (*useraction.State, error) {
	ctx, span := pendingActionTracer.Start(ctx, "store.Get")
	defer span.End()

	values, err := s.client.MGet(ctx, pendingActionKey(ownerID, id), pendingActionDecisionKey(ownerID, id)).Result()
	if err != nil {
		return nil, failSpan(span, fmt.Errorf("get action: %w", err))
	}

	state, err := decodeState(values[0], values[1])
	if err != nil {
		return nil, failSpan(span, err)
	}

	if state == nil {
		return nil, useraction.ErrNotFound
	}

	return state, nil
}

func (s *PendingActionStore) Decide(ctx context.Context, action *useraction.Action, decision useraction.Status) (bool, useraction.Status, error) {
	ctx, span := pendingActionTracer.Start(ctx, "store.Decide")
	defer span.End()

	ttl := time.Until(action.ExpiresAt)
	if ttl <= 0 {
		return false, "", useraction.ErrNotFound
	}

	key := pendingActionDecisionKey(action.OwnerID, action.ID)

	claimed, err := s.client.SetNX(ctx, key, string(decision), ttl).Result()
	if err != nil {
		return false, "", failSpan(span, fmt.Errorf("claim decision: %w", err))
	}

	if claimed {
		return true, decision, nil
	}

	current, err := s.client.Get(ctx, key).Result()
	if err != nil && !errors.Is(err, redis.Nil) {
		return false, "", failSpan(span, fmt.Errorf("read decision: %w", err))
	}

	return false, useraction.Status(current), nil
}

func (s *PendingActionStore) MarkFailed(ctx context.Context, action *useraction.Action) error {
	ctx, span := pendingActionTracer.Start(ctx, "store.MarkFailed")
	defer span.End()

	err := s.client.SetArgs(ctx, pendingActionDecisionKey(action.OwnerID, action.ID), string(useraction.StatusFailed),
		redis.SetArgs{Mode: "XX", KeepTTL: true}).Err()
	if err != nil && !errors.Is(err, redis.Nil) {
		return failSpan(span, fmt.Errorf("mark failed: %w", err))
	}

	return nil
}

func (s *PendingActionStore) ListByConversation(ctx context.Context, ownerID uuid.UUID, conversationID string) ([]useraction.State, error) {
	ctx, span := pendingActionTracer.Start(ctx, "store.ListByConversation")
	defer span.End()

	indexKey := conversationActionsKey(ownerID, conversationID)

	members, err := s.client.SMembers(ctx, indexKey).Result()
	if err != nil {
		return nil, failSpan(span, fmt.Errorf("list conversation actions: %w", err))
	}

	if len(members) == 0 {
		return []useraction.State{}, nil
	}

	keys := make([]string, 0, 2*len(members))
	ids := make([]uuid.UUID, 0, len(members))

	for _, member := range members {
		id, err := uuid.Parse(member)
		if err != nil {
			continue
		}

		ids = append(ids, id)
		keys = append(keys, pendingActionKey(ownerID, id), pendingActionDecisionKey(ownerID, id))
	}

	if len(ids) == 0 {
		return []useraction.State{}, nil
	}

	values, err := s.client.MGet(ctx, keys...).Result()
	if err != nil {
		return nil, failSpan(span, fmt.Errorf("get conversation actions: %w", err))
	}

	states := make([]useraction.State, 0, len(ids))

	var expired []any

	for i, id := range ids {
		state, err := decodeState(values[2*i], values[2*i+1])
		if err != nil {
			return nil, failSpan(span, err)
		}

		if state == nil {
			expired = append(expired, id.String())

			continue
		}

		states = append(states, *state)
	}

	// Best-effort pruning; the whole index expires with its newest action anyway.
	if len(expired) > 0 {
		_ = s.client.SRem(ctx, indexKey, expired...).Err()
	}

	sort.Slice(states, func(i, j int) bool { return states[i].ExpiresAt.Before(states[j].ExpiresAt) })

	return states, nil
}

// decodeState turns an MGET pair into a State. A missing action is (nil, nil); a missing
// decision means the action is still pending.
func decodeState(actionValue, decisionValue any) (*useraction.State, error) {
	raw, ok := actionValue.(string)
	if !ok {
		return nil, nil
	}

	var action useraction.Action
	if err := json.Unmarshal([]byte(raw), &action); err != nil {
		return nil, fmt.Errorf("unmarshal action: %w", err)
	}

	status := useraction.StatusPending
	if decision, ok := decisionValue.(string); ok && decision != "" {
		status = useraction.Status(decision)
	}

	return &useraction.State{Action: action, Status: status}, nil
}

func failSpan(span trace.Span, err error) error {
	span.RecordError(err)
	span.SetStatus(codes.Error, err.Error())

	return err
}
