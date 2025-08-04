# Service Language Migration Guide

This guide explains how to migrate a service from one programming language to another while maintaining system compatibility.

## Core Principles

1. **API Contract Preservation**: The REST API must remain identical
2. **Database Schema Compatibility**: Database structure must be maintained
3. **Service Independence**: No changes required in other services
4. **Gradual Migration**: Services can be migrated one at a time

## Migration Process

### 1. Preparation

- Document the current API endpoints and request/response formats
- Export the database schema and seed data
- Identify service dependencies and communication patterns
- Set up the new language environment

### 2. Implementation

- Implement the same REST API endpoints in the new language
- Use the same database schema (create migrations if needed)
- Maintain the same environment variable interface
- Implement identical health check endpoints

### 3. Testing

- Run API contract tests against both implementations
- Verify database compatibility
- Test service integration with other services
- Load test to ensure performance requirements

### 4. Deployment

- Deploy new service alongside the old one
- Use feature flags or traffic splitting for gradual rollout
- Monitor error rates and performance metrics
- Complete the migration when confident

## Language-Specific Examples

### Node.js → Go

```go
// Example Go service structure
├── cmd/
│   └── main.go
├── internal/
│   ├── handlers/
│   ├── models/
│   ├── repository/
│   └── middleware/
├── pkg/
├── go.mod
├── go.sum
└── Dockerfile
```

Key considerations:
- Use Gin or Echo for HTTP routing
- GORM for database operations
- Maintain same JSON response formats
- Handle CORS and security headers identically

### Node.js → Rust

```rust
// Example Rust service structure
├── src/
│   ├── main.rs
│   ├── handlers/
│   ├── models/
│   ├── repository/
│   └── middleware/
├── Cargo.toml
├── Cargo.lock
└── Dockerfile
```

Key considerations:
- Use Actix-web or Warp for HTTP
- Diesel or SQLx for database operations
- Serde for JSON serialization
- Same error response formats

### Node.js → Python

```python
# Example Python service structure
├── src/
│   ├── main.py
│   ├── handlers/
│   ├── models/
│   ├── repository/
│   └── middleware/
├── requirements.txt
├── pyproject.toml
└── Dockerfile
```

Key considerations:
- Use FastAPI or Flask
- SQLAlchemy for database operations
- Pydantic for request/response validation
- Same HTTP status codes and error formats

## Database Migration

When migrating services, the database schema must remain compatible:

```sql
-- Example: Maintaining schema compatibility
-- Old Node.js service used snake_case
-- New Go service might prefer camelCase in Go structs
-- But database column names must stay the same

CREATE TABLE users (
  id UUID PRIMARY KEY,
  first_name VARCHAR(100), -- Keep snake_case in DB
  last_name VARCHAR(100),
  created_at TIMESTAMP
);
```

## Docker Configuration

Update the Dockerfile while maintaining the same interface:

```dockerfile
# Go version
FROM golang:1.21-alpine AS builder
WORKDIR /app
COPY go.mod go.sum ./
RUN go mod download
COPY . .
RUN go build -o main cmd/main.go

FROM alpine:latest
RUN apk --no-cache add ca-certificates
WORKDIR /root/
COPY --from=builder /app/main .
EXPOSE 3020
CMD ["./main"]
```

## Environment Variables

Maintain the same environment variable interface:

```env
# These must remain the same regardless of language
PORT=3020
NODE_ENV=development  # or GO_ENV, RUST_ENV, etc.
DATABASE_URL=postgresql://user:pass@localhost/db
JWT_SECRET=secret
```

## API Contract Testing

Use tools like Newman (Postman) or Dredd to validate API contracts:

```json
{
  "scripts": {
    "test:api": "newman run api-tests.postman_collection.json"
  }
}
```

## Monitoring and Observability

Ensure the new service maintains the same observability:

- Health check endpoint (`/health`)
- Metrics endpoint (`/metrics`) if using Prometheus
- Structured logging with same log levels
- Same tracing format if using distributed tracing

## Rollback Strategy

Always have a rollback plan:

1. Keep the old service deployment ready
2. Use database migrations that are backward compatible
3. Implement feature flags for quick rollback
4. Monitor key metrics during migration

## Best Practices

1. **Start Small**: Migrate simpler services first
2. **Automate Testing**: Use CI/CD to validate API contracts
3. **Monitor Closely**: Watch error rates and performance during migration
4. **Document Changes**: Keep track of language-specific optimizations
5. **Team Knowledge**: Ensure team members are trained in the new language

## Common Pitfalls

- Changing API response formats
- Different error handling approaches
- Performance degradation in new implementation
- Database connection pooling differences
- Different timezone handling
- JSON serialization differences

## Tools and Resources

- **API Testing**: Postman, Newman, Dredd, Insomnia
- **Database Migration**: Flyway, Liquibase, native tools
- **Load Testing**: Artillery, k6, JMeter
- **Monitoring**: Prometheus, Grafana, DataDog
- **Container Scanning**: Trivy, Snyk, Clair
