# Keycloak Identity Provider

Production-ready identity and access management for the Peerit platform.

## Overview

Keycloak provides centralized authentication and authorization for all Peerit microservices, replacing the need for custom auth implementations in each service.

## Features

### Identity Management
- User registration and email verification
- Password policies and complexity requirements
- Account lockout and brute force protection
- User profile management and self-service

### Authentication Methods
- Username/password authentication
- Magic link passwordless login
- Social login (Google, GitHub, Microsoft)
- Multi-factor authentication (TOTP, email OTP)

### Authorization & Roles
- Role-based access control (RBAC)
- Fine-grained permissions
- Group membership management
- Resource-based authorization

### Integration
- OpenID Connect / OAuth 2.0 standards
- JWT token generation and validation
- Single Sign-On (SSO) across all services
- REST Admin API for user management

## Architecture

### Peerit Realm Structure
```
Realm: peerit
├── Roles
│   ├── admin      # Platform administrators
│   ├── teacher    # Course instructors  
│   └── student    # Course participants
├── Clients
│   ├── peerit-frontend    # Vue.js SPA
│   ├── peerit-api        # API Gateway
│   └── peerit-services   # Microservices
└── Users
    ├── Admin accounts
    ├── Teacher accounts
    └── Student accounts
```

### Token Flow
```
1. User → Frontend → Keycloak (login)
2. Keycloak → Frontend (JWT access token + refresh token)  
3. Frontend → API Gateway (Bearer token)
4. API Gateway → Services (validated token + user claims)
```

## Quick Start

### Development Setup

```bash
# Start Keycloak with development configuration
docker compose -f compose.keycloak.yml up -d

# Access Keycloak Admin Console
open http://localhost:8080/admin
# Login: admin / admin

# Access Peerit Realm
open http://localhost:8080/realms/peerit/account
```

### Automatic Realm Import

```bash
# Keycloak automatically imports realm on startup
# Configuration: ./realm-config/peerit-realm.json
# No manual scripts required - fully declarative
```

## Configuration

### Environment Variables

```env
# Keycloak Core
KEYCLOAK_ADMIN=admin
KEYCLOAK_ADMIN_PASSWORD=admin
KC_DB=postgres
KC_DB_URL=jdbc:postgresql://postgres:5432/keycloak
KC_DB_USERNAME=keycloak
KC_DB_PASSWORD=keycloak

# Peerit Integration  
KC_HOSTNAME=localhost
KC_HTTP_PORT=8080
KC_REALM_NAME=peerit

# Development Settings
KC_LOG_LEVEL=INFO
KC_IMPORT=/opt/keycloak/data/import/peerit-realm.json
```

### Realm Configuration

The Peerit realm includes:

- **3 predefined roles**: admin, teacher, student
- **3 client applications**: frontend, api-gateway, services
- **Development users**: admin, teacher1, student1-5
- **Password policies**: 8+ chars, complexity requirements
- **Session settings**: 30min timeout, remember-me support

### Client Configuration

**Frontend Client (peerit-frontend)**
- Type: Public (SPA)
- Redirect URIs: `http://localhost:3000/*`
- Web Origins: `http://localhost:3000`
- Implicit Flow: Enabled

**API Gateway Client (peerit-api)**
- Type: Confidential
- Service Account: Enabled
- Authorization: Enabled

**Services Client (peerit-services)**
- Type: Bearer-only
- Used for token validation

## Development Users

Pre-configured test accounts:

| Username | Password | Role | Email |
|----------|----------|------|-------|
| admin | admin123 | admin | admin@peerit.local |
| teacher1 | teacher123 | teacher | teacher1@peerit.local |
| student1 | student123 | student | student1@peerit.local |
| student2 | student123 | student | student2@peerit.local |
| student3 | student123 | student | student3@peerit.local |

## Service Integration

### Frontend Integration (Vue.js)

```javascript
// Install keycloak-js
npm install keycloak-js

// Initialize Keycloak
import Keycloak from 'keycloak-js';

const keycloak = new Keycloak({
  url: 'http://localhost:8080',
  realm: 'peerit',
  clientId: 'peerit-frontend'
});

await keycloak.init({ onLoad: 'login-required' });
```

### Service Integration (Node.js)

```javascript
// Install keycloak-connect
npm install keycloak-connect

// Middleware for token validation
const session = require('express-session');
const Keycloak = require('keycloak-connect');

const memoryStore = new session.MemoryStore();
const keycloak = new Keycloak({ store: memoryStore });

app.use(keycloak.middleware());
app.use('/api/protected', keycloak.protect('realm:user'));
```

### Manual Token Validation

```javascript
// JWT validation without keycloak-connect
const jwt = require('jsonwebtoken');
const jwksClient = require('jwks-rsa');

const client = jwksClient({
  jwksUri: 'http://localhost:8080/realms/peerit/protocol/openid-connect/certs'
});

function validateToken(token) {
  return jwt.verify(token, getKey, {
    audience: 'peerit-services',
    issuer: 'http://localhost:8080/realms/peerit'
  });
}
```

## Production Deployment

### Database Requirements

Keycloak requires PostgreSQL for production:

```sql
-- Create Keycloak database
CREATE DATABASE keycloak;
CREATE USER keycloak WITH PASSWORD 'secure-password';
GRANT ALL PRIVILEGES ON DATABASE keycloak TO keycloak;
```

### Production Configuration

