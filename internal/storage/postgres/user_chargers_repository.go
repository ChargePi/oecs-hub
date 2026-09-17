package postgres

import (
	"context"
	"encoding/json"
	"errors"
	"fmt"
	"time"

	"github.com/ChargePi/oecs-hub/internal/charger"
	"github.com/ChargePi/oecs-hub/internal/userchargers"
	"github.com/google/uuid"
	"gorm.io/gorm"
	"gorm.io/gorm/clause"
)

// UserChargersRepository backs internal/userchargers. It shares the *gorm.DB with
// ChargerRepository because the rating write path has to update charger_variants.ratings
// in the same transaction as the ratings themselves - see UpsertRatings.
type UserChargersRepository struct {
	db *gorm.DB
}

func NewUserChargersRepository(db *gorm.DB) *UserChargersRepository {
	return &UserChargersRepository{db: db}
}

// SetFavorite adds or removes one favorite. Adding uses ON CONFLICT DO NOTHING and
// removing a missing row is a no-op, so both directions are idempotent.
func (r *UserChargersRepository) SetFavorite(ctx context.Context, identityID, variantID uuid.UUID, favorited bool) (bool, error) {
	db := r.db.WithContext(ctx)

	if !favorited {
		err := db.Where("identity_id = ? AND charger_variant_id = ?", identityID, variantID).
			Delete(&userFavoriteChargerEntity{}).Error
		if err != nil {
			return false, fmt.Errorf("delete favorite: %w", err)
		}

		return false, nil
	}

	var verified bool

	// The FK only guarantees the variant exists, not that it is verified - an
	// unverified/rejected submission isn't something a user can favorite.
	err := db.Raw(`SELECT status = ? FROM charger_variants WHERE id = ?`, string(charger.StatusVerified), variantID).
		Scan(&verified).Error
	if err != nil {
		return false, fmt.Errorf("check charger variant: %w", err)
	}

	if !verified {
		return false, userchargers.ErrVariantNotFound
	}

	entity := userFavoriteChargerEntity{IdentityID: identityID, ChargerVariantID: variantID}

	err = db.Clauses(clause.OnConflict{DoNothing: true}).Create(&entity).Error
	if err != nil {
		return false, fmt.Errorf("create favorite: %w", err)
	}

	return true, nil
}

func (r *UserChargersRepository) ListFavorites(ctx context.Context, identityID uuid.UUID, limit, offset uint32) ([]userchargers.Favorite, int64, error) {
	db := r.db.WithContext(ctx).Model(&userFavoriteChargerEntity{}).Where("identity_id = ?", identityID)

	var total int64
	if err := db.Count(&total).Error; err != nil {
		return nil, 0, fmt.Errorf("count favorites: %w", err)
	}

	var entities []userFavoriteChargerEntity

	err := db.Order("created_at DESC").Limit(int(limit)).Offset(int(offset)).Find(&entities).Error
	if err != nil {
		return nil, 0, fmt.Errorf("list favorites: %w", err)
	}

	favorites := make([]userchargers.Favorite, len(entities))
	for i, entity := range entities {
		favorites[i] = userchargers.Favorite{ChargerVariantID: entity.ChargerVariantID, CreatedAt: entity.CreatedAt}
	}

	return favorites, total, nil
}

func (r *UserChargersRepository) CreateProject(ctx context.Context, p *userchargers.Project) error {
	entity, err := userProjectToEntity(p)
	if err != nil {
		return err
	}

	if err := r.db.WithContext(ctx).Create(entity).Error; err != nil {
		return fmt.Errorf("create project: %w", err)
	}

	created, err := userProjectToDomain(entity)
	if err != nil {
		return err
	}

	*p = *created

	return nil
}

func (r *UserChargersRepository) GetProject(ctx context.Context, identityID, id uuid.UUID) (*userchargers.Project, error) {
	var entity userProjectEntity

	err := r.db.WithContext(ctx).Where("id = ? AND identity_id = ?", id, identityID).First(&entity).Error
	if err != nil {
		if errors.Is(err, gorm.ErrRecordNotFound) {
			return nil, userchargers.ErrNotFound
		}

		return nil, fmt.Errorf("get project: %w", err)
	}

	return userProjectToDomain(&entity)
}

func (r *UserChargersRepository) ListProjects(ctx context.Context, identityID uuid.UUID, limit, offset uint32) ([]*userchargers.Project, int64, error) {
	db := r.db.WithContext(ctx).Model(&userProjectEntity{}).Where("identity_id = ?", identityID)

	var total int64
	if err := db.Count(&total).Error; err != nil {
		return nil, 0, fmt.Errorf("count projects: %w", err)
	}

	var entities []userProjectEntity

	err := db.Order("created_at DESC").Limit(int(limit)).Offset(int(offset)).Find(&entities).Error
	if err != nil {
		return nil, 0, fmt.Errorf("list projects: %w", err)
	}

	projects := make([]*userchargers.Project, len(entities))

	for i := range entities {
		project, err := userProjectToDomain(&entities[i])
		if err != nil {
			return nil, 0, err
		}

		projects[i] = project
	}

	return projects, total, nil
}

