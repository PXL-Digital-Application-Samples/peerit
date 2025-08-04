# Backend-for-Frontend (BFF)

A specialized API layer that provides frontend-optimized endpoints by orchestrating calls to multiple microservices.

## Technology Stack

- **Runtime**: Node.js
- **Framework**: Express.js
- **Language**: JavaScript
- **HTTP Client**: Axios
- **Validation**: Joi
- **Documentation**: OpenAPI/Swagger

## Features

- Frontend-optimized API endpoints
- Request aggregation from multiple services
- Response transformation and simplification
- Frontend-specific error handling
- Request/response caching
- Authentication token forwarding

## API Endpoints

### Authentication
- `POST /auth/login` - User login
- `POST /auth/logout` - User logout
- `GET /auth/me` - Get current user info

### Dashboard
- `GET /dashboard/student` - Student dashboard data
- `GET /dashboard/admin` - Admin dashboard data

### Reviews
- `GET /reviews/session/:id` - Get review session with questions
- `POST /reviews/submit` - Submit peer review
- `GET /reviews/status/:sessionId` - Get submission status

### Reports
- `GET /reports/:id` - Get individual report
- `GET /reports/team/:teamId` - Get team reports

## Development

```bash
# Install dependencies
npm install

# Start development server
npm run dev

# Start production server
npm start
```

## Environment Variables

Create a `.env` file based on `.env.example`:

```env
PORT=3001
NODE_ENV=development
ORCHESTRATOR_URL=http://localhost:3010
AUTH_SERVICE_URL=http://localhost:3020
USER_SERVICE_URL=http://localhost:3021
# ... other service URLs
```

## Deployment

The service is containerized and deployed as a microservice.

See `Dockerfile` for containerization details.
