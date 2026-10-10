package vector

import (
	"context"
	"os"
	"strconv"
	"testing"

	"github.com/ChargePi/oecs-hub/internal/charger"
	openaiEmbedding "github.com/cloudwego/eino-ext/components/embedding/openai"
	"github.com/google/uuid"
)

// TestChargerIndex_Integration runs against a real Qdrant and embedding endpoint, in a
// throwaway collection. It's skipped unless OECS_HUB_SEMANTICSEARCH_QDRANTHOST is set;
// OECS_HUB_BIFROST_BASEURL and OECS_HUB_SEMANTICSEARCH_EMBEDDINGMODEL pick the embedder.
func TestChargerIndex_Integration(t *testing.T) {
	host := os.Getenv("OECS_HUB_SEMANTICSEARCH_QDRANTHOST")
	if host == "" {
		t.Skip("OECS_HUB_SEMANTICSEARCH_QDRANTHOST not set")
	}

	port := 6334

	if raw := os.Getenv("OECS_HUB_SEMANTICSEARCH_QDRANTPORT"); raw != "" {
		parsed, err := strconv.Atoi(raw)
		if err != nil {
			t.Fatalf("invalid qdrant port: %v", err)
		}

		port = parsed
	}

	ctx := context.Background()

	embedder, err := openaiEmbedding.NewEmbedder(ctx, &openaiEmbedding.EmbeddingConfig{
		APIKey:  os.Getenv("OECS_HUB_BIFROST_APIKEY"),
		Model:   os.Getenv("OECS_HUB_SEMANTICSEARCH_EMBEDDINGMODEL"),
		BaseURL: os.Getenv("OECS_HUB_BIFROST_BASEURL"),
	})
	if err != nil {
		t.Fatalf("create embedder: %v", err)
	}

	index, err := NewChargerIndex(Config{
		Host:       host,
		Port:       port,
		Collection: "oecs_chargers_test_" + uuid.NewString(),
		TopK:       10,
	}, embedder)
	if err != nil {
		t.Fatalf("create index: %v", err)
	}

	t.Cleanup(func() {
		_ = index.client.DeleteCollection(ctx, index.collection)
		_ = index.Close()
	})

	if err := index.EnsureCollection(ctx); err != nil {
		t.Fatalf("ensure collection: %v", err)
	}

	if err := index.EnsureCollection(ctx); err != nil {
		t.Fatalf("ensure existing collection: %v", err)
	}

	wallbox := testCharger(t, "ac-wallbox-full.json")
	fastCharger := testCharger(t, "dc-fast-charger-full.json")

	for _, c := range []*charger.Charger{wallbox, fastCharger} {
		if err := index.Upsert(ctx, c); err != nil {
			t.Fatalf("upsert: %v", err)
		}
	}

	cases := map[string]uuid.UUID{
		"home wallbox with solar integration":               wallbox.ID,
		"high power DC fast charger with CCS for a highway": fastCharger.ID,
		"charger with a credit card terminal and CHAdeMO":   fastCharger.ID,
	}

	for query, want := range cases {
		t.Run(query, func(t *testing.T) {
			ids, err := index.Search(ctx, query)
			if err != nil {
				t.Fatalf("search: %v", err)
			}

			if len(ids) != 2 || ids[0] != want {
				t.Fatalf("expected %s first of 2, got %v", want, ids)
			}
		})
	}

	if err := index.Remove(ctx, wallbox.ID); err != nil {
		t.Fatalf("remove: %v", err)
	}

	ids, err := index.Search(ctx, "home wallbox with solar integration")
	if err != nil {
		t.Fatalf("search after remove: %v", err)
	}

	if len(ids) != 1 || ids[0] != fastCharger.ID {
		t.Fatalf("expected only the fast charger after remove, got %v", ids)
	}
}

func testCharger(t *testing.T, file string) *charger.Charger {
	t.Helper()

	raw, err := os.ReadFile("../oecsspec/testdata/" + file)
	if err != nil {
		t.Fatalf("read testdata: %v", err)
	}

	return &charger.Charger{ID: uuid.New(), Spec: raw}
}
