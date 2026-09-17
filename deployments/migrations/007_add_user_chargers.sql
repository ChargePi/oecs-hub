-- +goose Up
CREATE TABLE IF NOT EXISTS user_favorite_chargers (
    id                 UUID        NOT NULL DEFAULT gen_random_uuid(),
    identity_id        UUID        NOT NULL,
    charger_variant_id UUID        NOT NULL REFERENCES charger_variants (id) ON DELETE CASCADE,
    created_at         TIMESTAMPTZ NOT NULL DEFAULT NOW(),

    PRIMARY KEY (id),
    CONSTRAINT user_favorite_chargers_identity_variant_unique
        UNIQUE (identity_id, charger_variant_id)
);

CREATE INDEX idx_user_favorite_chargers_identity
    ON user_favorite_chargers (identity_id, created_at DESC);

CREATE TABLE IF NOT EXISTS user_projects (
    id          UUID        NOT NULL DEFAULT gen_random_uuid(),
    identity_id UUID        NOT NULL,
    name        TEXT        NOT NULL,
    description TEXT,
    -- Ordered list of {"chargerVariantId": <uuid>, "note": <string|null>}. Embedded
    -- rather than given a join table: it is always read and written as a whole, order is
    -- part of the value, and nothing queries "which projects contain charger X". Same
    -- denormalisation call as charger_variants.ratings (migration 003).
    --
    -- The trade-off is that there is no FK backstop on chargerVariantId, so
    -- internal/userchargers must validate the ids against the catalogue before writing.
    -- Tolerable because charger_variants are never hard-deleted - they move through
    -- status instead.
    chargers    JSONB       NOT NULL DEFAULT '[]',
    created_at  TIMESTAMPTZ NOT NULL DEFAULT NOW(),
    updated_at  TIMESTAMPTZ NOT NULL DEFAULT NOW(),

    PRIMARY KEY (id)
);

CREATE INDEX idx_user_projects_identity
    ON user_projects (identity_id, created_at DESC);

-- Keeps "which of my projects already contain this charger?" cheap for the product page.
CREATE INDEX idx_user_projects_chargers
    ON user_projects USING GIN (chargers jsonb_path_ops);

-- +goose Down
DROP INDEX IF EXISTS idx_user_projects_chargers;
DROP INDEX IF EXISTS idx_user_projects_identity;
DROP TABLE IF EXISTS user_projects;

DROP INDEX IF EXISTS idx_user_favorite_chargers_identity;
DROP TABLE IF EXISTS user_favorite_chargers;
