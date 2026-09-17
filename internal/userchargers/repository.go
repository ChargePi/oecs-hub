package userchargers

import (
	"context"
	"errors"

	"github.com/google/uuid"
)

var (
	// ErrNotFound covers both "no such project" and "not yours" - the repository scopes
	// every project read and write by identity, so the two are indistinguishable by
	// design (same terseness as charger.Repository.UpdateSpec).
	ErrNotFound = errors.New("not found")
	// ErrVariantNotFound means a charger id in a request isn't a verified catalogue
	// entry. user_projects.chargers has no FK, so this check is load-bearing rather than
	// a convenience - see deployments/migrations/007_add_user_chargers.sql.
	ErrVariantNotFound = errors.New("charger variant not found")
	// ErrInvalidOrdering means ordered_charger_variant_ids wasn't a permutation of the
	// project's chargers once the batch had been applied.
	ErrInvalidOrdering = errors.New("ordering must be a permutation of the project's chargers")
	ErrInvalidProject  = errors.New("invalid project")
)

const (
	DefaultPageSize = 50
	MaxPageSize     = 200
	MaxProjectName  = 200
	// MaxProjectChargers bounds the embedded JSON document. Projects are shortlists, and
	// the whole array is rewritten on every edit.
	MaxProjectChargers = 500
)

type Repository interface {
	// SetFavorite adds or removes one favorite and reports the resulting state. Both
	// directions are idempotent. Returns ErrVariantNotFound if variantID isn't a verified
	// charger.
	SetFavorite(ctx context.Context, identityID, variantID uuid.UUID, favorited bool) (bool, error)
	// ListFavorites returns identityID's favorites newest-first, paginated.
	ListFavorites(ctx context.Context, identityID uuid.UUID, limit, offset uint32) ([]Favorite, int64, error)

	CreateProject(ctx context.Context, p *Project) error
	// GetProject returns id only if it belongs to identityID, ErrNotFound otherwise.
	GetProject(ctx context.Context, identityID, id uuid.UUID) (*Project, error)
	ListProjects(ctx context.Context, identityID uuid.UUID, limit, offset uint32) ([]*Project, int64, error)
	// UpdateProjectAttributes changes name/description only. Membership goes through
	// ApplyChargerChanges.
	UpdateProjectAttributes(ctx context.Context, identityID, id uuid.UUID, attrs ProjectAttributes) (*Project, error)
	DeleteProject(ctx context.Context, identityID, id uuid.UUID) error
	// ApplyChargerChanges locks the project row, hands its current charger list to apply,
	// and writes back whatever apply returns - the read-modify-write the embedded JSON
	// document needs. An error from apply aborts the transaction.
	ApplyChargerChanges(ctx context.Context, identityID, id uuid.UUID, apply func([]ProjectCharger) ([]ProjectCharger, error)) (*Project, error)

	// UpsertRatings records raterIdentityID's score for each input category against
	// variantID, overwriting any prior score of theirs in the same category, then returns
	// the recomputed aggregate across all raters. Returns ErrVariantNotFound if variantID
	// doesn't exist or isn't verified.
	UpsertRatings(ctx context.Context, variantID, raterIdentityID uuid.UUID, inputs []RatingInput) (RatingsSummary, error)
	// ListRatingsByRater returns the chargers raterIdentityID has rated, newest-first,
	// with their own per-category scores.
	ListRatingsByRater(ctx context.Context, raterIdentityID uuid.UUID, limit, offset uint32) ([]MyRating, int64, error)
}
