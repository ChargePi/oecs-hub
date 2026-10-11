package vector

import (
	"context"
	"os"
	"strconv"
	"testing"

	"github.com/ChargePi/oecs-hub/internal/manufacturer"
	openaiEmbedding "github.com/cloudwego/eino-ext/components/embedding/openai"
	"github.com/google/uuid"
)

// Skipped unless OECS_HUB_SEMANTICSEARCH_QDRANTHOST is set.
func TestManufacturerIndex_Integration(t *testing.T) {
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

	index, err := NewManufacturerIndex(Config{
		Host:       host,
		Port:       port,
		Collection: "oecs_manufacturers_test_" + uuid.NewString(),
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

	wallboxes := &manufacturer.Manufacturer{ID: uuid.New(), Name: "Acme", Country: "DE", Catalog: manufacturer.Catalog{
		ChargerTypes:   []string{"AC"},
		ConnectorTypes: []string{"Type2_Mennekes"},
		Protocols:      []string{"OCPP"},
		Series:         []string{"Home Wallbox"},
	}}
	fastChargers := &manufacturer.Manufacturer{ID: uuid.New(), Name: "Zenith", Country: "US", Catalog: manufacturer.Catalog{
		ChargerTypes:   []string{"DC"},
		ConnectorTypes: []string{"CCS2_Combo2", "CHAdeMO"},
		Protocols:      []string{"ISO15118", "OCPP"},
		Series:         []string{"Highway Hypercharger"},
	}}

	for _, m := range []*manufacturer.Manufacturer{wallboxes, fastChargers} {
		if err := index.Upsert(ctx, m); err != nil {
			t.Fatalf("upsert: %v", err)
		}
	}

	cases := map[string]uuid.UUID{
		"AC wallbox makers with Type 2":              wallboxes.ID,
		"DC fast charger manufacturers with CHAdeMO": fastChargers.ID,
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

	// Re-upserting replaces the document rather than adding a second point.
	wallboxes.Catalog = fastChargers.Catalog

	if err := index.Upsert(ctx, wallboxes); err != nil {
		t.Fatalf("re-upsert: %v", err)
	}

	ids, err := index.Search(ctx, "AC wallbox makers with Type 2")
	if err != nil {
		t.Fatalf("search after re-upsert: %v", err)
	}

	if len(ids) != 2 {
		t.Fatalf("expected 2 manufacturers after re-upsert, got %v", ids)
	}
}
