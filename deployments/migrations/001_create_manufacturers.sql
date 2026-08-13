-- +goose Up
CREATE EXTENSION IF NOT EXISTS pgcrypto;

CREATE TABLE IF NOT EXISTS manufacturers (
    id              UUID        NOT NULL DEFAULT gen_random_uuid(),
    name            TEXT        NOT NULL,
    country         TEXT,
    contact_name    TEXT,
    contact_email   TEXT,
    contact_phone   TEXT,
    contact_website TEXT,
    created_at      TIMESTAMPTZ NOT NULL DEFAULT NOW(),
    updated_at      TIMESTAMPTZ NOT NULL DEFAULT NOW(),

    PRIMARY KEY (id),
    CONSTRAINT manufacturers_name_country_unique
        UNIQUE NULLS NOT DISTINCT (name, country)
);

-- +goose Down
DROP TABLE IF EXISTS manufacturers;
