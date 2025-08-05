# Keycloak for Peerit Platform
# 
# Pre-configured Keycloak image with Peerit realm and themes
# Built on Keycloak v26+ with environment-based configuration

FROM quay.io/keycloak/keycloak:latest

# Set metadata
LABEL org.opencontainers.image.title="Peerit Keycloak"
LABEL org.opencontainers.image.description="Pre-configured Keycloak for Peerit anonymous peer evaluation platform"
LABEL org.opencontainers.image.vendor="PXL Digital Application Samples"
LABEL org.opencontainers.image.source="https://github.com/PXL-Digital-Application-Samples/peerit"

# Switch to root to install packages and setup
USER root

# Note: Keycloak image is minimal and doesn't have package managers
# We'll use the built-in health check capabilities instead

# Copy realm configuration and themes
COPY realm-config/ /opt/keycloak/data/import/
COPY themes/ /opt/keycloak/themes/

# Copy initialization scripts
COPY scripts/ /opt/keycloak/scripts/
RUN chmod +x /opt/keycloak/scripts/*.sh

# Set ownership and permissions
RUN chown -R keycloak:keycloak /opt/keycloak/data/import/ /opt/keycloak/themes/ /opt/keycloak/scripts/
RUN chmod -R 755 /opt/keycloak/data/import/ /opt/keycloak/themes/

# Switch back to keycloak user
USER keycloak

# Default environment variables (can be overridden)
ENV KC_HEALTH_ENABLED=true
ENV KC_METRICS_ENABLED=true
ENV KC_HTTP_ENABLED=true
ENV KC_HOSTNAME_STRICT=false
ENV KC_HOSTNAME_STRICT_HTTPS=false
ENV KC_LOG_LEVEL=INFO

# Database configuration (must be provided via environment)
ENV KC_DB=postgres
# KC_DB_URL, KC_DB_USERNAME, KC_DB_PASSWORD must be set at runtime

# Admin configuration (must be provided via environment at runtime)
# KC_BOOTSTRAP_ADMIN_USERNAME and KC_BOOTSTRAP_ADMIN_PASSWORD must be set

# Expose port
EXPOSE 8080

# Health check using built-in Keycloak health endpoint
HEALTHCHECK --interval=30s --timeout=10s --retries=5 --start-period=60s \
    CMD bash -c "</dev/tcp/localhost/8080" || exit 1

# Default entrypoint
ENTRYPOINT ["/opt/keycloak/bin/kc.sh"]
CMD ["start", "--optimized", "--import-realm"]
