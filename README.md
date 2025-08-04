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
- **services/auth-service**: Authentication and session management
- **services/user-service**: User and role management
- **services/team-service**: Team and project mapping
- **services/rubric-service**: Rubric definitions and versions
- **services/review-service**: Review submission and state management
- **services/report-service**: Report generation and storage
- **services/email-service**: Email notifications and reminders

### Infrastructure

- **infra/docker**: Docker configurations

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

# Start only infrastructure (PostgreSQL + Redis)
docker compose up postgres redis

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

Each service can be developed independently:

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

## Docker Compose Architecture

### Three-Tier Structure

1. **Infrastructure** (`infra/docker/compose.yml`) - PostgreSQL, Redis, shared services
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

## Service Architecture

Each service is completely independent with:

- Own database and data isolation
- Independent deployment pipeline
- Language-agnostic interfaces
- Docker containerization
- Health checks and monitoring
- Comprehensive logging

This enables teams to work independently and migrate services to optimal languages while maintaining system consistency.
