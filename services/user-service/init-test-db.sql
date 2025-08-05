-- Initialize test database for user-service integration tests
-- Grant necessary permissions for Keycloak to create schemas and tables

-- Grant schema creation privileges to testuser
ALTER USER testuser CREATEDB;
ALTER USER testuser CREATEROLE;

-- Create keycloak schema if needed (Keycloak will handle this, but ensure permissions)
-- GRANT ALL PRIVILEGES ON DATABASE peerit_test TO testuser;

-- Ensure testuser can create schemas
GRANT CREATE ON DATABASE peerit_test TO testuser;

-- For Keycloak to work properly, testuser needs these privileges
ALTER USER testuser WITH SUPERUSER;
