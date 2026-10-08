package userchargers

import (
	"errors"
	"fmt"

	"github.com/ChargePi/oecs-hub/internal/charger"
)

var (
	ErrInvalidCategory = errors.New("invalid rating category")
	ErrInvalidScore    = errors.New("rating score must be between 1 and 5")
	ErrInvalidMinScore = errors.New("minimum rating must be between 1 and 5")
)

// ValidRatingCategories mirrors rating_categories, seeded by
// deployments/migrations/003_add_charger_ratings.sql. The category_name FK on
// charger_variant_ratings is the backstop against this drifting from the DB.
var ValidRatingCategories = map[string]bool{
	"reliability": true,
	"support":     true,
	"design":      true,
	"ease_of_use": true,
}

// RatingInput is one category's score submitted by a rater in a single SubmitRating call.
type RatingInput struct {
	CategoryName string
	Score        int
}

// ValidateRatingInputs rejects unknown categories, out-of-range scores, and repeated
// categories within the same call - the latter would otherwise reach UpsertRatings' multi-
// row upsert as two rows sharing the same conflict target, which Postgres errors on.
func ValidateRatingInputs(inputs []RatingInput) error {
	seen := make(map[string]bool, len(inputs))

	for _, in := range inputs {
		if !ValidRatingCategories[in.CategoryName] {
			return fmt.Errorf("%w: %q", ErrInvalidCategory, in.CategoryName)
		}

		if in.Score < 1 || in.Score > 5 {
			return fmt.Errorf("%w: got %d", ErrInvalidScore, in.Score)
		}

		if seen[in.CategoryName] {
			return fmt.Errorf("%w: duplicate category %q", ErrInvalidCategory, in.CategoryName)
		}

		seen[in.CategoryName] = true
	}

	return nil
}

func ValidateRatingFilters(filters []charger.RatingFilter) error {
	seen := make(map[string]struct{}, len(filters))

	for _, in := range filters {
		if !ValidRatingCategories[in.Category] {
			return fmt.Errorf("%w: %q", ErrInvalidCategory, in.Category)
		}

		if in.MinAverage < 1 || in.MinAverage > 5 {
			return fmt.Errorf("%w: got %g", ErrInvalidMinScore, in.MinAverage)
		}

		if _, ok := seen[in.Category]; ok {
			return fmt.Errorf("%w: duplicate category %q", ErrInvalidCategory, in.Category)
		}

		seen[in.Category] = struct{}{}
	}

	return nil
}
