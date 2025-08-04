# Auth Service

JWT-based authentication and session management service for the Peerit platform.

## Testing Strategy

### 1. Basic Tests - Local, No Infrastructure
**Command**: `npm run test:basic`
- **Infrastructure**: None (mocks only)
- **Tests**: Unit tests, basic API validation, environment checks
- **Environment**: `NODE_ENV=test`, `SKIP_REDIS=true`, includes JWT secrets
- **Use case**: Fast feedback during development, CI pre-checks

### 2. Integration Tests - Docker Compose Infrastructure  
**Command**: `npm run test:integration`
- **Infrastructure**: Docker Compose (PostgreSQL + Redis)
- **Tests**: Real database connections, session storage, full API flow
- **Environment**: `NODE_ENV=test`, `TEST_INTEGRATION=true`
- **Use case**: Pre-production validation, full system testing
- **Coverage**: All 14 auth endpoints including login, magic links, password reset, token operations, and monitoring endpoints

### 3. Docker Build Integration

**Option A**: Multi-stage Dockerfile runs tests during build
```bash
# Build with integrated testing (tests must pass to proceed)
docker build -f Dockerfile.multi-stage -t peerit-auth-service:tested .

# If tests fail, build stops - no production image created
```

**Option B**: Separate test compose automatically runs tests
```bash
# Run integration tests in isolated Docker environment
docker compose -f compose.test.yml up --build --abort-on-container-exit

# Clean up test containers
docker compose -f compose.test.yml down --volumes
```

**Test Results**: ✅ ALL TESTS WORKING

**Integration test coverage includes:**
- All authentication endpoints (login, magic links, token validation, logout)
- Password management workflows (reset request/completion)
- Express Actuator monitoring endpoints
- Service health and dependency checking
- Error handling and security validation
- Database and Redis integration testing

**Credentials**: Test credentials should NOT be in production images

## Quick Start

```bash
# Install dependencies
npm install

# 1. Basic tests (fast, no infrastructure)
npm run test:basic

# 2. Integration tests (requires Docker Compose)
docker compose -f infra/docker/compose.yml up -d
npm run test:integration
docker compose -f infra/docker/compose.yml down

# 3. Development mode
npm run dev
```

## Testing Commands

| Command | Infrastructure | What it tests |
|---------|---------------|---------------|
| `npm test` | None | Alias for `test:basic` |
| `npm run test:basic` | None (mocks) | Unit tests, environment validation |
| `npm run test:integration` | Docker Compose | Real PostgreSQL + Redis |
| `npm run test:watch` | None (mocks) | Watch mode for development |
| `npm run test:all` | Both | Basic + Integration sequentially |
## Test Credentials Security

### Development/Test Credentials

```env
# .env.test (NOT in production)
DATABASE_URL=postgresql://testuser:testpass@localhost:5432/peerit_test
REDIS_URL=redis://localhost:6379/1
JWT_SECRET=test-secret-not-for-production
```

### Production Deployment

- Test credentials must be excluded from production builds
- Use build-time secrets or external credential injection
- Consider test-specific Docker Compose files

## Docker Integration Options

### Option A: Multi-stage Dockerfile with Tests

```dockerfile
# Test stage
FROM node:18-alpine AS test
COPY package*.json ./
RUN npm ci
COPY . .
RUN npm run test:basic
# Only proceed to production if tests pass

# Production stage  
FROM node:18-alpine AS production
# ... production build without test dependencies
```

### Option B: Test Compose

```yaml
# compose.test.yml
services:
  auth-service-test:
    build: .
    environment:
      NODE_ENV: test
      TEST_INTEGRATION: true
    depends_on:
      - postgres-test
      - redis-test
    command: npm run test:integration
```

## Features

### Core Authentication
- **JWT Authentication**: Access and refresh token management with configurable expiration
- **Magic Link Authentication**: Email-based passwordless login with secure token generation
- **Password Management**: Secure password reset functionality with email workflows
- **Token Validation**: Endpoint for validating JWT tokens and extracting user information
- **Session Management**: Redis-based session storage with in-memory fallbacks

### Security & Rate Limiting
- **Rate Limiting**: Per-endpoint rate limiting (login, magic links, password reset)
- **Token Refresh**: Secure refresh token rotation and validation
- **Logout Support**: Token invalidation and session cleanup
- **CORS Protection**: Configurable cross-origin resource sharing
- **Security Headers**: Helmet.js integration for security best practices

