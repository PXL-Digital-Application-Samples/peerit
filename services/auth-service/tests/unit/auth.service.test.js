const authService = require('../../src/services/auth');
const databaseService = require('../../src/services/database');
const bcrypt = require('bcryptjs');
const jwt = require('jsonwebtoken');

// Mock the database service
jest.mock('../../src/services/database');

describe('Auth Service', () => {
  const originalEnv = process.env;
  
  beforeEach(() => {
    jest.clearAllMocks();
    // Set test environment variables only for testing
    process.env = {
      ...originalEnv,
      NODE_ENV: 'test',
      JWT_SECRET: 'test-jwt-secret-key-for-testing-only',
      JWT_REFRESH_SECRET: 'test-refresh-secret-for-testing-only',
      JWT_EXPIRES_IN: '15m',
      JWT_REFRESH_EXPIRES_IN: '7d'
    };
  });

  afterAll(() => {
    // Restore original environment
    process.env = originalEnv;
  });

  describe('hashPassword', () => {
    test('should hash password successfully', async () => {
      const password = 'testPassword123';
      const hashedPassword = await authService.hashPassword(password);
      
      expect(hashedPassword).toBeDefined();
      expect(hashedPassword).not.toBe(password);
      expect(hashedPassword.length).toBeGreaterThan(50);
    });

    test('should create different hashes for same password', async () => {
      const password = 'testPassword123';
      const hash1 = await authService.hashPassword(password);
      const hash2 = await authService.hashPassword(password);
      
      expect(hash1).not.toBe(hash2);
    });
  });

  describe('verifyPassword', () => {
    test('should return true for correct password', async () => {
      const password = 'testPassword123';
      const hashedPassword = await authService.hashPassword(password);
      
      const isValid = await authService.verifyPassword(password, hashedPassword);
      expect(isValid).toBe(true);
    });

    test('should return false for incorrect password', async () => {
      const password = 'testPassword123';
      const wrongPassword = 'wrongPassword';
      const hashedPassword = await authService.hashPassword(password);
      
      const isValid = await authService.verifyPassword(wrongPassword, hashedPassword);
      expect(isValid).toBe(false);
    });
  });

  describe('generateAccessToken', () => {
    test('should generate valid access token', () => {
      const payload = {
        userId: 'test-user-id',
        email: 'test@example.com',
        type: 'access'
      };
      
      const token = authService.generateAccessToken(payload);
      
      expect(token).toBeDefined();
      expect(typeof token).toBe('string');
    });

    test('should create token with correct payload', () => {
      const payload = {
        userId: 'test-user-id',
        email: 'test@example.com',
        type: 'access'
      };
      
      const token = authService.generateAccessToken(payload);
      
      // Verify access token using the service's own method
      const decoded = authService.verifyAccessToken(token);
      expect(decoded.userId).toBe(payload.userId);
      expect(decoded.email).toBe(payload.email);
      expect(decoded.type).toBe(payload.type);
    });
  });

  describe('verifyAccessToken', () => {
    test('should verify valid access token', () => {
      const userId = 'test-user-id';
      const email = 'test@example.com';
      const tokens = authService.generateTokens(userId, email);
      
      const payload = authService.verifyAccessToken(tokens.accessToken);
      
      expect(payload.userId).toBe(userId);
      expect(payload.email).toBe(email);
      expect(payload.type).toBe('access');
    });

    test('should throw error for invalid token', () => {
      const invalidToken = 'invalid.token.here';
      
      expect(() => {
        authService.verifyAccessToken(invalidToken);
      }).toThrow();
    });

    test('should reject refresh token in verifyAccessToken (wrong secret)', () => {
      const userId = 'test-user-id';
      const email = 'test@example.com';
      const tokens = authService.generateTokens(userId, email);
      
      // Refresh token uses different secret, so verifyAccessToken should reject it
      expect(() => {
        authService.verifyAccessToken(tokens.refreshToken);
      }).toThrow('Invalid or expired token');
    });
  });

  describe('verifyRefreshToken', () => {
    test('should verify valid refresh token', () => {
      const userId = 'test-user-id';
      const email = 'test@example.com';
      const tokens = authService.generateTokens(userId, email);
      
      const payload = authService.verifyRefreshToken(tokens.refreshToken);
      
      expect(payload.userId).toBe(userId);
      expect(payload.type).toBe('refresh');
    });

    test('should reject access token in verifyRefreshToken (wrong secret)', () => {
      const userId = 'test-user-id';
      const email = 'test@example.com';
      const tokens = authService.generateTokens(userId, email);
      
      // Access token uses different secret, so verifyRefreshToken should reject it
      expect(() => {
        authService.verifyRefreshToken(tokens.accessToken);
      }).toThrow('Invalid or expired refresh token');
    });
  });

  describe('generateMagicLinkToken', () => {
    test('should generate unique magic link tokens', () => {
      const token1 = authService.generateMagicLinkToken();
      const token2 = authService.generateMagicLinkToken();
      
      expect(token1).toBeDefined();
      expect(token2).toBeDefined();
      expect(token1).not.toBe(token2);
      expect(token1.length).toBeGreaterThan(20);
    });
  });

  describe('createMagicLink', () => {
    test('should create magic link with correct format', async () => {
      const userId = 'test-user-id';
      const purpose = 'login';
      const mockToken = {
        id: 'mock-token-id',
        token: 'mock-token-123',
        expiresAt: new Date(Date.now() + 15 * 60 * 1000)
      };

      databaseService.createMagicLinkToken.mockResolvedValue(mockToken);

      const result = await authService.createMagicLink(userId, purpose);
      
      expect(result).toHaveProperty('token');
      expect(result).toHaveProperty('magicLink');
      expect(result).toHaveProperty('expiresAt');
      expect(result.magicLink).toContain(result.token);
      expect(databaseService.createMagicLinkToken).toHaveBeenCalledWith(
        userId,
        expect.any(String),
        expect.any(Date),
        purpose,
        null
      );
    });
  });

  describe('validateMagicLink', () => {
    test('should validate valid magic link token', async () => {
      const token = 'valid-token-123';
      const mockUser = {
        id: 'user-id',
        email: 'test@example.com',
        isActive: true,
        lockedUntil: null
      };
      const mockTokenData = {
        id: 'token-id',
        token,
        used: false,
        expiresAt: new Date(Date.now() + 15 * 60 * 1000),
        user: mockUser
      };

      databaseService.findMagicLinkToken.mockResolvedValue(mockTokenData);
      databaseService.useMagicLinkToken.mockResolvedValue({});

      const result = await authService.validateMagicLink(token);
      
      expect(result.isValid).toBe(true);
      expect(result.user).toBe(mockUser);
      expect(databaseService.useMagicLinkToken).toHaveBeenCalledWith('token-id');
    });

    test('should reject expired magic link token', async () => {
      const token = 'expired-token-123';
      const mockTokenData = {
        id: 'token-id',
        token,
        used: false,
        expiresAt: new Date(Date.now() - 1000), // Expired
        user: { id: 'user-id', email: 'test@example.com' }
      };

      databaseService.findMagicLinkToken.mockResolvedValue(mockTokenData);

      const result = await authService.validateMagicLink(token);
      
      expect(result.isValid).toBe(false);
      expect(result.reason).toBe('Token expired');
      expect(databaseService.useMagicLinkToken).not.toHaveBeenCalled();
    });

    test('should reject already used magic link token', async () => {
      const token = 'used-token-123';
      const mockTokenData = {
        id: 'token-id',
        token,
        used: true, // Already used
        expiresAt: new Date(Date.now() + 15 * 60 * 1000),
        user: { id: 'user-id', email: 'test@example.com' }
      };

      databaseService.findMagicLinkToken.mockResolvedValue(mockTokenData);

      const result = await authService.validateMagicLink(token);
      
      expect(result.isValid).toBe(false);
      expect(result.reason).toBe('Token already used');
      expect(databaseService.useMagicLinkToken).not.toHaveBeenCalled();
    });

    test('should reject token for inactive user', async () => {
      const token = 'valid-token-123';
      const mockUser = {
        id: 'user-id',
        email: 'test@example.com',
        isActive: false // Inactive user
      };
      const mockTokenData = {
        id: 'token-id',
        token,
        used: false,
        expiresAt: new Date(Date.now() + 15 * 60 * 1000),
        user: mockUser
      };

      databaseService.findMagicLinkToken.mockResolvedValue(mockTokenData);

      const result = await authService.validateMagicLink(token);
      
      expect(result.isValid).toBe(false);
      expect(result.reason).toBe('User account is inactive');
      expect(databaseService.useMagicLinkToken).not.toHaveBeenCalled();
    });

    test('should reject token for locked user', async () => {
      const token = 'valid-token-123';
      const mockUser = {
        id: 'user-id',
        email: 'test@example.com',
        isActive: true,
        lockedUntil: new Date(Date.now() + 60000) // Locked for 1 minute
      };
      const mockTokenData = {
        id: 'token-id',
        token,
        used: false,
        expiresAt: new Date(Date.now() + 15 * 60 * 1000),
        user: mockUser
      };

      databaseService.findMagicLinkToken.mockResolvedValue(mockTokenData);

      const result = await authService.validateMagicLink(token);
      
      expect(result.isValid).toBe(false);
      expect(result.reason).toBe('User account is locked');
      expect(databaseService.useMagicLinkToken).not.toHaveBeenCalled();
    });
  });

  describe('authenticateUser', () => {
    test('should authenticate valid user credentials', async () => {
      const email = 'test@example.com';
      const password = 'testPassword123';
      const hashedPassword = await authService.hashPassword(password);
      
      const mockUser = {
        id: 'user-id',
        email,
        passwordHash: hashedPassword,
        isActive: true,
        lockedUntil: null,
        failedLoginAttempts: 0
      };

      databaseService.findUserByEmail.mockResolvedValue(mockUser);
      databaseService.resetFailedLoginAttempts.mockResolvedValue({});

      const result = await authService.authenticateUser(email, password);
      
      expect(result.success).toBe(true);
      expect(result.user).toBe(mockUser);
      expect(databaseService.resetFailedLoginAttempts).toHaveBeenCalledWith('user-id');
    });

    test('should reject invalid password', async () => {
      const email = 'test@example.com';
      const password = 'wrongPassword';
      const correctPassword = 'testPassword123';
      const hashedPassword = await authService.hashPassword(correctPassword);
      
      const mockUser = {
        id: 'user-id',
        email,
        passwordHash: hashedPassword,
        isActive: true,
        lockedUntil: null,
        failedLoginAttempts: 2
      };

      databaseService.findUserByEmail.mockResolvedValue(mockUser);
      databaseService.incrementFailedLoginAttempts.mockResolvedValue({});

      const result = await authService.authenticateUser(email, password);
      
      expect(result.success).toBe(false);
      expect(result.reason).toBe('Invalid credentials');
      expect(databaseService.incrementFailedLoginAttempts).toHaveBeenCalledWith('user-id');
    });

    test('should reject non-existent user', async () => {
      const email = 'nonexistent@example.com';
      const password = 'testPassword123';

      databaseService.findUserByEmail.mockResolvedValue(null);

      const result = await authService.authenticateUser(email, password);
      
      expect(result.success).toBe(false);
      expect(result.reason).toBe('Invalid credentials');
    });
  });
});
