# Peerit Keycloak

Pre-configured Keycloak container for the Peerit platform. Supports PostgreSQL, realm import, custom themes, and automated testing.

---

- [What is Keycloak?](#what-is-keycloak)
  - [Key Terminology](#key-terminology)
  - [Realm vs Admin User](#realm-vs-admin-user)
  - [Peerit Configuration Summary](#peerit-configuration-summary)
  - [Token Usage Flow](#token-usage-flow)
- [Peerit User Accounts Explained](#peerit-user-accounts-explained)
- [Deployment](#deployment)
  - [Local Dev/Test with Docker Compose](#local-devtest-with-docker-compose)
  - [Local Production Example](#local-production-example)
  - [Manual Docker Run (without Compose)](#manual-docker-run-without-compose)
- [Realm Configuration](#realm-configuration)
- [Local Build](#local-build)
- [Testing](#testing)
  - [Automated Tests (Newman)](#automated-tests-newman)
  - [Manual Test: Realm + Token](#manual-test-realm--token)
- [Login Info](#login-info)
  - [Admin Console](#admin-console)
  - [Test Users (Peerit realm)](#test-users-peerit-realm)
- [CI / GitHub Actions](#ci--github-actions)
  - [Auto Build on Push](#auto-build-on-push)
  - [Manual Build](#manual-build)
  - [Release Build](#release-build)
- [File Overview](#file-overview)
- [Notes](#notes)


---

## What is Keycloak?

Keycloak is an open-source Identity and Access Management (IAM) solution that provides Single Sign-On (SSO), user federation, identity brokering, and centralized authentication/authorization for applications.

It supports industry standards like **OAuth 2.0**, **OpenID Connect**, and **SAML 2.0**, and is commonly used to secure web, mobile, and backend applications.

### Key Terminology

| Concept       | Description                                                                 |
|---------------|-----------------------------------------------------------------------------|
| **Realm**     | A logical namespace in Keycloak. Each realm is isolated and contains its own users, roles, groups, and clients. |
| **User**      | An identity account. Can log in and be assigned roles and groups.           |
| **Group**     | A collection of users with shared role assignments or attributes.           |
| **Role**      | A permission label assigned to users or groups, used by applications to control access. |
| **Client**    | An application (e.g., SPA, API, service) that uses Keycloak for authentication. Clients request tokens to access resources. |
| **Client Scope** | A set of roles and attributes exposed in tokens requested by a client.  |

### Realm vs Admin User

- **Admin User (Bootstrap)**: Used to start Keycloak and configure it via the admin console or REST API (defined by env vars).
- **Realm Users**: Defined *inside* a realm. These are application users (admin, teacher, student) used by your platform.

### Peerit Configuration Summary

- **Realm**: `peerit`
  - Contains all roles, users, clients specific to the Peerit platform.
- **Roles**:
  - `admin`: full access to Peerit features
  - `teacher`: manages courses, teams, reviews
  - `student`: submits reviews and joins teams
- **Clients**:
  - `peerit-frontend`: A public client for the web UI (PKCE, OpenID Connect)
  - `peerit-api`: Confidential client for backend API gateway
  - `peerit-services`: Bearer-only client used by microservices
- **Groups**:
  - Map to roles: `/Administrators`, `/Teachers`, `/Students`
- **Internationalization**: Supports `en`, `nl`, and `fr`, default is `en`
- **Theme**: Custom Peerit theme for login pages and admin console

### Token Usage Flow

1. A client (e.g., `peerit-frontend`) sends the user to Keycloak for login.
2. On successful login, Keycloak issues an access token and ID token.
3. The token contains assigned roles (e.g., `student`) and scopes.
4. Backend services (e.g., `peerit-api`) validate the token and enforce access.

---

## Peerit User Accounts Explained

| Account Type         | Where Defined          | Purpose                                                                 |
|----------------------|------------------------|-------------------------------------------------------------------------|
| **Bootstrap Admin**  | Environment variable   | Starts Keycloak and allows first-time login to import the realm        |
| **Realm Admin User** | `peerit-realm.json`    | `admin` user inside the `peerit` realm, for platform administration     |
| **Test Users**       | `peerit-realm.json`    | Teacher and students for dev/test scenarios                            |
| **PostgreSQL User**  | `.env.compose.*`       | Credentials to connect Keycloak to PostgreSQL                          |

> Bootstrap admin credentials (e.g., `KC_BOOTSTRAP_ADMIN_PASSWORD`) **must be provided** at container runtime.

---

## Deployment

### Local Dev/Test with Docker Compose

```sh
docker compose --env-file .env.compose.test -f compose.test.yml up -d
```

### Local Production Example

```sh
docker compose --env-file .env.compose.prod -f compose.prod.yml up -d
```

---

### Manual Docker Run (without Compose)

> This is for advanced or custom setups.

```sh
docker network create peerit-test
```

```sh
docker run -d --name postgres-test --network peerit-test -e POSTGRES_USER=keycloak -e POSTGRES_PASSWORD=password -e POSTGRES_DB=keycloak postgres:15-alpine
```

```sh
docker run -d --name keycloak-test --network peerit-test -p 8080:8080 -e KC_DB=postgres -e KC_DB_URL=jdbc:postgresql://postgres-test:5432/keycloak -e KC_DB_USERNAME=keycloak -e KC_DB_PASSWORD=password -e KC_BOOTSTRAP_ADMIN_USERNAME=admin -e KC_BOOTSTRAP_ADMIN_PASSWORD=Admin123 ghcr.io/pxl-digital-application-samples/peerit-keycloak:latest
```

To stop and clean up:

```sh
docker stop keycloak-test postgres-test
docker rm keycloak-test postgres-test
docker network rm peerit-test
```

---

## Realm Configuration

The `peerit` realm includes:

* **Roles**: `admin`, `teacher`, `student`
* **Groups**: `Administrators`, `Teachers`, `Students`
* **Users**:
  * `admin` / `Admin123` (admin)
  * `teacher1` / `Teacher123` (teacher)
  * `student1/2/3` / `Student123` (students)
* **Clients**:
  * `peerit-frontend` (Vue SPA, PKCE)
  * `peerit-api` (backend-for-frontend)
  * `peerit-services` (bearer-only services)

All defined in [`realm-config/peerit-realm.json`](./realm-config/peerit-realm.json).

---

## Local Build

Build the image manually:

```sh
docker build -f Dockerfile -t peerit-keycloak .
```

---

## Testing

### Automated Tests (Newman)

Install and run [Newman](https://github.com/postmanlabs/newman):

```sh
npm install -g newman
```

```sh
newman run peerit-keycloak-tests.json
newman run peerit-keycloak-negative-role-tests.json
```

### Manual Test: Realm + Token

Check realm availability:

```sh
curl http://localhost:8080/realms/peerit
```

Obtain a test token:

```sh
curl -X POST http://localhost:8080/realms/peerit/protocol/openid-connect/token -H "Content-Type: application/x-www-form-urlencoded" -d "grant_type=password&client_id=peerit-frontend&username=teacher1&password=Teacher123"
```

---

## Login Info

### Admin Console

* [http://localhost:8080](http://localhost:8080)
* Bootstrap Admin: `admin` / `Admin123`
* Realm Admin (Peerit): `admin` / `Admin123`

### Test Users (Peerit realm)

| Username | Password   | Role    |
| -------- | ---------- | ------- |
| admin    | Admin123   | admin   |
| teacher1 | Teacher123 | teacher |
| student1 | Student123 | student |
| student2 | Student123 | student |
| student3 | Student123 | student |

---

## CI / GitHub Actions

### Auto Build on Push

* Push to `infra/docker/keycloak/` triggers auto build to GHCR.

### Manual Build

* Go to GitHub → Actions → **"Build Peerit Keycloak Image"**
* Trigger manually with version overrides.

### Release Build

```sh
git tag v1.0.0
git push origin v1.0.0
```

Creates:

* `ghcr.io/pxl-digital-application-samples/peerit-keycloak:v1.0.0`
* Plus: `:v1.0`, `:v1`, `:latest` (if on `main`)

---

## File Overview

| File                                       | Description                                |
| ------------------------------------------ | ------------------------------------------ |
| `Dockerfile`                               | Keycloak image with prebuilt Peerit config |
| `compose.test.yml` / `compose.prod.yml`    | Local test/prod setup using Docker Compose |
| `.env.compose.test` / `.env.compose.prod`  | Environment files for Compose              |
| `realm-config/peerit-realm.json`           | Peerit realm configuration                 |
| `scripts/init-keycloak.sh`                 | Startup and realm import logic             |
| `peerit-keycloak-tests.json`               | Postman integration test collection        |
| `peerit-keycloak-negative-role-tests.json` | Postman negative access test suite         |
| `.github/workflows/build-keycloak.yml`     | GitHub Actions build pipeline              |

---

## Notes

* `KC_BOOTSTRAP_ADMIN_USERNAME` and `KC_BOOTSTRAP_ADMIN_PASSWORD` must be set at runtime (they're not defined in `realm-config`).
* PostgreSQL credentials in `.env.compose.*` must match the `KC_DB_*` variables in Compose.

---