// UpdateProjectAttributes writes only the attributes the caller set. A non-nil, blank
// Description clears the column - see userchargers.Service.UpdateProject.
func (r *UserChargersRepository) UpdateProjectAttributes(ctx context.Context, identityID, id uuid.UUID, attrs userchargers.ProjectAttributes) (*userchargers.Project, error) {
	updates := map[string]any{"updated_at": time.Now()}

	if attrs.Name != nil {
		updates["name"] = *attrs.Name
	}

	if attrs.Description != nil {
		updates["description"] = strPtrOrNil(*attrs.Description)
	}

	result := r.db.WithContext(ctx).Model(&userProjectEntity{}).
		Where("id = ? AND identity_id = ?", id, identityID).
		Updates(updates)
	if result.Error != nil {
		return nil, fmt.Errorf("update project: %w", result.Error)
	}

	if result.RowsAffected == 0 {
		return nil, userchargers.ErrNotFound
	}

	return r.GetProject(ctx, identityID, id)
}

func (r *UserChargersRepository) DeleteProject(ctx context.Context, identityID, id uuid.UUID) error {
	result := r.db.WithContext(ctx).
		Where("id = ? AND identity_id = ?", id, identityID).
		Delete(&userProjectEntity{})
	if result.Error != nil {
		return fmt.Errorf("delete project: %w", result.Error)
	}

	if result.RowsAffected == 0 {
		return userchargers.ErrNotFound
	}

	return nil
}

// ApplyChargerChanges is the read-modify-write the embedded membership document needs. The
// `SELECT ... FOR UPDATE` serializes concurrent edits to the same project, so two batches
// can't each overwrite the other's whole array.
func (r *UserChargersRepository) ApplyChargerChanges(ctx context.Context, identityID, id uuid.UUID, apply func([]userchargers.ProjectCharger) ([]userchargers.ProjectCharger, error)) (*userchargers.Project, error) {
	var project *userchargers.Project

	err := r.db.WithContext(ctx).Transaction(func(tx *gorm.DB) error {
		var entity userProjectEntity

		err := tx.Clauses(clause.Locking{Strength: "UPDATE"}).
			Where("id = ? AND identity_id = ?", id, identityID).
			First(&entity).Error
		if err != nil {
			if errors.Is(err, gorm.ErrRecordNotFound) {
				return userchargers.ErrNotFound
			}

			return fmt.Errorf("lock project: %w", err)
		}

		current, err := unmarshalProjectChargers(entity.Chargers)
		if err != nil {
			return err
		}

		next, err := apply(current)
		if err != nil {
			return err
		}

		raw, err := marshalProjectChargers(next)
		if err != nil {
			return err
		}

		err = tx.Model(&userProjectEntity{}).Where("id = ?", id).
			Updates(map[string]any{"chargers": raw, "updated_at": time.Now()}).Error
		if err != nil {
			return fmt.Errorf("update project chargers: %w", err)
		}

		entity.Chargers = raw

		project, err = userProjectToDomain(&entity)

		return err
	})
	if err != nil {
		return nil, err
	}

	return project, nil
}

type chargerVariantRatingEntity struct {
	ID               uuid.UUID `gorm:"column:id;type:uuid;primaryKey;default:gen_random_uuid()"`
	ChargerVariantID uuid.UUID `gorm:"column:charger_variant_id;not null"`
	CategoryName     string    `gorm:"column:category_name;not null"`
	RaterIdentityID  uuid.UUID `gorm:"column:rater_identity_id;not null"`
	Score            int       `gorm:"column:score;not null"`
	CreatedAt        time.Time `gorm:"column:created_at;autoCreateTime"`
	UpdatedAt        time.Time `gorm:"column:updated_at;autoUpdateTime"`
}

func (chargerVariantRatingEntity) TableName() string {
	return "charger_variant_ratings"
}

type categoryAggregateRow struct {
	CategoryName string
	Average      float64
	Count        int64
}

