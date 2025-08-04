const DatabaseService = require('../../src/services/database');

// Mock Prisma and Redis
jest.mock('@prisma/client');
jest.mock('redis');

describe('Database Service', () => {
  let databaseService;

  beforeEach(() => {
    // Reset environment to development mode
    process.env.NODE_ENV = 'development';
    
    // Clear all mocks
    jest.clearAllMocks();
    
    // Create a fresh instance for each test
    const DatabaseServiceClass = require('../../src/services/database').constructor;
    databaseService = new DatabaseServiceClass();
  });

  describe('Mock Operations in Development Mode', () => {
    beforeEach(() => {
      // Ensure we're in development mode without database connections
      databaseService.prismaConnected = false;
      databaseService.redisConnected = false;
      databaseService.isDevelopment = true;
    });

    describe('User Operations', () => {
      test('should create mock user', async () => {
        const email = 'test@example.com';
        const passwordHash = 'hashed-password';
        
        const user = await databaseService.createUser(email, passwordHash);
        
        expect(user).toBeDefined();
        expect(user.email).toBe(email);
        expect(user.passwordHash).toBe(passwordHash);
        expect(user.id).toBeDefined();
      });

      test('should find mock user by email', async () => {
        const user = await databaseService.findUserByEmail('demo@example.com');
        
        expect(user).toBeDefined();
        expect(user.email).toBe('demo@example.com');
        expect(user.id).toBe('mock-user-id-123');
      });

      test('should return null for non-demo email', async () => {
        const user = await databaseService.findUserByEmail('other@example.com');
        expect(user).toBeNull();
      });

      test('should find mock user by ID', async () => {
        const user = await databaseService.findUserById('mock-user-id-123');
        
        expect(user).toBeDefined();
        expect(user.id).toBe('mock-user-id-123');
        expect(user.email).toBe('demo@example.com');
      });

      test('should return null for non-mock user ID', async () => {
        const user = await databaseService.findUserById('other-id');
        expect(user).toBeNull();
      });

      test('should update mock user', async () => {
        const updateData = { lastLogin: new Date() };
        const updatedUser = await databaseService.updateUser('mock-user-id-123', updateData);
        
        expect(updatedUser).toBeDefined();
        expect(updatedUser.lastLogin).toBe(updateData.lastLogin);
      });

      test('should increment failed login attempts', async () => {
        const user = await databaseService.incrementFailedLoginAttempts('mock-user-id-123');
        expect(user).toBeDefined();
      });

      test('should reset failed login attempts', async () => {
        const user = await databaseService.resetFailedLoginAttempts('mock-user-id-123');
        expect(user).toBeDefined();
      });

      test('should lock account', async () => {
        const user = await databaseService.lockAccount('mock-user-id-123', 60000);
        expect(user).toBeDefined();
      });
    });

    describe('Magic Link Token Operations', () => {
      test('should create mock magic link token', async () => {
        const userId = 'user-id';
        const token = 'magic-token-123';
        const expiresAt = new Date(Date.now() + 15 * 60 * 1000);
        
        const magicLinkToken = await databaseService.createMagicLinkToken(
          userId, token, expiresAt, 'login'
        );
        
        expect(magicLinkToken).toBeDefined();
        expect(magicLinkToken.userId).toBe(userId);
        expect(magicLinkToken.token).toBe(token);
        expect(magicLinkToken.expiresAt).toBe(expiresAt);
        expect(magicLinkToken.purpose).toBe('login');
        expect(magicLinkToken.used).toBe(false);
      });

      test('should find mock magic link token', async () => {
        const token = 'some-token';
        const magicLinkToken = await databaseService.findMagicLinkToken(token);
        
        expect(magicLinkToken).toBeDefined();
        expect(magicLinkToken.token).toBe(token);
        expect(magicLinkToken.used).toBe(false);
        expect(magicLinkToken.user).toBeDefined();
      });

      test('should use mock magic link token', async () => {
        const tokenId = 'token-id';
        const result = await databaseService.useMagicLinkToken(tokenId);
        
        expect(result).toBeDefined();
        expect(result.id).toBe(tokenId);
        expect(result.used).toBe(true);
        expect(result.usedAt).toBeDefined();
      });
    });

    describe('Session Operations', () => {
      test('should create session in memory', async () => {
        const sessionId = 'session-123';
        const userData = { userId: 'user-id', email: 'test@example.com' };
        
        const result = await databaseService.createSession(sessionId, userData, 3600);
        
        expect(result).toBe(sessionId);
        expect(databaseService.mockSessions.has(sessionId)).toBe(true);
      });

      test('should get session from memory', async () => {
        const sessionId = 'session-123';
        const userData = { userId: 'user-id', email: 'test@example.com' };
        
        await databaseService.createSession(sessionId, userData, 3600);
        const retrievedData = await databaseService.getSession(sessionId);
        
        expect(retrievedData).toEqual(userData);
      });

      test('should return null for expired session', async () => {
        const sessionId = 'expired-session';
        const userData = { userId: 'user-id', email: 'test@example.com' };
        
        // Create session with very short TTL
        databaseService.mockSessions.set(sessionId, {
          data: userData,
          expires: Date.now() - 1000 // Already expired
        });
        
        const retrievedData = await databaseService.getSession(sessionId);
        expect(retrievedData).toBeNull();
      });

      test('should update session in memory', async () => {
        const sessionId = 'session-123';
        const userData = { userId: 'user-id', email: 'test@example.com' };
        const updatedData = { userId: 'user-id', email: 'updated@example.com' };
        
        await databaseService.createSession(sessionId, userData, 3600);
        await databaseService.updateSession(sessionId, updatedData, 3600);
        
        const retrievedData = await databaseService.getSession(sessionId);
        expect(retrievedData).toEqual(updatedData);
      });

      test('should delete session from memory', async () => {
        const sessionId = 'session-123';
        const userData = { userId: 'user-id', email: 'test@example.com' };
        
        await databaseService.createSession(sessionId, userData, 3600);
        await databaseService.deleteSession(sessionId);
        
        const retrievedData = await databaseService.getSession(sessionId);
        expect(retrievedData).toBeNull();
        expect(databaseService.mockSessions.has(sessionId)).toBe(false);
      });
    });

    describe('Cleanup Operations', () => {
      test('should mock cleanup expired magic link tokens', async () => {
        const result = await databaseService.cleanupExpiredMagicLinkTokens();
        expect(result).toEqual({ count: 0 });
      });

      test('should mock cleanup expired refresh tokens', async () => {
        const result = await databaseService.cleanupExpiredRefreshTokens();
        expect(result).toEqual({ count: 0 });
      });
    });
  });

  describe('Health Check', () => {
    test('should return disconnected status when databases are not available', async () => {
      databaseService.prismaConnected = false;
      databaseService.redisConnected = false;
      
      const health = await databaseService.healthCheck();
      
      expect(health).toHaveProperty('database');
      expect(health).toHaveProperty('redis');
      expect(health.database).toBe('disconnected');
      expect(health.redis).toBe('disconnected');
    });
  });

  describe('Production Mode Error Handling', () => {
    beforeEach(() => {
      process.env.NODE_ENV = 'production';
      databaseService.isDevelopment = false;
      databaseService.prismaConnected = false;
      databaseService.redisConnected = false;
    });

    test('should throw error when database not connected in production', async () => {
      await expect(
        databaseService.createUser('test@example.com', 'hash')
      ).rejects.toThrow('Database not connected');
    });

    test('should throw error when session storage not available in production', async () => {
      await expect(
        databaseService.createSession('session-id', {}, 3600)
      ).rejects.toThrow('Session storage not available');
    });
  });
});
