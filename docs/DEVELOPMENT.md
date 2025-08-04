# Development Guide

## Quick Start

### Prerequisites

- Docker Desktop (includes Docker Compose)
- That's it! No Node.js required for Docker development.

### Start Development Environment

```bash
# Start everything (Docker handles setup)
docker compose up

# Access the application:
# Frontend: http://localhost:3000
# API Gateway: http://localhost:80
# BFF: http://localhost:3001
```

> **Note**: First startup takes longer as Docker downloads images and builds services.

## Docker Compose Workflows

### Development Commands

```bash
# Start everything
docker compose up

# Start in background
docker compose up -d

# Start only infrastructure (PostgreSQL + Redis)
docker compose up postgres redis -d

# Start specific services
docker compose up frontend bff api-gateway

# View logs
docker compose logs -f

# Stop everything
docker compose down

# Clean slate (removes all data)
docker compose down -v
```

### Individual Service Development

```bash
# Start infrastructure
docker compose up postgres redis -d

# Work on auth service
cd services/auth-service
docker compose up
# OR for local development:
npm install && npm run dev

# Work on frontend  
cd apps/frontend
npm install && npm run dev
```

### Admin Tools

```bash
# Start with admin tools
docker compose --profile tools up

# Access tools:
# PostgreSQL Admin: http://localhost:5050 (admin@peerit.dev / admin)
# Redis Commander: http://localhost:8081
```

## Service Architecture

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

### Network Communication

All services communicate through the `peerit-network` Docker network using service names:

```javascript
// Service-to-service communication
const authResponse = await fetch('http://auth-service:3020/validate');
const userData = await fetch('http://user-service:3021/users/123');
```

## Service Development

Each service is completely independent:

```bash
# Work on a specific service
cd services/auth-service
npm install
npm run dev

# Run tests for a service
npm test

# Build a service
npm run build
```

## Language Migration

Services can be migrated to any language. See `docs/MIGRATION.md` for detailed guidance.

### Current Status

- **Node.js/JavaScript**: All services (initial implementation)
- **Migration Ready**: Services are designed to be language-agnostic

### Migration Example

```bash
# Migrate auth-service to Go
cd services/auth-service
# 1. Implement Go version alongside Node.js
# 2. Test API compatibility
# 3. Update Docker configuration
# 4. Deploy and monitor
```

## Database Management

Each service has its own database for complete isolation:

```bash
# Connect to a specific service database
docker exec -it peerit-postgres-1 psql -U peerit -d peerit_auth

# Run migrations for a service
cd services/auth-service
npm run db:migrate
```

## Monitoring and Debugging

```bash
# View all service logs
npm run docker:logs

# View specific service logs
docker logs peerit-auth-service-1 -f

# Check service health
curl http://localhost:3020/health
```

## Best Practices

1. **Service Independence**: Never import code between services
2. **API Contracts**: Maintain consistent API interfaces during migrations
3. **Database Isolation**: Each service owns its data completely
4. **Environment Variables**: Use .env files for configuration
5. **Testing**: Test services independently and integration points
6. **Documentation**: Keep service READMEs updated

## Troubleshooting

### Common Issues

1. **Port Conflicts**: Ensure ports 3000-3030 are available
2. **Database Connection**: Check PostgreSQL is running in Docker
3. **Service Dependencies**: Some services depend on others (see compose.yml)

### Clean Reset

```bash
# Stop everything and clean up
docker compose down -v
docker system prune -f

# Start fresh
docker compose up
```

## Architecture Benefits

This monorepo structure provides:

- **Independent Development**: Teams can work on services separately
- **Language Flexibility**: Migrate services to optimal languages
- **Deployment Independence**: Deploy services individually
- **Shared Tooling**: Common development and deployment tools
- **Testing**: Integration testing across service boundaries
