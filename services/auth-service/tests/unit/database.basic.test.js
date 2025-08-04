const databaseService = require('../../src/services/database');

describe('Database Service - Basic Tests', () => {
  beforeEach(() => {
    // Ensure we're in development mode for mock operations
    process.env.NODE_ENV = 'development';
  });

  describe('Mock Operations in Development Mode', () => {
    test('should provide mock user data', () => {
      const mockUser = databaseService.getMockUser();
      
      expect(mockUser).toBeDefined();
      expect(mockUser).toHaveProperty('id');
      expect(mockUser).toHaveProperty('email', 'demo@example.com');
      expect(mockUser).toHaveProperty('isActive', true);
    });

    test('should handle in-memory sessions', async () => {
      const sessionId = 'test-session-123';
      const userData = { userId: 'user-123', email: 'test@example.com' };
      
      // Create session
      await databaseService.createSession(sessionId, userData, 3600);
      
      // Retrieve session
      const retrieved = await databaseService.getSession(sessionId);
      expect(retrieved).toEqual(userData);
      
      // Delete session
      await databaseService.deleteSession(sessionId);
      const deleted = await databaseService.getSession(sessionId);
      expect(deleted).toBeNull();
    });

    test('should mock database operations', async () => {
      // These should not throw errors in development mode
      const user = await databaseService.findUserByEmail('demo@example.com');
      expect(user).toBeDefined();
      
      const mockUser = await databaseService.createUser('test@example.com', 'hash');
      expect(mockUser).toBeDefined();
      expect(mockUser.email).toBe('test@example.com');
    });

    test('should provide health check status', async () => {
      const health = await databaseService.healthCheck();
      
      expect(health).toHaveProperty('database');
      expect(health).toHaveProperty('redis');
      // In development without real databases, these should be 'disconnected'
      expect(['connected', 'disconnected', 'not_initialized']).toContain(health.database);
      expect(['connected', 'disconnected']).toContain(health.redis);
    });
  });

  describe('Session Management', () => {
    test('should handle session expiration', async () => {
      const sessionId = 'expiring-session';
      const userData = { userId: 'user-123' };
      
      // Manually set an expired session
      databaseService.mockSessions.set(sessionId, {
        data: userData,
        expires: Date.now() - 1000 // Already expired
      });
      
      const retrieved = await databaseService.getSession(sessionId);
      expect(retrieved).toBeNull();
    });

    test('should update existing sessions', async () => {
      const sessionId = 'update-session';
      const originalData = { userId: 'user-123', role: 'user' };
      const updatedData = { userId: 'user-123', role: 'admin' };
      
      await databaseService.createSession(sessionId, originalData, 3600);
      await databaseService.updateSession(sessionId, updatedData, 3600);
      
      const retrieved = await databaseService.getSession(sessionId);
      expect(retrieved).toEqual(updatedData);
    });
  });
});
