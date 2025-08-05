# Keycloak Identity Provider

Centralized authentication and authorization for Peerit microservices using OpenID Connect/OAuth 2.0.

## Setup

```bash
# Start infrastructure (includes Keycloak)
docker compose -f infra/docker/compose.yml up -d

# Access admin console
http://localhost:8080/admin (admin / Admin123)

# Access Peerit realm  
http://localhost:8080/realms/peerit/account
```

## Configuration

Keycloak automatically imports the Peerit realm configuration on startup from `./realm-config/peerit-realm.json`.

### Realm Contents
- Roles: admin, teacher, student
- Test users: admin, teacher1, student1-3
- Client apps: peerit-frontend, peerit-api, peerit-services

### Test Users

| Username | Password | Role | Email |
|----------|----------|------|-------|
| admin | Admin123 | admin | admin@peerit.local |
| teacher1 | Teacher123 | teacher | teacher1@peerit.local |
| student1 | Student123 | student | student1@peerit.local |
| student2 | Student123 | student | student2@peerit.local |
| student3 | Student123 | student | student3@peerit.local |

## Testing

### Running Tests

Install Newman (Postman CLI runner):

```bash
npm install -g newman
```

Ensure Keycloak is running:

```bash
docker compose -f infra/docker/compose.yml up -d
```

Run main test suite (19 assertions):

```bash
npx newman run infra/docker/keycloak/test/peerit-keycloak-tests.json
```

Run negative authorization tests (8 assertions):

```bash
npx newman run infra/docker/keycloak/test/peerit-keycloak-negative-role-tests.json
```

Run both test suites:

```bash
npx newman run infra/docker/keycloak/test/peerit-keycloak-tests.json && \
npx newman run infra/docker/keycloak/test/peerit-keycloak-negative-role-tests.json
```

### Test Coverage

- Authentication: Admin, teacher, student login
- Admin API: Users, roles, clients access  
- Token validation: UserInfo endpoint for all roles
- Authorization: Role-based access control
- Negative tests: Forbidden access scenarios

## API Reference

### OpenID Connect Endpoints (Contract)

```bash
# Token endpoint
POST http://localhost:8080/realms/peerit/protocol/openid-connect/token
Content-Type: application/x-www-form-urlencoded
grant_type=password&client_id=peerit-api&client_secret=peerit-api-secret-dev-only&username=admin&password=Admin123

# Logout endpoint
POST http://localhost:8080/realms/peerit/protocol/openid-connect/logout
Content-Type: application/x-www-form-urlencoded
client_id=peerit-api&client_secret=peerit-api-secret-dev-only&refresh_token={refresh_token}
```

### Admin REST API

```bash
# Get admin token first
POST http://localhost:8080/realms/master/protocol/openid-connect/token
Content-Type: application/x-www-form-urlencoded
grant_type=password&client_id=admin-cli&username=admin&password=Admin123

# Then use token for admin operations
GET http://localhost:8080/admin/realms/peerit/users
Authorization: Bearer {admin_token}

GET http://localhost:8080/admin/realms/peerit/roles  
Authorization: Bearer {admin_token}

GET http://localhost:8080/admin/realms/peerit/clients
Authorization: Bearer {admin_token}
```

### API Documentation

- **Newman Tests**: Use the test collections as practical API examples
- **Admin Console**: Access API documentation through the Keycloak admin interface

## Troubleshooting

Common issues:

- Keycloak won't start: Check PostgreSQL connectivity and port conflicts
- Token validation fails: Verify realm name and client configuration  
- User authentication fails: Check credentials in Keycloak admin console
- Tests failing: Ensure Keycloak is fully started and realm imported

View logs:

```bash
docker compose -f infra/docker/compose.yml logs keycloak -f
```
