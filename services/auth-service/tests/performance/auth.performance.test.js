const request = require('supertest');
const app = require('../../src/index');

// Mock the database service
jest.mock('../../src/services/database');
const databaseService = require('../../src/services/database');

describe('Auth Service Performance Tests', () => {
  beforeEach(() => {
    jest.clearAllMocks();
    
    // Mock health check to be fast
    databaseService.healthCheck.mockResolvedValue({
      database: 'disconnected',
      redis: 'disconnected'
    });
  });

  describe('Response Time Performance', () => {
    test('health endpoint should respond quickly', async () => {
      const startTime = Date.now();
      
      await request(app)
        .get('/health')
        .expect(200);
      
      const responseTime = Date.now() - startTime;
      expect(responseTime).toBeLessThan(100); // Should respond in under 100ms
    });

    test('docs endpoint should respond within reasonable time', async () => {
      const startTime = Date.now();
      
      await request(app)
        .get('/docs/openapi.json')
        .expect(200);
      
      const responseTime = Date.now() - startTime;
      expect(responseTime).toBeLessThan(200); // Should respond in under 200ms
    });

    test('validation should be fast for invalid requests', async () => {
      const startTime = Date.now();
      
      await request(app)
        .post('/login')
        .send({
          email: 'invalid-email',
          password: 'weak'
        })
        .expect(400);
      
      const responseTime = Date.now() - startTime;
      expect(responseTime).toBeLessThan(50); // Validation should be very fast
    });
  });

  describe('Concurrent Request Handling', () => {
    test('should handle multiple health check requests concurrently', async () => {
      const concurrentRequests = 10;
      const requests = Array(concurrentRequests).fill().map(() =>
        request(app).get('/health').expect(503)
      );

      const startTime = Date.now();
      const responses = await Promise.all(requests);
      const totalTime = Date.now() - startTime;

      // All requests should complete
      expect(responses).toHaveLength(concurrentRequests);
      
      // Should not take much longer than a single request
      expect(totalTime).toBeLessThan(500);
      
      // All responses should be valid
      responses.forEach(response => {
        expect(response.body).toHaveProperty('status');
        expect(response.body).toHaveProperty('timestamp');
      });
    });

    test('should handle multiple validation requests concurrently', async () => {
      const concurrentRequests = 5;
      const requests = Array(concurrentRequests).fill().map(() =>
        request(app)
          .post('/login')
          .send({
            email: 'invalid-email',
            password: 'weak'
          })
          .expect(400)
      );

      const startTime = Date.now();
      const responses = await Promise.all(requests);
      const totalTime = Date.now() - startTime;

      expect(responses).toHaveLength(concurrentRequests);
      expect(totalTime).toBeLessThan(300);
      
      responses.forEach(response => {
        expect(response.body).toHaveProperty('error', 'Validation failed');
      });
    });
  });

  describe('Memory Usage', () => {
    test('should not leak memory during multiple requests', async () => {
      const initialMemory = process.memoryUsage();
      
      // Make many requests
      const requests = Array(50).fill().map(() =>
        request(app).get('/health').expect(503)
      );
      
      await Promise.all(requests);
      
      // Force garbage collection if available
      if (global.gc) {
        global.gc();
      }
      
      const finalMemory = process.memoryUsage();
      
      // Memory shouldn't grow significantly (within 50MB)
      const memoryDiff = finalMemory.heapUsed - initialMemory.heapUsed;
      expect(memoryDiff).toBeLessThan(50 * 1024 * 1024); // 50MB
    });
  });

  describe('Rate Limiting Performance', () => {
    test('rate limiting should not significantly impact response time', async () => {
      // Mock database for failed logins
      databaseService.findUserByEmail.mockResolvedValue(null);
      
      const loginData = {
        email: 'test@example.com',
        password: 'StrongPassword123!'
      };

      // First request (should be fast)
      const startTime1 = Date.now();
      await request(app)
        .post('/login')
        .send(loginData)
        .expect(401);
      const time1 = Date.now() - startTime1;

      // Second request (should still be fast due to rate limiting check)
      const startTime2 = Date.now();
      await request(app)
        .post('/login')
        .send(loginData)
        .expect(401);
      const time2 = Date.now() - startTime2;

      // Rate limiting check shouldn't add significant overhead
      expect(Math.abs(time2 - time1)).toBeLessThan(100);
    });
  });
});
