package userchargers

import (
	"errors"
	"testing"

	"github.com/ChargePi/oecs-hub/internal/charger"
)

func TestValidateRatingFilters(t *testing.T) {
	tests := []struct {
		name    string
		filters []charger.RatingFilter
		wantErr error
	}{
		{name: "valid", filters: []charger.RatingFilter{{Category: "reliability", MinAverage: 4}, {Category: "design", MinAverage: 1}}},
		{name: "unknown category", filters: []charger.RatingFilter{{Category: "price", MinAverage: 3}}, wantErr: ErrInvalidCategory},
		{name: "below range", filters: []charger.RatingFilter{{Category: "support", MinAverage: 0}}, wantErr: ErrInvalidMinScore},
		{name: "above range", filters: []charger.RatingFilter{{Category: "support", MinAverage: 5.5}}, wantErr: ErrInvalidMinScore},
		{name: "duplicate category", filters: []charger.RatingFilter{{Category: "support", MinAverage: 2}, {Category: "support", MinAverage: 3}}, wantErr: ErrInvalidCategory},
	}

	for _, tt := range tests {
		t.Run(tt.name, func(t *testing.T) {
			err := ValidateRatingFilters(tt.filters)
			if !errors.Is(err, tt.wantErr) {
				t.Fatalf("expected %v, got %v", tt.wantErr, err)
			}
		})
	}
}
