-- +goose Up
ALTER TABLE manufacturers ADD COLUMN owner_identity_id UUID;

CREATE UNIQUE INDEX manufacturers_owner_identity_id_unique
    ON manufacturers (owner_identity_id)
    WHERE owner_identity_id IS NOT NULL;

ALTER TABLE charger_variants ADD COLUMN submitted_by_identity_id UUID;

CREATE INDEX idx_charger_variants_submitted_by_identity_id
    ON charger_variants (submitted_by_identity_id);

-- +goose Down
DROP INDEX IF EXISTS idx_charger_variants_submitted_by_identity_id;
ALTER TABLE charger_variants DROP COLUMN IF EXISTS submitted_by_identity_id;

DROP INDEX IF EXISTS manufacturers_owner_identity_id_unique;
ALTER TABLE manufacturers DROP COLUMN IF EXISTS owner_identity_id;
