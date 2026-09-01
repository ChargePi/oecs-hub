-- +goose Up
ALTER TABLE charger_variants ADD COLUMN submitted_by_email TEXT;

-- +goose Down
ALTER TABLE charger_variants DROP COLUMN IF EXISTS submitted_by_email;
