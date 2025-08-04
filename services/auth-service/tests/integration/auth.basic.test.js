const request = require('supertest');
const app = require('../../src/index');

// Mock the database service for integration tests
jest.mock('../../src/services/database');
const databaseService = require('../../src/services/database');

describe('Auth Service - Basic Integration Tests', () => {
  beforeEach(() => {
    jest.clearAllMocks();
    
    // Set up common mock behaviors
    databaseService.healthCheck.mockResolvedValue({
      database: 'disconnected',
      redis: 'disconnected'
    });
  });

  describe('Health and Documentation', () => {
    test('GET /auth/health should return health status', async () => {
      const response = await request(app)
        .get('/auth/health')
        .expect(200);

      expect(response.body).toHaveProperty('status');
      expect(response.body).toHaveProperty('timestamp');
      expect(response.body).toHaveProperty('version');
      expect(response.body).toHaveProperty('dependencies');
    });

    test('GET /auth/docs/json should return OpenAPI spec', async () => {
      const response = await request(app)
        .get('/auth/docs/json')
        .expect(200);

      expect(response.body).toHaveProperty('openapi');
      expect(response.body).toHaveProperty('info');
      expect(response.body.info.title).toBe('Peerit Auth Service API');
    });
  });

  describe('Validation', () => {
    test('should reject invalid email format', async () => {
      const response = await request(app)
        .post('/auth/login')
        .send({
          email: 'invalid-email',
          password: 'StrongPassword123!'
        })
        .expect(400);

      expect(response.body).toHaveProperty('error');
    });

    test('should require both email and password', async () => {
      const response = await request(app)
        .post('/auth/login')
        .send({
          email: 'test@example.com'
          // missing password
        })
        .expect(400);

      expect(response.body).toHaveProperty('error');
    });
  });

  describe('Error Handling', () => {
    test('should handle 404 for non-existent endpoints', async () => {
      const response = await request(app)
        .get('/auth/non-existent')
        .expect(404);

      expect(response.body).toHaveProperty('error');
    });
  });

  describe('Security Headers', () => {
    test('should include security headers', async () => {
      const response = await request(app)
        .get('/auth/health')
        .expect(200);

      expect(response.headers).toHaveProperty('x-content-type-options');
      expect(response.headers).toHaveProperty('x-frame-options');
    });

    test('should handle CORS', async () => {
      const response = await request(app)
        .options('/auth/login')
        .set('Origin', 'http://localhost:3000')
        .expect(204);

      expect(response.headers).toHaveProperty('access-control-allow-origin');
    });
  });
});
