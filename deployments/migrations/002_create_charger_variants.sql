-- +goose Up
CREATE TABLE IF NOT EXISTS charger_variants (
    id                   UUID           NOT NULL DEFAULT gen_random_uuid(),
    manufacturer_id      UUID           REFERENCES manufacturers (id),
    manufacturer_name    TEXT           NOT NULL,
    manufacturer_country TEXT,
    series               TEXT,
    model_name           TEXT           NOT NULL,
    part_number          TEXT,
    charger_type         TEXT           NOT NULL,
    model_status         TEXT,
    connector_types      TEXT[]         NOT NULL DEFAULT '{}',
    protocols            TEXT[]         NOT NULL DEFAULT '{}',
    min_power_watts      NUMERIC,
    max_power_watts      NUMERIC,
    product_image_url    TEXT,
    schema_version       TEXT           NOT NULL,
    spec                 JSONB          NOT NULL,
    status               TEXT           NOT NULL DEFAULT 'submitted',
    submitted_by         TEXT,
    submitted_at         TIMESTAMPTZ    NOT NULL DEFAULT NOW(),
    reviewed_at          TIMESTAMPTZ,
    created_at           TIMESTAMPTZ    NOT NULL DEFAULT NOW(),
    updated_at           TIMESTAMPTZ    NOT NULL DEFAULT NOW(),

    PRIMARY KEY (id)
);

CREATE INDEX IF NOT EXISTS idx_charger_variants_manufacturer_series ON charger_variants (manufacturer_id, series);
CREATE INDEX IF NOT EXISTS idx_charger_variants_status ON charger_variants (status);
CREATE INDEX IF NOT EXISTS idx_charger_variants_charger_type ON charger_variants (charger_type);
CREATE INDEX IF NOT EXISTS idx_charger_variants_connector_types ON charger_variants USING GIN (connector_types);
CREATE INDEX IF NOT EXISTS idx_charger_variants_protocols ON charger_variants USING GIN (protocols);
CREATE INDEX IF NOT EXISTS idx_charger_variants_spec ON charger_variants USING GIN (spec jsonb_path_ops);

-- +goose Down
DROP TABLE IF EXISTS charger_variants;
