-- Create separate databases for each service
-- This ensures complete data isolation between services

CREATE DATABASE peerit_auth;
CREATE DATABASE peerit_users;
CREATE DATABASE peerit_teams;
CREATE DATABASE peerit_rubrics;
CREATE DATABASE peerit_reviews;
CREATE DATABASE peerit_reports;
CREATE DATABASE peerit_emails;

-- Create a read-only user for monitoring (optional)
CREATE USER peerit_readonly WITH PASSWORD 'readonly_password';

-- Grant connect permissions to each database
GRANT CONNECT ON DATABASE peerit_auth TO peerit_readonly;
GRANT CONNECT ON DATABASE peerit_users TO peerit_readonly;
GRANT CONNECT ON DATABASE peerit_teams TO peerit_readonly;
GRANT CONNECT ON DATABASE peerit_rubrics TO peerit_readonly;
GRANT CONNECT ON DATABASE peerit_reviews TO peerit_readonly;
GRANT CONNECT ON DATABASE peerit_reports TO peerit_readonly;
GRANT CONNECT ON DATABASE peerit_emails TO peerit_readonly;
