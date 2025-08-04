# Auth Service

JWT-based authentication and session management service for the Peerit platform.

## Features

- **JWT Authentication**: Access and refresh token management
- **Magic Link Authentication**: Email-based passwordless login
- **Password Management**: Secure password reset functionality
- **Session Management**: Redis-based session storage with fallbacks
- **Monitoring**: Industry-standard health and info endpoints via express-actuator
- **Development Ready**: Mock database and session modes for development

## Quick Start

```bash
# Install dependencies
npm install

# Run in development mode (uses mocks when database unavailable)
npm run dev

# Run tests (fast - skips Redis for speed)
npm run test:basic

# Run tests with Redis (slower but more comprehensive)
npm run test:redis
```

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
