-- +goose Up
CREATE TABLE IF NOT EXISTS rating_categories (
    id          UUID        NOT NULL DEFAULT gen_random_uuid(),
    name        TEXT        NOT NULL,
    description TEXT,
    created_at  TIMESTAMPTZ NOT NULL DEFAULT NOW(),
    updated_at  TIMESTAMPTZ NOT NULL DEFAULT NOW(),

    PRIMARY KEY (id),
    CONSTRAINT rating_categories_name_unique UNIQUE (name)
);

INSERT INTO rating_categories (name, description) VALUES
    ('reliability', 'How dependable the charger is in day-to-day use - uptime, consistent charging speed, and freedom from faults.'),
    ('support', 'Quality of the manufacturer''s customer support - responsiveness, warranty handling, and troubleshooting help.'),
    ('design', 'Build quality and physical design - durability, weatherproofing, cable management, and aesthetics.'),
    ('ease_of_use', 'How intuitive the charger is to operate - starting a session, app/display usability, and payment flow.');

ALTER TABLE charger_variants ADD COLUMN IF NOT EXISTS ratings JSONB NOT NULL DEFAULT '{}';

CREATE INDEX IF NOT EXISTS idx_charger_variants_ratings ON charger_variants USING GIN (ratings jsonb_path_ops);

-- +goose Down
DROP INDEX IF EXISTS idx_charger_variants_ratings;
ALTER TABLE charger_variants DROP COLUMN IF EXISTS ratings;
DROP TABLE IF EXISTS rating_categories;
