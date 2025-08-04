# Report Service

Generates and manages immutable peer evaluation reports.

## Responsibilities

- Report generation from review data
- Report storage and retrieval
- PDF/CSV export functionality
- Immutable report data
- Score calculations and analytics

## API Endpoints

- `POST /reports/generate` - Generate reports for session
- `GET /reports/:id` - Get individual report
- `GET /reports/team/:teamId` - Get team reports
- `GET /reports/:id/export/:format` - Export report (PDF/CSV)

## Database Schema

```sql
CREATE TABLE reports (
  id UUID PRIMARY KEY,
  session_id UUID NOT NULL,
  reviewee_id UUID NOT NULL,
  generated_at TIMESTAMP DEFAULT NOW(),
  data JSONB NOT NULL, -- Immutable report data
  scores JSONB NOT NULL, -- Calculated scores
  created_at TIMESTAMP DEFAULT NOW()
);

CREATE INDEX idx_reports_session_id ON reports(session_id);
CREATE INDEX idx_reports_reviewee_id ON reports(reviewee_id);
```

## Technology Stack

Language-agnostic service (currently Node.js/JavaScript).
