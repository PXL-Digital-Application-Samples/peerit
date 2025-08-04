# Auth Service

Handles authentication, authorization, and session management for the Peerit platform.

## Technology Stack

- **Runtime**: Node.js (can be changed to Go, Rust, etc.)
- **Framework**: Express.js
- **Language**: JavaScript
- **Database**: PostgreSQL
- **ORM**: Prisma
- **Authentication**: JWT + bcrypt

## Responsibilities

- User authentication (email/password, magic links)
- JWT token generation and validation
- Session management
- Password hashing and verification
- Magic link generation for anonymous reviews
- Role-based access control (admin/student)

## API Endpoints

- `POST /auth/login` - User login with email/password
- `POST /auth/magic-link` - Generate magic link for anonymous access
- `POST /auth/verify-magic-link` - Verify magic link token
- `POST /auth/logout` - User logout
- `GET /auth/me` - Get current user from token
- `POST /auth/refresh` - Refresh JWT token
- `POST /auth/change-password` - Change user password

## Database Schema

```sql
-- Users table (minimal auth info)
CREATE TABLE users (
  id UUID PRIMARY KEY,
  email VARCHAR(255) UNIQUE NOT NULL,
  password_hash VARCHAR(255),
  role VARCHAR(50) NOT NULL DEFAULT 'student',
  created_at TIMESTAMP DEFAULT NOW(),
  updated_at TIMESTAMP DEFAULT NOW()
);

-- Sessions table
CREATE TABLE sessions (
  id UUID PRIMARY KEY,
  user_id UUID REFERENCES users(id),
  token_hash VARCHAR(255) NOT NULL,
  expires_at TIMESTAMP NOT NULL,
  created_at TIMESTAMP DEFAULT NOW()
);

-- Magic links table
CREATE TABLE magic_links (
  id UUID PRIMARY KEY,
  token_hash VARCHAR(255) NOT NULL,
  review_session_id UUID NOT NULL,
  reviewer_id UUID NOT NULL,
  reviewee_id UUID NOT NULL,
  expires_at TIMESTAMP NOT NULL,
  used_at TIMESTAMP,
  created_at TIMESTAMP DEFAULT NOW()
);
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

## Environment Variables

See `.env.example` for required configuration.

## Security Features

- Password hashing with bcrypt (minimum 12 rounds)
- JWT with secure signing
- Magic link tokens with expiration
- Rate limiting on authentication endpoints
- CORS configuration
- Helmet security headers

## Language Migration Notes

This service can be migrated to other languages while maintaining the same API contract:

- **Go**: Using Gin/Echo + GORM + PostgreSQL
- **Rust**: Using Actix-web + Diesel + PostgreSQL  
- **Python**: Using FastAPI + SQLAlchemy + PostgreSQL
- **Java**: Using Spring Boot + JPA + PostgreSQL

The database schema and API endpoints remain the same regardless of implementation language.

## Deployment

The service is containerized and deployed independently.

See `Dockerfile` for containerization details.
