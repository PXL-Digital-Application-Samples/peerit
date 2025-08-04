# User Service

Manages user profiles, roles, and user-related data for the Peerit platform.

## Technology Stack

- **Runtime**: Node.js (Language-agnostic - can be migrated to Go, Rust, Python, etc.)
- **Framework**: Express.js
- **Language**: JavaScript
- **Database**: PostgreSQL
- **ORM**: Prisma

## Responsibilities

- User profile management
- Role assignment and management
- User CRUD operations
- CSV import/export functionality
- User search and filtering

## API Endpoints

- `GET /users` - List all users (admin only)
- `GET /users/:id` - Get user by ID
- `POST /users` - Create new user (admin only)
- `PUT /users/:id` - Update user (admin only)
- `DELETE /users/:id` - Delete user (admin only)
- `POST /users/import` - Import users from CSV (admin only)
- `GET /users/export` - Export users to CSV (admin only)
- `GET /users/search` - Search users

## Database Schema

```sql
CREATE TABLE users (
  id UUID PRIMARY KEY,
  email VARCHAR(255) UNIQUE NOT NULL,
  first_name VARCHAR(100) NOT NULL,
  last_name VARCHAR(100) NOT NULL,
  role VARCHAR(50) NOT NULL DEFAULT 'student',
  team_id UUID,
  active BOOLEAN DEFAULT true,
  created_at TIMESTAMP DEFAULT NOW(),
  updated_at TIMESTAMP DEFAULT NOW()
);

CREATE INDEX idx_users_email ON users(email);
CREATE INDEX idx_users_team_id ON users(team_id);
CREATE INDEX idx_users_role ON users(role);
```

## Development

```bash
# Install dependencies
npm install

# Set up database
npm run db:migrate

# Start development server
npm run dev

# Run tests
npm test
```

## Language Migration Examples

This service can be implemented in any language:

### Go Version
```bash
# Structure for Go implementation
├── cmd/
│   └── main.go
├── internal/
│   ├── handlers/
│   ├── models/
│   └── repository/
├── pkg/
├── go.mod
└── Dockerfile
```

### Rust Version
```bash
# Structure for Rust implementation
├── src/
│   ├── main.rs
│   ├── handlers/
│   ├── models/
│   └── repository/
├── Cargo.toml
└── Dockerfile
```

The key requirement is maintaining the same REST API contract regardless of implementation language.

## Deployment

Service is containerized and deployed independently with its own database.

See `Dockerfile` for containerization details.
