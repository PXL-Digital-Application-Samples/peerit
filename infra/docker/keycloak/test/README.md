# Keycloak Test Suite

Automated tests for Peerit Keycloak configuration using Newman (Postman CLI).

## Quick Start

```bash
# Install Newman
npm install -g newman

# Start Keycloak test infrastructure
docker compose --env-file .env.compose.test -f compose.test.yml up -d

# Run test suite
newman run peerit-keycloak-tests.json

# Run negative test suite
newman run peerit-keycloak-negative-role-tests.json
