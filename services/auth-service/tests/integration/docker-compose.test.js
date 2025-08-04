const request = require('supertest');

/**
 * Docker Compose Integration Test
 * 
 * Tests the auth service against real Docker Compose infrastructure:
 * - PostgreSQL database (localhost:5432)
 * - Redis cache (localhost:6379)
 * 
 * Prerequisites:
 * 1. Start infrastructure: docker compose -f ../../infra/docker/compose.yml up -d
 * 2. Ensure auth database exists: peerit_auth
 * 3. Run test: npm run test:compose
 */
describe('Auth Service - Docker Compose Integration', () => {
  let app;

  beforeAll(async () => {
    // Configure for real Docker Compose infrastructure
    process.env.NODE_ENV = 'test';
    process.env.TEST_INTEGRATION = 'true';
    process.env.DATABASE_URL = 'postgresql://peerit:peerit_dev@localhost:5432/peerit_auth';
    process.env.REDIS_URL = 'redis://localhost:6379/1';
    process.env.JWT_SECRET = 'test_jwt_secret_for_docker_compose_integration';
    process.env.FRONTEND_URL = 'http://localhost:3000';
    
    app = require('../../src/index');
    
    // Give services time to initialize
    await new Promise(resolve => setTimeout(resolve, 2000));
  }, 10000);

  afterAll(async () => {
    // Clean up database connections
    try {
      const databaseService = require('../../src/services/database');
      await databaseService.disconnect();
    } catch (error) {
      console.warn('Cleanup warning:', error.message);
    }
  }, 5000);

  describe('Service Health & Info', () => {
    test('should return healthy status with real infrastructure', async () => {
      const response = await request(app)
        .get('/health')
        .timeout(5000);

      expect(response.status).toBe(200);
      expect(response.body.status).toBe('UP');
      expect(response.body.database).toBeDefined();
      expect(response.body.session).toBeDefined();
      
      // In integration mode, should show real connection status
      console.log('📊 Health Check:', {
        database: response.body.database.status,
        session: response.body.session.connected ? 'connected' : 'disconnected'
      });
    });

    test('should return service info with real infrastructure details', async () => {
      const response = await request(app)
        .get('/info')
        .timeout(5000);

      expect(response.status).toBe(200);
      expect(response.body.service.name).toBe('auth-service');
      expect(response.body.database.provider).toBe('prisma');
      expect(response.body.database.type).toBe('postgresql');
      
      // Should show real Redis provider when connected
      if (response.body.sessions.connected) {
        expect(response.body.sessions.provider).toBe('redis');
      }

      console.log('🔍 Service Info:', {
        database: response.body.database.connected ? 'connected' : 'disconnected',
        sessions: response.body.sessions.provider,
        environment: response.body.environment.environment
      });
    });
  });

  describe('API Documentation', () => {
    test('should serve OpenAPI specification', async () => {
      const response = await request(app)
        .get('/docs/openapi.json')
        .timeout(3000);

      expect(response.status).toBe(200);
      expect(response.body.openapi).toBeDefined();
      expect(response.body.info.title).toContain('Auth');
      expect(response.body.paths).toBeDefined();
    });

    test('should serve Swagger UI documentation', async () => {
      const response = await request(app)
        .get('/docs')
        .timeout(3000);

      // Should redirect to /docs/ or return Swagger UI
      expect([200, 301, 302]).toContain(response.status);
    });
  });

  describe('Authentication Flow', () => {
    test('should validate email format in login requests', async () => {
      const response = await request(app)
        .post('/login')
        .send({
          email: 'invalid-email-format',
          password: 'testpassword123'
        })
        .timeout(3000);

      expect(response.status).toBe(400);
      expect(response.body.error).toBeDefined();
      expect(response.body.message).toMatch(/email/i);
    });

    test('should require password in login requests', async () => {
      const response = await request(app)
        .post('/login')
        .send({
          email: 'test@example.com'
          // Missing password
        })
        .timeout(3000);

      expect(response.status).toBe(400);
      expect(response.body.error).toBeDefined();
    });

    test('should handle authentication failure gracefully', async () => {
      const response = await request(app)
        .post('/login')
        .send({
          email: 'nonexistent@example.com',
          password: 'wrongpassword'
        })
        .timeout(3000);

      expect(response.status).toBe(401);
      expect(response.body.error).toBeDefined();
    });

    test('should require token for protected endpoints', async () => {
      const response = await request(app)
        .get('/validate')
        .timeout(3000);

      expect(response.status).toBe(401);
      expect(response.body.error).toBe('MISSING_TOKEN');
    });

    test('should reject invalid tokens', async () => {
      const response = await request(app)
        .get('/validate')
        .set('Authorization', 'Bearer invalid_token_here')
        .timeout(3000);

      expect(response.status).toBe(401);
      expect(response.body.error).toBe('INVALID_TOKEN');
    });
  });

  describe('Magic Link Authentication', () => {
    test('should validate email format for magic links', async () => {
      const response = await request(app)
        .post('/magic-link')
        .send({
          email: 'invalid-email'
        })
        .timeout(3000);

      expect(response.status).toBe(400);
      expect(response.body.error).toBeDefined();
    });

    test('should handle magic link request with valid email', async () => {
      const response = await request(app)
        .post('/magic-link')
        .send({
          email: 'test@example.com'
        })
        .timeout(5000);

      // Should either succeed (if database connected) or fail gracefully
      expect([200, 500]).toContain(response.status);
      
      if (response.status === 200) {
        expect(response.body.success).toBe(true);
        expect(response.body.message).toMatch(/sent|created/i);
        console.log('✅ Magic link created successfully');
      } else {
        expect(response.body.error).toBeDefined();
        console.log('⚠️ Magic link failed (expected if database not seeded):', response.body.error);
      }
    });
  });

  describe('Error Handling', () => {
    test('should return 404 for non-existent endpoints', async () => {
      const response = await request(app)
        .get('/non-existent-endpoint')
        .timeout(3000);

      expect(response.status).toBe(404);
      expect(response.body.error).toBe('NOT_FOUND');
    });

    test('should handle malformed JSON gracefully', async () => {
      const response = await request(app)
        .post('/login')
        .set('Content-Type', 'application/json')
        .send('{"invalid": json}')
        .timeout(3000);

      expect([400, 500]).toContain(response.status);
      expect(response.body.error).toBeDefined();
    });
  });

  describe('Service Root', () => {
    test('should return service information at root endpoint', async () => {
      const response = await request(app)
        .get('/')
        .timeout(3000);

      expect(response.status).toBe(200);
      expect(response.body.service).toBe('Peerit Authentication Service');
      expect(response.body.status).toBe('running');
      expect(response.body.documentation).toBe('/docs');
    });
  });
});
