# Peerit Keycloak

Pre-configured Keycloak for the Peerit platform with PostgreSQL support, realm import, custom themes, and automated test suite.

---

## Deployment

### Docker Compose Set-up

Test:

```sh
docker compose --env-file .env.compose.test -f compose.test.yml up -d
```

Prod:

```sh
docker compose --env-file .env.compose.prod -f compose.prod.yml up -d
```

### Docker manual container set-up

```sh
# Create a Docker network
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
```

Cleanup

```sh
docker stop keycloak-test postgres-test
docker rm keycloak-test postgres-test
docker network rm peerit-test
```

---

## Local build

```sh
docker build -f Dockerfile -t peerit-keycloak .
```

---

## Testing

### Run Automated Tests (Postman + Newman)

This repository includes Postman collections for automated testing of Peerit realm setup and role enforcement.

```sh
# Install Newman CLI (if not installed)
npm install -g newman

# Run integration test suite
newman run peerit-keycloak-tests.json

# Run negative test suite
newman run peerit-keycloak-negative-role-tests.json
```

### Manual checks

Check if keycloak realm `peerit` is available

```sh
curl http://localhost:8080/realms/master
curl http://localhost:8080/realms/peerit
```

Test users that are part of the pre-configured Peerit realm.

```sh
curl -X POST http://localhost:8080/realms/peerit/protocol/openid-connect/token `
  -H "Content-Type: application/x-www-form-urlencoded" `
  -d "grant_type=password&client_id=peerit-frontend&username=teacher1&password=Teacher123"
```

| Username | Password             | Role    |
| -------- | -------------------- | ------- |
| admin    | Admin123             | admin   |
| teacher1 | Teacher123           | teacher |
| student1 | Student123           | student |
| student2 | Student123           | student |
| student3 | Student123           | student |

### Keycloak Dashboard

* URL: [http://localhost:8080](http://localhost:8080)
* Login: `admin` / `your-secure-password`

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

## File Overview

| File                                       | Purpose                                  |
| ------------------------------------------ | ---------------------------------------- |
| `Dockerfile`                               | Keycloak image with Peerit config        |
| `compose.test.yml`                         | Local integration testing infrastructure |
| `compose.prod.yml`                         | Local integration prod example           |
| `.env.compose.prod` / `.env.compose.test`  | Environment config files                 |
| `peerit-keycloak-tests.json`               | API test suite (Postman collection)      |
| `peerit-keycloak-negative-role-tests.json` | Access denial test suite                 |
| `.github/workflows/build-keycloak.yml`     | CI build and deploy                      |

---
