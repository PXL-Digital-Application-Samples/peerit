# Peerit Keycloak

Pre-configured Keycloak for the Peerit platform with PostgreSQL support, realm import, and custom themes.

**Updated**: Fixed GitHub Actions authentication for automatic builds.

## Quick Test (Copy-Paste Ready)

### Test with Temporary PostgreSQL Database

```bash
# 1. Create network
docker network create peerit-test 2>/dev/null || true

# 2. Start PostgreSQL (temporary)
docker run -d --name postgres-test --network peerit-test -e POSTGRES_USER=keycloak -e POSTGRES_PASSWORD=password -e POSTGRES_DB=keycloak postgres:15-alpine

# 3. Start Keycloak (change admin password here)
docker run -d --name keycloak-test --network peerit-test -p 8080:8080 -e KC_DB=postgres -e KC_DB_URL=jdbc:postgresql://postgres-test:5432/keycloak -e KC_DB_USERNAME=keycloak -e KC_DB_PASSWORD=password -e KC_BOOTSTRAP_ADMIN_USERNAME=admin -e KC_BOOTSTRAP_ADMIN_PASSWORD=your-secure-password ghcr.io/pxl-digital-application-samples/peerit-keycloak:latest

# 4. Wait for startup (30-60 seconds), then test
curl -s http://localhost:8080/realms/master | grep -o '"realm":"[^"]*"'

# 5. Open in browser: http://localhost:8080
# Login: admin / your-secure-password

# 6. Cleanup when done
docker stop keycloak-test postgres-test
docker rm keycloak-test postgres-test
docker network rm peerit-test
```

### Test Peerit Realm Users

```bash
# After Keycloak is running, test pre-configured users:
# Teacher: teacher1 / Teacher123
# Student: student1 / Student123

# Test authentication via API:
curl -X POST http://localhost:8080/realms/peerit/protocol/openid-connect/token \
  -H "Content-Type: application/x-www-form-urlencoded" \
  -d "grant_type=password&client_id=peerit-frontend&username=teacher1&password=Teacher123"
```

## Production Setup

### Required Environment Variables

**Database Configuration (Required):**
```env
KC_DB=postgres
KC_DB_URL=jdbc:postgresql://your-postgres-host:5432/keycloak
KC_DB_USERNAME=keycloak
KC_DB_PASSWORD=your-database-password
```

**Admin Configuration (Required):**
```env
KC_BOOTSTRAP_ADMIN_USERNAME=admin
KC_BOOTSTRAP_ADMIN_PASSWORD=your-secure-admin-password
```

### Production Docker Compose

```yaml
services:
  postgres:
    image: postgres:15-alpine
    environment:
      POSTGRES_USER: keycloak
      POSTGRES_PASSWORD: your-database-password
      POSTGRES_DB: keycloak
    volumes:
      - postgres_data:/var/lib/postgresql/data

  keycloak:
    image: ghcr.io/pxl-digital-application-samples/peerit-keycloak:latest
    environment:
      KC_DB: postgres
      KC_DB_URL: jdbc:postgresql://postgres:5432/keycloak
      KC_DB_USERNAME: keycloak
      KC_DB_PASSWORD: your-database-password
      KC_BOOTSTRAP_ADMIN_USERNAME: admin
      KC_BOOTSTRAP_ADMIN_PASSWORD: your-secure-admin-password
      KC_HOSTNAME: your-domain.com
      KC_PROXY: edge
    ports:
      - "8080:8080"
    depends_on:
      - postgres

volumes:
  postgres_data:
```

## Building Images

### GitHub Actions (Recommended)

**Zero-Click Automatic Build:**

- Just push changes to `infra/docker/keycloak/` on main branch
- GitHub Actions automatically builds and pushes `latest` tag
- No forms, no clicking, completely automatic

**One-Click Manual Build:**

1. Go to Actions → "Build Peerit Keycloak Image" → "Run workflow"
2. Click "Run workflow" (all defaults are pre-filled)
3. Image available at: `ghcr.io/pxl-digital-application-samples/peerit-keycloak:latest`

**Automatic Release Build:**

1. Create and push a version tag: `git tag v1.0.0 && git push origin v1.0.0`
2. GitHub Actions automatically builds one image with multiple tags:
   - `ghcr.io/pxl-digital-application-samples/peerit-keycloak:v1.0.0`
   - `ghcr.io/pxl-digital-application-samples/peerit-keycloak:v1.0`
   - `ghcr.io/pxl-digital-application-samples/peerit-keycloak:v1`
   - `ghcr.io/pxl-digital-application-samples/peerit-keycloak:latest` (if main branch)

### Manual Build

```bash
docker build -f Dockerfile -t peerit-keycloak .
```

### Optional Configuration

```env
KC_HOSTNAME=your-domain.com
KC_HTTP_PORT=8080
KC_LOG_LEVEL=INFO
KC_DB_SCHEMA=public
KC_PROXY=edge
```

## Features

- **Pre-configured Peerit realm** with roles and clients
- **Custom themes** for branding  
- **PostgreSQL database support** (v26+ optimized build)
- **Optimized production build** with pre-compiled features
- **Multi-platform** (AMD64/ARM64)
- **Environment-configurable** for dev/prod

## Pre-configured Users

The Peerit realm includes test users:

- **Admin**: admin / (set via KC_BOOTSTRAP_ADMIN_PASSWORD)
- **Teacher**: teacher1 / Teacher123
- **Student**: student1 / Student123

## Troubleshooting

```bash
# Check if Keycloak is responding
curl http://localhost:8080/realms/master

# Test Peerit realm
curl http://localhost:8080/realms/peerit

# Check container logs
docker logs keycloak-test

# Test with debug logging
docker run -e KC_LOG_LEVEL=DEBUG ghcr.io/pxl-digital-application-samples/peerit-keycloak:latest
```

## Files

- `Dockerfile` - Multi-platform Keycloak image with PostgreSQL support
- `compose.keycloak-prod.yml` - Production deployment template
- `.env.prod` - Production environment template
- `.github/workflows/build-keycloak.yml` - Automated image building