### Monitoring & Operations  
- **Express Actuator**: Industry-standard monitoring endpoints (`/management/*`)
  - `/management/health` - Service health status
  - `/management/database` - Database and session health
  - `/management/info` - Service information and configuration
- **Health Endpoints**: Comprehensive health checking (`/health`, `/info`)
- **API Documentation**: Live Swagger UI with OpenAPI 3.1 specification
- **Development Ready**: Mock database and session modes for development

### API Endpoints
- `POST /login` - Email/password authentication
- `POST /magic-link` - Generate magic link for passwordless login  
- `GET /magic/{token}` - Consume magic link token
- `POST /refresh` - Refresh JWT access tokens
- `POST /logout` - Invalidate tokens and end session
- `POST /reset-password` - Initiate password reset flow
- `PUT /reset-password` - Complete password reset with new password
- `GET /validate` - Validate JWT token and return user info
- `GET /health` - Service health status
- `GET /info` - Service configuration and build information

## API Documentation

- **Live API Docs**: http://localhost:3020/docs
- **OpenAPI Specification**: [openapi.yaml](./openapi.yaml)
- **Health Check**: http://localhost:3020/health
- **Service Info**: http://localhost:3020/info

## Architecture

### Database Support
- **Production**: PostgreSQL with Prisma ORM
- **Development**: Automatic fallback to mock implementations
- **Testing**: Unit tests use mocks, integration tests support both mock and real databases

### Session Management
- **Production**: Redis for distributed sessions
- **Development**: In-memory fallback when Redis unavailable
- **Testing**: Mock and in-memory session providers

### Monitoring
Uses [express-actuator](https://www.npmjs.com/package/express-actuator) for industry-standard monitoring endpoints following Spring Boot Actuator patterns.

### Integration Test Coverage

The integration tests comprehensively validate all core auth service functionality:

**Authentication Flows:**
- Email/password login with JWT token generation
- Magic link generation and consumption workflows  
- Token validation and authorization checking
- Token refresh and logout operations

**Password Management:**
- Password reset request initiation
- Password reset completion workflow
- Secure error handling for invalid requests

**Monitoring & Health:**
- Express Actuator endpoints (`/management/health`, `/management/database`, `/management/info`)
- Service health and dependency status checking
- API documentation serving and OpenAPI specification

**Error Handling:**
- Database connection failure scenarios
- Invalid token format validation
- Rate limiting and security error responses
- Graceful degradation when dependencies are unavailable

**Performance Optimizations:**
- Skips Redis connection attempts in basic test mode
- Uses shorter timeouts (1s instead of 5s) for faster failures  
- Provides `SKIP_REDIS=true` environment variable for complete Redis bypass
- Clean separation between unit tests (mocks) and integration tests (real infrastructure)

## Environment Configuration

Set these variables in `.env` file:

```env
PORT=3020
JWT_SECRET=your-secret-here
DATABASE_URL=postgresql://user:password@localhost:5432/peerit_auth
REDIS_URL=redis://localhost:6379
FRONTEND_URL=http://localhost:3000
EMAIL_SERVICE_URL=http://localhost:3030
```

Service gracefully handles missing databases with mock implementations for development.

## Docker Deployment

### Using Docker Compose (Recommended)

From the project root directory:

```bash
# Start auth service with dependencies
docker compose up postgres redis auth-service -d

# View logs
docker compose logs auth-service -f

# Stop services
docker compose down
```

### Standalone Docker Build

From the auth service directory:

```bash
# Build production image
docker build -t peerit-auth-service .

# Run with environment variables
docker run -d \
  -p 3020:3020 \
  -e DATABASE_URL=postgresql://user:pass@host:5432/peerit_auth \
  -e REDIS_URL=redis://host:6379 \
  -e JWT_SECRET=your-secure-secret \
  --name auth-service \
  peerit-auth-service
```

### Multi-Stage Build Features

The Dockerfile uses production-ready multi-stage builds with:

- **Security**: Non-root user, Alpine Linux base, minimal attack surface
- **Performance**: Optimized layer caching, dependency separation
- **Monitoring**: Built-in health checks, dumb-init process management
- **Size**: Production image ~150MB, excludes dev dependencies

## Production Deployment

- Ensure PostgreSQL and Redis are available
- Set secure JWT_SECRET (minimum 32 characters)
- Configure proper CORS origins via FRONTEND_URL
- Use HTTPS in production environments
- Monitor via `/health` and `/info` endpoints
- Enable health check endpoints for load balancers
- Consider Redis clustering for high availability
