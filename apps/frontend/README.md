# Frontend Application

Reactive SPA built with SvelteKit for the Peerit peer evaluation platform.

## Technology Stack

- **Framework**: SvelteKit
- **Language**: TypeScript
- **Styling**: TailwindCSS
- **State Management**: Svelte stores
- **HTTP Client**: Fetch API

## Features

- Student dashboard for peer evaluations
- Admin dashboard for managing users, teams, and sessions
- Anonymous review submission interface
- Report viewing and export functionality

## Development

```bash
# Install dependencies
npm install

# Start development server
npm run dev

# Build for production
npm run build

# Preview production build
npm run preview
```

## Environment Variables

Create a `.env` file based on `.env.example`:

```env
VITE_API_BASE_URL=http://localhost:3000
VITE_BFF_BASE_URL=http://localhost:3001
```

## API Integration

The frontend communicates with the backend through the BFF (Backend-for-Frontend) service, which provides a simplified API tailored for frontend needs.

## Deployment

The application is containerized and can be deployed as a static site or SPA.

See `Dockerfile` for containerization details.
