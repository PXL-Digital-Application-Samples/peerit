const request = require('supertest');

// Integration tests require Docker Compose infrastructure
describe('Auth Service - Integration Tests', () => {
  let app;

  beforeAll(async () => {
    // These tests require real infrastructure
    if (!process.env.TEST_INTEGRATION) {
      throw new Error('Integration tests require TEST_INTEGRATION=true');
    }

    // Set test environment with faster timeouts
    process.env.NODE_ENV = 'test';
    process.env.JWT_SECRET = 'test-secret-not-for-production';
    
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
      expect(response.body.status).toBe('UP');
      expect(response.body.database).toBeDefined();
      expect(response.body.session).toBeDefined();
    }, 3000);

    test('should return service info with real configuration', async () => {
      const response = await request(app)
        .get('/info')
        .timeout(2000);

      expect(response.status).toBe(200);
      expect(response.body.service.name).toBe('auth-service');
      expect(response.body.database.provider).toBe('prisma');
      expect(response.body.sessions.provider).toBeDefined();
    }, 3000);
  });

  describe('API Documentation', () => {
    test('should serve OpenAPI specification', async () => {
      const response = await request(app)
        .get('/docs/openapi.json')
        .timeout(1000);

      expect(response.status).toBe(200);
      expect(response.body.openapi).toBeDefined();
      expect(response.body.info.title).toBeDefined();
    }, 2000);
  });

  describe('Authentication Endpoints', () => {
    test('should handle login validation', async () => {
      const response = await request(app)
        .post('/login')
        .send({
          email: 'invalid-email',
          password: 'test'
        })
        .timeout(1000);

      expect(response.status).toBe(400);
      expect(response.body.error).toBeDefined();
    }, 2000);

    test('should require authorization for protected endpoints', async () => {
      const response = await request(app)
        .get('/validate')
        .timeout(1000);

      expect(response.status).toBe(401);
      expect(response.body.error).toBe('MISSING_TOKEN');
    }, 2000);
  });
});
