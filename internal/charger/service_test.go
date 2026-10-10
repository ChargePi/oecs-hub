package charger

import (
	"context"
	"errors"
	"slices"
	"testing"

	"github.com/google/uuid"
)

type fakeRepository struct {
	Repository

	existing   *Charger
	chargers   []*Charger
	gotFilters SearchFilters
}

func (f *fakeRepository) GetForReview(context.Context, uuid.UUID) (*Charger, error) {
	return f.existing, nil
}

func (f *fakeRepository) UpdateStatus(_ context.Context, id uuid.UUID, status Status, manufacturerID *uuid.UUID) (*Charger, error) {
	return &Charger{ID: id, Status: status, ManufacturerID: manufacturerID}, nil
}

func (f *fakeRepository) Search(_ context.Context, filters SearchFilters, limit, offset uint32) ([]*Charger, int64, error) {
	f.gotFilters = filters

	end := min(int(offset+limit), len(f.chargers))
	if int(offset) >= end {
		return nil, int64(len(f.chargers)), nil
	}

	return f.chargers[offset:end], int64(len(f.chargers)), nil
}

type fakeCache struct {
	Cache
}

func (fakeCache) Delete(context.Context, uuid.UUID) error { return nil }

type fakeGraph struct{}

func (fakeGraph) UpsertVariant(context.Context, uuid.UUID, *Charger) error { return nil }
func (fakeGraph) MoveVariant(context.Context, uuid.UUID, *Charger) error   { return nil }
func (fakeGraph) RemoveVariant(context.Context, uuid.UUID) error           { return nil }

type fakeIndex struct {
	upserted []uuid.UUID
	removed  []uuid.UUID
	searched []string
	ranked   []uuid.UUID
	err      error
	failFor  map[uuid.UUID]struct{}
}

func (f *fakeIndex) Upsert(_ context.Context, c *Charger) error {
	if _, fail := f.failFor[c.ID]; fail || f.err != nil {
		return errors.New("boom")
	}

	f.upserted = append(f.upserted, c.ID)

	return nil
}

func (f *fakeIndex) Remove(_ context.Context, id uuid.UUID) error {
	f.removed = append(f.removed, id)

	return f.err
}

func (f *fakeIndex) Search(_ context.Context, query string) ([]uuid.UUID, error) {
	f.searched = append(f.searched, query)

	return f.ranked, f.err
}

func newTestService(repo *fakeRepository, index SemanticIndex) *Service {
	return NewService(repo, fakeCache{}, nil, nil, fakeGraph{}, index)
}

func TestService_ChangeStatus_Index(t *testing.T) {
	id := uuid.New()
	manufacturerID := uuid.New()

	cases := []struct {
		name        string
		from, to    Status
		wantUpsert  bool
		wantRemoved bool
	}{
		{"verify indexes", StatusSubmitted, StatusVerified, true, false},
		{"archive a verified charger removes it", StatusVerified, StatusArchived, false, true},
		{"reject a verified charger removes it", StatusVerified, StatusRejected, false, true},
		{"reject a submission leaves the index alone", StatusSubmitted, StatusRejected, false, false},
	}

	for _, tc := range cases {
		t.Run(tc.name, func(t *testing.T) {
			index := &fakeIndex{}
			repo := &fakeRepository{existing: &Charger{ID: id, Status: tc.from, ManufacturerID: &manufacturerID}}

			if _, err := newTestService(repo, index).ChangeStatus(context.Background(), id, tc.to); err != nil {
				t.Fatalf("ChangeStatus: %v", err)
			}

			if got := slices.Contains(index.upserted, id); got != tc.wantUpsert {
				t.Errorf("upserted = %v, want %v", got, tc.wantUpsert)
			}

			if got := slices.Contains(index.removed, id); got != tc.wantRemoved {
				t.Errorf("removed = %v, want %v", got, tc.wantRemoved)
			}
		})
	}

	t.Run("index failure doesn't fail the status change", func(t *testing.T) {
		repo := &fakeRepository{existing: &Charger{ID: id, Status: StatusSubmitted, ManufacturerID: &manufacturerID}}

		if _, err := newTestService(repo, &fakeIndex{err: errors.New("boom")}).ChangeStatus(context.Background(), id, StatusVerified); err != nil {
			t.Fatalf("ChangeStatus: %v", err)
		}
	})

	t.Run("no index configured", func(t *testing.T) {
		repo := &fakeRepository{existing: &Charger{ID: id, Status: StatusSubmitted, ManufacturerID: &manufacturerID}}

		if _, err := newTestService(repo, nil).ChangeStatus(context.Background(), id, StatusVerified); err != nil {
			t.Fatalf("ChangeStatus: %v", err)
		}
	})
}

