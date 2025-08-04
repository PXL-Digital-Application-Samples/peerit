const request = require('supertest');
const app = require('../../src/index');

describe('Service Endpoints', () => {
  // Set timeout for all tests in this suite
  jest.setTimeout(5000);

  describe('GET /health', () => {
    it('should return health status', async () => {
      const response = await request(app)
        .get('/health')
        .expect('Content-Type', /json/);

      expect(response.body).toHaveProperty('status');
      expect(response.body).toHaveProperty('timestamp');
      expect(response.body).toHaveProperty('version');
      expect(response.body).toHaveProperty('uptime');
      expect(response.body).toHaveProperty('database');
      
      expect(['UP', 'DOWN']).toContain(response.body.status);
      expect(typeof response.body.uptime).toBe('number');
      expect(typeof response.body.timestamp).toBe('string');
      expect(typeof response.body.version).toBe('string');
    });

    it('should return 200 when service is healthy', async () => {
      // This test might fail if database is not connected, but that's expected
      const response = await request(app)
        .get('/health');

      if (response.body.status === 'UP') {
        expect(response.status).toBe(200);
      } else {
        expect(response.status).toBe(503);
      }
    });

    it('should return proper database information', async () => {
      const response = await request(app)
        .get('/health');

      expect(response.body.database).toBeDefined();
      expect(typeof response.body.database).toBe('object');
    });
  });

  describe('GET /info', () => {
    it('should return comprehensive service information', async () => {
      const response = await request(app)
        .get('/info')
        .expect(200)
        .expect('Content-Type', /json/);

      // Check service information
      expect(response.body).toHaveProperty('service');
      expect(response.body.service).toHaveProperty('name', 'auth-service');
      expect(response.body.service).toHaveProperty('version');
      expect(response.body.service).toHaveProperty('description');

      // Check environment information
      expect(response.body).toHaveProperty('environment');
      expect(response.body.environment).toHaveProperty('nodeVersion');
      expect(response.body.environment).toHaveProperty('environment');
      expect(response.body.environment).toHaveProperty('port');
      expect(typeof response.body.environment.port).toBe('number');

      // Check database configuration
      expect(response.body).toHaveProperty('database');
      expect(response.body.database).toHaveProperty('provider', 'prisma');
      expect(response.body.database).toHaveProperty('type');
      expect(response.body.database).toHaveProperty('url');
      expect(response.body.database).toHaveProperty('connected');
      expect(response.body.database).toHaveProperty('mode');

      // Check sessions configuration
      expect(response.body).toHaveProperty('sessions');
      expect(response.body.sessions).toHaveProperty('provider');
      expect(response.body.sessions).toHaveProperty('connected');
      expect(response.body.sessions).toHaveProperty('mode');

      // Check features
      expect(response.body).toHaveProperty('features');
      expect(response.body.features).toHaveProperty('magicLinks', true);
      expect(response.body.features).toHaveProperty('jwtRefresh', true);
      expect(response.body.features).toHaveProperty('rateLimiting', true);

      // Check build information
      expect(response.body).toHaveProperty('build');
      expect(response.body.build).toHaveProperty('timestamp');
      expect(response.body.build).toHaveProperty('commit');
    });

    it('should sanitize database URL credentials', async () => {
      const response = await request(app)
        .get('/info')
        .expect(200);

      if (response.body.database.url.includes('://')) {
        expect(response.body.database.url).toMatch(/\*\*\*:\*\*\*/);
        expect(response.body.database.url).not.toMatch(/password|user|credentials/i);
      }
    });

    it('should include correct database type from connection string', async () => {
      const response = await request(app)
        .get('/info')
        .expect(200);

      if (process.env.DATABASE_URL) {
        const dbType = process.env.DATABASE_URL.split('://')[0];
        expect(response.body.database.type).toBe(dbType);
      }
    });

    it('should show session provider based on Redis URL configuration', async () => {
      const response = await request(app)
        .get('/info')
        .expect(200);

      if (process.env.REDIS_URL) {
        expect(response.body.sessions.provider).toBe('redis');
      } else {
        expect(response.body.sessions.provider).toBe('memory');
      }
    });
  });

  describe('GET /validate', () => {
    it('should require Authorization header', async () => {
      const response = await request(app)
        .get('/validate')
        .expect(401)
        .expect('Content-Type', /json/);

      expect(response.body).toHaveProperty('error', 'MISSING_TOKEN');
      expect(response.body).toHaveProperty('message');
      expect(response.body).toHaveProperty('timestamp');
    });

    it('should require Bearer token format', async () => {
      const response = await request(app)
        .get('/validate')
        .set('Authorization', 'InvalidFormat token123')
        .expect(401);

      expect(response.body.error).toBe('MISSING_TOKEN');
    });

    it('should validate token format in Authorization header', async () => {
      const response = await request(app)
        .get('/validate')
        .set('Authorization', 'Bearer invalid-token')
        .expect(401);

      expect(response.body.error).toBe('INVALID_TOKEN');
    });
  });
});
