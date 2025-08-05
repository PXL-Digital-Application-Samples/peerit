# Peerit Keycloak API Tests

Declarative API tests for validating Keycloak infrastructure supporting the Peerit platform.

## Test Coverage

### Infrastructure Health
- Health endpoint accessibility (`/health`)
- Ready endpoint confirmation (`/health/ready`)  
- Metrics endpoint validation (`/metrics`)

### Peerit Realm Configuration
- OIDC configuration validation (`/.well-known/openid_configuration`)
- JWKS endpoint and key validation (`/protocol/openid-connect/certs`)
- Required endpoints and grant types verification

### Authentication Tests
- Admin user authentication (master and peerit realms)
- Teacher user authentication and role validation
- Student user authentication and role validation
- Token acquisition and storage for subsequent tests

### Admin API Access
- User management API (`/admin/realms/peerit/users`)
- Role management API (`/admin/realms/peerit/roles`)
- Client management API (`/admin/realms/peerit/clients`)
- Configuration validation for Peerit applications

### Token Validation
- UserInfo endpoint with admin token
- UserInfo endpoint with teacher token  
- UserInfo endpoint with student token
- Token claim validation and user data verification

## Quick Start

### Prerequisites

```powershell
# Install Newman (Postman CLI runner)
npm install -g newman newman-reporter-html

# Ensure Keycloak is running
docker compose -f compose.keycloak.yml up -d
```

### Run Tests

```powershell
# Basic test execution
.\run-tests.ps1

# Generate HTML report
.\run-tests.ps1 -ReportFormat html

# Generate JSON report with verbose output
.\run-tests.ps1 -ReportFormat json -Verbose
```

## Test Collection

The `peerit-keycloak-tests.json` file contains:

- **5 test categories** covering all critical Peerit integration points
- **Declarative assertions** for infrastructure validation
- **Token management** with automatic storage and reuse
- **Role-based testing** for admin, teacher, and student workflows
- **Configuration validation** for clients, roles, and realm settings

## Expected Results

All tests should pass if:
- Keycloak is running on `localhost:8080`
- Peerit realm is properly imported
- Test users exist with correct credentials:
  - admin / Admin123 (admin role)
  - teacher1 / Teacher123 (teacher role)  
  - student1 / Student123 (student role)

## Reports

Test reports are saved in the `results/` directory:
- **CLI output**: Real-time console results
- **JSON reports**: Machine-readable results with timestamps
- **HTML reports**: Visual reports with detailed assertions

## Integration

### CI/CD Pipeline

```yaml
# Example GitHub Actions step
- name: Test Keycloak Infrastructure
  run: |
    docker compose -f compose.keycloak.yml up -d
    sleep 30  # Wait for startup
    ./run-tests.ps1 -ReportFormat json
  working-directory: infra/docker/keycloak/test
```

### Local Development

```powershell
# Watch mode for development
while ($true) {
    .\run-tests.ps1
    Start-Sleep 30
}
```

## Troubleshooting

### Common Issues

**Newman not found**
- Run: `npm install -g newman newman-reporter-html`

**Keycloak not accessible**  
- Check: `docker compose -f compose.keycloak.yml ps`
- Start: `docker compose -f compose.keycloak.yml up -d`

**Authentication failures**
- Verify user credentials in Keycloak admin console
- Check realm import completed successfully

**Token validation errors**
- Ensure proper OIDC configuration
- Verify client settings in Peerit realm

### Debugging

```powershell
# Run with maximum verbosity
.\run-tests.ps1 -ReportFormat html -Verbose

# Check specific test category
newman run peerit-keycloak-tests.json --folder "Authentication Tests"

# Test single request
newman run peerit-keycloak-tests.json --folder "Infrastructure Health"
```
