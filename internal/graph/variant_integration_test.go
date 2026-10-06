package graph_test

import (
	"context"
	"os"
	"testing"

	"github.com/ChargePi/oecs-hub/internal/charger"
	"github.com/ChargePi/oecs-hub/internal/graph"
	"github.com/google/uuid"
)

// TestMoveVariant_Integration exercises MoveVariant against a real Memgraph instance.
// Skipped unless OECS_HUB_MEMGRAPH_URI is set.
func TestMoveVariant_Integration(t *testing.T) {
	uri := os.Getenv("OECS_HUB_MEMGRAPH_URI")
	if uri == "" {
		t.Skip("OECS_HUB_MEMGRAPH_URI not set")
	}

	ctx := context.Background()

	client, err := graph.NewClient(uri, "", "")
	if err != nil {
		t.Fatalf("connect: %v", err)
	}
	defer client.Close(ctx)

	from, to := uuid.New(), uuid.New()
	moved := &charger.Charger{ID: uuid.New(), Series: "Bolt", ModelName: "Bolt-1", Status: charger.StatusVerified}
	sibling := &charger.Charger{ID: uuid.New(), Series: "Volt", ModelName: "Volt-1", Status: charger.StatusVerified}

	for _, c := range []*charger.Charger{moved, sibling} {
		if err := client.UpsertVariant(ctx, from, c); err != nil {
			t.Fatalf("upsert variant: %v", err)
		}
	}

	if err := client.MoveVariant(ctx, to, moved); err != nil {
		t.Fatalf("move variant: %v", err)
	}

	fromProducts, err := client.GetManufacturerGraph(ctx, from)
	if err != nil {
		t.Fatalf("get source graph: %v", err)
	}

	if len(fromProducts) != 1 || fromProducts[0].ID != graph.ProductID(from, "Volt") {
		t.Fatalf("expected only the Volt product to remain under the source, got %+v", fromProducts)
	}

	toProducts, err := client.GetManufacturerGraph(ctx, to)
	if err != nil {
		t.Fatalf("get target graph: %v", err)
	}

	if len(toProducts) != 1 || toProducts[0].ID != graph.ProductID(to, "Bolt") ||
		len(toProducts[0].VariantIDs) != 1 || toProducts[0].VariantIDs[0] != moved.ID {
		t.Fatalf("expected the variant under the target's Bolt product, got %+v", toProducts)
	}

	if err := client.MoveVariant(ctx, to, moved); err != nil {
		t.Fatalf("repeat move: %v", err)
	}

	toProducts, err = client.GetManufacturerGraph(ctx, to)
	if err != nil {
		t.Fatalf("get target graph: %v", err)
	}

	if len(toProducts) != 1 || len(toProducts[0].VariantIDs) != 1 {
		t.Fatalf("repeat move should be a no-op, got %+v", toProducts)
	}

	if err := client.RemoveVariant(ctx, moved.ID); err != nil {
		t.Fatalf("remove variant: %v", err)
	}

	toProducts, err = client.GetManufacturerGraph(ctx, to)
	if err != nil {
		t.Fatalf("get target graph: %v", err)
	}

	if len(toProducts) != 0 {
		t.Fatalf("expected the emptied product to be removed, got %+v", toProducts)
	}
}
