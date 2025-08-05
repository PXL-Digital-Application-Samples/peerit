// Peerit Realm Tests
// Test realm import and configuration

describe('Peerit Realm', () => {
  beforeAll(async () => {
    await waitForKeycloak();
  }, global.TEST_TIMEOUT);

  describe('Realm Configuration', () => {
    test('peerit realm should exist', async () => {
      const response = await fetch(`${global.KEYCLOAK_URL}/realms/peerit/.well-known/openid_configuration`);
      expect(response.status).toBe(200);
      
      const config = await response.json();
      expect(config.realm).toBe('peerit');
    });

    test('peerit realm should have correct issuer', async () => {
      const response = await fetch(`${global.KEYCLOAK_URL}/realms/peerit/.well-known/openid_configuration`);
      const config = await response.json();
      
      expect(config.issuer).toMatch(/\/realms\/peerit$/);
    });

    test('peerit realm should support required flows', async () => {
      const response = await fetch(`${global.KEYCLOAK_URL}/realms/peerit/.well-known/openid_configuration`);
      const config = await response.json();
      
      expect(config.grant_types_supported).toContain('authorization_code');
      expect(config.grant_types_supported).toContain('refresh_token');
      expect(config.response_types_supported).toContain('code');
    });

    test('peerit realm should have JWKS endpoint', async () => {
      const response = await fetch(`${global.KEYCLOAK_URL}/realms/peerit/.well-known/openid_configuration`);
      const config = await response.json();
      
      const jwksResponse = await fetch(config.jwks_uri);
      expect(jwksResponse.status).toBe(200);
      
      const jwks = await jwksResponse.json();
      expect(jwks).toHaveProperty('keys');
      expect(Array.isArray(jwks.keys)).toBe(true);
      expect(jwks.keys.length).toBeGreaterThan(0);
    });
  });

  describe('Authentication Endpoints', () => {
    test('authorization endpoint should be accessible', async () => {
      const response = await fetch(`${global.KEYCLOAK_URL}/realms/peerit/protocol/openid-connect/auth?client_id=test&response_type=code&redirect_uri=http://localhost:3000`);
      expect([200, 302, 400]).toContain(response.status); // Various auth responses are acceptable
    });

    test('token endpoint should handle POST requests', async () => {
      const response = await fetch(`${global.KEYCLOAK_URL}/realms/peerit/protocol/openid-connect/token`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/x-www-form-urlencoded' },
        body: 'grant_type=authorization_code&code=invalid'
      });
      expect([400, 401]).toContain(response.status); // Should reject invalid requests properly
    });
  });

  describe('Account Console', () => {
    test('account console should be accessible', async () => {
      const response = await fetch(`${global.KEYCLOAK_URL}/realms/peerit/account/`);
      expect([200, 302]).toContain(response.status); // Either loads or redirects to login
    });
  });
});
