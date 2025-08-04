# Orchestrator Service

Coordinates multi-step workflows across microservices for complex business processes.

## Technology Stack

- **Runtime**: Node.js
- **Framework**: Express.js
- **Language**: JavaScript
- **Message Queue**: Redis/Bull
- **HTTP Client**: Axios
- **Documentation**: OpenAPI/Swagger

## Responsibilities

- Workflow coordination and orchestration
- Service communication management
- Business process implementation
- Event-driven workflow execution
- Saga pattern implementation for distributed transactions

## Key Workflows

### Start Review Session
1. Create review session (review-service)
2. Get team members (user-service)
3. Generate magic links (auth-service)
4. Send email invitations (email-service)

### Complete Review Submission
1. Validate review submission (review-service)
2. Check if all reviews completed
3. Trigger report generation (report-service)
4. Send completion notifications (email-service)

### Generate Reports
1. Aggregate review data (review-service)
2. Get team and user info (user-service, team-service)
3. Apply rubric scoring (rubric-service)
4. Generate final reports (report-service)

## API Endpoints

- `POST /workflows/start-review-session` - Start a new review session
- `POST /workflows/submit-review` - Process review submission
- `POST /workflows/close-session` - Close review session and generate reports
- `GET /workflows/:id/status` - Get workflow status

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

See `.env.example` for required configuration.

## Architecture Notes

This service implements the Saga pattern for managing distributed transactions across microservices. Each workflow is broken down into compensatable steps that can be rolled back if any step fails.

## Deployment

The service is containerized and deployed independently.

See `Dockerfile` for containerization details.
