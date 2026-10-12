package manufacturer

import (
	"context"
	"errors"
	"slices"
	"testing"

	"github.com/google/uuid"
)

type fakeRepository struct {
	Repository

	manufacturers []*Summary
	gotFilters    ListFilters
	refreshed     *Manufacturer
}

func (f *fakeRepository) Create(_ context.Context, m *Manufacturer) error {
	m.ID = uuid.New()

	return nil
}

func (f *fakeRepository) RefreshCatalog(context.Context, uuid.UUID) (*Manufacturer, error) {
	if f.refreshed == nil {
		return nil, ErrNotFound
	}

	return f.refreshed, nil
}

func (f *fakeRepository) List(_ context.Context, filters ListFilters, limit, offset uint32) ([]*Summary, int64, error) {
	f.gotFilters = filters

	end := min(int(offset+limit), len(f.manufacturers))
	if int(offset) >= end {
		return nil, int64(len(f.manufacturers)), nil
	}

	return f.manufacturers[offset:end], int64(len(f.manufacturers)), nil
}

type fakeCache struct {
	Cache

	deleted []uuid.UUID
}

func (f *fakeCache) Set(context.Context, *Manufacturer) error { return nil }

func (f *fakeCache) Delete(_ context.Context, id uuid.UUID) error {
	f.deleted = append(f.deleted, id)

	return nil
}

type fakeGraph struct{}

func (fakeGraph) UpsertManufacturer(context.Context, *Manufacturer) error { return nil }

type fakeIndex struct {
	upserted []*Manufacturer
	searched []string
	ranked   []uuid.UUID
	err      error
	failFor  map[uuid.UUID]struct{}
}

func (f *fakeIndex) Upsert(_ context.Context, m *Manufacturer) error {
	if _, fail := f.failFor[m.ID]; fail || f.err != nil {
		return errors.New("boom")
	}

	f.upserted = append(f.upserted, m)

	return nil
}

func (f *fakeIndex) Search(_ context.Context, query string) ([]uuid.UUID, error) {
	f.searched = append(f.searched, query)

	return f.ranked, f.err
}

func TestService_List_Semantic(t *testing.T) {
	ranked := []uuid.UUID{uuid.New(), uuid.New()}
	query := "DC fast chargers with CCS2"
	empty := ""

	cases := []struct {
		name       string
		query      *string
		indexErr   error
		wantSearch bool
		wantRanked []uuid.UUID
	}{
		{"query is ranked", &query, nil, true, ranked},
		{"index failure falls back", &query, errors.New("boom"), true, nil},
		{"no query", nil, nil, false, nil},
		{"empty query", &empty, nil, false, nil},
	}

	for _, tc := range cases {
		t.Run(tc.name, func(t *testing.T) {
			index := &fakeIndex{ranked: ranked, err: tc.indexErr}
			repo := &fakeRepository{}

			if _, _, err := NewService(repo, &fakeCache{}, fakeGraph{}, index).List(context.Background(), tc.query, nil, 10, 0); err != nil {
				t.Fatalf("List: %v", err)
			}

			if got := len(index.searched) == 1; got != tc.wantSearch {
				t.Errorf("index searched = %v, want %v", got, tc.wantSearch)
			}

			if !slices.Equal(repo.gotFilters.RankedIDs, tc.wantRanked) {
				t.Errorf("RankedIDs = %v, want %v", repo.gotFilters.RankedIDs, tc.wantRanked)
			}
		})
	}

	t.Run("no index configured", func(t *testing.T) {
		repo := &fakeRepository{}

		if _, _, err := NewService(repo, &fakeCache{}, fakeGraph{}, nil).List(context.Background(), &query, nil, 10, 0); err != nil {
			t.Fatalf("List: %v", err)
		}

		if repo.gotFilters.RankedIDs != nil {
			t.Errorf("RankedIDs = %v, want none", repo.gotFilters.RankedIDs)
		}
	})
}

