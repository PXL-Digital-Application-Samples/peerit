FROM caddy:2-alpine

# Copy configuration
COPY caddy.json /etc/caddy/caddy.json

# Expose ports
EXPOSE 80 443

# Start Caddy
CMD ["caddy", "run", "--config", "/etc/caddy/caddy.json"]
