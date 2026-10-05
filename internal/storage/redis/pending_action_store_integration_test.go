package redis_test

import (
	"context"
	"errors"
	"os"
	"sync"
	"testing"
	"time"

	redisStorage "github.com/ChargePi/oecs-hub/internal/storage/redis"
	"github.com/ChargePi/oecs-hub/internal/useraction"
	"github.com/google/uuid"
	"github.com/redis/go-redis/v9"
)

// newPendingActionStore connects to OECS_HUB_REDIS_ADDRESS on a throwaway DB (15), so it
// never touches the caches the hub itself uses.
func newPendingActionStore(t *testing.T) *redisStorage.PendingActionStore {
	t.Helper()

	addr := os.Getenv("OECS_HUB_REDIS_ADDRESS")
	if addr == "" {
		t.Skip("OECS_HUB_REDIS_ADDRESS not set")
	}

	client := redis.NewClient(&redis.Options{Addr: addr, Password: os.Getenv("OECS_HUB_REDIS_PASSWORD"), DB: 15})
	t.Cleanup(func() { _ = client.Close() })

	if err := client.Ping(context.Background()).Err(); err != nil {
		t.Fatalf("ping redis: %v", err)
	}

	return redisStorage.NewPendingActionStore(client)
}

func newAction(ownerID uuid.UUID, conversationID string, ttl time.Duration) *useraction.Action {
	return &useraction.Action{
		ID:             uuid.New(),
		OwnerID:        ownerID,
		ConversationID: conversationID,
		Kind:           useraction.KindFavorite,
		Summary:        "Add Acme Bolt-9000 to your favorites",
		ExpiresAt:      time.Now().Add(ttl),
		Favorite:       &useraction.FavoritePayload{VariantID: uuid.New(), Favorited: true},
	}
}

func TestPendingActionStore_GetIsOwnerScoped_Integration(t *testing.T) {
	store := newPendingActionStore(t)
	ctx := context.Background()

	action := newAction(uuid.New(), "", time.Minute)
	if err := store.Save(ctx, action); err != nil {
		t.Fatalf("Save: %v", err)
	}

	state, err := store.Get(ctx, action.OwnerID, action.ID)
	if err != nil {
		t.Fatalf("Get: %v", err)
	}

	if state.Status != useraction.StatusPending || state.Favorite.VariantID != action.Favorite.VariantID {
		t.Fatalf("state = %+v", state)
	}

	if _, err := store.Get(ctx, uuid.New(), action.ID); !errors.Is(err, useraction.ErrNotFound) {
		t.Fatalf("other owner's Get err = %v, want ErrNotFound", err)
	}
}

func TestPendingActionStore_DecideHasExactlyOneWinner_Integration(t *testing.T) {
	store := newPendingActionStore(t)
	ctx := context.Background()

	action := newAction(uuid.New(), "", time.Minute)
	if err := store.Save(ctx, action); err != nil {
		t.Fatalf("Save: %v", err)
	}

	var (
		wg      sync.WaitGroup
		mu      sync.Mutex
		winners []useraction.Status
	)

	for i := 0; i < 20; i++ {
		decision := useraction.StatusConfirmed
		if i%2 == 0 {
			decision = useraction.StatusRejected
		}

		wg.Add(1)

		go func() {
			defer wg.Done()

			claimed, _, err := store.Decide(ctx, action, decision)
			if err != nil {
				t.Errorf("Decide: %v", err)

				return
			}

			if claimed {
				mu.Lock()
				winners = append(winners, decision)
				mu.Unlock()
			}
		}()
	}

	wg.Wait()

	if len(winners) != 1 {
		t.Fatalf("winners = %v, want exactly one", winners)
	}

	claimed, current, err := store.Decide(ctx, action, useraction.StatusConfirmed)
	if err != nil || claimed || current != winners[0] {
		t.Fatalf("late Decide = %v, %s, %v; want lost to %s", claimed, current, err, winners[0])
	}

	state, err := store.Get(ctx, action.OwnerID, action.ID)
	if err != nil || state.Status != winners[0] {
		t.Fatalf("Get = %+v, %v; want %s", state, err, winners[0])
	}
}

func TestPendingActionStore_MarkFailed_Integration(t *testing.T) {
	store := newPendingActionStore(t)
	ctx := context.Background()

	action := newAction(uuid.New(), "", time.Minute)
	if err := store.Save(ctx, action); err != nil {
		t.Fatalf("Save: %v", err)
	}

	if _, _, err := store.Decide(ctx, action, useraction.StatusConfirmed); err != nil {
		t.Fatalf("Decide: %v", err)
	}

	if err := store.MarkFailed(ctx, action); err != nil {
		t.Fatalf("MarkFailed: %v", err)
	}

	state, err := store.Get(ctx, action.OwnerID, action.ID)
	if err != nil || state.Status != useraction.StatusFailed {
		t.Fatalf("Get = %+v, %v; want failed", state, err)
	}
}

func TestPendingActionStore_ListByConversation_Integration(t *testing.T) {
	store := newPendingActionStore(t)
	ctx := context.Background()

	ownerID := uuid.New()
	conversationID := uuid.NewString()

	short := newAction(ownerID, conversationID, time.Second)
	long := newAction(ownerID, conversationID, time.Minute)
	otherOwner := newAction(uuid.New(), conversationID, time.Minute)
	otherConversation := newAction(ownerID, uuid.NewString(), time.Minute)

	for _, a := range []*useraction.Action{short, long, otherOwner, otherConversation} {
		if err := store.Save(ctx, a); err != nil {
			t.Fatalf("Save: %v", err)
		}
	}

	states, err := store.ListByConversation(ctx, ownerID, conversationID)
	if err != nil {
		t.Fatalf("ListByConversation: %v", err)
	}

	if len(states) != 2 || states[0].ID != short.ID || states[1].ID != long.ID {
		t.Fatalf("states = %+v, want [short, long]", states)
	}

	time.Sleep(1500 * time.Millisecond)

	states, err = store.ListByConversation(ctx, ownerID, conversationID)
	if err != nil {
		t.Fatalf("ListByConversation after expiry: %v", err)
	}

	if len(states) != 1 || states[0].ID != long.ID {
		t.Fatalf("states after expiry = %+v, want [long]", states)
	}

	if _, err := store.Get(ctx, ownerID, short.ID); !errors.Is(err, useraction.ErrNotFound) {
		t.Fatalf("expired Get err = %v, want ErrNotFound", err)
	}
}
