#!/bin/bash

set -e

echo "Waiting for Keycloak to be ready..."

until curl -f http://localhost:8080/health/ready > /dev/null 2>&1; do
    echo "Waiting..."
    sleep 5
done

echo "Keycloak is ready."

export KEYCLOAK_ADMIN="${KC_BOOTSTRAP_ADMIN_USERNAME:-admin}"
export KEYCLOAK_ADMIN_PASSWORD="${KC_BOOTSTRAP_ADMIN_PASSWORD:-Admin123}"

echo "Logging into Keycloak..."

ADMIN_TOKEN=$(curl -s -X POST \
  http://localhost:8080/realms/master/protocol/openid-connect/token \
  -H "Content-Type: application/x-www-form-urlencoded" \
  -d "username=${KEYCLOAK_ADMIN}" \
  -d "password=${KEYCLOAK_ADMIN_PASSWORD}" \
  -d "grant_type=password" \
  -d "client_id=admin-cli" | jq -r '.access_token')

if [ -z "$ADMIN_TOKEN" ] || [ "$ADMIN_TOKEN" == "null" ]; then
    echo "Failed to get admin token"
    exit 1
fi

echo "Checking if 'peerit' realm exists..."

REALM_EXISTS=$(curl -s -o /dev/null -w "%{http_code}" \
  -H "Authorization: Bearer ${ADMIN_TOKEN}" \
  http://localhost:8080/admin/realms/peerit)

if [ "$REALM_EXISTS" = "200" ]; then
    echo "Realm exists."
else
    echo "Importing realm..."
    curl -s -X POST \
      http://localhost:8080/admin/realms \
      -H "Authorization: Bearer ${ADMIN_TOKEN}" \
      -H "Content-Type: application/json" \
      -d @/opt/keycloak/data/import/peerit-realm.json
    echo "Realm imported."
fi

echo "Keycloak setup complete."
