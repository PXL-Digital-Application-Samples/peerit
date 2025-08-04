# Email Service

Handles all email communications for the Peerit platform.

## Responsibilities

- Email template management
- Email sending (SMTP)
- Magic link email delivery
- Reminder emails for pending reviews
- Notification emails for completed reviews

## API Endpoints

- `POST /emails/send` - Send email
- `POST /emails/magic-link` - Send magic link email
- `POST /emails/reminder` - Send reminder email
- `POST /emails/batch` - Send batch emails
- `GET /emails/templates` - List email templates

## Database Schema

```sql
CREATE TABLE email_templates (
  id UUID PRIMARY KEY,
  name VARCHAR(255) NOT NULL,
  subject VARCHAR(500) NOT NULL,
  html_body TEXT NOT NULL,
  text_body TEXT,
  variables JSONB, -- Template variables
  created_at TIMESTAMP DEFAULT NOW()
);

CREATE TABLE email_logs (
  id UUID PRIMARY KEY,
  to_email VARCHAR(255) NOT NULL,
  subject VARCHAR(500) NOT NULL,
  template_id UUID REFERENCES email_templates(id),
  status VARCHAR(50) DEFAULT 'pending',
  sent_at TIMESTAMP,
  error_message TEXT,
  created_at TIMESTAMP DEFAULT NOW()
);
```

## Email Templates

- **magic-link**: Anonymous review invitation
- **reminder**: Review deadline reminder
- **completion**: Review completion notification
- **session-start**: New review session notification

## Technology Stack

Language-agnostic service (currently Node.js/TypeScript).
