# Development Guide

## Quick Start

1. **Prerequisites**
   - Docker and Docker Compose
   - Node.js 18+ (for currently implemented services)
   - PostgreSQL client (optional, for direct DB access)

2. **Setup**
   ```bash
   # Clone the repository
   git clone https://github.com/your-org/peerit.git
   cd peerit
   
   # Run setup script
   npm run setup
   # or on Windows:
   powershell -ExecutionPolicy Bypass -File tools/setup.ps1
   ```

3. **Start Development Environment**
   ```bash
   npm run docker:up
   ```

4. **Access the Application**
   - Frontend: http://localhost:3000
   - API Gateway: http://localhost:80
   - Individual services: http://localhost:30XX (where XX is service port)

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
3. **Service Dependencies**: Some services depend on others (see docker-compose.yml)

### Clean Reset
```bash
# Stop everything and clean up
npm run docker:down
docker system prune -f
npm run clean

# Start fresh
npm run setup
```

## Architecture Benefits

This monorepo structure provides:

- **Independent Development**: Teams can work on services separately
- **Language Flexibility**: Migrate services to optimal languages
- **Deployment Independence**: Deploy services individually
- **Shared Tooling**: Common development and deployment tools
- **Testing**: Integration testing across service boundaries
