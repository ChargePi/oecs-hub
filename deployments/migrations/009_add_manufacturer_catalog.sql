-- +goose Up
ALTER TABLE manufacturers
    ADD COLUMN charger_types   TEXT[] NOT NULL DEFAULT '{}',
    ADD COLUMN connector_types TEXT[] NOT NULL DEFAULT '{}',
    ADD COLUMN protocols       TEXT[] NOT NULL DEFAULT '{}',
    ADD COLUMN series          TEXT[] NOT NULL DEFAULT '{}';

UPDATE manufacturers SET
    charger_types = COALESCE((
        SELECT array_agg(DISTINCT cv.charger_type ORDER BY cv.charger_type)
        FROM charger_variants cv
        WHERE cv.manufacturer_id = manufacturers.id AND cv.status = 'verified' AND cv.charger_type <> ''
    ), '{}'),
    connector_types = COALESCE((
        SELECT array_agg(DISTINCT t ORDER BY t)
        FROM charger_variants cv, unnest(cv.connector_types) AS t
        WHERE cv.manufacturer_id = manufacturers.id AND cv.status = 'verified' AND t <> ''
    ), '{}'),
    protocols = COALESCE((
        SELECT array_agg(DISTINCT p ORDER BY p)
        FROM charger_variants cv, unnest(cv.protocols) AS p
        WHERE cv.manufacturer_id = manufacturers.id AND cv.status = 'verified' AND p <> ''
    ), '{}'),
    series = COALESCE((
        SELECT array_agg(DISTINCT s ORDER BY s)
        FROM charger_variants cv, LATERAL (SELECT COALESCE(NULLIF(cv.series, ''), cv.model_name)) AS named(s)
        WHERE cv.manufacturer_id = manufacturers.id AND cv.status = 'verified' AND s <> ''
    ), '{}');

-- +goose Down
ALTER TABLE manufacturers
    DROP COLUMN IF EXISTS charger_types,
    DROP COLUMN IF EXISTS connector_types,
    DROP COLUMN IF EXISTS protocols,
    DROP COLUMN IF EXISTS series;
