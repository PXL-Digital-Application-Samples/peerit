# Frontend Application

Reactive SPA built with Vue.js for the Peerit peer evaluation platform.

## Technology Stack

- **Framework**: Vue.js 3
- **Language**: JavaScript
- **Build Tool**: Vite
- **Styling**: TailwindCSS
- **State Management**: Pinia
- **HTTP Client**: Axios
- **Router**: Vue Router

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

# Lint code
npm run lint

# Format code
npm run format
```

## Environment Variables

Create a `.env` file based on `.env.example`:

```env
VITE_API_BASE_URL=http://localhost:3000
VITE_BFF_BASE_URL=http://localhost:3001
```

## API Integration

The frontend communicates with the backend through the BFF (Backend-for-Frontend) service, which provides a simplified API tailored for frontend needs.

## Project Structure

```
src/
├── components/          # Reusable Vue components
├── views/              # Page components
├── router/             # Vue Router configuration
├── stores/             # Pinia stores for state management
├── services/           # API service functions
├── assets/             # Static assets
└── main.js             # Application entry point
```

## Deployment

The application is containerized and can be deployed as a static site.

See `Dockerfile` for containerization details.
