# Authentication Service

The auth-service provides secure authentication and session management for the Peerit peer evaluation platform.

## Overview

Handles user authentication via email/password and magic links, manages JWT tokens, and provides session management for all other services in the system.

## Core Features

- **Email/Password Login**: Secure bcrypt/argon2 password hashing
- **Magic Link Authentication**: Time-limited, single-use email links for anonymous reviews
- **JWT Token Management**: Short-lived access tokens + refresh tokens
- **Session Management**: Redis-based session storage with TTL
- **Security Controls**: Rate limiting, CSRF protection, secure headers
- **Password Reset**: Secure password reset flow via email
- **Account Status**: Account activation, deactivation, lockout

## API Endpoints

### Authentication

```http
POST /auth/login              # Email/password authentication
POST /auth/magic-link         # Request magic link via email
GET  /auth/magic/:token       # Validate magic link token
POST /auth/refresh            # Refresh access token
POST /auth/logout             # Invalidate session
```

### Password Management

```http
POST /auth/reset-password     # Request password reset
PUT  /auth/reset-password     # Complete password reset
```

### Service Integration

```http
GET  /auth/validate           # Validate JWT token (internal)
GET  /auth/health             # Health check
```

## Data Models

### User Credentials

```sql
CREATE TABLE user_credentials (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    email VARCHAR(255) UNIQUE NOT NULL,
    password_hash VARCHAR(255) NOT NULL,
    is_active BOOLEAN DEFAULT true,
    failed_login_attempts INTEGER DEFAULT 0,
    locked_until TIMESTAMP NULL,
    created_at TIMESTAMP DEFAULT NOW(),
    updated_at TIMESTAMP DEFAULT NOW()
);
```

### Magic Link Tokens

```sql
CREATE TABLE magic_link_tokens (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    token VARCHAR(255) UNIQUE NOT NULL,
    user_id UUID NOT NULL,
    expires_at TIMESTAMP NOT NULL,
    used BOOLEAN DEFAULT false,
    used_at TIMESTAMP NULL,
    created_at TIMESTAMP DEFAULT NOW()
);
```

### Refresh Tokens

```sql
CREATE TABLE refresh_tokens (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    token VARCHAR(255) UNIQUE NOT NULL,
    user_id UUID NOT NULL,
    expires_at TIMESTAMP NOT NULL,
    revoked BOOLEAN DEFAULT false,
    revoked_at TIMESTAMP NULL,
    created_at TIMESTAMP DEFAULT NOW()
);
```

### Session Data (Redis)

```json
{
  "session_id": {
    "user_id": "uuid",
    "email": "user@example.com",
    "role": "student|admin",
    "expires_at": "timestamp",
    "last_activity": "timestamp"
  }
}
```

## Security Requirements

- **Password Hashing**: bcrypt (cost 12) or argon2
- **JWT Signing**: RS256 with rotating keys
- **Rate Limiting**: 5 login attempts per minute per IP
- **Magic Links**: 15-minute expiry, single-use
- **Session TTL**: 8 hours (configurable)
- **HTTPS Only**: All endpoints require HTTPS in production
- **Account Lockout**: 5 failed attempts locks account for 15 minutes

## Dependencies

### Database

- **PostgreSQL**: `peerit_auth` database for persistent storage
- **Redis**: DB 0 for session management and caching

### External Services

- **Email Service**: For sending magic links and password reset emails
- **Orchestrator**: Coordinates magic link generation workflows

## Environment Variables

```bash
# Database
DATABASE_URL=postgresql://peerit:password@postgres:5432/peerit_auth
REDIS_URL=redis://redis:6379/0

# JWT Configuration
JWT_SECRET_KEY=your-secret-key
JWT_ACCESS_EXPIRES_IN=15m
JWT_REFRESH_EXPIRES_IN=7d

# Security
BCRYPT_COST=12
RATE_LIMIT_MAX=5
RATE_LIMIT_WINDOW_MS=60000
ACCOUNT_LOCKOUT_ATTEMPTS=5
ACCOUNT_LOCKOUT_DURATION_MS=900000

# Magic Links
MAGIC_LINK_EXPIRES_IN=15m
MAGIC_LINK_BASE_URL=https://peerit.example.com

# Server
PORT=3020
NODE_ENV=development
```

## Development

### Setup

```bash
# Start infrastructure
docker compose up postgres redis -d

# Install dependencies
npm install

# Run database migrations
npm run db:migrate

# Start development server
npm run dev
```

### Testing

```bash
# Run all tests
npm test

# Run tests in watch mode
npm run test:watch

# Run integration tests
npm run test:integration
```

### Database Management

```bash
# Create migration
npm run db:migrate:new migration_name

# Run migrations
npm run db:migrate

# Reset database
npm run db:reset

# Seed test data
npm run db:seed
```

## Integration Points

### With Orchestrator

- Receives requests to generate magic links for review sessions
- Provides user authentication status for workflow decisions

### With Email Service

- Triggers email sending for magic links and password resets
- Receives delivery confirmations for audit logging

### With All Services

- Provides JWT token validation via `/auth/validate` endpoint
- All services validate tokens before processing requests

## API Examples

### Login with Email/Password

```bash
curl -X POST http://localhost:3020/auth/login \
  -H "Content-Type: application/json" \
  -d '{
    "email": "user@example.com",
    "password": "securepassword"
  }'
```

### Request Magic Link

```bash
curl -X POST http://localhost:3020/auth/magic-link \
  -H "Content-Type: application/json" \
  -d '{
    "email": "user@example.com",
    "purpose": "review_session",
    "session_id": "uuid"
  }'
```

### Validate Token (Internal)

```bash
curl -X GET http://localhost:3020/auth/validate \
  -H "Authorization: Bearer jwt-token-here"
```

## Monitoring

### Health Check

```bash
curl http://localhost:3020/auth/health
```

### Metrics

- Login success/failure rates
- Token generation/validation rates
- Session duration statistics
- Rate limit violations
- Magic link usage patterns

## Security Considerations

1. **Never log sensitive data** (passwords, tokens, session IDs)
2. **Rotate JWT signing keys** regularly
3. **Monitor for brute force attacks** via rate limiting logs
4. **Audit all authentication events** for security analysis
5. **Use secure session management** with proper TTL
6. **Implement proper CORS policies** for frontend integration
7. **Validate all inputs** to prevent injection attacks
