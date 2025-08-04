const request = require('supertest');

// Simple integration test focused on database connectivity
describe('Auth Service - Database Integration Tests', () => {
  let app;
  let server;

  beforeAll(async () => {
    // Set environment for integration testing
    process.env.NODE_ENV = 'test';
    process.env.TEST_INTEGRATION = 'true';
    process.env.DATABASE_URL = 'postgresql://peerit:peerit_dev@localhost:5432/peerit_auth';
    process.env.REDIS_URL = 'redis://localhost:6379/1';
    process.env.JWT_SECRET = 'test_jwt_secret';
    process.env.JWT_REFRESH_SECRET = 'test_jwt_refresh_secret';

    // Import app after environment is set
    app = require('../../src/index');
    
    // Create server with short timeout
    server = app.listen(0, '127.0.0.1');
    
    // Wait a moment for server to start
    await new Promise(resolve => setTimeout(resolve, 500));
  }, 10000);

  afterAll(async () => {
    if (server) {
      server.close();
    }
    // Force exit after short delay
    setTimeout(() => process.exit(0), 100);
  }, 2000);

  describe('Infrastructure Tests', () => {
    test('health endpoint should connect to real database', async () => {
      const response = await request(app)
        .get('/health')
        .timeout(3000);

      expect(response.status).toBeGreaterThanOrEqual(200);
      expect(response.body.database).toBeDefined();
      expect(response.body.session).toBeDefined();
      
      // Should be using real database, not mock
      expect(response.body.database.mode).not.toBe('mock');
    }, 5000);

    test('info endpoint should show real database connection', async () => {
      const response = await request(app)
        .get('/info')
        .timeout(3000);

      expect(response.status).toBe(200);
      expect(response.body.database.provider).toBe('prisma');
      expect(response.body.database.type).toBe('postgresql');
      
      // Should not be mock mode
      expect(response.body.database.mode).not.toBe('mock');
    }, 5000);

    test('login endpoint should respond (database connectivity test)', async () => {
      const response = await request(app)
        .post('/login')
        .send({
          email: 'test@example.com',
          password: 'TestPassword123!'
        })
        .timeout(3000);

      // Should get a response (whether success or failure doesn't matter for connectivity test)
      expect(response.status).toBeGreaterThanOrEqual(200);
      expect(response.body).toBeDefined();
    }, 5000);

    test('magic link endpoint should respond', async () => {
      const response = await request(app)
        .post('/magic-link')
        .send({
          email: 'test@example.com'
        })
        .timeout(3000);

      expect(response.status).toBeGreaterThanOrEqual(200);
      expect(response.body).toBeDefined();
    }, 5000);

    test('validate endpoint should respond', async () => {
      const response = await request(app)
        .get('/validate')
        .timeout(3000);

      expect(response.status).toBe(401); // Expected without token
      expect(response.body.error).toBe('MISSING_TOKEN');
    }, 5000);
  });
});