func TestService_Search_Semantic(t *testing.T) {
	ranked := []uuid.UUID{uuid.New(), uuid.New()}
	query := "quiet wallbox with solar"
	empty := ""

	cases := []struct {
		name       string
		filters    SearchFilters
		indexErr   error
		wantSearch bool
		wantRanked []uuid.UUID
	}{
		{"verified query is ranked", SearchFilters{Query: &query, Statuses: []Status{StatusVerified}}, nil, true, ranked},
		{"index failure falls back", SearchFilters{Query: &query, Statuses: []Status{StatusVerified}}, errors.New("boom"), true, nil},
		{"no query", SearchFilters{Statuses: []Status{StatusVerified}}, nil, false, nil},
		{"empty query", SearchFilters{Query: &empty, Statuses: []Status{StatusVerified}}, nil, false, nil},
		{"any status", SearchFilters{Query: &query}, nil, false, nil},
		{"non-verified status", SearchFilters{Query: &query, Statuses: []Status{StatusSubmitted}}, nil, false, nil},
	}

	for _, tc := range cases {
		t.Run(tc.name, func(t *testing.T) {
			index := &fakeIndex{ranked: ranked, err: tc.indexErr}
			repo := &fakeRepository{}

			if _, _, err := newTestService(repo, index).Search(context.Background(), tc.filters, 10, 0); err != nil {
				t.Fatalf("Search: %v", err)
			}

			if got := len(index.searched) == 1; got != tc.wantSearch {
				t.Errorf("index searched = %v, want %v", got, tc.wantSearch)
			}

			if !slices.Equal(repo.gotFilters.RankedIDs, tc.wantRanked) {
				t.Errorf("RankedIDs = %v, want %v", repo.gotFilters.RankedIDs, tc.wantRanked)
			}
		})
	}
}

func TestService_Reindex(t *testing.T) {
	t.Run("disabled", func(t *testing.T) {
		_, err := newTestService(&fakeRepository{}, nil).Reindex(context.Background())
		if !errors.Is(err, ErrSemanticSearchDisabled) {
			t.Fatalf("expected ErrSemanticSearchDisabled, got %v", err)
		}
	})

	t.Run("indexes every page and counts failures", func(t *testing.T) {
		chargers := make([]*Charger, MaxPageSize+5)
		for i := range chargers {
			chargers[i] = &Charger{ID: uuid.New(), Status: StatusVerified}
		}

		index := &fakeIndex{failFor: map[uuid.UUID]struct{}{chargers[3].ID: {}}}
		repo := &fakeRepository{chargers: chargers}

		result, err := newTestService(repo, index).Reindex(context.Background())
		if err != nil {
			t.Fatalf("Reindex: %v", err)
		}

		if result.Indexed != len(chargers)-1 || result.Failed != 1 {
			t.Fatalf("got %+v, want %d indexed and 1 failed", result, len(chargers)-1)
		}

		if !slices.Equal(repo.gotFilters.Statuses, []Status{StatusVerified}) {
			t.Errorf("expected only verified chargers, got %v", repo.gotFilters.Statuses)
		}
	})
}
