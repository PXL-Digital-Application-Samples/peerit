/**
 * Swagger Integration Tests
 * Tests the OpenAPI specification and Swagger UI functionality
 */

const request = require('supertest');
const app = require('../../src/index');

describe('Swagger/OpenAPI Integration Tests', () => {
  
  describe('OpenAPI Specification', () => {
    test('GET /docs/openapi.json should return valid OpenAPI spec', async () => {
      const response = await request(app)
        .get('/docs/openapi.json')
        .expect(200)
        .expect('Content-Type', /json/);

      const spec = response.body;
      
      // Validate OpenAPI structure
      expect(spec).toHaveProperty('openapi');
      expect(spec).toHaveProperty('info');
      expect(spec).toHaveProperty('paths');
      expect(spec).toHaveProperty('components');
      
      // Validate info section
      expect(spec.info.title).toBe('Peerit Auth Service API');
      expect(spec.info.version).toMatch(/^\d+\.\d+\.\d+$/);
      
      // Validate key paths exist
      expect(spec.paths).toHaveProperty('/login');
      expect(spec.paths).toHaveProperty('/health');
      expect(spec.paths).toHaveProperty('/info');
      
      // Validate components schemas
      expect(spec.components).toHaveProperty('schemas');
      expect(spec.components.schemas).toHaveProperty('LoginRequest');
      expect(spec.components.schemas).toHaveProperty('HealthResponse');
    });
  });

  describe('Swagger UI Accessibility', () => {
    test('GET /docs should be accessible (may redirect)', async () => {
      const response = await request(app)
        .get('/docs');

      // Accept both 200 (direct) and 301 (redirect) as valid responses
      expect([200, 301]).toContain(response.status);
    });
  });

  describe('Basic Endpoint Validation', () => {
    test('Health endpoint should return proper structure', async () => {
      const response = await request(app)
        .get('/health')
        .expect(503); // Service down because no database
      
      // Validate response structure
      expect(response.body).toHaveProperty('status');
      expect(response.body).toHaveProperty('timestamp');
      expect(response.body).toHaveProperty('version');
      expect(response.body).toHaveProperty('dependencies');
      
      // Validate types
      expect(typeof response.body.status).toBe('string');
      expect(typeof response.body.timestamp).toBe('string');
      expect(typeof response.body.version).toBe('string');
      expect(typeof response.body.dependencies).toBe('object');
    });

    test('Service info endpoint should return comprehensive configuration', async () => {
      const response = await request(app)
        .get('/info')
        .expect(200);
      
      // Validate response structure
      expect(response.body).toHaveProperty('service');
      expect(response.body.service).toHaveProperty('version');
      expect(response.body).toHaveProperty('environment');
      expect(response.body).toHaveProperty('database');
      expect(response.body).toHaveProperty('sessions');
      expect(response.body).toHaveProperty('features');
      
      // Validate nested structures
      expect(response.body.service).toHaveProperty('name');
      expect(response.body.service).toHaveProperty('description');
      expect(response.body.database).toHaveProperty('type');
      expect(response.body.sessions).toHaveProperty('provider');
    }, 15000); // Increase timeout for this test

    test('Login validation should work correctly', async () => {
      // Test valid request structure but invalid credentials
      const validRequest = {
        email: 'test@example.com',
        password: 'validPassword123'
      };
      
      const response = await request(app)
        .post('/login')
        .send(validRequest)
        .expect('Content-Type', /json/);
      
      // Should get validation error (user doesn't exist) but structure should be valid
      expect([400, 401]).toContain(response.status);
      
      // Test invalid request that violates schema
      const invalidRequest = {
        email: 'invalid-email',
        password: '123' // too short
      };
      
      const invalidResponse = await request(app)
        .post('/login')
        .send(invalidRequest)
        .expect(400);
        
      expect(invalidResponse.body).toHaveProperty('error');
    });
  });

  describe('Error Response Validation', () => {
    test('404 responses should match expected error format', async () => {
      const response = await request(app)
        .get('/non-existent-endpoint')
        .expect(404);
      
      expect(response.body).toHaveProperty('error');
      expect(typeof response.body.error).toBe('string');
    });

    test('Validation errors should return proper error format', async () => {
      const response = await request(app)
        .post('/login')
        .send({}) // Empty body should trigger validation error
        .expect(400);
      
      expect(response.body).toHaveProperty('error');
      expect(typeof response.body.error).toBe('string');
    });
  });
});
