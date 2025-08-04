const axios = require('axios');

// Test against the running service instead of importing the app
const BASE_URL = 'http://localhost:3020';

describe('Service Endpoints - Live Tests', () => {
  // Only run these tests if the service is actually running
  const timeout = 5000;
  
  beforeAll(async () => {
    try {
      await axios.get(`${BASE_URL}/auth/health`, { timeout: 2000 });
    } catch (error) {
      console.log('⚠️ Service not running, skipping live tests');
      throw new Error('Service not available for testing');
    }
  });

  describe('GET /auth/health', () => {
    it('should return health status with proper structure', async () => {
      const response = await axios.get(`${BASE_URL}/auth/health`);
      
      expect(response.status).toBeGreaterThanOrEqual(200);
      expect(response.data).toHaveProperty('status');
      expect(response.data).toHaveProperty('timestamp');
      expect(response.data).toHaveProperty('version');
      expect(response.data).toHaveProperty('uptime');
      expect(response.data).toHaveProperty('database');
      
      expect(['UP', 'DOWN']).toContain(response.data.status);
      expect(typeof response.data.uptime).toBe('number');
      expect(typeof response.data.timestamp).toBe('string');
      expect(typeof response.data.version).toBe('string');
    });

    it('should return appropriate status code based on health', async () => {
      const response = await axios.get(`${BASE_URL}/auth/health`, {
        validateStatus: () => true // Accept any status code
      });

      if (response.data.status === 'UP') {
        expect(response.status).toBe(200);
      } else {
        expect(response.status).toBe(503);
      }
    });
  });

  describe('GET /auth/info', () => {
    it('should return comprehensive service information', async () => {
      const response = await axios.get(`${BASE_URL}/auth/info`);
      
      expect(response.status).toBe(200);
      expect(response.headers['content-type']).toContain('application/json');

      // Check service information
      expect(response.data).toHaveProperty('service');
      expect(response.data.service).toHaveProperty('name', 'auth-service');
      expect(response.data.service).toHaveProperty('version');
      expect(response.data.service).toHaveProperty('description');

      // Check environment information
      expect(response.data).toHaveProperty('environment');
      expect(response.data.environment).toHaveProperty('nodeVersion');
      expect(response.data.environment).toHaveProperty('environment');
      expect(response.data.environment).toHaveProperty('port');
      expect(typeof response.data.environment.port).toBe('number');

      // Check database configuration
      expect(response.data).toHaveProperty('database');
      expect(response.data.database).toHaveProperty('provider', 'prisma');
      expect(response.data.database).toHaveProperty('type');
      expect(response.data.database).toHaveProperty('url');
      expect(response.data.database).toHaveProperty('connected');
      expect(response.data.database).toHaveProperty('mode');

      // Check sessions configuration
      expect(response.data).toHaveProperty('sessions');
      expect(response.data.sessions).toHaveProperty('provider');
      expect(response.data.sessions).toHaveProperty('connected');
      expect(response.data.sessions).toHaveProperty('mode');

      // Check features
      expect(response.data).toHaveProperty('features');
      expect(response.data.features).toHaveProperty('magicLinks', true);
      expect(response.data.features).toHaveProperty('jwtRefresh', true);
      expect(response.data.features).toHaveProperty('rateLimiting', true);

      // Check build information
      expect(response.data).toHaveProperty('build');
      expect(response.data.build).toHaveProperty('timestamp');
      expect(response.data.build).toHaveProperty('commit');
    });

    it('should sanitize database URL credentials', async () => {
      const response = await axios.get(`${BASE_URL}/auth/info`);
      
      if (response.data.database.url.includes('://')) {
        expect(response.data.database.url).toMatch(/\*\*\*:\*\*\*/);
        expect(response.data.database.url).not.toMatch(/password|user|credentials/i);
      }
    });

    it('should show database type from connection string', async () => {
      const response = await axios.get(`${BASE_URL}/auth/info`);
      
      expect(response.data.database.type).toBeDefined();
      expect(typeof response.data.database.type).toBe('string');
      expect(response.data.database.type.length).toBeGreaterThan(0);
    });
  });

  describe('GET /auth/validate', () => {
    it('should require Authorization header', async () => {
      try {
        await axios.get(`${BASE_URL}/auth/validate`);
        fail('Should have thrown an error');
      } catch (error) {
        expect(error.response.status).toBe(401);
        expect(error.response.data).toHaveProperty('error', 'MISSING_TOKEN');
        expect(error.response.data).toHaveProperty('message');
        expect(error.response.data).toHaveProperty('timestamp');
      }
    });

    it('should require Bearer token format', async () => {
      try {
        await axios.get(`${BASE_URL}/auth/validate`, {
          headers: { Authorization: 'InvalidFormat token123' }
        });
        fail('Should have thrown an error');
      } catch (error) {
        expect(error.response.status).toBe(401);
        expect(error.response.data.error).toBe('MISSING_TOKEN');
      }
    });

    it('should validate token format', async () => {
      try {
        await axios.get(`${BASE_URL}/auth/validate`, {
          headers: { Authorization: 'Bearer invalid-token' }
        });
        fail('Should have thrown an error');
      } catch (error) {
        expect(error.response.status).toBe(401);
        expect(error.response.data.error).toBe('INVALID_TOKEN');
      }
    });
  });

  describe('GET /auth/docs', () => {
    it('should serve Swagger UI documentation', async () => {
      const response = await axios.get(`${BASE_URL}/auth/docs`);
      
      expect(response.status).toBe(200);
      expect(response.headers['content-type']).toMatch(/html/);
      expect(response.data).toContain('Swagger UI');
    });

    it('should serve OpenAPI JSON specification', async () => {
      const response = await axios.get(`${BASE_URL}/auth/docs/json`);
      
      expect(response.status).toBe(200);
      expect(response.headers['content-type']).toContain('application/json');
      expect(response.data).toHaveProperty('openapi');
      expect(response.data).toHaveProperty('info');
      expect(response.data).toHaveProperty('paths');
    });

    it('should serve OpenAPI YAML specification', async () => {
      const response = await axios.get(`${BASE_URL}/auth/docs/yaml`);
      
      expect(response.status).toBe(200);
      expect(response.headers['content-type']).toMatch(/yaml|text/);
      expect(response.data).toContain('openapi:');
      expect(response.data).toContain('info:');
      expect(response.data).toContain('paths:');
    });
  });
});
