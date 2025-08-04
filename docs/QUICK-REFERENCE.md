# Peerit Docker Compose Quick Reference

## 🚀 Quick Start Commands

```bash
docker compose up               # Start everything
docker compose up -d           # Start in background
docker compose logs -f         # View logs
docker compose down            # Stop everything
```

## 🔧 Development Commands

```bash
# Infrastructure only
docker compose up postgres redis -d

# Specific services
docker compose up frontend bff api-gateway
docker compose up auth-service user-service

# Include admin tools
docker compose --profile tools up

# Build services
docker compose build

# Clean restart
docker compose down -v && docker compose up
```

## 🌐 Service URLs

| Service | URL | Purpose |
|---------|-----|---------|
| Frontend | http://localhost:3000 | Vue.js SPA |
| API Gateway | http://localhost:80 | Caddy routing |
| BFF | http://localhost:3001 | Backend-for-Frontend |
| Auth Service | http://localhost:3020 | Authentication |
| User Service | http://localhost:3021 | User management |
| Team Service | http://localhost:3022 | Team management |
| Rubric Service | http://localhost:3023 | Rubric definitions |
| Review Service | http://localhost:3024 | Review submissions |
| Report Service | http://localhost:3025 | Report generation |
| Email Service | http://localhost:3026 | Email notifications |
| Orchestrator | http://localhost:3010 | Workflow coordination |

## 🛠️ Admin Tools

| Tool | URL | Credentials |
|------|-----|-------------|
| pgAdmin | http://localhost:5050 | admin@peerit.dev / admin |
| Redis Commander | http://localhost:8081 | No auth required |

## 💾 Database Structure

Each service has its own isolated database:

- `peerit_auth` - Authentication service
- `peerit_users` - User management
- `peerit_teams` - Team management  
- `peerit_rubrics` - Rubric definitions
- `peerit_reviews` - Review submissions
- `peerit_reports` - Report generation
- `peerit_email` - Email tracking
- `peerit_orchestrator` - Workflow state

## 🔄 Redis Databases

Services use different Redis database numbers:

- **DB 0**: Auth service (sessions, tokens)
- **DB 1**: Orchestrator (workflows, queues)
- **DB 2**: BFF (response caching)
- **DB 3**: Review service (temporary data)

## 📁 Individual Service Development

```bash
# Start infrastructure
docker compose up postgres redis -d

# Work on specific service
cd services/auth-service
docker compose up

# Or work locally
npm install && npm run dev
```

## 🐳 Docker Network

All services communicate via `peerit-network`:

```javascript
// Service-to-service communication
fetch('http://auth-service:3020/validate')
fetch('http://user-service:3021/users/123')
```

## 🔍 Debugging

```bash
# View service status
docker compose ps

# Check specific service logs
docker compose logs -f auth-service

# Connect to database
docker exec -it peerit-postgres psql -U peerit -d peerit_auth

# Connect to Redis
docker exec -it peerit-redis redis-cli -n 0
```

## 🧹 Cleanup

```bash
# Stop and remove containers
docker compose down

# Stop and remove volumes (clean slate)
docker compose down -v

# Remove unused Docker resources
docker system prune -f
```

## 📚 Documentation

- [Full Docker Guide](docs/DOCKER-COMPOSE.md)
- [Development Guide](docs/DEVELOPMENT.md)
- [Migration Guide](docs/MIGRATION.md)
