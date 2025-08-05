#!/bin/bash

# Keycloak initialization script for Peerit platform
# This script sets up the initial realm configuration and development users

set -e

echo "Starting Keycloak initialization for Peerit platform..."

# Wait for Keycloak to be ready
echo "Waiting for Keycloak to be available..."
until curl -f http://localhost:8080/realms/master > /dev/null 2>&1; do
    echo "Waiting for Keycloak startup..."
    sleep 5
done

echo "Keycloak is ready. Starting configuration..."

# Set up admin credentials
export KEYCLOAK_ADMIN=admin
export KEYCLOAK_ADMIN_PASSWORD=admin

# Login to admin console
echo "Logging in to Keycloak admin console..."
ADMIN_TOKEN=$(curl -s -X POST \
  http://localhost:8080/realms/master/protocol/openid-connect/token \
  -H "Content-Type: application/x-www-form-urlencoded" \
  -d "username=${KEYCLOAK_ADMIN}" \
  -d "password=${KEYCLOAK_ADMIN_PASSWORD}" \
  -d "grant_type=password" \
  -d "client_id=admin-cli" | jq -r '.access_token')

if [ "$ADMIN_TOKEN" = "null" ] || [ -z "$ADMIN_TOKEN" ]; then
    echo "Failed to obtain admin token. Exiting."
    exit 1
fi

echo "Admin token obtained successfully."

# Check if peerit realm already exists
echo "Checking if peerit realm exists..."
REALM_EXISTS=$(curl -s -o /dev/null -w "%{http_code}" \
  -H "Authorization: Bearer ${ADMIN_TOKEN}" \
  http://localhost:8080/admin/realms/peerit)

if [ "$REALM_EXISTS" = "200" ]; then
    echo "Peerit realm already exists. Skipping realm creation."
else
    echo "Creating peerit realm..."
    
    # Import realm configuration
    REALM_IMPORT_RESPONSE=$(curl -s -X POST \
      http://localhost:8080/admin/realms \
      -H "Authorization: Bearer ${ADMIN_TOKEN}" \
      -H "Content-Type: application/json" \
      -d @/opt/keycloak/data/import/peerit-realm.json)
    
    if [ $? -eq 0 ]; then
        echo "Peerit realm created successfully."
    else
        echo "Failed to create peerit realm: $REALM_IMPORT_RESPONSE"
        exit 1
    fi
fi

# Verify realm configuration
echo "Verifying realm configuration..."
REALM_INFO=$(curl -s \
  -H "Authorization: Bearer ${ADMIN_TOKEN}" \
  http://localhost:8080/admin/realms/peerit)

if echo "$REALM_INFO" | jq -e '.realm == "peerit"' > /dev/null; then
    echo "Realm verification successful."
    
    # Display realm information
    echo "Realm: $(echo "$REALM_INFO" | jq -r '.realm')"
    echo "Display Name: $(echo "$REALM_INFO" | jq -r '.displayName')"
    echo "Enabled: $(echo "$REALM_INFO" | jq -r '.enabled')"
    echo "Registration Allowed: $(echo "$REALM_INFO" | jq -r '.registrationAllowed')"
    echo "Email Verification: $(echo "$REALM_INFO" | jq -r '.verifyEmail')"
else
    echo "Realm verification failed."
    exit 1
fi

# List users in the realm
echo "Checking users in peerit realm..."
USERS_COUNT=$(curl -s \
  -H "Authorization: Bearer ${ADMIN_TOKEN}" \
  "http://localhost:8080/admin/realms/peerit/users?max=100" | jq length)

echo "Number of users in peerit realm: $USERS_COUNT"

# List clients in the realm
echo "Checking clients in peerit realm..."
CLIENTS=$(curl -s \
  -H "Authorization: Bearer ${ADMIN_TOKEN}" \
  "http://localhost:8080/admin/realms/peerit/clients")

echo "Clients in peerit realm:"
echo "$CLIENTS" | jq -r '.[] | "- \(.clientId): \(.name // "No name")"'

echo ""
echo "========================================="
echo "Keycloak Peerit Realm Setup Complete!"
echo "========================================="
echo ""
echo "Access URLs:"
echo "- Admin Console: http://localhost:8080/admin"
echo "- Peerit Realm: http://localhost:8080/realms/peerit"
echo "- Account Console: http://localhost:8080/realms/peerit/account"
echo ""
echo "Default Admin Credentials:"
echo "- Username: admin"
echo "- Password: admin"
echo ""
echo "Development Users:"
echo "- Admin: admin@peerit.local / Admin123"
echo "- Teacher: teacher1@peerit.local / Teacher123"
echo "- Student 1: student1@peerit.local / Student123"
echo "- Student 2: student2@peerit.local / Student123"
echo "- Student 3: student3@peerit.local / Student123"
echo ""
echo "Client Applications:"
echo "- peerit-frontend (Public SPA)"
echo "- peerit-api (Confidential API)"
echo "- peerit-services (Bearer-only)"
echo ""
echo "Next Steps:"
echo "1. Configure your frontend application to use Keycloak"
echo "2. Update API services to validate Keycloak tokens"
echo "3. Customize themes in themes/peerit/ directory"
echo "4. Review and adjust security settings for production"
echo ""
