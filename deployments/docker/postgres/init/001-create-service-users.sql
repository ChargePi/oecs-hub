-- Runs once via the official postgres image's /docker-entrypoint-initdb.d
-- mechanism (first boot on an empty data volume only). Provisions the Kratos
-- and Keto databases/roles on the shared oecs-hub postgres instance so they
-- no longer need their own containers.

CREATE USER kratos WITH PASSWORD 'kratos';
CREATE DATABASE kratos OWNER kratos;

CREATE USER keto WITH PASSWORD 'keto';
CREATE DATABASE keto OWNER keto;
