package postgres

import (
	"context"
	"errors"
	"fmt"

	"github.com/ChargePi/oecs-hub/internal/charger"
	"github.com/google/uuid"
	"github.com/lib/pq"
	"gorm.io/gorm"
)

type ChargerRepository struct {
	db *gorm.DB
}

func NewChargerRepository(db *gorm.DB) *ChargerRepository {
	return &ChargerRepository{db: db}
}

// Get retrieves a verified charger. Submitted/rejected records are only reachable
// through GetForReview.
func (r *ChargerRepository) Get(ctx context.Context, id uuid.UUID) (*charger.Charger, error) {
	var entity chargerVariantEntity

	err := r.db.WithContext(ctx).
		Where("id = ? AND status = ?", id, string(charger.StatusVerified)).
		First(&entity).Error
	if err != nil {
		if errors.Is(err, gorm.ErrRecordNotFound) {
			return nil, charger.ErrNotFound
		}

		return nil, fmt.Errorf("get charger: %w", err)
	}

	return chargerToDomain(&entity), nil
}

func (r *ChargerRepository) GetForReview(ctx context.Context, id uuid.UUID) (*charger.Charger, error) {
	var entity chargerVariantEntity
	err := r.db.WithContext(ctx).First(&entity, "id = ?", id).Error
	if err != nil {
		if errors.Is(err, gorm.ErrRecordNotFound) {
			return nil, charger.ErrNotFound
		}

		return nil, fmt.Errorf("get charger for review: %w", err)
	}

	return chargerToDomain(&entity), nil
}

func (r *ChargerRepository) Create(ctx context.Context, c *charger.Charger) error {
	entity := chargerToEntity(c)
	err := r.db.WithContext(ctx).Create(entity).Error
	if err != nil {
		return fmt.Errorf("create charger: %w", err)
	}

	*c = *chargerToDomain(entity)

	return nil
}

// List returns chargers matching filters, paginated.
func (r *ChargerRepository) List(ctx context.Context, filters charger.SearchFilters, limit, offset uint32) ([]*charger.Charger, int64, error) {
	query := r.applyFilters(r.db.WithContext(ctx).Model(&chargerVariantEntity{}), filters)

	return runSearch(query, limit, offset)
}

// SearchByFields returns chargers matching filters, paginated. Unlike List, it supports
// generic filtering over arbitrary OECS spec fields via filters.FieldFilters - see
// charger.FieldSearchFilters.
func (r *ChargerRepository) SearchByFields(ctx context.Context, filters charger.FieldSearchFilters, limit, offset uint32) ([]*charger.Charger, int64, error) {
	query, err := r.applyFieldSearchFilters(r.db.WithContext(ctx).Model(&chargerVariantEntity{}), filters)
	if err != nil {
		return nil, 0, err
	}

	return runSearch(query, limit, offset)
}

// runSearch counts and fetches the given query's matches, applying the shared List/
// SearchByFields ordering and page bounds.
func runSearch(query *gorm.DB, limit, offset uint32) ([]*charger.Charger, int64, error) {
	var total int64
	if err := query.Count(&total).Error; err != nil {
		return nil, 0, fmt.Errorf("count chargers: %w", err)
	}

	var entities []*chargerVariantEntity

	err := query.Order("manufacturer_name ASC, model_name ASC").
		Limit(int(limit)).
		Offset(int(offset)).
		Find(&entities).Error
	if err != nil {
		return nil, 0, fmt.Errorf("list chargers: %w", err)
	}

	return chargersToDomainSlice(entities), total, nil
}