func TestService_Create_Index(t *testing.T) {
	cases := []struct {
		name  string
		index *fakeIndex
		want  int
	}{
		{"indexes", &fakeIndex{}, 1},
		{"index failure doesn't fail the create", &fakeIndex{err: errors.New("boom")}, 0},
	}

	for _, tc := range cases {
		t.Run(tc.name, func(t *testing.T) {
			svc := NewService(&fakeRepository{}, &fakeCache{}, fakeGraph{}, tc.index)

			if _, err := svc.Create(context.Background(), &Manufacturer{Name: "Acme"}); err != nil {
				t.Fatalf("Create: %v", err)
			}

			if len(tc.index.upserted) != tc.want {
				t.Errorf("upserted %d, want %d", len(tc.index.upserted), tc.want)
			}
		})
	}

	t.Run("no index configured", func(t *testing.T) {
		svc := NewService(&fakeRepository{}, &fakeCache{}, fakeGraph{}, nil)

		if _, err := svc.Create(context.Background(), &Manufacturer{Name: "Acme"}); err != nil {
			t.Fatalf("Create: %v", err)
		}
	})
}

func TestService_RefreshCatalog(t *testing.T) {
	id := uuid.New()
	refreshed := &Manufacturer{ID: id, Name: "Acme", Catalog: Catalog{ChargerTypes: []string{"DC"}}}

	t.Run("evicts the cache and indexes the refreshed catalog", func(t *testing.T) {
		index := &fakeIndex{}
		cache := &fakeCache{}

		if err := NewService(&fakeRepository{refreshed: refreshed}, cache, fakeGraph{}, index).RefreshCatalog(context.Background(), id); err != nil {
			t.Fatalf("RefreshCatalog: %v", err)
		}

		if !slices.Equal(cache.deleted, []uuid.UUID{id}) {
			t.Errorf("cache deleted = %v, want %v", cache.deleted, id)
		}

		if len(index.upserted) != 1 || !slices.Equal(index.upserted[0].Catalog.ChargerTypes, []string{"DC"}) {
			t.Errorf("unexpected upserts: %+v", index.upserted)
		}
	})

	t.Run("index failure doesn't fail the refresh", func(t *testing.T) {
		svc := NewService(&fakeRepository{refreshed: refreshed}, &fakeCache{}, fakeGraph{}, &fakeIndex{err: errors.New("boom")})

		if err := svc.RefreshCatalog(context.Background(), id); err != nil {
			t.Fatalf("RefreshCatalog: %v", err)
		}
	})

	t.Run("no index configured", func(t *testing.T) {
		cache := &fakeCache{}

		if err := NewService(&fakeRepository{refreshed: refreshed}, cache, fakeGraph{}, nil).RefreshCatalog(context.Background(), id); err != nil {
			t.Fatalf("RefreshCatalog: %v", err)
		}

		if len(cache.deleted) != 1 {
			t.Errorf("expected the cache to be evicted")
		}
	})

	t.Run("unknown manufacturer", func(t *testing.T) {
		err := NewService(&fakeRepository{}, &fakeCache{}, fakeGraph{}, &fakeIndex{}).RefreshCatalog(context.Background(), id)
		if !errors.Is(err, ErrNotFound) {
			t.Fatalf("expected ErrNotFound, got %v", err)
		}
	})
}

func TestService_Reindex(t *testing.T) {
	t.Run("disabled", func(t *testing.T) {
		_, err := NewService(&fakeRepository{}, &fakeCache{}, fakeGraph{}, nil).Reindex(context.Background())
		if !errors.Is(err, ErrSemanticSearchDisabled) {
			t.Fatalf("expected ErrSemanticSearchDisabled, got %v", err)
		}
	})

	t.Run("indexes every page and counts failures", func(t *testing.T) {
		manufacturers := make([]*Summary, MaxPageSize+5)
		for i := range manufacturers {
			manufacturers[i] = &Summary{Manufacturer: Manufacturer{ID: uuid.New()}}
		}

		index := &fakeIndex{failFor: map[uuid.UUID]struct{}{manufacturers[3].Manufacturer.ID: {}}}
		repo := &fakeRepository{manufacturers: manufacturers}

		result, err := NewService(repo, &fakeCache{}, fakeGraph{}, index).Reindex(context.Background())
		if err != nil {
			t.Fatalf("Reindex: %v", err)
		}

		if result.Indexed != len(manufacturers)-1 || result.Failed != 1 {
			t.Fatalf("got %+v, want %d indexed and 1 failed", result, len(manufacturers)-1)
		}
	})
}
