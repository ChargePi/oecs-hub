package planningclient

import (
	"testing"

	projectsv1 "github.com/ChargePi/oecs-hub/gen/proto/projects/v1"
	"github.com/ChargePi/oecs-hub/internal/userchargers"
	"github.com/google/uuid"
)

func TestDiff(t *testing.T) {
	a, b, c := uuid.New(), uuid.New(), uuid.New()
	note, other := "keep", "changed"

	current := []userchargers.ProjectCharger{{ChargerVariantID: a, Note: &note}, {ChargerVariantID: b}}
	next := []userchargers.ProjectCharger{{ChargerVariantID: c}, {ChargerVariantID: a, Note: &other}}

	changes := diff(current, next)

	got := map[string]projectsv1.ProjectChargerAction{}
	for _, ch := range changes {
		got[ch.GetChargerVariantId()] = ch.GetAction()
	}

	want := map[string]projectsv1.ProjectChargerAction{
		c.String(): projectsv1.ProjectChargerAction_PROJECT_CHARGER_ACTION_ADD,
		a.String(): projectsv1.ProjectChargerAction_PROJECT_CHARGER_ACTION_SET_NOTE,
		b.String(): projectsv1.ProjectChargerAction_PROJECT_CHARGER_ACTION_REMOVE,
	}

	if len(got) != len(want) {
		t.Fatalf("got %v, want %v", got, want)
	}

	for id, action := range want {
		if got[id] != action {
			t.Fatalf("%s: got %v, want %v", id, got[id], action)
		}
	}

	if len(diff(current, current)) != 0 {
		t.Fatal("an unchanged list must produce no changes")
	}
}
