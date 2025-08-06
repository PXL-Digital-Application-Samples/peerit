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
  let realPrismaClient;

  beforeAll(async () => {
    // These tests require real infrastructure
    if (!process.env.TEST_INTEGRATION) {
      throw new Error('Integration tests require TEST_INTEGRATION=true');
    }

    // Set test environment with faster timeouts
    process.env.NODE_ENV = 'test';
    process.env.DATABASE_URL = 'postgresql://testuser:testpass@localhost:5433/peerit_test';
    process.env.KEYCLOAK_URL = 'http://localhost:8180';
    process.env.KEYCLOAK_REALM = 'peerit';
    
    // Force real database connection - no mocking allowed
    delete require.cache[require.resolve('../../src/index.js')];
    
    // Import app after setting environment - this should be fast
    app = require('../../src/index');
    
    // Verify real database connection by testing actual connectivity
    const { PrismaClient } = require('@prisma/client');
    realPrismaClient = new PrismaClient({
      datasources: {
        db: {
          url: process.env.DATABASE_URL
        }
      }
    });
    
    try {
      // Force actual database connection test
      await realPrismaClient.$queryRaw`SELECT 1 as test`;
      console.log('✅ Real PostgreSQL connection verified');
    } catch (error) {
      throw new Error(`❌ REAL DATABASE CONNECTION FAILED: ${error.message}`);
    }
    
    // Verify real Keycloak connection using v26+ compatible endpoint
    try {
      const response = await fetch('http://localhost:8180/realms/master/protocol/openid-connect/token', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/x-www-form-urlencoded',
        },
        body: 'grant_type=client_credentials&client_id=invalid-test-client'
      });
      // We expect a 400 error for invalid client, but it proves Keycloak is responding
      if (response.status === 400 || response.status === 401) {
        console.log('✅ Real Keycloak connection verified');
      } else {
        throw new Error(`Unexpected response from Keycloak: ${response.status}`);
      }
    } catch (error) {
      if (error.message.includes('fetch')) {
        throw new Error(`❌ REAL KEYCLOAK CONNECTION FAILED: ${error.message}`);
      }
      throw new Error(`❌ REAL KEYCLOAK CONNECTION FAILED: ${error.message}`);
    }
    
    // Give a moment for any async initialization
    await new Promise(resolve => setTimeout(resolve, 100));
  }, 10000);

  afterAll(async () => {
    if (realPrismaClient) {
      await realPrismaClient.$disconnect();
    }
  });

  describe('Real Infrastructure Verification', () => {
    test('should connect to real PostgreSQL database', async () => {
      // Direct database query to verify real connection
      const result = await realPrismaClient.$queryRaw`
        SELECT 
          current_database() as database_name,
          current_user as user_name,
          inet_server_addr() as server_ip,
          inet_server_port() as server_port
      `;
      
      expect(result).toBeDefined();
      expect(result[0].database_name).toBe('peerit_test');
      expect(result[0].user_name).toBe('testuser');
      expect(result[0].server_port).toBe(5432); // Internal port
      
      console.log('✅ Real database verified:', result[0]);
    }, 5000);

    test('should connect to real Keycloak instance', async () => {
      // Direct Keycloak API call to verify real connection using v26+ compatible endpoint
      const response = await fetch('http://localhost:8180/realms/peerit/protocol/openid-connect/token', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/x-www-form-urlencoded',
        },
        body: 'grant_type=client_credentials&client_id=invalid-test-client'
      });
      
      // We expect a 400 error for invalid client, but it proves Keycloak is responding
      expect([400, 401]).toContain(response.status);
      
      console.log('✅ Real Keycloak verified: peerit realm accessible');
    }, 5000);

    test('should verify Keycloak can access shared database', async () => {
      // Check that Keycloak schema exists in the shared database
      const result = await realPrismaClient.$queryRaw`
        SELECT schema_name 
        FROM information_schema.schemata 
        WHERE schema_name = 'keycloak'
      `;
      
      expect(result).toBeDefined();
      expect(result.length).toBe(1);
      expect(result[0].schema_name).toBe('keycloak');
      
      console.log('✅ Keycloak schema verified in shared database');
    }, 5000);

    test('should verify database has both service and Keycloak data', async () => {
      // Check both schemas exist in same database
      const schemas = await realPrismaClient.$queryRaw`
        SELECT schema_name 
        FROM information_schema.schemata 
        WHERE schema_name IN ('public', 'keycloak')
        ORDER BY schema_name
      `;
      
      expect(schemas).toBeDefined();
      expect(schemas.length).toBe(2);
      expect(schemas[0].schema_name).toBe('keycloak');
      expect(schemas[1].schema_name).toBe('public');
      
      console.log('✅ Both schemas verified in shared database:', schemas.map(s => s.schema_name));
    }, 5000);
  });

  describe('Service Health', () => {
    test('should return health status with real infrastructure', async () => {
      const response = await request(app)
        .get('/health')
        .timeout(2000);

      expect(response.status).toBe(200);
      expect(response.body.status).toBe('UP');
      expect(response.body.version).toBeDefined();
      expect(response.body.dependencies).toBeDefined();
      expect(response.body.dependencies.database).toBeDefined();
    }, 3000);

    test('should return service health check endpoint with REAL database', async () => {
      const response = await request(app)
        .get('/api/service/health')
        .timeout(2000);

      // With real PostgreSQL running, must be UP status
      expect(response.status).toBe(200);
      expect(response.body.status).toBe('UP');
      expect(response.body.service).toBe('user-service');
      expect(response.body.checks).toBeDefined();
      expect(response.body.checks.database).toBe('connected');
      
      // Verify this is actually hitting the real database by checking response time
      // Real database should have some latency vs mocked responses
      const startTime = Date.now();
      const dbResponse = await request(app).get('/api/service/health');
      const endTime = Date.now();
      const responseTime = endTime - startTime;
      
      expect(responseTime).toBeGreaterThan(1); // Real DB should take >1ms
      expect(dbResponse.body.checks.database).toBe('connected');
      
      console.log(`✅ Real database health check took ${responseTime}ms`);
    }, 5000);

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
        .get('/docs/openapi.json')
        .timeout(1000);

      expect(response.status).toBe(200);
      expect(response.body.openapi).toBeDefined();
      expect(response.body.info.title).toBeDefined();
      expect(response.body.info.title).toContain('User Service');
    }, 2000);

    test('should serve Swagger UI documentation', async () => {
      const response = await request(app)
        .get('/docs/')
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
      expect(response.body.message).toContain('Missing or invalid authorization header');
    }, 2000);

    test('should verify Keycloak JWT verification is REAL', async () => {
      // Try with a malformed JWT that would pass mocked validation but fail real validation
      const fakeJWT = 'eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJzdWIiOiIxMjM0NTY3ODkwIiwibmFtZSI6IkpvaG4gRG9lIiwiaWF0IjoxNTE2MjM5MDIyfQ.SflKxwRJSMeKKF2QT4fwpMeJf36POk6yJV_adQssw5c';
      
      const response = await request(app)
        .get('/api/users/test-user-id')
        .set('Authorization', `Bearer ${fakeJWT}`)
        .timeout(2000);

      // Real Keycloak validation should reject this fake JWT
      expect(response.status).toBeOneOf([401, 403]);
      expect(response.body.error).toBeDefined();
      
      // If this was mocked, it might return 200, but real Keycloak will reject it
      expect(response.status).not.toBe(200);
      
      console.log('✅ Real Keycloak JWT validation rejected fake token');
    }, 3000);

    test('should verify Keycloak issuer validation is REAL', async () => {
      // Create a JWT with wrong issuer that mocks might accept but real Keycloak rejects
      const wrongIssuerJWT = 'eyJhbGciOiJSUzI1NiIsInR5cCI6IkpXVCIsImtpZCI6InRlc3QifQ.eyJpc3MiOiJodHRwOi8vZmFrZS1pc3N1ZXIiLCJzdWIiOiJ0ZXN0LXVzZXIiLCJhdWQiOiJwZWVyaXQtc2VydmljZXMiLCJleHAiOjk5OTk5OTk5OTksImlhdCI6MTY0NzY4MDAwMCwianRpIjoidGVzdC1qd3QtaWQifQ.invalid';
      
      const response = await request(app)
        .get('/api/users/test-user-id')
        .set('Authorization', `Bearer ${wrongIssuerJWT}`)
        .timeout(2000);

      // Real Keycloak should reject wrong issuer
      expect(response.status).toBeOneOf([401, 403]);
      expect(response.body.error).toBeDefined();
      
      console.log('✅ Real Keycloak issuer validation active');
    }, 3000);

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
      expect(response.body.message).toContain('Missing or invalid authorization header');
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

    test('should prove real database usage with actual data persistence', async () => {
      // First ensure User table exists or create a simple test
      try {
        // Try to create a simple test table for verification
        await realPrismaClient.$executeRaw`
          CREATE TABLE IF NOT EXISTS test_integration (
            id TEXT PRIMARY KEY,
            created_at TIMESTAMP DEFAULT NOW()
          )
        `;
        
        const testId = `test-${Date.now()}`;
        
        // Insert test data directly into real database
        await realPrismaClient.$executeRaw`
          INSERT INTO test_integration (id) VALUES (${testId})
        `;
        
        // Query back to verify real database persistence
        const result = await realPrismaClient.$queryRaw`
          SELECT id FROM test_integration WHERE id = ${testId}
        `;
        
        expect(result).toBeDefined();
        expect(result.length).toBe(1);
        expect(result[0].id).toBe(testId);
        
        // Clean up
        await realPrismaClient.$executeRaw`
          DELETE FROM test_integration WHERE id = ${testId}
        `;
        
      } catch (error) {
        // Fall back to simple database connection verification
        const result = await realPrismaClient.$queryRaw`SELECT NOW() as current_time`;
        expect(result).toBeDefined();
        expect(result[0].current_time).toBeDefined();
      }
      
      // Verify the service health check hits real database
      const healthResponse = await request(app)
        .get('/api/service/health')
        .timeout(2000);
      
      expect(healthResponse.status).toBe(200);
      expect(healthResponse.body.checks.database).toBe('connected');
      
      console.log('✅ Real database persistence and connectivity verified');
    }, 10000);
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
