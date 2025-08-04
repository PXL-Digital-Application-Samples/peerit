# Docker Compose Development Guide

This guide explains how to use Docker Compose for local development with the Peerit microservices platform.

## Architecture Overview

The Docker Compose setup is designed with three levels:

1. **Infrastructure Layer** (`infra/docker/compose.yml`) - Shared PostgreSQL and Redis
2. **Service Layer** (individual `compose.yml` files) - Each service with its dependencies
3. **Orchestration Layer** (root `compose.yml`) - Full-stack development environment

## Quick Start

### Prerequisites

- Docker Desktop (Windows/Mac) or Docker Engine + Docker Compose (Linux)
- That's it! No Node.js or setup scripts required.

### Start Everything

```bash
# Clone and enter the repository
git clone <repository-url>
cd peerit

# Start full development environment
docker compose up
```

### Access the Application

- **Frontend**: <http://localhost:3000>
- **API Gateway**: <http://localhost:80>  
- **BFF**: <http://localhost:3001>
- **Individual Services**: <http://localhost:30XX> (where XX = service port)

### Optional Development Tools

```bash
# Start with admin tools
docker compose --profile tools up

# Access tools
# PostgreSQL Admin: http://localhost:5050 (admin@peerit.dev / admin)
# Redis Commander: http://localhost:8081
```

## Development Workflows

### Working on a Single Service

Each service can be developed independently:

```bash
# Start infrastructure only
docker compose up postgres redis -d

# Work on auth service specifically
cd services/auth-service
docker compose up

# The service will connect to shared PostgreSQL and Redis
```

### Working on Frontend + API

```bash
# Start backend services
docker compose up postgres redis bff api-gateway orchestrator auth-service -d

# Start frontend in development mode
cd apps/frontend
npm run dev
```

### Working on Multiple Services

```bash
# Start specific services
docker compose up postgres redis auth-service user-service team-service

# Or start everything except email service
docker compose up --scale email-service=0
```

## Service Isolation

### Database Isolation

Each service has its own database within the shared PostgreSQL instance:

- `peerit_auth` - Authentication service
- `peerit_users` - User management service
- `peerit_teams` - Team management service
- `peerit_rubrics` - Rubric management service
- `peerit_reviews` - Review submission service
- `peerit_reports` - Report generation service
- `peerit_email` - Email service
- `peerit_orchestrator` - Workflow orchestration

### Redis Database Separation

Services use different Redis databases for isolation:

- **DB 0**: Auth service (sessions, tokens)
- **DB 1**: Orchestrator (workflows, queues)
- **DB 2**: BFF (response caching)
- **DB 3**: Review service (temporary data)

### Network Isolation

All services communicate through the `peerit-network` Docker network using service names:

```javascript
// Service-to-service communication
const authResponse = await fetch('http://auth-service:3020/validate');
const userData = await fetch('http://user-service:3021/users/123');
```

## Environment Variables

### Infrastructure Variables

Shared across all services in `infra/docker/.env.shared`:

```env
POSTGRES_HOST=postgres
POSTGRES_PORT=5432
REDIS_HOST=redis
REDIS_PORT=6379
```

### Service-Specific Variables

Each service defines its own environment in its `compose.yml`:

```yaml
environment:
  - PORT=3020
  - DATABASE_URL=postgresql://peerit:peerit_dev@postgres:5432/peerit_auth
  - JWT_SECRET=your_secret_here
```

### Override for Development

Create `.env` files in service directories to override defaults:

```bash
# services/auth-service/.env
JWT_SECRET=my_local_development_secret
LOG_LEVEL=debug
```

## Data Persistence

### Volumes

The following volumes persist data between container restarts:

- `postgres_data` - Database data
- `redis_data` - Redis data
- `user_uploads` - User service file uploads
- `rubric_uploads` - Rubric service templates
- `report_storage` - Generated reports

### Backup and Restore

