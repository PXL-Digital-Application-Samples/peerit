const request = require('supertest');

// Add custom matcher for multiple status codes
expect.extend({
  toBeOneOf(received, expected) {
    const pass = expected.includes(received);
    if (pass) {
      return {
        message: () => `expected ${received} not to be one of [${expected.join(', ')}]`,
        pass: true,
      };
    } else {
      return {
        message: () => `expected ${received} to be one of [${expected.join(', ')}]`,
        pass: false,
      };
    }
  },
});

// Integration tests require Docker Compose infrastructure
describe('User Service - Integration Tests', () => {
  let app;

  beforeAll(async () => {
    // These tests require real infrastructure
    if (!process.env.TEST_INTEGRATION) {
      throw new Error('Integration tests require TEST_INTEGRATION=true');
    }

    // Set test environment with faster timeouts
    process.env.NODE_ENV = 'test';
    process.env.DATABASE_URL = 'postgresql://peerit_user:peerit_password@localhost:5432/peerit_user_test';
    process.env.KEYCLOAK_URL = 'http://localhost:8180';
    process.env.KEYCLOAK_REALM = 'peerit';
    
    // Import app after setting environment - this should be fast
    app = require('../../src/index');
    
    // Give a moment for any async initialization
    await new Promise(resolve => setTimeout(resolve, 100));
  }, 3000);

  describe('Service Health', () => {
    test('should return health status with real infrastructure', async () => {
      const response = await request(app)
        .get('/health')
        .timeout(2000);

      expect(response.status).toBe(200);
      expect(response.body.status).toBe('healthy');
      expect(response.body.service).toBe('user-service');
      expect(response.body.checks).toBeDefined();
      expect(response.body.checks.database).toBeDefined();
    }, 3000);

    test('should return service health check endpoint', async () => {
      const response = await request(app)
        .get('/api/service/health')
        .timeout(2000);

      expect(response.status).toBe(200);
      expect(response.body.status).toBe('healthy');
      expect(response.body.service).toBe('user-service');
      expect(response.body.checks).toBeDefined();
    }, 3000);

    test('should return service info', async () => {
      const response = await request(app)
        .get('/api/service/info')
        .timeout(2000);

      expect(response.status).toBe(200);
      expect(response.body.name).toBe('user-service');
      expect(response.body.description).toContain('User profile and role management');
      expect(response.body.features).toBeDefined();
      expect(response.body.endpoints).toBeDefined();
    }, 3000);
  });

  describe('API Documentation', () => {
    test('should serve OpenAPI specification', async () => {
      const response = await request(app)
        .get('/api/docs/openapi.json')
        .timeout(1000);

      expect(response.status).toBe(200);
      expect(response.body.openapi).toBeDefined();
      expect(response.body.info.title).toBeDefined();
      expect(response.body.info.title).toContain('User Service');
    }, 2000);

    test('should serve Swagger UI documentation', async () => {
      const response = await request(app)
        .get('/api/docs/')
        .timeout(1000);

      expect(response.status).toBe(200);
      expect(response.text).toContain('swagger-ui');
    }, 2000);
  });

  describe('Authentication Requirements', () => {
    test('should require authorization for user profile endpoints', async () => {
      const response = await request(app)
        .get('/api/users/test-user-id')
        .timeout(1000);

      expect(response.status).toBe(401);
      expect(response.body.error).toBe('Unauthorized');
      expect(response.body.message).toContain('No token provided');
    }, 2000);

    test('should require authorization for role management endpoints', async () => {
      const response = await request(app)
        .get('/api/users/test-user-id/roles')
        .timeout(1000);

      expect(response.status).toBe(401);
      expect(response.body.error).toBe('Unauthorized');
    }, 2000);

    test('should require authorization for team membership endpoints', async () => {
      const response = await request(app)
        .get('/api/users/test-user-id/teams')
        .timeout(1000);

      expect(response.status).toBe(401);
      expect(response.body.error).toBe('Unauthorized');
    }, 2000);

    test('should require authorization for sync endpoints', async () => {
      const response = await request(app)
        .get('/api/sync/status')
        .timeout(1000);

      expect(response.status).toBe(401);
      expect(response.body.error).toBe('Unauthorized');
    }, 2000);

    test('should reject invalid token format', async () => {
      const response = await request(app)
        .get('/api/users/test-user-id')
        .set('Authorization', 'Bearer invalid-token-format')
        .timeout(1000);

      expect(response.status).toBeOneOf([401, 403]);
      expect(response.body.error).toBeDefined();
    }, 2000);

    test('should handle malformed authorization header', async () => {
      const response = await request(app)
        .get('/api/users/test-user-id')
        .set('Authorization', 'InvalidFormat')
        .timeout(1000);

      expect(response.status).toBe(401);
      expect(response.body.error).toBe('Unauthorized');
      expect(response.body.message).toContain('Invalid token format');
    }, 2000);
  });

  describe('Service Metrics (Admin Only)', () => {
    test('should require authentication for metrics endpoint', async () => {
      const response = await request(app)
        .get('/api/service/metrics')
        .timeout(2000);

      expect(response.status).toBe(401);
      expect(response.body.error).toBe('Unauthorized');
    }, 3000);

    test('should reject non-admin access to metrics', async () => {
      const response = await request(app)
        .get('/api/service/metrics')
        .set('Authorization', 'Bearer fake-student-token')
        .timeout(2000);

      // Should fail with 401 (invalid token) or 403 (no admin role)
      expect(response.status).toBeOneOf([401, 403]);
      expect(response.body.error).toBeDefined();
    }, 3000);
  });

  describe('Database Integration', () => {
    test('should handle database connection in health check', async () => {
      const response = await request(app)
        .get('/api/service/health')
        .timeout(2000);

      // Health check should either succeed or fail gracefully
      expect([200, 503]).toContain(response.status);
      
      if (response.status === 200) {
        expect(response.body.checks.database).toBe('connected');
      } else {
        expect(response.body.checks.database).toBe('disconnected');
        expect(response.body.error).toBeDefined();
      }
    }, 3000);
  });

  describe('Error Handling', () => {
    test('should handle 404 for non-existent endpoints', async () => {
      const response = await request(app)
        .get('/api/non-existent-endpoint')
        .timeout(1000);

      expect(response.status).toBe(404);
    }, 2000);

    test('should handle invalid JSON in request body', async () => {
      const response = await request(app)
        .put('/api/users/test-user-id')
        .set('Content-Type', 'application/json')
        .send('invalid-json')
        .timeout(1000);

      expect(response.status).toBeOneOf([400, 401]); // 400 for bad JSON or 401 for auth
    }, 2000);

    test('should provide consistent error response format', async () => {
      const response = await request(app)
        .get('/api/users/test-user-id')
        .timeout(1000);

      expect(response.status).toBe(401);
      expect(response.body).toHaveProperty('error');
      expect(response.body).toHaveProperty('message');
      expect(response.body).toHaveProperty('code');
      expect(response.body).toHaveProperty('timestamp');
    }, 2000);
  });
});
