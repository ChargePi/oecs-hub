-- +goose Up
CREATE TABLE IF NOT EXISTS charger_variant_ratings (
    id                  UUID        NOT NULL DEFAULT gen_random_uuid(),
    charger_variant_id  UUID        NOT NULL REFERENCES charger_variants (id),
    category_name       TEXT        NOT NULL REFERENCES rating_categories (name),
    rater_identity_id   UUID        NOT NULL,
    score               SMALLINT    NOT NULL CHECK (score BETWEEN 1 AND 5),
    created_at          TIMESTAMPTZ NOT NULL DEFAULT NOW(),
    updated_at          TIMESTAMPTZ NOT NULL DEFAULT NOW(),

    PRIMARY KEY (id),
    CONSTRAINT charger_variant_ratings_unique_rater_category
        UNIQUE (charger_variant_id, rater_identity_id, category_name)
);

-- +goose Down
DROP TABLE IF EXISTS charger_variant_ratings;
