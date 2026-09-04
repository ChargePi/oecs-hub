package postgres

import (
	"context"
	"encoding/json"
	"errors"
	"fmt"
	"time"

	"github.com/ChargePi/oecs-hub/internal/charger"
	"github.com/google/uuid"
	"gorm.io/gorm"
	"gorm.io/gorm/clause"
)

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
func (r *ChargerRepository) UpsertRatings(ctx context.Context, variantID, raterIdentityID uuid.UUID, inputs []charger.RatingInput) (charger.RatingsSummary, error) {
	var summary charger.RatingsSummary

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
			return charger.ErrNotFound
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

		summary = make(charger.RatingsSummary, len(rows))
		for _, row := range rows {
			summary[row.CategoryName] = charger.CategoryScore{Average: row.Average, Count: row.Count}
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
		if errors.Is(err, charger.ErrNotFound) {
			return nil, charger.ErrNotFound
		}

		return nil, err
	}

	return summary, nil
}
