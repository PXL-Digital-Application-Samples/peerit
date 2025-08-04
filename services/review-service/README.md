# Review Service

Manages peer review sessions, submissions, and review state.

## Responsibilities

- Review session management
- Review submission handling  
- Anonymous review tracking
- Deadline enforcement
- Review state management

## API Endpoints

- `POST /reviews/sessions` - Create review session
- `GET /reviews/sessions/:id` - Get session details
- `POST /reviews/submit` - Submit peer review
- `GET /reviews/sessions/:id/status` - Get submission status
- `PUT /reviews/sessions/:id/close` - Close review session

## Database Schema

```sql
CREATE TABLE review_sessions (
  id UUID PRIMARY KEY,
  name VARCHAR(255) NOT NULL,
  team_id UUID NOT NULL,
  rubric_id UUID NOT NULL,
  deadline TIMESTAMP NOT NULL,
  status VARCHAR(50) DEFAULT 'active',
  created_at TIMESTAMP DEFAULT NOW()
);

CREATE TABLE reviews (
  id UUID PRIMARY KEY,
  session_id UUID REFERENCES review_sessions(id),
  reviewer_id UUID NOT NULL,
  reviewee_id UUID NOT NULL,
  submitted_at TIMESTAMP,
  created_at TIMESTAMP DEFAULT NOW()
);

CREATE TABLE review_responses (
  id UUID PRIMARY KEY,
  review_id UUID REFERENCES reviews(id),
  question_id UUID NOT NULL,
  response_value INTEGER,
  response_text TEXT
);
```

## Technology Stack

Language-agnostic service (currently Node.js/TypeScript).
