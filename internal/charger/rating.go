package charger

import (
	"errors"
	"fmt"
)

var (
	ErrInvalidCategory = errors.New("invalid rating category")
	ErrInvalidScore    = errors.New("rating score must be between 1 and 5")
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

// validateRatingInputs rejects unknown categories, out-of-range scores, and repeated
// categories within the same call - the latter would otherwise reach UpsertRatings' multi-
// row upsert as two rows sharing the same conflict target, which Postgres errors on.
func validateRatingInputs(inputs []RatingInput) error {
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
