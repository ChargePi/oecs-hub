package planningclient

import (
	"context"
	"errors"
	"os"
	"testing"

	"github.com/ChargePi/oecs-hub/internal/auth"
	"github.com/ChargePi/oecs-hub/internal/userchargers"
	"github.com/google/uuid"
)

func TestPlanningClientIntegration(t *testing.T) {
	address, secret := os.Getenv("OECS_HUB_PLANNING_PROJECTSADDRESS"), os.Getenv("OECS_HUB_AUTH_GATEWAY_SECRET")
	if address == "" || secret == "" {
		t.Skip("OECS_HUB_PLANNING_PROJECTSADDRESS / OECS_HUB_AUTH_GATEWAY_SECRET not set")
	}

	client, err := New(address, secret)
	if err != nil {
		t.Fatal(err)
	}
	defer func() { _ = client.Close() }()

	identity := uuid.New()
	ctx := auth.WithIdentity(context.Background(), &auth.Identity{ID: identity.String(), Email: "it@example.com", UserType: auth.UserTypeIndividual})

	p := &userchargers.Project{IdentityID: identity, Name: "Integration"}
	if err := client.CreateProject(ctx, p); err != nil {
		t.Fatal(err)
	}

	a, b := uuid.New(), uuid.New()
	note := "north"

	updated, err := client.ApplyChargerChanges(ctx, identity, p.ID, func([]userchargers.ProjectCharger) ([]userchargers.ProjectCharger, error) {
		return []userchargers.ProjectCharger{{ChargerVariantID: b}, {ChargerVariantID: a, Note: &note}}, nil
	})
	if err != nil || len(updated.Chargers) != 2 || updated.Chargers[0].ChargerVariantID != b || *updated.Chargers[1].Note != note {
		t.Fatalf("ApplyChargerChanges = %+v, %v", updated, err)
	}

	listed, total, err := client.ListProjects(ctx, identity, 10, 0)
	if err != nil || total != 1 || listed[0].ChargerCount != 2 {
		t.Fatalf("ListProjects = %+v, %d, %v", listed, total, err)
	}

	if err := client.DeleteProject(ctx, identity, p.ID); err != nil {
		t.Fatal(err)
	}

	if _, err := client.GetProject(ctx, identity, p.ID); !errors.Is(err, userchargers.ErrNotFound) {
		t.Fatalf("expected ErrNotFound after delete, got %v", err)
	}

	stranger := auth.WithIdentity(context.Background(), &auth.Identity{ID: uuid.NewString(), UserType: auth.UserTypeIndividual})
	if _, err := client.GetProject(stranger, uuid.Nil, updated.ID); !errors.Is(err, userchargers.ErrNotFound) {
		t.Fatalf("stranger: expected ErrNotFound, got %v", err)
	}
}
