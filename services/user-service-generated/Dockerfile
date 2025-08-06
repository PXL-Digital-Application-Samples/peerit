# Multi-stage Node.js Dockerfile for production deployment
# Stage 1: Build dependencies
FROM node:22-alpine AS builder

# Install dumb-init for proper signal handling
RUN apk add --no-cache dumb-init

# Set working directory
WORKDIR /app

# Copy package files first for better layer caching
COPY package*.json ./

# Install only production dependencies (generate lock file if needed)
RUN npm install --only=production && npm cache clean --force

# Stage 2: Production image
FROM node:22-alpine AS production

# Set environment for production optimizations
ENV NODE_ENV=production

# Create non-root user for security
RUN addgroup -g 1001 -S nodejs && \
    adduser -S service -u 1001 -G nodejs

# Copy dumb-init from builder stage
COPY --from=builder /usr/bin/dumb-init /usr/bin/dumb-init

# Set working directory
WORKDIR /app

# Copy dependencies from builder stage
COPY --from=builder --chown=service:nodejs /app/node_modules ./node_modules

# Copy application code
COPY --chown=service:nodejs . .

# Switch to non-root user
USER service

# Expose port
EXPOSE 3020

# Health check for container orchestration
HEALTHCHECK --interval=30s --timeout=3s --start-period=5s --retries=3 \
  CMD wget --no-verbose --tries=1 --spider http://localhost:3020/health || exit 1

# Use dumb-init for proper signal handling
ENTRYPOINT ["/usr/bin/dumb-init", "--"]

# Start the application
CMD ["node", "index.js"]
