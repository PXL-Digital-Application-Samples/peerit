# Auth Service

JWT-based authentication and session management service for the Peerit platform.

## Testing Strategy

### 1. Basic Tests - Local, No Infrastructure
**Command**: `npm run test:basic`
- **Duration**: ~2 seconds
- **Infrastructure**: None (mocks only)
- **Tests**: Unit tests, basic API validation, OpenAPI compliance
- **Environment**: `NODE_ENV=test`, `SKIP_REDIS=true`
- **Use case**: Fast feedback during development, CI pre-checks

### 2. Integration Tests - Docker Compose Infrastructure  
**Command**: `npm run test:integration`
- **Duration**: ~5 seconds
- **Infrastructure**: Docker Compose (PostgreSQL + Redis)
- **Tests**: Real database connections, session storage, full API flow
- **Environment**: `NODE_ENV=test`, `TEST_INTEGRATION=true`
- **Use case**: Pre-production validation, full system testing

### 3. Docker Build Integration
**Options**:
- **Option A**: Multi-stage Dockerfile runs tests during build
- **Option B**: Separate test compose automatically runs tests
- **Credentials**: Test credentials should NOT be in production images

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

| Command | Infrastructure | Duration | What it tests |
|---------|---------------|----------|---------------|
| `npm test` | None | ~2s | Alias for `test:basic` |
| `npm run test:basic` | None (mocks) | ~2s | Unit tests, OpenAPI validation |
| `npm run test:integration` | Docker Compose | ~5s | Real PostgreSQL + Redis |
| `npm run test:watch` | None (mocks) | - | Watch mode for development |
| `npm run test:all` | Both | ~7s | Basic + Integration sequentially |
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
# docker-compose.test.yml
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

- **JWT Authentication**: Access and refresh token management
- **Magic Link Authentication**: Email-based passwordless login
- **Password Management**: Secure password reset functionality
- **Session Management**: Redis-based session storage with fallbacks
- **Monitoring**: Industry-standard health and info endpoints
- **Development Ready**: Mock database and session modes for development

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

### Testing Performance

For faster test execution, the service automatically:

- Skips Redis connection attempts in test mode (saves 5+ seconds)
- Uses shorter timeouts (1s instead of 5s) for faster failures  
- Provides `SKIP_REDIS=true` environment variable for complete Redis bypass
- Maintains backward compatibility with full Redis integration tests via `npm run test:redis`

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
