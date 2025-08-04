# API Gateway

Caddy-based API Gateway for routing requests to appropriate services with authentication forwarding.

## Features

- HTTPS termination
- Request routing to microservices
- Authentication forwarding
- Rate limiting
- Load balancing
- Static file serving for frontend

## Configuration

The gateway is configured using Caddy's JSON configuration format in `caddy.json`.

## Routing

- `/api/auth/*` → auth-service
- `/api/users/*` → user-service  
- `/api/teams/*` → team-service
- `/api/rubrics/*` → rubric-service
- `/api/reviews/*` → review-service
- `/api/reports/*` → report-service
- `/api/emails/*` → email-service
- `/api/orchestrator/*` → orchestrator
- `/bff/*` → bff service
- `/*` → frontend (SPA)

## Development

```bash
# Start Caddy with the configuration
caddy run --config caddy.json

# Reload configuration
caddy reload --config caddy.json
```

## Environment Variables

- `CADDY_DOMAIN`: Domain name for HTTPS certificates
- `FRONTEND_URL`: Frontend service URL
- `BFF_URL`: BFF service URL
- `AUTH_SERVICE_URL`: Auth service URL
- `USER_SERVICE_URL`: User service URL
- `TEAM_SERVICE_URL`: Team service URL
- `RUBRIC_SERVICE_URL`: Rubric service URL
- `REVIEW_SERVICE_URL`: Review service URL
- `REPORT_SERVICE_URL`: Report service URL
- `EMAIL_SERVICE_URL`: Email service URL
- `ORCHESTRATOR_URL`: Orchestrator service URL

## Deployment

The gateway runs in a Docker container with Caddy.

See `Dockerfile` for containerization details.
