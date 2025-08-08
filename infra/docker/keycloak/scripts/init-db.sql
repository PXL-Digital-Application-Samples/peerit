-- Initializes the peerit_auth DB

SELECT 'CREATE DATABASE peerit_auth'
WHERE NOT EXISTS (SELECT FROM pg_database WHERE datname = 'peerit_auth')\gexec

\c peerit_auth;

DO
$do$
BEGIN
   IF NOT EXISTS (
      SELECT FROM pg_catalog.pg_roles
      WHERE rolname = 'peerit_user') THEN

      CREATE ROLE peerit_user LOGIN PASSWORD 'securepass123';
   END IF;
END
$do$;

GRANT ALL PRIVILEGES ON DATABASE peerit_auth TO peerit_user;
GRANT ALL ON SCHEMA public TO peerit_user;

ALTER DEFAULT PRIVILEGES IN SCHEMA public GRANT ALL ON TABLES TO peerit_user;
ALTER DEFAULT PRIVILEGES IN SCHEMA public GRANT ALL ON SEQUENCES TO peerit_user;
ALTER DEFAULT PRIVILEGES IN SCHEMA public GRANT ALL ON FUNCTIONS TO peerit_user;

CREATE EXTENSION IF NOT EXISTS "uuid-ossp";

SET timezone = 'UTC';

\echo 'Peerit database initialized'