```bash
# Backup database
docker exec peerit-postgres pg_dump -U peerit peerit_auth > auth_backup.sql

# Restore database
docker exec -i peerit-postgres psql -U peerit peerit_auth < auth_backup.sql

# Backup all service databases
./tools/backup-databases.sh
```

## Testing

### Integration Testing

```bash
# Start test environment
docker compose -f compose.test.yml up -d

# Run integration tests
npm run test:integration

# Cleanup
docker compose -f compose.test.yml down -v
```

### Service Testing

```bash
# Test a specific service
cd services/auth-service
docker compose up -d postgres redis
npm test

# Test with Docker
docker compose run --rm auth-service npm test
```

## Monitoring and Debugging

### Viewing Logs

```bash
# All services
docker compose logs -f

# Specific service
docker compose logs -f auth-service

# Filter logs
docker compose logs -f auth-service | grep ERROR
```

### Service Health

```bash
# Check all service health
docker compose ps

# Check specific service health
curl http://localhost:3020/health

# Watch health checks
watch 'docker compose ps --format "table {{.Service}}\t{{.Status}}\t{{.Ports}}"'
```

### Database Access

```bash
# Connect to specific database
docker exec -it peerit-postgres psql -U peerit -d peerit_auth

# Connect to Redis
docker exec -it peerit-redis redis-cli

# Use specific Redis database
docker exec -it peerit-redis redis-cli -n 1  # Orchestrator DB
```

## Troubleshooting

### Common Issues

#### Port Conflicts
```bash
# Check what's using a port
netstat -tulpn | grep :3020

# Kill process using port
sudo kill -9 $(lsof -t -i:3020)
```

#### Database Connection Issues
```bash
# Check if PostgreSQL is ready
docker exec peerit-postgres pg_isready -U peerit

# Restart database
docker compose restart postgres

# Check database logs
docker compose logs postgres
```

#### Service Dependencies
```bash
# Check if services can reach each other
docker exec peerit-auth-service curl http://user-service:3021/health

# Check network connectivity
docker network inspect peerit-network
```

### Clean Reset

```bash
# Stop everything and remove volumes
docker compose down -v

# Remove all Peerit containers and images
docker system prune -f
docker volume prune -f

# Rebuild everything
docker compose build --no-cache
docker compose up
```

### Performance Issues

```bash
# Check resource usage
docker stats

# Limit service resources
docker compose up --scale orchestrator=1 --memory=512m orchestrator
```

## Production Considerations

### Security

- Change default passwords in production
- Use proper JWT secrets
- Configure HTTPS with real certificates
- Set up proper CORS origins
- Use environment-specific secrets management

### Scaling

```bash
# Scale specific services
docker compose up --scale review-service=3

# Load balance with API Gateway configuration
# See apps/api-gateway/caddy.json for upstream configuration
```

### Deployment

For production deployment:

1. Use `compose.prod.yml` with production configurations
2. Use external managed databases (AWS RDS, etc.)
3. Use external Redis (AWS ElastiCache, etc.)
4. Use proper secrets management (AWS Secrets Manager, etc.)
5. Set up monitoring and logging (Prometheus, ELK stack, etc.)

## Service Migration

When migrating a service to a different language:

1. Keep the same Docker compose interface
2. Maintain the same environment variables
3. Keep the same database schema
4. Preserve the same API endpoints
5. Use the same Docker network and ports

Example migration from Node.js to Go:

```dockerfile
# New Dockerfile for Go service
FROM golang:1.21-alpine AS builder
WORKDIR /app
COPY go.mod go.sum ./
RUN go mod download
COPY . .
RUN go build -o main .

FROM alpine:latest
RUN apk add --no-cache ca-certificates
WORKDIR /root/
COPY --from=builder /app/main .
EXPOSE 3020
CMD ["./main"]
```

The compose.yml file remains the same, ensuring seamless migration.
