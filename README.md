# Peerit - Anonymous Peer Evaluation Platform

A microservices-based platform for anonymous peer evaluation in student project teams.

## Architecture

This is a language-agnostic monorepo containing independent, separately deployable microservices. Each service can be developed in any language and has its own build, test, and deployment pipeline.

## Services

### Frontend
- **apps/frontend**: Reactive SPA (SvelteKit/Vue.js)

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
- **infra/k8s**: Kubernetes manifests
- **infra/database**: Database schemas and migrations

## Development

Each service is completely independent and can be developed, tested, and deployed separately. See individual service README files for specific setup instructions.

## Getting Started

1. Clone the repository
2. Navigate to the specific service you want to work on
3. Follow the service-specific README for setup instructions

## Deployment

Services can be deployed independently using Docker containers. See `infra/` directory for deployment configurations.
