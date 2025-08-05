# Peerit - Anonymous Peer Evaluation Platform

A microservices-based platform for anonymous peer evaluation in student project teams.

## Architecture

This is a language-agnostic monorepo containing independent, separately deployable microservices. Each service can be developed in any language and has its own build, test, and deployment pipeline.

## Services

### Frontend

- **apps/frontend**: Reactive SPA (Vue.js)

### API Layer

- **apps/api-gateway**: Caddy configuration and routing
- **apps/bff**: Backend-for-Frontend service

### Core Services

- **services/orchestrator**: Workflow coordination service
- **services/user-service**: User and role management
- **services/team-service**: Team and project mapping
- **services/rubric-service**: Rubric definitions and versions
- **services/review-service**: Review submission and state management
- **services/report-service**: Report generation and storage
- **services/email-service**: Email notifications and reminders

### Identity Provider

- **infra/docker/keycloak**: OpenID Connect authentication and authorization

## Microservice Architecture

Each microservice is completely independent with its own:

- **Database**: Isolated PostgreSQL database per service
- **API**: RESTful interface with clear contracts
- **Docker**: Individual containerization and deployment
- **Documentation**: Detailed specs in each service's README.md

**Key Services:**

- **[Keycloak](infra/docker/keycloak/README.md)**: OpenID Connect identity provider, user authentication, role-based authorization
- **user-service**: User profiles, roles, team membership
- **review-service**: Anonymous peer evaluation submissions
- **orchestrator**: Cross-service workflow coordination

For detailed specifications, see individual service README files.

### Infrastructure

- **infra/docker**: Docker configurations and Keycloak identity provider

## Development

Each service is completely independent and can be developed, tested, and deployed separately. Services are currently defined with Docker configurations and package.json files, ready for implementation.

## Getting Started

### Prerequisites

- Docker Desktop (includes Docker Compose)
- That's it! No Node.js required for Docker development.

> **For local development without Docker**: Node.js 18+ required

### Quick Start

```bash
# Start everything (Docker will handle the setup)
docker compose up

# That's it! Access the application:
# Frontend: http://localhost:3000
# API Gateway: http://localhost:80
# BFF: http://localhost:3001
```

> **Note**: First startup takes longer as Docker downloads images and builds services. Subsequent starts are much faster.

### Development Workflows

```bash
# Start everything
docker compose up

# Start in background
docker compose up -d

# Start infrastructure (PostgreSQL + Redis + Keycloak)
docker compose -f infra/docker/compose.yml up -d

# Start specific services
docker compose up frontend bff api-gateway

# View logs
docker compose logs -f

# Stop everything
docker compose down

# Clean slate (removes all data)
docker compose down -v
```

### Testing

#### Infrastructure Testing

Test individual services against real Docker Compose infrastructure:

```bash
# 1. Start infrastructure
docker compose -f infra/docker/compose.yml up -d

# 2. Test specific services
cd services/user-service  
npm install
npm test:integration  # Service-specific integration tests

# 3. Clean up
docker compose -f infra/docker/compose.yml down
```

#### Development Testing

Fast tests for development (no infrastructure required):

```bash
cd services/user-service
npm run test:basic  # ~2s - uses mocks

cd services/user-service
npm test  # Unit tests with mocks
```

**Test Types by Service:**

| Service | Fast Tests | Integration Tests | Infrastructure |
|---------|------------|------------------|----------------|
| user-service | `npm test` | `npm run test:integration` | PostgreSQL |
| All | `npm run test:docker` | `npm run test:integration` | Full stack |

### Individual Service Development

Each service can be developed independently:

```bash
# Start infrastructure
docker compose up postgres redis keycloak -d

# Work on user service
cd services/user-service
docker compose up
# OR for local development:
npm install && npm run dev

# Work on frontend  
cd apps/frontend
npm install && npm run dev
```

## Docker Compose Architecture

### Three-Tier Structure

1. **Infrastructure** (`infra/docker/compose.yml`) - PostgreSQL, Redis, Keycloak, shared services
2. **Service Level** (individual `compose.yml`) - Each service with dependencies
3. **Full Stack** (root `compose.yml`) - Complete development environment

### Service Isolation

- **Databases**: Each service has its own PostgreSQL database
- **Redis**: Services use different Redis database numbers
- **Networks**: All services communicate via `peerit-network`
- **Volumes**: Persistent storage for data and uploads

See [docs/DEVELOPMENT.md](docs/DEVELOPMENT.md) for detailed development workflows and Docker usage.

## Deployment

### Local Development

Use Docker Compose for local development with service isolation:

```bash
docker compose up              # Start everything
docker compose up --profile tools  # Include pgAdmin and Redis Commander
```

### Production

Services can be deployed independently using Docker containers. Each service includes:

- Multi-stage Dockerfile for optimized builds
- Health checks for container orchestration  
- Environment-based configuration
- Language-agnostic interfaces for easy migration

See `infra/docker/` directory for Docker configurations.

## Documentation

- **[Development Guide](docs/DEVELOPMENT.md)** - Complete development workflow, Docker usage, and service architecture

> Services include .env.example files for local configuration and Docker compose files for isolated development.
