#!/bin/bash

# Startup script for user service with Prisma client regeneration

echo "Starting user service with runtime Prisma client generation..."

# Check if DATABASE_URL is set
if [ -z "$DATABASE_URL" ]; then
    echo "Warning: DATABASE_URL not set, using default"
    export DATABASE_URL="postgresql://user:password@localhost:5432/peerit"
fi

echo "DATABASE_URL: $DATABASE_URL"

# Regenerate Prisma client at runtime with the correct DATABASE_URL
if [ -f "prisma/schema.prisma" ]; then
    echo "Regenerating Prisma client with runtime DATABASE_URL..."
    npx prisma generate
    echo "Prisma client generated successfully"
else
    echo "No Prisma schema found, skipping client generation"
fi

# Start the application
echo "Starting Node.js application..."
exec node index.js
