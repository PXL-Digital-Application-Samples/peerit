# Keycloak Test Suite

Automated tests for Peerit Keycloak configuration using Newman (Postman CLI).

## Quick Start

```bash
# Install Newman
npm install -g newman

# Start Keycloak infrastructure
docker compose -f infra/docker/compose.yml up -d

# Run main test suite
npx newman run infra/docker/keycloak/test/peerit-keycloak-tests.json

# Run negative authorization tests
npx newman run infra/docker/keycloak/test/peerit-keycloak-negative-role-tests.json
```

## Test Collections

### Main Test Suite (`peerit-keycloak-tests.json`)
- **Authentication Tests**: Admin, teacher, student login
- **Admin API Tests**: Users, roles, clients access
- **Token Validation Tests**: UserInfo endpoint verification
- **Expected**: 19 assertions pass

### Negative Tests (`peerit-keycloak-negative-role-tests.json`)
- **Authorization Tests**: Teacher/student forbidden from admin endpoints
- **Standalone**: Includes login steps, runs independently
- **Expected**: 8 assertions pass (2 logins + 6 forbidden responses)

## Test Users

| Username | Password | Role |
|----------|----------|------|
| admin | Admin123 | admin |
| teacher1 | Teacher123 | teacher |
| student1 | Student123 | student |

## Expected Results

Both test suites should pass completely when Keycloak is properly configured with the Peerit realm imported.

For detailed information, see the main [Keycloak README](../README.md#testing).