func (r *ChargerRepository) applyFilters(query *gorm.DB, filters charger.SearchFilters) *gorm.DB {
	if filters.Query != nil && *filters.Query != "" {
		q := "%" + *filters.Query + "%"
		query = query.Where("(manufacturer_name ILIKE ? OR model_name ILIKE ? OR series ILIKE ?)", q, q, q)
	}

	if filters.ManufacturerID != nil {
		query = query.Where("manufacturer_id = ?", *filters.ManufacturerID)
	}

	if filters.ChargerType != nil && *filters.ChargerType != "" {
		query = query.Where("charger_type = ?", *filters.ChargerType)
	}

	if len(filters.ConnectorTypes) > 0 {
		query = query.Where("connector_types && ?", pq.StringArray(filters.ConnectorTypes))
	}

	if filters.MinPowerWatts != nil {
		query = query.Where("max_power_watts >= ?", *filters.MinPowerWatts)
	}

	if filters.MaxPowerWatts != nil {
		query = query.Where("min_power_watts <= ?", *filters.MaxPowerWatts)
	}

	if filters.Country != nil && *filters.Country != "" {
		query = query.Where("manufacturer_country = ?", *filters.Country)
	}

	if len(filters.Protocols) > 0 {
		query = query.Where("protocols && ?", pq.StringArray(filters.Protocols))
	}

	if len(filters.Statuses) > 0 {
		statuses := make([]string, len(filters.Statuses))
		for i, s := range filters.Statuses {
			statuses[i] = string(s)
		}

		query = query.Where("status IN ?", statuses)
	}

	return query
}

// applyFieldSearchFilters is the FieldSearchFilters counterpart to applyFilters, used by
// SearchByFields.
func (r *ChargerRepository) applyFieldSearchFilters(query *gorm.DB, filters charger.FieldSearchFilters) (*gorm.DB, error) {
	if filters.Query != nil && *filters.Query != "" {
		q := "%" + *filters.Query + "%"
		query = query.Where("(manufacturer_name ILIKE ? OR model_name ILIKE ? OR series ILIKE ?)", q, q, q)
	}

	if filters.ManufacturerID != nil {
		query = query.Where("manufacturer_id = ?", *filters.ManufacturerID)
	}

	if filters.ChargerType != nil && *filters.ChargerType != "" {
		query = query.Where("charger_type = ?", *filters.ChargerType)
	}

	if len(filters.Statuses) > 0 {
		statuses := make([]string, len(filters.Statuses))
		for i, s := range filters.Statuses {
			statuses[i] = string(s)
		}

		query = query.Where("status IN ?", statuses)
	}

	for _, f := range filters.FieldFilters {
		path, vars, err := fieldFilterPredicate(f)
		if err != nil {
			return nil, fmt.Errorf("field filter: %w", err)
		}

		query = query.Where("jsonb_path_exists(spec, ?::jsonpath, ?::jsonb)", path, string(vars))
	}

	return query, nil
}

// ListByIDs returns the verified chargers among ids.
func (r *ChargerRepository) ListByIDs(ctx context.Context, ids []uuid.UUID) ([]*charger.Charger, error) {
	if len(ids) == 0 {
		return nil, nil
	}

	var entities []*chargerVariantEntity

	err := r.db.WithContext(ctx).
		Where("id IN ? AND status = ?", ids, string(charger.StatusVerified)).
		Find(&entities).Error
	if err != nil {
		return nil, fmt.Errorf("list chargers by ids: %w", err)
	}

	return chargersToDomainSlice(entities), nil
}

// UpdateStatus applies an admin decision. When status is StatusVerified,
// manufacturerID must be non-nil and is linked to the record.
func (r *ChargerRepository) UpdateStatus(ctx context.Context, id uuid.UUID, status charger.Status, manufacturerID *uuid.UUID) (*charger.Charger, error) {
	updates := map[string]any{
		"status":      string(status),
		"reviewed_at": gorm.Expr("NOW()"),
	}
	if manufacturerID != nil {
		updates["manufacturer_id"] = *manufacturerID
	}

	result := r.db.WithContext(ctx).Model(&chargerVariantEntity{}).Where("id = ?", id).Updates(updates)
	if result.Error != nil {
		return nil, fmt.Errorf("update charger status: %w", result.Error)
	}

	if result.RowsAffected == 0 {
		return nil, charger.ErrNotFound
	}

	return r.GetForReview(ctx, id)
}
