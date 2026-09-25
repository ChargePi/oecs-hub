-- Runs once via the official postgres image's /docker-entrypoint-initdb.d
-- mechanism (first boot on an empty data volume only). Provisions the Kratos
-- and Keto databases/roles on the shared oecs-hub postgres instance so they
-- no longer need their own containers.

CREATE USER kratos WITH PASSWORD 'kratos';
CREATE DATABASE kratos OWNER kratos;

CREATE USER keto WITH PASSWORD 'keto';
CREATE DATABASE keto OWNER keto;

-- Chatwoot: extensions its schema enables are created here as superuser (the chatwoot
-- role can't create untrusted ones like vector/pg_stat_statements).
CREATE USER chatwoot WITH PASSWORD 'chatwoot';
CREATE DATABASE chatwoot OWNER chatwoot;
\connect chatwoot
CREATE EXTENSION IF NOT EXISTS vector;
CREATE EXTENSION IF NOT EXISTS pg_stat_statements;
CREATE EXTENSION IF NOT EXISTS pg_trgm;
CREATE EXTENSION IF NOT EXISTS pgcrypto;
