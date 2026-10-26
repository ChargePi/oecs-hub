-- +goose Up
CREATE TABLE IF NOT EXISTS user_onboarding (
    identity_id UUID        NOT NULL,
    status      TEXT        NOT NULL,
    answers     JSONB       NOT NULL DEFAULT '{}',
    created_at  TIMESTAMPTZ NOT NULL DEFAULT NOW(),
    updated_at  TIMESTAMPTZ NOT NULL DEFAULT NOW(),

    PRIMARY KEY (identity_id)
);

-- +goose Down
DROP TABLE IF EXISTS user_onboarding;
