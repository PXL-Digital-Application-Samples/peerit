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

# Run tests
npm test
```

## API Documentation

- **Live API Docs**: http://localhost:3020/auth/docs
- **OpenAPI Specification**: [openapi.yaml](./openapi.yaml)
- **Health Check**: http://localhost:3020/auth/health
- **Service Info**: http://localhost:3020/auth/info

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

## Production Deployment

- Ensure PostgreSQL and Redis are available
- Set secure JWT_SECRET
- Configure proper CORS origins
- Use HTTPS in production
- Monitor via `/auth/health` and `/auth/info` endpoints