```env
# Production environment variables
KC_DB=postgres
KC_DB_URL=jdbc:postgresql://postgres.example.com:5432/keycloak
KC_DB_USERNAME=keycloak
KC_DB_PASSWORD=secure-keycloak-password
KC_HOSTNAME=auth.peerit.example.com
KC_HOSTNAME_STRICT=true
KC_HTTP_ENABLED=false
KC_HTTPS_CERTIFICATE_FILE=/opt/keycloak/certs/tls.crt
KC_HTTPS_CERTIFICATE_KEY_FILE=/opt/keycloak/certs/tls.key
```

### Security Considerations

- **Use HTTPS only** in production
- **Secure admin credentials** (not admin/admin)
- **Database encryption** at rest
- **Regular security updates**
- **Audit logging** enabled
- **Rate limiting** on authentication endpoints

### High Availability

For production deployment:

- **Database clustering** with PostgreSQL
- **Keycloak clustering** with shared database
- **Load balancer** with session affinity
- **Redis session store** for distributed sessions

## Monitoring & Observability

### Health Endpoints

- Health Check: `http://localhost:8080/health`
- Metrics: `http://localhost:8080/metrics` 
- Ready Check: `http://localhost:8080/health/ready`

### Admin API

```bash
# Get admin access token
curl -X POST http://localhost:8080/realms/master/protocol/openid-connect/token \
  -d "grant_type=password" \
  -d "client_id=admin-cli" \
  -d "username=admin" \
  -d "password=admin"

# List users in peerit realm
curl -H "Authorization: Bearer $TOKEN" \
  http://localhost:8080/admin/realms/peerit/users
```

## Testing

### Automated Test Suite

The Keycloak configuration includes comprehensive automated tests to verify:

- Authentication and token generation
- Admin API access and permissions
- User role-based authorization
- Negative authorization (forbidden access)

### Running Tests

**Prerequisites:**

```bash
# Install Newman (Postman CLI runner)
npm install -g newman

# Ensure Keycloak is running
docker compose -f infra/docker/compose.yml up -d
```

**Main Test Suite:**

```bash
# Run all positive tests (authentication, admin API, token validation)
npx newman run infra/docker/keycloak/test/peerit-keycloak-tests.json

# Expected: 19 assertions pass
# - 5 authentication tests (admin, teacher, student logins)
# - 11 admin API tests (users, roles, clients access)
# - 3 token validation tests (userinfo endpoint)
```

**Negative Authorization Tests:**

```bash
# Run authorization tests (teacher/student forbidden from admin endpoints)
npx newman run infra/docker/keycloak/test/peerit-keycloak-negative-role-tests.json

# Expected: 8 assertions pass
# - 2 login tests (teacher, student authentication)
# - 6 forbidden tests (403 responses for admin endpoints)
```

**Run Both Test Suites:**

```bash
# Sequential execution of both test collections
npx newman run infra/docker/keycloak/test/peerit-keycloak-tests.json && \
npx newman run infra/docker/keycloak/test/peerit-keycloak-negative-role-tests.json
```

### Test Collections

- **`peerit-keycloak-tests.json`**: Main test suite with positive scenarios
- **`peerit-keycloak-negative-role-tests.json`**: Negative authorization tests

Both collections are standalone and can be run independently. The negative test collection includes its own login steps to work without dependencies.

### Test Coverage

| Test Category | Coverage |
|---------------|----------|
| Authentication | Admin, Teacher, Student login |
| Admin API | Users, Roles, Clients access |
| Token Validation | UserInfo endpoint for all roles |
| Authorization | Role-based access control |
| Negative Tests | Forbidden access scenarios |

## Troubleshooting

### Common Issues

#### Keycloak won't start

- Check PostgreSQL connectivity
- Verify database credentials
- Check port conflicts (8080)

#### Token validation fails

- Verify realm name and client configuration
- Check token expiration settings
- Validate JWKS endpoint accessibility

#### User authentication fails

- Check user credentials in Keycloak admin
- Verify client redirect URIs
- Check password policies

#### Tests failing

- Ensure Keycloak is fully started and healthy
- Verify realm import completed successfully
- Check test user credentials match realm configuration

### Logs and Debugging

```bash
# View Keycloak logs
docker compose -f compose.keycloak.yml logs keycloak -f

# Enable debug logging
export KC_LOG_LEVEL=DEBUG

# Database connection logs
export KC_LOG_DB_QUERIES=true
```

## Migration from Auth Service

### Migration Strategy

1. **Run in parallel**: Keep existing auth-service during migration
2. **Export users**: Extract user data from auth-service database
3. **Import to Keycloak**: Use Admin API or realm import
4. **Update services**: Replace auth-service calls with Keycloak
5. **Decommission**: Remove auth-service after successful migration

### User Data Migration

```javascript
// Export from auth-service
const users = await authService.getAllUsers();

// Transform for Keycloak import
const keycloakUsers = users.map(user => ({
  username: user.email,
  email: user.email,
  enabled: user.isActive,
  emailVerified: user.emailVerified,
  credentials: [{
    type: "password",
    hashedSaltedValue: user.passwordHash,
    algorithm: "bcrypt"
  }]
}));
```

## Support

- **Keycloak Documentation**: https://www.keycloak.org/documentation
- **Admin Guide**: https://www.keycloak.org/docs/latest/server_admin/
- **REST API**: https://www.keycloak.org/docs-api/latest/rest-api/
