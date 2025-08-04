# Auth Service Configuration Endpoints - Testing Guide

## Overview
This guide covers the new service configuration endpoints added to the auth-service following REST API best practices.

## New Endpoints

### 1. Health Check Endpoint - `/auth/health`
- **Purpose**: Returns service health status and dependencies
- **Method**: GET
- **Response Codes**: 200 (healthy), 503 (unhealthy)

#### Response Format:
```json
{
  "status": "UP" | "DOWN",
  "timestamp": "2024-01-15T10:30:45.123Z",
  "version": "1.0.0",
  "uptime": 3600.5,
  "database": {
    "status": "UP" | "DOWN" | "UNKNOWN",
    "type": "postgresql"
  }
}
```

### 2. Service Information Endpoint - `/auth/info`
- **Purpose**: Returns detailed service configuration and environment information
- **Method**: GET
- **Response Code**: 200

#### Response Format:
```json
{
  "service": {
    "name": "auth-service",
    "version": "1.0.0",
    "description": "Authentication and authorization service for Peerit platform"
  },
  "environment": {
    "nodeVersion": "v18.19.0",
    "environment": "development",
    "port": 3020
  },
  "database": {
    "provider": "prisma",
    "type": "postgresql",
    "url": "postgresql://***:***@localhost:5432/peerit_auth",
    "connected": false,
    "mode": "mock"
  },
  "sessions": {
    "provider": "redis",
    "connected": false,
    "mode": "memory"
  },
  "features": {
    "magicLinks": true,
    "jwtRefresh": true,
    "rateLimiting": true
  },
  "build": {
    "timestamp": "2024-01-15T10:30:45.123Z",
    "commit": "abc123def"
  }
}
```

## Manual Testing Instructions

### Prerequisites
1. Start the auth service:
   ```bash
   cd services/auth-service
   node src/index.js
   ```

2. Service should be running on http://localhost:3020

### Test Commands

#### Health Check
```bash
# Test health endpoint
curl http://localhost:3020/auth/health

# Test with verbose output
curl -v http://localhost:3020/auth/health
```

#### Service Information
```bash
# Test info endpoint
curl http://localhost:3020/auth/info

# Pretty print JSON output
curl -s http://localhost:3020/auth/info | json_pp
```

#### Swagger Documentation
```bash
# Test Swagger UI
curl http://localhost:3020/auth/docs

# Test OpenAPI JSON
curl http://localhost:3020/auth/docs/json

# Test OpenAPI YAML
curl http://localhost:3020/auth/docs/yaml
```

### Expected Behaviors

#### With Database Connected
- Health endpoint returns 200 with status "UP"
- Info endpoint shows `database.connected: true` and `database.mode: "connected"`
- Sessions info reflects actual Redis connection status

#### Without Database (Development Mode)
- Health endpoint returns 503 with status "DOWN"
- Info endpoint shows `database.connected: false` and `database.mode: "mock"`
- Service continues to function with mock implementations

#### Security Features
- Database URLs are sanitized (credentials replaced with ***)
- Rate limiting headers are included in responses
- CORS headers are properly configured
- Security headers (Helmet) are applied

### Integration with OpenAPI Specification

All endpoints are documented in `openapi.yaml` with:
- Complete request/response schemas
- Example values
- Proper HTTP status codes
- Security requirements where applicable

### Swagger UI Testing

1. Open http://localhost:3020/auth/docs in browser
2. Test each endpoint directly from Swagger UI
3. Verify response formats match OpenAPI specification
4. Check that error responses are properly documented

## Configuration Details

### Database Flexibility
The service supports multiple database types:
- PostgreSQL (primary)
- MySQL (configurable)
- SQLite (development)
- Mock mode (no database required)

Database type is automatically detected from `DATABASE_URL` environment variable.

### Session Storage Options
- Redis (production)
- In-memory (development fallback)
- Mock mode (testing)

### Environment Variables
The info endpoint reflects these key configurations:
- `NODE_ENV` - environment type
- `PORT` - service port
- `DATABASE_URL` - database connection (sanitized)
- `REDIS_URL` - Redis connection
- `GIT_COMMIT` - build information

## Best Practices Implemented

1. **REST API Design**: Followed standard REST patterns for resource naming
2. **Health Checks**: Separate health and info endpoints following microservices patterns
3. **Security**: Credential sanitization, proper error handling
4. **Documentation**: Complete OpenAPI specification with examples
5. **Flexibility**: Works with or without database connections
6. **Monitoring**: Comprehensive service information for observability

## Automated Testing

Run the basic functionality tests:
```bash
npm test tests/simple.test.js
```

For live service testing (requires running service):
```bash
npm test tests/integration/service.live.test.js
```

## Troubleshooting

### Service Won't Start
- Check Node.js version compatibility
- Verify all dependencies are installed: `npm install`
- Check for port conflicts on 3020

### Database Connection Issues
- Service is designed to work without database in development
- Check database configuration in `.env` file
- Verify database server is running if using real database

### Redis Connection Issues
- Service falls back to in-memory sessions
- Check Redis configuration if using Redis
- Redis is optional for development

### Test Failures
- Ensure service is running before integration tests
- Check if ports are available
- Review Jest configuration in `jest.config.json`
