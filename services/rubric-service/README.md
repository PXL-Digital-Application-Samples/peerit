# Rubric Service

Manages evaluation rubrics and question sets for peer reviews.

## Responsibilities

- Rubric CRUD operations
- Question management
- Rubric versioning
- Default rubric seeding

## API Endpoints

- `GET /rubrics` - List all rubrics
- `GET /rubrics/:id` - Get rubric by ID
- `POST /rubrics` - Create new rubric
- `PUT /rubrics/:id` - Update rubric (creates new version)
- `GET /rubrics/:id/questions` - Get rubric questions

## Database Schema

```sql
CREATE TABLE rubrics (
  id UUID PRIMARY KEY,
  name VARCHAR(255) NOT NULL,
  version INTEGER NOT NULL DEFAULT 1,
  description TEXT,
  locked BOOLEAN DEFAULT false,
  created_at TIMESTAMP DEFAULT NOW()
);

CREATE TABLE questions (
  id UUID PRIMARY KEY,
  rubric_id UUID REFERENCES rubrics(id),
  type VARCHAR(50) NOT NULL, -- 'likert', 'text'
  text TEXT NOT NULL,
  scale_min INTEGER,
  scale_max INTEGER,
  weight DECIMAL(3,2) DEFAULT 1.0,
  order_index INTEGER NOT NULL
);
```

## Technology Stack

Language-agnostic service (currently Node.js/JavaScript).
