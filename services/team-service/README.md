# Team Service

Manages team and project data for the Peerit platform.

## Responsibilities

- Team CRUD operations
- Project management
- Team-user associations
- CSV import/export for teams

## API Endpoints

- `GET /teams` - List all teams
- `GET /teams/:id` - Get team by ID
- `POST /teams` - Create new team
- `PUT /teams/:id` - Update team
- `DELETE /teams/:id` - Delete team
- `GET /teams/:id/members` - Get team members
- `POST /teams/import` - Import teams from CSV

## Database Schema

```sql
CREATE TABLE teams (
  id UUID PRIMARY KEY,
  name VARCHAR(255) NOT NULL,
  project_id UUID,
  description TEXT,
  created_at TIMESTAMP DEFAULT NOW(),
  updated_at TIMESTAMP DEFAULT NOW()
);

CREATE TABLE projects (
  id UUID PRIMARY KEY,
  name VARCHAR(255) NOT NULL,
  description TEXT,
  created_at TIMESTAMP DEFAULT NOW(),
  updated_at TIMESTAMP DEFAULT NOW()
);
```

## Technology Stack

Language-agnostic service (currently Node.js/JavaScript).

## Development

See package.json for available scripts.
