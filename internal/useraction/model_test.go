package useraction

import (
	"testing"

	"github.com/ChargePi/oecs-hub/internal/userchargers"
	"github.com/google/uuid"
)

type destructiveCase struct {
	action Action
	want   bool
}

func TestDestructive(t *testing.T) {
	tests := map[string]destructiveCase{
		"add favorite":    {Action{Favorite: &FavoritePayload{VariantID: uuid.New(), Favorited: true}}, false},
		"remove favorite": {Action{Favorite: &FavoritePayload{VariantID: uuid.New()}}, true},
		"create project":  {Action{Project: &ProjectPayload{NewProject: &NewProject{Name: "Depot"}}}, false},
		"add to project": {Action{Project: &ProjectPayload{Changes: []userchargers.ChargerChange{
			{ChargerVariantID: uuid.New(), Action: userchargers.ChargerChangeAdd},
		}}}, false},
		"remove from project": {Action{Project: &ProjectPayload{Changes: []userchargers.ChargerChange{
			{ChargerVariantID: uuid.New(), Action: userchargers.ChargerChangeAdd},
			{ChargerVariantID: uuid.New(), Action: userchargers.ChargerChangeRemove},
		}}}, true},
		"rating": {Action{Rating: &RatingPayload{VariantID: uuid.New()}}, false},
	}

	for name, tc := range tests {
		t.Run(name, func(t *testing.T) {
			if got := tc.action.Destructive(); got != tc.want {
				t.Fatalf("Destructive() = %v, want %v", got, tc.want)
			}
		})
	}
}
