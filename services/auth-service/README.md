# Auth Service

JWT-based authentication and session management service for the Peerit platform.

## Quick Start

### Development

```bash
npm install
npm run dev
```

### Docker Deployment

```bash
# Using Docker Compose (recommended)
docker compose up postgres redis auth-service -d

# Standalone Docker
docker build -t peerit-auth-service .
docker run -d -p 3020:3020 -e JWT_SECRET=your-secret peerit-auth-service
```

### Production Checklist

- Set secure `JWT_SECRET` (minimum 32 characters)
- Configure PostgreSQL and Redis connections
- Set `FRONTEND_URL` for CORS
- Enable HTTPS
- Monitor health endpoints

## API Documentation

### Swagger UI & OpenAPI

- **Live API Documentation**: <http://localhost:3020/docs>
- **OpenAPI 3.1 Specification**: [openapi.yaml](./openapi.yaml)

Interactive browser-based API testing with complete endpoint documentation, request/response schemas, and authentication flow examples. The OpenAPI specification can be imported into Postman, Insomnia, or used for code generation.

### Health & Monitoring

- **Health Check**: <http://localhost:3020/health>
- **Service Info**: <http://localhost:3020/info>
- **Database Status**: <http://localhost:3020/management/database>
- **Detailed Health**: <http://localhost:3020/management/health>

## Testing

```bash
# Unit tests (43 tests) - 4 seconds, no infrastructure
npm test

# Integration tests (14 tests) - requires Docker
docker compose -f compose.test.yml up postgres-test redis-test -d
npm run test:integration
docker compose -f compose.test.yml down --volumes
```

## Configuration

```env
# Required
PORT=3020
JWT_SECRET=your-secure-secret-minimum-32-characters
JWT_REFRESH_SECRET=your-refresh-secret-different-from-jwt
DATABASE_URL=postgresql://user:password@localhost:5432/peerit_auth
REDIS_URL=redis://localhost:6379

# Optional
FRONTEND_URL=http://localhost:3000
EMAIL_SERVICE_URL=http://localhost:3030
JWT_EXPIRES_IN=15m
JWT_REFRESH_EXPIRES_IN=7d
```

## Features

### Authentication & Security

- JWT access and refresh tokens with configurable expiration
- Magic link passwordless authentication
- Password reset workflows with email integration
- Rate limiting on authentication endpoints
- CORS protection and security headers
- Token validation and user session management

### Monitoring & Operations

- Express Actuator endpoints following Spring Boot patterns
- Health checks for service and database dependencies
- Live Swagger UI with OpenAPI 3.1 specification
- Mock implementations for development without infrastructure

### API Endpoints

- `POST /login` - Email/password authentication
- `POST /magic-link` - Generate magic link for passwordless login
- `GET /magic/{token}` - Consume magic link token
- `POST /refresh` - Refresh JWT access tokens
- `POST /logout` - Invalidate tokens and end session
- `POST /reset-password` - Initiate password reset
- `PUT /reset-password` - Complete password reset
- `GET /validate` - Validate JWT token
- `GET /health` - Service health status
- `GET /info` - Service information

## Architecture

The service uses a layered architecture with graceful degradation:

- **Database**: PostgreSQL with Prisma ORM (falls back to mocks in development)
- **Session Storage**: Redis for distributed sessions (falls back to in-memory)
- **Monitoring**: Express Actuator for industry-standard health endpoints
- **Documentation**: OpenAPI 3.1 with interactive Swagger UI

## Production Deployment

### Docker Multi-Stage Build

```bash
# Build with integrated testing
docker build -f Dockerfile.multi-stage -t peerit-auth-service:tested .
```

Production image features:

- Alpine Linux base (~150MB)
- Non-root user security
- Built-in health checks
- Optimized layer caching

### Production Configuration

- Ensure PostgreSQL and Redis availability
- Use secure JWT secrets (minimum 32 characters)
- Configure HTTPS and proper CORS origins
- Enable health check endpoints for load balancers
- Consider Redis clustering for high availability
