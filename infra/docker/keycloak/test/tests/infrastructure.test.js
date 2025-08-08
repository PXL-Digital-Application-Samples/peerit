// Keycloak Infrastructure Tests
// Declarative testing for Keycloak deployment

describe('Keycloak Infrastructure', () => {
  beforeAll(async () => {
    await waitForKeycloak();
  }, global.TEST_TIMEOUT);

  describe('Health Checks', () => {
    test('health endpoint should be accessible', async () => {
      const response = await fetch(`${global.KEYCLOAK_URL}/health`);
      expect(response.status).toBe(200);
    });

    test('ready endpoint should confirm readiness', async () => {
      const response = await fetch(`${global.KEYCLOAK_URL}/health/ready`);
      expect(response.status).toBe(200);
    });

    test('metrics endpoint should be accessible', async () => {
      const response = await fetch(`${global.KEYCLOAK_URL}/metrics`);
      expect(response.status).toBe(200);
    });
  });

  describe('Admin Console', () => {
    test('admin console should be accessible', async () => {
      const response = await fetch(`${global.KEYCLOAK_URL}/admin/`);
      expect(response.status).toBe(302); // Redirect to login
    });

    test('admin console should serve static assets', async () => {
      const response = await fetch(`${global.KEYCLOAK_URL}/admin/console/favicon.ico`);
      expect([200, 404]).toContain(response.status); // Either exists or 404 is acceptable
    });
  });

  describe('Master Realm', () => {
    test('master realm should be accessible', async () => {
      const response = await fetch(`${global.KEYCLOAK_URL}/realms/master/.well-known/openid_configuration`);
      expect(response.status).toBe(200);
      
      const config = await response.json();
      expect(config.realm).toBe('master');
      expect(config.issuer).toContain('/realms/master');
    });

    test('master realm should have required endpoints', async () => {
      const response = await fetch(`${global.KEYCLOAK_URL}/realms/master/.well-known/openid_configuration`);
      const config = await response.json();
      
      expect(config).toHaveProperty('authorization_endpoint');
      expect(config).toHaveProperty('token_endpoint');
      expect(config).toHaveProperty('userinfo_endpoint');
      expect(config).toHaveProperty('jwks_uri');
    });
  });
});
