const request = require('supertest');
const { PrismaClient } = require('@prisma/client');
const Redis = require('redis');

// Test against real database and Redis from Docker Compose
describe('Auth Service - Real Database Integration Tests', () => {
  let app;
  let prisma;
  let redisClient;
  let server;

  beforeAll(async () => {
    // Set environment for integration testing
    process.env.NODE_ENV = 'test';
    process.env.TEST_INTEGRATION = 'true';
    process.env.DATABASE_URL = 'postgresql://peerit:peerit_dev@localhost:5432/peerit_auth';
    process.env.REDIS_URL = 'redis://localhost:6379/1'; // Use database 1 for tests
    process.env.JWT_SECRET = 'test_jwt_secret_for_integration_tests';
    process.env.JWT_REFRESH_SECRET = 'test_jwt_refresh_secret_for_integration_tests';
    process.env.PORT = 0; // Dynamic port

    // Initialize Prisma client for test database
    prisma = new PrismaClient({
      datasources: {
        db: {
          url: process.env.DATABASE_URL
        }
      }
    });

    // Initialize Redis client for testing
    redisClient = Redis.createClient({
      url: process.env.REDIS_URL
    });

    try {
      // Test database connectivity
      await prisma.$connect();
      console.log('✅ Connected to test database');
      
      // Test Redis connectivity
      await redisClient.connect();
      await redisClient.ping();
      console.log('✅ Connected to test Redis');

      // Clear test data first
      try {
        // Check if tables exist by trying to query them
        await prisma.session.deleteMany();
        await prisma.user.deleteMany();
        console.log('✅ Cleared existing test data');
      } catch (dbError) {
        console.log('ℹ️ Database tables not yet created, continuing...');
      }
      
      await redisClient.flushDb(); // Clear Redis test database

      // Import app after environment is set
      app = require('../../src/index');
      
      // Create server manually for testing since NODE_ENV=test prevents auto-start
      server = app.listen(0, '127.0.0.1', () => {
        console.log(`✅ Test server started on port ${server.address().port}`);
      });
      
    } catch (error) {
      console.error('❌ Failed to connect to test infrastructure:', error.message);
      throw new Error('Test infrastructure not available. Run: docker compose -f infra/docker/compose.yml up -d');
    }
  }, 30000);

  afterAll(async () => {
    try {
      // Clean up test data
      if (prisma) {
        try {
          await prisma.session.deleteMany();
          await prisma.user.deleteMany();
        } catch (dbError) {
          console.log('ℹ️ Tables not found during cleanup, skipping...');
        }
        await prisma.$disconnect();
      }
      
      if (redisClient) {
        await redisClient.flushDb();
        await redisClient.disconnect();
      }

      // Close server
      if (server) {
        await new Promise((resolve) => {
          server.close(resolve);
        });
      }
    } catch (error) {
      console.error('Cleanup error:', error);
    }
  }, 10000);

  describe('Database Health Checks', () => {
    test('health endpoint should show database UP', async () => {
      const response = await request(app)
        .get('/health')
        .expect(200);

      expect(response.body.status).toBe('UP');
      expect(response.body.database.status).toBe('UP');
      expect(response.body.database.type).toBe('postgresql');
      expect(response.body.session.status).toBe('UP');
      expect(response.body.session.connected).toBe(true);
    });

    test('info endpoint should show real database connection', async () => {
      const response = await request(app)
        .get('/info')
        .expect(200);

      expect(response.body.database.connected).toBe(true);
      expect(response.body.database.type).toBe('postgresql');
      expect(response.body.database.url).toContain('***:***@'); // Sanitized credentials
      expect(response.body.sessions.connected).toBe(true);
      expect(response.body.sessions.provider).toBe('redis');
    });
  });

  describe('User Registration Flow', () => {
    test('login endpoint should require valid user (tests database connectivity)', async () => {
      const response = await request(app)
        .post('/login')
        .send({
          email: 'nonexistent@example.com',
          password: 'SomePassword123!'
        })
        .expect(401);

      expect(response.body.error).toBeDefined();
      expect(response.body.message).toBeDefined();
      expect(response.body.timestamp).toBeDefined();
    });

    test('login endpoint should validate email format', async () => {
      const response = await request(app)
        .post('/login')
        .send({
          email: 'invalid-email',
          password: 'SomePassword123!'
        })
        .expect(400);

      expect(response.body.error).toBeDefined();
    });
  });

  describe('Authentication Flow', () => {
    test('should reject login with missing password', async () => {
      const response = await request(app)
        .post('/login')
        .send({
          email: 'test@example.com'
          // missing password
        })
        .expect(400);

      expect(response.body.error).toBeDefined();
    });

    test('should reject login with missing email', async () => {
      const response = await request(app)
        .post('/login')
        .send({
          password: 'SomePassword123!'
          // missing email
        })
        .expect(400);

      expect(response.body.error).toBeDefined();
    });
  });

  describe('Token Validation Flow', () => {
    test('should require Authorization header', async () => {
      const response = await request(app)
        .get('/validate')
        .expect(401);

      expect(response.body.error).toBe('MISSING_TOKEN');
      expect(response.body.message).toBeDefined();
      expect(response.body.timestamp).toBeDefined();
    });

    test('should reject invalid token format', async () => {
      const response = await request(app)
        .get('/validate')
        .set('Authorization', 'InvalidFormat token123')
        .expect(401);

      expect(response.body.error).toBe('MISSING_TOKEN');
    });

    test('should reject malformed JWT token', async () => {
      const response = await request(app)
        .get('/validate')
        .set('Authorization', 'Bearer invalid.token.here')
        .expect(401);

      expect(response.body.error).toBe('INVALID_TOKEN');
    });

    test('should test refresh endpoint format', async () => {
      const response = await request(app)
        .post('/refresh')
        .send({ refreshToken: 'invalid_refresh_token' })
        .expect(401);

      expect(response.body.error).toBeDefined();
    });
  });

  describe('Magic Link Flow', () => {
    test('should accept magic link requests', async () => {
      const response = await request(app)
        .post('/magic-link')
        .send({
          email: 'test@example.com'
        })
        .expect(200);

      expect(response.body.success).toBe(true);
      expect(response.body.message).toContain('magic link');
    });

    test('should validate email for magic link', async () => {
      const response = await request(app)
        .post('/magic-link')
        .send({
          email: 'invalid-email'
        })
        .expect(400);

      expect(response.body.error).toBeDefined();
    });

    test('should require email for magic link', async () => {
      const response = await request(app)
        .post('/magic-link')
        .send({})
        .expect(400);

      expect(response.body.error).toBeDefined();
    });
  });

  describe('Password Reset Flow', () => {
    test('should accept password reset requests', async () => {
      const response = await request(app)
        .post('/reset-password')
        .send({
          email: 'test@example.com'
        })
        .expect(200);

      expect(response.body.success).toBe(true);
      expect(response.body.message).toContain('reset');
    });

    test('should validate email for password reset', async () => {
      const response = await request(app)
        .post('/reset-password')
        .send({
          email: 'invalid-email'
        })
        .expect(400);

      expect(response.body.error).toBeDefined();
    });
  });

  describe('Error Handling with Database', () => {
    test('should handle database disconnection gracefully', async () => {
      // Temporarily disconnect from database
      await prisma.$disconnect();

      const response = await request(app)
        .get('/health')
        .expect(503);

      expect(response.body.status).toBe('DOWN');
      expect(response.body.database.status).toBe('DOWN');

      // Reconnect for other tests
      await prisma.$connect();
    });
  });
});
