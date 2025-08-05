# Peerit Keycloak

Pre-configured Keycloak for the Peerit platform with realm import, themes, and GitHub Actions build automation.

## Quick Start

### Using Pre-built Image

```bash
# Pull and run
docker run -d \
  --name peerit-keycloak \
  -p 8080:8080 \
  -e KC_DB_URL=jdbc:postgresql://postgres:5432/keycloak \
  -e KC_DB_USERNAME=keycloak \
  -e KC_DB_PASSWORD=password \
  -e KC_BOOTSTRAP_ADMIN_USERNAME=admin \
  -e KC_BOOTSTRAP_ADMIN_PASSWORD=admin123 \
  ghcr.io/pxl-digital-application-samples/peerit-keycloak:latest
```

### Using Docker Compose

```bash
# Production
cp .env.prod .env  # Edit with your settings
docker compose -f compose.keycloak-prod.yml up -d

# Development  
docker compose -f compose.keycloak.yml up -d
```

## Building Images

### GitHub Actions (Recommended)

1. Go to Actions → "Build Peerit Keycloak Image" → "Run workflow"
2. Set parameters:
   - Keycloak Version: `latest`
   - Image Tag: `v1.0.0`
   - Push to Registry: `true`
3. Image available at: `ghcr.io/pxl-digital-application-samples/peerit-keycloak:v1.0.0`

### Manual Build

```bash
docker build -f Dockerfile -t peerit-keycloak .
```

## Configuration

### Required Environment Variables

```env
KC_DB_URL=jdbc:postgresql://postgres:5432/keycloak
KC_DB_USERNAME=keycloak
KC_DB_PASSWORD=secure-password
KC_BOOTSTRAP_ADMIN_USERNAME=admin
KC_BOOTSTRAP_ADMIN_PASSWORD=secure-admin-password
```

### Optional Variables

```env
KC_HOSTNAME=localhost
KC_HTTP_PORT=8080
KC_LOG_LEVEL=INFO
KC_DB_SCHEMA=public
KC_PROXY=edge
KC_HEALTH_ENABLED=true
KC_METRICS_ENABLED=true
```

## Features

- **Pre-configured Peerit realm** with roles and clients
- **Custom themes** for branding
- **Health checks** at `/health/ready`, `/health/live`
- **Metrics** at `/metrics`
- **Multi-platform** (AMD64/ARM64)
- **Environment-configurable** for dev/prod

## Integration Testing

```bash
# Use pre-built image in tests
export KEYCLOAK_IMAGE=ghcr.io/pxl-digital-application-samples/peerit-keycloak:latest
docker compose -f compose.test.yml up -d
```

## Troubleshooting

```bash
# Check health
curl http://localhost:8080/health/ready

# Check logs
docker logs peerit-keycloak

# Debug mode
docker run -e KC_LOG_LEVEL=DEBUG peerit-keycloak
```

## Files Created

- `Dockerfile` - Multi-platform Keycloak image with Peerit configuration
- `compose.keycloak-prod.yml` - Production deployment with environment variables
- `.env.prod` - Production environment template
- `.github/workflows/build-keycloak.yml` - Automated image building
- Updated test compose files to support pre-built image option