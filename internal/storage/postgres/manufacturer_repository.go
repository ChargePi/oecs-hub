package postgres

import (
	"context"
	"errors"
	"fmt"
	"time"

	"github.com/ChargePi/oecs-hub/internal/manufacturer"
	"github.com/google/uuid"
	"github.com/jackc/pgx/v5/pgconn"
	"gorm.io/gorm"
)

type ManufacturerRepository struct {
	db *gorm.DB
}

func NewManufacturerRepository(db *gorm.DB) *ManufacturerRepository {
	return &ManufacturerRepository{db: db}
}

func (r *ManufacturerRepository) Get(ctx context.Context, id uuid.UUID) (*manufacturer.Manufacturer, error) {
	var entity manufacturerEntity
	err := r.db.WithContext(ctx).First(&entity, "id = ?", id).Error
	if err != nil {
		if errors.Is(err, gorm.ErrRecordNotFound) {
			return nil, manufacturer.ErrNotFound
		}

		return nil, fmt.Errorf("get manufacturer: %w", err)
	}

	return manufacturerToDomain(&entity), nil
}

const uniqueViolation = "23505"

func isUniqueViolation(err error) bool {
	var pgErr *pgconn.PgError

	return errors.As(err, &pgErr) && pgErr.Code == uniqueViolation
}

func (r *ManufacturerRepository) Create(ctx context.Context, m *manufacturer.Manufacturer) error {
	entity := manufacturerToEntity(m)

	err := r.db.WithContext(ctx).Create(entity).Error
	switch {
	case isUniqueViolation(err):
		return manufacturer.ErrAlreadyExists
	case err != nil:
		return fmt.Errorf("create manufacturer: %w", err)
	}

	*m = *manufacturerToDomain(entity)

	return nil
}

// FindOrCreateForIdentity resolves (name, country) to a manufacturer row owned by
// ownerIdentityID. See manufacturer.Repository for the exact claim/conflict semantics.
// Runs in a transaction since it reads then conditionally writes.
func (r *ManufacturerRepository) FindOrCreateForIdentity(ctx context.Context, ownerIdentityID uuid.UUID, m *manufacturer.Manufacturer) error {
	return r.db.WithContext(ctx).Transaction(func(tx *gorm.DB) error {
		var owned manufacturerEntity

		err := tx.Where("owner_identity_id = ?", ownerIdentityID).First(&owned).Error
		switch {
		case err == nil:
			*m = *manufacturerToDomain(&owned)
			return nil
		case !errors.Is(err, gorm.ErrRecordNotFound):
			return fmt.Errorf("find manufacturer owned by identity: %w", err)
		}

		var existing manufacturerEntity

		err = tx.Where("name = ? AND country IS NOT DISTINCT FROM ?", m.Name, strPtrOrNil(m.Country)).
			First(&existing).Error
		switch {
		case err == nil:
			if existing.OwnerIdentityID != nil && *existing.OwnerIdentityID != ownerIdentityID {
				return manufacturer.ErrOwnershipConflict
			}

			if err := tx.Model(&existing).Update("owner_identity_id", ownerIdentityID).Error; err != nil {
				return fmt.Errorf("claim manufacturer: %w", err)
			}

			existing.OwnerIdentityID = &ownerIdentityID
			*m = *manufacturerToDomain(&existing)

			return nil
		case !errors.Is(err, gorm.ErrRecordNotFound):
			return fmt.Errorf("find manufacturer by name/country: %w", err)
		}

		entity := manufacturerToEntity(m)
		entity.OwnerIdentityID = &ownerIdentityID

		if err := tx.Create(entity).Error; err != nil {
			return fmt.Errorf("create manufacturer: %w", err)
		}

		*m = *manufacturerToDomain(entity)

		return nil
	})
}

