# Peerit Keycloak

Pre-configured Keycloak for the Peerit platform with PostgreSQL support, realm import, custom themes, and automated test suite.

---

## Quick Test (Local Setup)

### Start with Temporary PostgreSQL Database

```sh
# Create a Docker network (idempotent)
docker network create peerit-test

# Start PostgreSQL container
docker run -d --name postgres-test --network peerit-test `
  -e POSTGRES_USER=keycloak `
  -e POSTGRES_PASSWORD=password `
  -e POSTGRES_DB=keycloak `
  postgres:15-alpine

# Start Keycloak container (change password)
docker run -d --name keycloak-test --network peerit-test -p 8080:8080 `
  -e KC_DB=postgres `
  -e KC_DB_URL=jdbc:postgresql://postgres-test:5432/keycloak `
  -e KC_DB_USERNAME=keycloak `
  -e KC_DB_PASSWORD=password `
  -e KC_BOOTSTRAP_ADMIN_USERNAME=admin `
  -e KC_BOOTSTRAP_ADMIN_PASSWORD=your-secure-password `
  ghcr.io/pxl-digital-application-samples/peerit-keycloak:latest

# Wait for Keycloak to start
Start-Sleep -Seconds 60

# Test if realm is available
curl http://localhost:8080/realms/master
````

### Open Keycloak

* URL: [http://localhost:8080](http://localhost:8080)
* Login: `admin` / `your-secure-password`

### Cleanup

```sh
docker stop keycloak-test postgres-test
docker rm keycloak-test postgres-test
docker network rm peerit-test
```

---

## Test Realm Users

These test users are part of the pre-configured Peerit realm.

```sh
curl -X POST http://localhost:8080/realms/peerit/protocol/openid-connect/token `
  -H "Content-Type: application/x-www-form-urlencoded" `
  -d "grant_type=password&client_id=peerit-frontend&username=teacher1&password=Teacher123"
```

| Username | Password   | Role    |
| -------- | ---------- | ------- |
| admin    | Admin123   | admin   |
| teacher1 | Teacher123 | teacher |
| student1 | Student123 | student |

---

## Production Setup

### Required Environment Variables

```env
KC_DB=postgres
KC_DB_URL=jdbc:postgresql://your-postgres-host:5432/keycloak
KC_DB_USERNAME=keycloak
KC_DB_PASSWORD=your-database-password

KC_BOOTSTRAP_ADMIN_USERNAME=admin
KC_BOOTSTRAP_ADMIN_PASSWORD=your-secure-admin-password
```

### Docker Compose Example

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

---

## Automated Test Suite (Postman + Newman)

This repository includes Postman collections for automated testing of Peerit realm setup and role enforcement.

### Run Tests

```sh
# Install Newman CLI (if not installed)
npm install -g newman

# Start test infrastructure
docker compose --env-file .env.compose.test -f compose.test.yml up -d

# Run integration test suite
newman run peerit-keycloak-tests.json

# Run negative test suite
newman run peerit-keycloak-negative-role-tests.json
```

---

## Manual Build

```sh
docker build -f Dockerfile -t peerit-keycloak .
```

Optional environment variables:

```env
KC_HOSTNAME=your-domain.com
KC_HTTP_PORT=8080
KC_LOG_LEVEL=INFO
KC_DB_SCHEMA=public
KC_PROXY=edge
```

---

## GitHub Actions CI

### Auto Build

* Push to `infra/docker/keycloak/` → triggers auto build to GHCR

### Manual Build

1. Go to GitHub → Actions → **"Build Peerit Keycloak Image"**
2. Run workflow with optional version overrides

### Release Build

```sh
git tag v1.0.0
git push origin v1.0.0
```

This builds and tags:

* `ghcr.io/pxl-digital-application-samples/peerit-keycloak:v1.0.0`
* `...:v1.0`, `...:v1`, `...:latest` (if on `main`)

---

## Troubleshooting

```sh
# Check Keycloak realm
curl http://localhost:8080/realms/master
curl http://localhost:8080/realms/peerit

# View logs
docker logs keycloak-test

# Debug logging
docker run -e KC_LOG_LEVEL=DEBUG ghcr.io/pxl-digital-application-samples/peerit-keycloak:latest
```

---

## File Overview

| File                                       | Purpose                                  |
| ------------------------------------------ | ---------------------------------------- |
| `Dockerfile`                               | Keycloak image with Peerit config        |
| `compose.keycloak-prod.yml`                | Production deployment template           |
| `compose.test.yml`                         | Local integration testing infrastructure |
| `.env.compose.dev` / `.env.compose.test`   | Environment config files                 |
| `peerit-keycloak-tests.json`               | API test suite (Postman collection)      |
| `peerit-keycloak-negative-role-tests.json` | Access denial test suite                 |
| `.github/workflows/build-keycloak.yml`     | CI build and deploy                      |

---
