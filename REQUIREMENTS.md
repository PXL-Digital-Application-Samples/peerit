# Peerit – Requirements Specification

Audience: Students (3–8 per team) doing long-term IT projects  
Admin: Instructor or course staff  
Use case: Students evaluate each other anonymously after a project or project phase.

## 1. User Management

### 1.1. User Accounts
- Managed internally (no external identity providers).
- Defined via CSV import: name, email, team.
- Login options:
  - Email/password (securely hashed via bcrypt or argon2)
  - Magic-link login via email

### 1.2. Roles
- Two roles: admin and student
- Admins manage users, teams, sessions, rubrics, and reports

## 2. Team & Project Management

### 2.1. Teams
- Each student is in exactly one team
- Defined via UI or CSV import

### 2.2. Projects (Optional)
- Teams may be assigned to projects
- Multiple review sessions per project are allowed

## 3. Rubric Management

### 3.1. Rubrics (Question Sets)
- Admin defines question sets with:
  - Likert-scale questions (0–5)
  - Optional text response questions
  - Optional weights for scoring
- Rubrics are versioned
- Once assigned to a session, a rubric version is locked

### 3.2. Default Rubric (Pre-seeded)
Likert-scale (0–5):
1. Contributed significantly to the project
2. Met deadlines and commitments
3. Collaborated effectively
4. Communicated clearly
5. Showed initiative
6. Demonstrated technical skill
7. Receptive to feedback

Optional open-ended:
- What did this team member do particularly well?
- How could they improve?

Optional team reflection:
- Biggest challenge?
- How well did the team collaborate?

## 4. Peer Review Workflow

### 4.1. Review Sessions
- Admin initiates review session via UI
- Orchestrator:
  - Creates session via review-service
  - Retrieves users via user-service
  - Generates magic links via auth-service
  - Sends invitations via email-service

### 4.2. Review Process
- Each student gets a unique link to complete reviews anonymously
- Students evaluate all teammates
- Admins can see submission status, not content

### 4.3. Deadlines & Reminders
- Deadline is enforced
- Email reminders sent to incomplete reviewers (via email-service)

## 5. Reports & Results

### 5.1. Individual Reports
- After session closes:
  - report-service compiles feedback
  - Includes score profile (e.g., spider chart)
  - Anonymous comments included
- Reports are immutable post-generation

### 5.2. Admin Access
- Admin can:
  - View/export reports
  - Track who submitted
  - Export scores/comments by team/student (CSV, PDF)

## 6. Admin Dashboard
- User/team management (CSV or UI)
- Rubric management
- Review session creation and monitoring
- Report viewing/exporting
- Reminder email controls

## 7. Privacy & Security
- Student reviews are anonymous
- Passwords are securely hashed
- Review data is immutable post-submission
- GDPR-aligned data handling

## 8. Technical Architecture Overview

- Frontend: Reactive SPA (e.g. SvelteKit or Vue.js)
- API Gateway: Caddy (open-source, easy Kubernetes deployment)
- Orchestrator: Coordinates multi-step workflows
- Microservices:
  - auth-service
  - user-service
  - team-service
  - rubric-service
  - review-service
  - report-service
  - email-service
- Database: PostgreSQL (default); services must abstract DB access to enable switch to MySQL if needed

## 9. Future Scope
- Self-assessment (definite)
- Multi-phase reviews (e.g., mid + final)
- Review quality scoring (optional)
- Conflict detection & team dynamics questions (optional)
- LMS integrations (e.g., Canvas) (optional)