// SetOwner links id to ownerIdentityID, replacing any current owner.
func (r *ManufacturerRepository) SetOwner(ctx context.Context, id, ownerIdentityID uuid.UUID) (*manufacturer.Manufacturer, error) {
	var entity manufacturerEntity

	err := r.db.WithContext(ctx).Transaction(func(tx *gorm.DB) error {
		err := tx.First(&entity, "id = ?", id).Error
		switch {
		case errors.Is(err, gorm.ErrRecordNotFound):
			return manufacturer.ErrNotFound
		case err != nil:
			return fmt.Errorf("get manufacturer: %w", err)
		}

		var owned int64

		err = tx.Model(&manufacturerEntity{}).
			Where("owner_identity_id = ? AND id <> ?", ownerIdentityID, id).
			Count(&owned).Error
		switch {
		case err != nil:
			return fmt.Errorf("count manufacturers owned by identity: %w", err)
		case owned > 0:
			return manufacturer.ErrOwnershipConflict
		}

		err = tx.Model(&entity).Update("owner_identity_id", ownerIdentityID).Error
		switch {
		case isUniqueViolation(err):
			return manufacturer.ErrOwnershipConflict
		case err != nil:
			return fmt.Errorf("update manufacturer owner: %w", err)
		}

		entity.OwnerIdentityID = &ownerIdentityID

		return nil
	})
	if err != nil {
		return nil, fmt.Errorf("set manufacturer owner: %w", err)
	}

	return manufacturerToDomain(&entity), nil
}

// manufacturerListRow is deliberately a flat struct (not an embedded manufacturerEntity)
// - gorm does not reliably scan into an embedded struct's promoted fields when the
// query is built from a different .Model() type than the destination slice's element
// type, as happens here (base is modeled on manufacturerEntity, scanned into this type).
type manufacturerListRow struct {
	ID              uuid.UUID
	OwnerIdentityID *uuid.UUID
	Name            string
	Country         *string
	ContactName     *string
	ContactEmail    *string
	ContactPhone    *string
	ContactWebsite  *string
	CreatedAt       time.Time
	UpdatedAt       time.Time
	ProductCount    int64
	VariantCount    int64
}

func (row *manufacturerListRow) entity() *manufacturerEntity {
	return &manufacturerEntity{
		ID:              row.ID,
		OwnerIdentityID: row.OwnerIdentityID,
		Name:            row.Name,
		Country:         row.Country,
		ContactName:     row.ContactName,
		ContactEmail:    row.ContactEmail,
		ContactPhone:    row.ContactPhone,
		ContactWebsite:  row.ContactWebsite,
		CreatedAt:       row.CreatedAt,
		UpdatedAt:       row.UpdatedAt,
	}
}

// List returns manufacturers matching query/country, paginated, with product/variant
// counts derived from their verified charger_variants.
func (r *ManufacturerRepository) List(ctx context.Context, query, country *string, limit, offset uint32) ([]*manufacturer.Summary, int64, error) {
	base := r.db.WithContext(ctx).Model(&manufacturerEntity{})
	if query != nil && *query != "" {
		base = base.Where("name ILIKE ?", "%"+*query+"%")
	}

	if country != nil && *country != "" {
		base = base.Where("country = ?", *country)
	}

	var total int64
	if err := base.Count(&total).Error; err != nil {
		return nil, 0, fmt.Errorf("count manufacturers: %w", err)
	}

	var rows []*manufacturerListRow

	err := base.Session(&gorm.Session{}).
		Select(`manufacturers.*,
			COALESCE(agg.product_count, 0) AS product_count,
			COALESCE(agg.variant_count, 0) AS variant_count`).
		Joins(`LEFT JOIN (
			SELECT manufacturer_id,
				COUNT(DISTINCT COALESCE(series, model_name)) AS product_count,
				COUNT(*) AS variant_count
			FROM charger_variants
			WHERE status = 'verified'
			GROUP BY manufacturer_id
		) agg ON agg.manufacturer_id = manufacturers.id`).
		Order("manufacturers.name ASC").
		Limit(int(limit)).
		Offset(int(offset)).
		Find(&rows).Error
	if err != nil {
		return nil, 0, fmt.Errorf("list manufacturers: %w", err)
	}

	summaries := make([]*manufacturer.Summary, len(rows))
	for i, row := range rows {
		summaries[i] = &manufacturer.Summary{
			Manufacturer: *manufacturerToDomain(row.entity()),
			ProductCount: row.ProductCount,
			VariantCount: row.VariantCount,
		}
	}

	return summaries, total, nil
}
