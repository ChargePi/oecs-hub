// Package userchargers owns the three user-scoped views of the charger catalogue behind
// the "My chargers" page for individual accounts: favorites, projects, and the chargers
// the caller has rated. The catalogue itself stays in internal/charger - this package only
// holds per-identity collections and the rating write path.
package userchargers

import (
	"time"

	"github.com/google/uuid"
)

// Favorite is one entry in an identity's flat favorites list.
type Favorite struct {
	ChargerVariantID uuid.UUID
	CreatedAt        time.Time
}

// Project is a named shortlist of chargers owned by one identity. Chargers is ordered and
// stored as an embedded JSON document on the project row rather than in a join table, so a
// project is always loaded and saved whole.
type Project struct {
	ID          uuid.UUID
	IdentityID  uuid.UUID
	Name        string
	Description *string
	Chargers    []ProjectCharger
	CreatedAt   time.Time
	UpdatedAt   time.Time
}

// ProjectCharger is one charger's membership in a project. There is no FK behind
// ChargerVariantID - Service validates it against the catalogue before every write.
type ProjectCharger struct {
	ChargerVariantID uuid.UUID `json:"chargerVariantId"`
	Note             *string   `json:"note,omitempty"`
}

// ProjectAttributes are the fields UpdateProject may change. A nil field is left alone,
// which is how the caller clears a description (a non-nil pointer to "").
type ProjectAttributes struct {
	Name        *string
	Description *string
}

// ChargerChangeAction is one operation in a ManageChargers batch.
type ChargerChangeAction string

const (
	ChargerChangeAdd     ChargerChangeAction = "add"
	ChargerChangeRemove  ChargerChangeAction = "remove"
	ChargerChangeSetNote ChargerChangeAction = "set_note"
)

// ChargerChange is one membership edit. Note is used by ChargerChangeAdd and
// ChargerChangeSetNote and ignored by ChargerChangeRemove.
type ChargerChange struct {
	ChargerVariantID uuid.UUID
	Action           ChargerChangeAction
	Note             *string
}

// CategoryScore is one category's aggregated rating across all raters, as stored in
// charger.Charger.Ratings.
type CategoryScore struct {
	Average float64 `json:"average"`
	Count   int64   `json:"count"`
}

// RatingsSummary is the decoded shape of charger.Charger.Ratings - one CategoryScore per
// rating_categories.name.
type RatingsSummary map[string]CategoryScore

// MyRating is one charger the caller has rated, with their own per-category scores.
type MyRating struct {
	ChargerVariantID uuid.UUID
	Scores           []RatingInput
	// RatedAt is the most recent update across the caller's scores for this charger.
	RatedAt time.Time
}
