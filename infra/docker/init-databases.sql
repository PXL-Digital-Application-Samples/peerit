-- Initialize separate databases for each service
-- This ensures complete data isolation while sharing PostgreSQL instance

-- Auth Service Database
CREATE DATABASE peerit_auth;
GRANT ALL PRIVILEGES ON DATABASE peerit_auth TO peerit;

-- User Service Database  
CREATE DATABASE peerit_users;
GRANT ALL PRIVILEGES ON DATABASE peerit_users TO peerit;

-- Team Service Database
CREATE DATABASE peerit_teams;
GRANT ALL PRIVILEGES ON DATABASE peerit_teams TO peerit;

-- Rubric Service Database
CREATE DATABASE peerit_rubrics;
GRANT ALL PRIVILEGES ON DATABASE peerit_rubrics TO peerit;

-- Review Service Database
CREATE DATABASE peerit_reviews;
GRANT ALL PRIVILEGES ON DATABASE peerit_reviews TO peerit;

-- Report Service Database
CREATE DATABASE peerit_reports;
GRANT ALL PRIVILEGES ON DATABASE peerit_reports TO peerit;

-- Email Service Database (for tracking email status, templates, etc.)
CREATE DATABASE peerit_email;
GRANT ALL PRIVILEGES ON DATABASE peerit_email TO peerit;

-- Orchestrator Database (for workflow state, saga patterns)
CREATE DATABASE peerit_orchestrator;
GRANT ALL PRIVILEGES ON DATABASE peerit_orchestrator TO peerit;
