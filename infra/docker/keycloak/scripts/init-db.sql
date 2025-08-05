-- Keycloak database initialization script for Peerit platform
-- This script sets up the PostgreSQL database for Keycloak

-- Create Keycloak database if it doesn't exist
SELECT 'CREATE DATABASE keycloak'
WHERE NOT EXISTS (SELECT FROM pg_database WHERE datname = 'keycloak')\gexec

-- Connect to the keycloak database
\c keycloak;

-- Create keycloak user if it doesn't exist
DO
$do$
BEGIN
   IF NOT EXISTS (
      SELECT FROM pg_catalog.pg_roles
      WHERE  rolname = 'keycloak') THEN

      CREATE ROLE keycloak LOGIN PASSWORD 'keycloak';
   END IF;
END
$do$;

-- Grant necessary privileges
GRANT ALL PRIVILEGES ON DATABASE keycloak TO keycloak;
GRANT ALL ON SCHEMA public TO keycloak;

-- Set default privileges for future objects
ALTER DEFAULT PRIVILEGES IN SCHEMA public GRANT ALL ON TABLES TO keycloak;
ALTER DEFAULT PRIVILEGES IN SCHEMA public GRANT ALL ON SEQUENCES TO keycloak;
ALTER DEFAULT PRIVILEGES IN SCHEMA public GRANT ALL ON FUNCTIONS TO keycloak;

-- Create extension for UUID generation if needed
CREATE EXTENSION IF NOT EXISTS "uuid-ossp";

-- Set timezone
SET timezone = 'UTC';

-- Log the completion
\echo 'Keycloak database initialization completed successfully'
\echo 'Database: keycloak'
\echo 'User: keycloak'
\echo 'Schema: public'
\echo 'Timezone: UTC'
