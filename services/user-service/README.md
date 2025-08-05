# User Service

Manages user profiles, roles, and team membership for the Peerit platform. This service handles user data beyond authentication, which is provided by Keycloak.

## Quick Start

### Development

```bash
npm install
npm run dev
```

### Docker Deployment

```bash
# Using Docker Compose
docker compose up postgres redis user-service -d

# Standalone Docker
docker build -t peerit-user-service .
docker run -d -p 3020:3020 peerit-user-service
```

### Production Checklist

- Set `KEYCLOAK_URL` and realm configuration
- Configure service authentication with Keycloak
- Set `FRONTEND_URL` for CORS
- Enable HTTPS
- Monitor health endpoints

## API Documentation

### Swagger UI & OpenAPI

- **Live API Documentation**: <http://localhost:3020/docs>
- **OpenAPI 3.1 Specification**: [openapi.yaml](./openapi.yaml)

Interactive browser-based API testing with complete endpoint documentation, request/response schemas, and authentication flow examples.

### Health & Monitoring

- **Health Check**: <http://localhost:3020/health>
- **Service Info**: <http://localhost:3020/info>

## Testing

```bash
# Unit tests - no infrastructure
npm test

# Integration tests - requires Docker
docker compose -f compose.test.yml up postgres-test redis-test -d
npm run test:integration
docker compose -f compose.test.yml down --volumes
```

## Configuration

```env
# Required
PORT=3020
DATABASE_URL=postgresql://user:password@localhost:5432/peerit_user
REDIS_URL=redis://localhost:6379
KEYCLOAK_URL=http://localhost:8080
KEYCLOAK_REALM=peerit
KEYCLOAK_CLIENT_ID=peerit-services

# Optional
FRONTEND_URL=http://localhost:3000
EMAIL_SERVICE_URL=http://localhost:3030
TEAM_SERVICE_URL=http://localhost:3040
```

## Features

### User Profile Management

- User profile CRUD operations (extend Keycloak user data)
- Custom user attributes and preferences
- Profile picture and bio management
- User activity tracking and statistics

### Role & Permission Management

- Role assignment and validation (sync with Keycloak)
- Permission checking and enforcement
- Role-based feature access control
- Custom role attributes and metadata

### Team Membership

- Team membership management and validation
- User-team relationship tracking
- Team role assignments (team lead, member, etc.)
- Cross-team user participation tracking

### Integration & Sync

- Keycloak user synchronization
- Real-time user status updates
- Integration with team-service for membership
- Integration with review-service for user contexts



## Architecture

The service uses a layered architecture with Keycloak integration:

- **Database**: PostgreSQL with Prisma ORM for user profile data
- **Cache**: Redis for session data and performance optimization
- **Authentication**: Keycloak token validation and user sync
- **Documentation**: OpenAPI 3.1 with interactive Swagger UI
- **Integration**: REST APIs with team-service and review-service

## Production Deployment

### Docker Multi-Stage Build

```bash
# Build with integrated testing
docker build -f Dockerfile.multi-stage -t peerit-user-service:tested .
```

Production image features:

- Alpine Linux base (~150MB)
- Non-root user security
- Built-in health checks
- Optimized layer caching

### Production Configuration

- Ensure PostgreSQL and Redis availability
- Configure Keycloak connection and realm settings
- Set up proper CORS origins for frontend integration
- Enable health check endpoints for load balancers
- Configure service-to-service authentication
- Consider Redis clustering for high availability
