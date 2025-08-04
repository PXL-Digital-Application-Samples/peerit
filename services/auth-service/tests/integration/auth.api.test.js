const request = require('supertest');
const app = require('../../src/index');

// Mock the database service for integration tests
jest.mock('../../src/services/database');
const databaseService = require('../../src/services/database');

describe('Auth Service Integration Tests', () => {
  beforeEach(() => {
    jest.clearAllMocks();
    
    // Set up common mock behaviors
    databaseService.healthCheck.mockResolvedValue({
      database: 'disconnected',
      redis: 'disconnected'
    });
  });

  describe('GET /auth/health', () => {
    test('should return health status', async () => {
      const response = await request(app)
        .get('/auth/health')
        .expect(200);

      expect(response.body).toHaveProperty('status');
      expect(response.body).toHaveProperty('timestamp');
      expect(response.body).toHaveProperty('version');
      expect(response.body).toHaveProperty('uptime');
      expect(response.body).toHaveProperty('dependencies');
      expect(response.body.dependencies).toHaveProperty('database');
      expect(response.body.dependencies).toHaveProperty('redis');
    });
  });

  describe('GET /auth/docs', () => {
    test('should serve Swagger documentation', async () => {
      const response = await request(app)
        .get('/auth/docs/')
        .expect(200);

      expect(response.text).toContain('Swagger UI');
      expect(response.headers['content-type']).toContain('text/html');
    });
  });

  describe('GET /auth/docs/json', () => {
    test('should return OpenAPI JSON specification', async () => {
      const response = await request(app)
        .get('/auth/docs/json')
        .expect(200);

      expect(response.body).toHaveProperty('openapi');
      expect(response.body).toHaveProperty('info');
      expect(response.body).toHaveProperty('paths');
      expect(response.body.info.title).toBe('Peerit Auth Service API');
    });
  });

  describe('POST /auth/login/password', () => {
    test('should login successfully with valid credentials', async () => {
      const mockUser = {
        id: 'user-123',
        email: 'test@example.com',
        passwordHash: '$2a$12$mockedhash',
        isActive: true,
        lockedUntil: null,
        failedLoginAttempts: 0
      };

      databaseService.findUserByEmail.mockResolvedValue(mockUser);
      databaseService.resetFailedLoginAttempts.mockResolvedValue({});
      databaseService.createSession.mockResolvedValue('session-123');

      const response = await request(app)
        .post('/auth/login/password')
        .send({
          email: 'test@example.com',
          password: 'StrongPassword123!'
        })
        .expect(200);

      expect(response.body).toHaveProperty('success', true);
      expect(response.body).toHaveProperty('tokens');
      expect(response.body.tokens).toHaveProperty('accessToken');
      expect(response.body.tokens).toHaveProperty('refreshToken');
      expect(response.body).toHaveProperty('user');
      expect(response.body.user.email).toBe('test@example.com');
    });

    test('should reject invalid credentials', async () => {
      databaseService.findUserByEmail.mockResolvedValue(null);

      const response = await request(app)
        .post('/auth/login/password')
        .send({
          email: 'nonexistent@example.com',
          password: 'AnyPassword123!'
        })
        .expect(401);

      expect(response.body).toHaveProperty('success', false);
      expect(response.body).toHaveProperty('error', 'Authentication failed');
    });

    test('should reject invalid email format', async () => {
      const response = await request(app)
        .post('/auth/login/password')
        .send({
          email: 'invalid-email',
          password: 'StrongPassword123!'
        })
        .expect(400);

      expect(response.body).toHaveProperty('error', 'Validation failed');
      expect(response.body.details[0].field).toBe('email');
    });

    test('should reject weak password', async () => {
      const response = await request(app)
        .post('/auth/login/password')
        .send({
          email: 'test@example.com',
          password: 'weak'
        })
        .expect(400);

      expect(response.body).toHaveProperty('error', 'Validation failed');
      expect(response.body.details[0].field).toBe('password');
    });

    test('should be rate limited', async () => {
      const loginData = {
        email: 'test@example.com',
        password: 'StrongPassword123!'
      };

      // Mock authentication failure to avoid successful logins
      databaseService.findUserByEmail.mockResolvedValue(null);

      // Make multiple requests to trigger rate limiting
      const requests = Array(6).fill().map(() => 
        request(app)
          .post('/auth/login/password')
          .send(loginData)
      );

      const responses = await Promise.all(requests);
      
      // Last request should be rate limited
      const lastResponse = responses[responses.length - 1];
      expect(lastResponse.status).toBe(429);
      expect(lastResponse.body).toHaveProperty('error', 'Too many requests');
    });
  });

  describe('POST /auth/magic-link/generate', () => {
    test('should generate magic link successfully', async () => {
      const mockUser = {
        id: 'user-123',
        email: 'test@example.com',
        isActive: true
      };

      const mockToken = {
        id: 'token-123',
        token: 'magic-token-456',
        expiresAt: new Date(Date.now() + 15 * 60 * 1000)
      };

      databaseService.findUserByEmail.mockResolvedValue(mockUser);
      databaseService.createMagicLinkToken.mockResolvedValue(mockToken);

      const response = await request(app)
        .post('/auth/magic-link/generate')
        .send({
          email: 'test@example.com',
          purpose: 'login'
        })
        .expect(200);

      expect(response.body).toHaveProperty('success', true);
      expect(response.body).toHaveProperty('magicLink');
      expect(response.body).toHaveProperty('expiresAt');
      expect(response.body.magicLink).toContain('magic-token-456');
    });

    test('should handle non-existent user gracefully', async () => {
      databaseService.findUserByEmail.mockResolvedValue(null);

      const response = await request(app)
        .post('/auth/magic-link/generate')
        .send({
          email: 'nonexistent@example.com',
          purpose: 'login'
        })
        .expect(200);

      expect(response.body).toHaveProperty('success', true);
      expect(response.body).toHaveProperty('message', 'If the email exists, a magic link has been sent');
    });

    test('should reject invalid purpose', async () => {
      const response = await request(app)
        .post('/auth/magic-link/generate')
        .send({
          email: 'test@example.com',
          purpose: 'invalid_purpose'
        })
        .expect(400);

      expect(response.body).toHaveProperty('error', 'Validation failed');
    });
  });

  describe('POST /auth/magic-link/validate', () => {
    test('should validate magic link successfully', async () => {
      const mockUser = {
        id: 'user-123',
        email: 'test@example.com',
        isActive: true,
        lockedUntil: null
      };

      const mockTokenData = {
        id: 'token-123',
        token: 'valid-token',
        used: false,
        expiresAt: new Date(Date.now() + 15 * 60 * 1000),
        user: mockUser
      };

      databaseService.findMagicLinkToken.mockResolvedValue(mockTokenData);
      databaseService.useMagicLinkToken.mockResolvedValue({});
      databaseService.createSession.mockResolvedValue('session-123');

      const response = await request(app)
        .post('/auth/magic-link/validate')
        .send({
          token: 'valid-token'
        })
        .expect(200);

      expect(response.body).toHaveProperty('success', true);
      expect(response.body).toHaveProperty('tokens');
      expect(response.body.tokens).toHaveProperty('accessToken');
      expect(response.body.tokens).toHaveProperty('refreshToken');
      expect(response.body).toHaveProperty('user');
    });

    test('should reject expired token', async () => {
      const mockTokenData = {
        id: 'token-123',
        token: 'expired-token',
        used: false,
        expiresAt: new Date(Date.now() - 1000), // Expired
        user: { id: 'user-123', email: 'test@example.com' }
      };

      databaseService.findMagicLinkToken.mockResolvedValue(mockTokenData);

      const response = await request(app)
        .post('/auth/magic-link/validate')
        .send({
          token: 'expired-token'
        })
        .expect(400);

      expect(response.body).toHaveProperty('success', false);
      expect(response.body).toHaveProperty('error', 'Token expired');
    });

    test('should reject already used token', async () => {
      const mockTokenData = {
        id: 'token-123',
        token: 'used-token',
        used: true, // Already used
        expiresAt: new Date(Date.now() + 15 * 60 * 1000),
        user: { id: 'user-123', email: 'test@example.com' }
      };

      databaseService.findMagicLinkToken.mockResolvedValue(mockTokenData);

      const response = await request(app)
        .post('/auth/magic-link/validate')
        .send({
          token: 'used-token'
        })
        .expect(400);

      expect(response.body).toHaveProperty('success', false);
      expect(response.body).toHaveProperty('error', 'Token already used');
    });

    test('should reject invalid token format', async () => {
      const response = await request(app)
        .post('/auth/magic-link/validate')
        .send({
          token: 'short'
        })
        .expect(400);

      expect(response.body).toHaveProperty('error', 'Validation failed');
    });
  });

  describe('POST /auth/token/refresh', () => {
    test('should refresh tokens successfully', async () => {
      const mockUser = {
        id: 'user-123',
        email: 'test@example.com',
        isActive: true
      };

      databaseService.findUserById.mockResolvedValue(mockUser);
      databaseService.createSession.mockResolvedValue('new-session-123');

      // Create a valid refresh token
      const jwt = require('jsonwebtoken');
      const refreshToken = jwt.sign(
        { userId: 'user-123', type: 'refresh' },
        process.env.JWT_REFRESH_SECRET || 'test-refresh-secret',
        { expiresIn: '7d' }
      );

      const response = await request(app)
        .post('/auth/token/refresh')
        .send({
          refreshToken
        })
        .expect(200);

      expect(response.body).toHaveProperty('success', true);
      expect(response.body).toHaveProperty('tokens');
      expect(response.body.tokens).toHaveProperty('accessToken');
      expect(response.body.tokens).toHaveProperty('refreshToken');
    });

    test('should reject invalid refresh token', async () => {
      const response = await request(app)
        .post('/auth/token/refresh')
        .send({
          refreshToken: 'invalid.token.here'
        })
        .expect(401);

      expect(response.body).toHaveProperty('success', false);
      expect(response.body).toHaveProperty('error', 'Invalid refresh token');
    });

    test('should reject access token used as refresh token', async () => {
      const jwt = require('jsonwebtoken');
      const accessToken = jwt.sign(
        { userId: 'user-123', email: 'test@example.com', type: 'access' },
        process.env.JWT_SECRET || 'test-secret-key',
        { expiresIn: '15m' }
      );

      const response = await request(app)
        .post('/auth/token/refresh')
        .send({
          refreshToken: accessToken
        })
        .expect(401);

      expect(response.body).toHaveProperty('success', false);
      expect(response.body).toHaveProperty('error', 'Invalid refresh token');
    });
  });

  describe('POST /auth/logout', () => {
    test('should logout successfully with valid token', async () => {
      const jwt = require('jsonwebtoken');
      const accessToken = jwt.sign(
        { userId: 'user-123', email: 'test@example.com', type: 'access', sessionId: 'session-123' },
        process.env.JWT_SECRET || 'test-secret-key',
        { expiresIn: '15m' }
      );

      databaseService.deleteSession.mockResolvedValue();

      const response = await request(app)
        .post('/auth/logout')
        .set('Authorization', `Bearer ${accessToken}`)
        .expect(200);

      expect(response.body).toHaveProperty('success', true);
      expect(response.body).toHaveProperty('message', 'Logged out successfully');
    });

    test('should reject request without authorization header', async () => {
      const response = await request(app)
        .post('/auth/logout')
        .expect(401);

      expect(response.body).toHaveProperty('error', 'Access token required');
    });

    test('should reject request with invalid token', async () => {
      const response = await request(app)
        .post('/auth/logout')
        .set('Authorization', 'Bearer invalid.token.here')
        .expect(401);

      expect(response.body).toHaveProperty('error', 'Invalid access token');
    });
  });

  describe('Error Handling', () => {
    test('should handle 404 for non-existent endpoints', async () => {
      const response = await request(app)
        .get('/auth/non-existent')
        .expect(404);

      expect(response.body).toHaveProperty('error', 'Endpoint not found');
    });

    test('should handle invalid JSON in request body', async () => {
      const response = await request(app)
        .post('/auth/login/password')
        .set('Content-Type', 'application/json')
        .send('{"invalid": json}')
        .expect(400);

      expect(response.body).toHaveProperty('error');
    });
  });

  describe('CORS and Security Headers', () => {
    test('should include security headers', async () => {
      const response = await request(app)
        .get('/auth/health')
        .expect(200);

      expect(response.headers).toHaveProperty('x-content-type-options');
      expect(response.headers).toHaveProperty('x-frame-options');
      expect(response.headers).toHaveProperty('x-xss-protection');
    });

    test('should handle CORS preflight requests', async () => {
      const response = await request(app)
        .options('/auth/login/password')
        .set('Origin', 'http://localhost:3000')
        .set('Access-Control-Request-Method', 'POST')
        .expect(204);

      expect(response.headers).toHaveProperty('access-control-allow-origin');
      expect(response.headers).toHaveProperty('access-control-allow-methods');
    });
  });
});