// UpsertRatings records raterIdentityID's score for each input category against
// variantID, then recomputes and stores the aggregate across all raters. Runs in a
// transaction: the initial `SELECT ... FOR UPDATE` both checks variantID exists/is
// verified and serializes concurrent raters on the same variant, so the recompute below
// never races another rater's write.
func (r *UserChargersRepository) UpsertRatings(ctx context.Context, variantID, raterIdentityID uuid.UUID, inputs []userchargers.RatingInput) (userchargers.RatingsSummary, error) {
	var summary userchargers.RatingsSummary

	err := r.db.WithContext(ctx).Transaction(func(tx *gorm.DB) error {
		var status string

		// Scan (unlike First/Take) never returns gorm.ErrRecordNotFound on a miss - it
		// just leaves status at its zero value - so absence is detected via RowsAffected.
		result := tx.Raw(`SELECT status FROM charger_variants WHERE id = ? FOR UPDATE`, variantID).
			Scan(&status)
		if result.Error != nil {
			return fmt.Errorf("lock charger variant: %w", result.Error)
		}

		if result.RowsAffected == 0 || status != string(charger.StatusVerified) {
			return userchargers.ErrVariantNotFound
		}

		entities := make([]chargerVariantRatingEntity, len(inputs))
		for i, in := range inputs {
			entities[i] = chargerVariantRatingEntity{
				ChargerVariantID: variantID,
				CategoryName:     in.CategoryName,
				RaterIdentityID:  raterIdentityID,
				Score:            in.Score,
			}
		}

		err := tx.Clauses(clause.OnConflict{
			Columns:   []clause.Column{{Name: "charger_variant_id"}, {Name: "rater_identity_id"}, {Name: "category_name"}},
			DoUpdates: clause.AssignmentColumns([]string{"score", "updated_at"}),
		}).Create(&entities).Error
		if err != nil {
			return fmt.Errorf("upsert ratings: %w", err)
		}

		var rows []categoryAggregateRow

		err = tx.Raw(`
			SELECT category_name, AVG(score) AS average, COUNT(*) AS count
			FROM charger_variant_ratings
			WHERE charger_variant_id = ?
			GROUP BY category_name
		`, variantID).Scan(&rows).Error
		if err != nil {
			return fmt.Errorf("aggregate ratings: %w", err)
		}

		summary = make(userchargers.RatingsSummary, len(rows))
		for _, row := range rows {
			summary[row.CategoryName] = userchargers.CategoryScore{Average: row.Average, Count: row.Count}
		}

		raw, err := json.Marshal(summary)
		if err != nil {
			return fmt.Errorf("marshal ratings summary: %w", err)
		}

		err = tx.Model(&chargerVariantEntity{}).Where("id = ?", variantID).Update("ratings", raw).Error
		if err != nil {
			return fmt.Errorf("update charger ratings: %w", err)
		}

		return nil
	})
	if err != nil {
		if errors.Is(err, userchargers.ErrVariantNotFound) {
			return nil, userchargers.ErrVariantNotFound
		}

		return nil, err
	}

	return summary, nil
}

type raterRatingRow struct {
	ChargerVariantID uuid.UUID
	CategoryName     string
	Score            int
	UpdatedAt        time.Time
}

// ListRatingsByRater groups the rater's per-category rows back into one entry per charger.
// The page is taken over distinct chargers (not rows), so a charger rated in four
// categories still counts once.
func (r *UserChargersRepository) ListRatingsByRater(ctx context.Context, raterIdentityID uuid.UUID, limit, offset uint32) ([]userchargers.MyRating, int64, error) {
	db := r.db.WithContext(ctx)

	var total int64

	err := db.Raw(`
		SELECT COUNT(DISTINCT charger_variant_id)
		FROM charger_variant_ratings
		WHERE rater_identity_id = ?
	`, raterIdentityID).Scan(&total).Error
	if err != nil {
		return nil, 0, fmt.Errorf("count rated chargers: %w", err)
	}

	var rows []raterRatingRow

	err = db.Raw(`
		SELECT r.charger_variant_id, r.category_name, r.score, r.updated_at
		FROM charger_variant_ratings r
		JOIN (
			SELECT charger_variant_id, MAX(updated_at) AS rated_at
			FROM charger_variant_ratings
			WHERE rater_identity_id = ?
			GROUP BY charger_variant_id
			ORDER BY rated_at DESC
			LIMIT ? OFFSET ?
		) page ON page.charger_variant_id = r.charger_variant_id
		WHERE r.rater_identity_id = ?
		ORDER BY page.rated_at DESC, r.category_name
	`, raterIdentityID, limit, offset, raterIdentityID).Scan(&rows).Error
	if err != nil {
		return nil, 0, fmt.Errorf("list rated chargers: %w", err)
	}

	var (
		ratings []userchargers.MyRating
		index   = make(map[uuid.UUID]int, len(rows))
	)

	for _, row := range rows {
		at, ok := index[row.ChargerVariantID]
		if !ok {
			index[row.ChargerVariantID] = len(ratings)
			at = len(ratings)

			ratings = append(ratings, userchargers.MyRating{ChargerVariantID: row.ChargerVariantID})
		}

		ratings[at].Scores = append(ratings[at].Scores,
			userchargers.RatingInput{CategoryName: row.CategoryName, Score: row.Score})

		if row.UpdatedAt.After(ratings[at].RatedAt) {
			ratings[at].RatedAt = row.UpdatedAt
		}
	}

	return ratings, total, nil
}
