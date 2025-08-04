const { PrismaClient } = require('@prisma/client');
const Redis = require('redis');

class DatabaseService {
  constructor() {
    this.isDevelopment = process.env.NODE_ENV === 'development';
    this.prisma = null;
    this.redis = null;
    this.prismaConnected = false;
    this.redisConnected = false;

    this.initializeDatabases();
  }

  async initializeDatabases() {
    // Initialize Prisma (PostgreSQL)
    try {
      this.prisma = new PrismaClient({
        log: this.isDevelopment ? ['info', 'warn', 'error'] : ['error'],
      });
      console.log('📦 Prisma client initialized');
    } catch (error) {
      console.warn('⚠️ Prisma client initialization failed:', error.message);
    }

    // Initialize Redis
    try {
      this.redis = Redis.createClient({
        url: process.env.REDIS_URL || 'redis://localhost:6379/0',
        socket: {
          connectTimeout: 5000,
          lazyConnect: true
        }
      });

      this.redis.on('error', (err) => {
        console.warn('⚠️ Redis connection error:', err.message);
        this.redisConnected = false;
      });

      this.redis.on('connect', () => {
        console.log('✅ Redis connected');
        this.redisConnected = true;
      });

      // Try to connect but don't block startup
      if (this.isDevelopment) {
        setTimeout(() => this.connectRedis(), 1000);
      } else {
        await this.connectRedis();
      }
    } catch (error) {
      console.warn('⚠️ Redis initialization failed:', error.message);
    }
  }

  async connectRedis() {
    try {
      if (this.redis && !this.redis.isOpen) {
        await this.redis.connect();
      }
    } catch (error) {
      console.warn('⚠️ Redis connection failed:', error.message);
      this.redisConnected = false;
    }
  }

  async healthCheck() {
    const health = {
      database: 'unknown',
      redis: 'unknown'
    };

    // Check PostgreSQL with timeout
    if (this.prisma) {
      try {
        const timeoutPromise = new Promise((_, reject) => 
          setTimeout(() => reject(new Error('Database timeout')), 3000)
        );
        const queryPromise = this.prisma.$queryRaw`SELECT 1`;
        
        await Promise.race([queryPromise, timeoutPromise]);
        health.database = 'connected';
        this.prismaConnected = true;
      } catch (error) {
        health.database = 'disconnected';
        this.prismaConnected = false;
        if (this.isDevelopment) {
          console.warn('⚠️ Database not connected (this is OK for development)');
        }
      }
    } else {
      health.database = 'not_initialized';
    }

    // Check Redis with timeout
    if (this.redis && this.redis.isOpen) {
      try {
        const timeoutPromise = new Promise((_, reject) => 
          setTimeout(() => reject(new Error('Redis timeout')), 2000)
        );
        const pingPromise = this.redis.ping();
        
        await Promise.race([pingPromise, timeoutPromise]);
        health.redis = 'connected';
        this.redisConnected = true;
      } catch (error) {
        health.redis = 'disconnected';
        this.redisConnected = false;
      }
    } else {
      health.redis = 'disconnected';
      this.redisConnected = false;
      if (this.isDevelopment) {
        console.warn('⚠️ Redis not connected (this is OK for development)');
      }
    }

    return health;
  }

  async disconnect() {
    if (this.prisma) {
      await this.prisma.$disconnect();
    }
    if (this.redis && this.redis.isOpen) {
      await this.redis.quit();
    }
  }

  // Mock data for development when database is not available
  getMockUser() {
    return {
      id: 'mock-user-id-123',
      email: 'demo@example.com',
      passwordHash: '$2a$12$placeholder.hash.for.development',
      isActive: true,
      failedLoginAttempts: 0,
      lockedUntil: null,
      createdAt: new Date(),
      updatedAt: new Date(),
      lastLogin: new Date()
    };
  }

  // User Credential operations
  async createUser(email, passwordHash) {
    if (!this.prismaConnected) {
      if (this.isDevelopment) {
        console.log('🔧 Mock: Creating user', email);
        return { ...this.getMockUser(), email, passwordHash };
      }
      throw new Error('Database not connected');
    }
    return this.prisma.userCredential.create({
      data: { email, passwordHash }
    });
  }

  async findUserByEmail(email) {
    if (!this.prismaConnected) {
      if (this.isDevelopment) {
        console.log('🔧 Mock: Finding user by email', email);
        return email === 'demo@example.com' ? this.getMockUser() : null;
      }
      throw new Error('Database not connected');
    }
    return this.prisma.userCredential.findUnique({
      where: { email }
    });
  }

  async findUserById(id) {
    if (!this.prismaConnected) {
      if (this.isDevelopment) {
        console.log('🔧 Mock: Finding user by ID', id);
        return id === 'mock-user-id-123' ? this.getMockUser() : null;
      }
      throw new Error('Database not connected');
    }
    return this.prisma.userCredential.findUnique({
      where: { id }
    });
  }

  async updateUser(id, data) {
    if (!this.prismaConnected) {
      if (this.isDevelopment) {
        console.log('🔧 Mock: Updating user', id, data);
        return { ...this.getMockUser(), ...data };
      }
      throw new Error('Database not connected');
    }
    return this.prisma.userCredential.update({
      where: { id },
      data
    });
  }

  async incrementFailedLoginAttempts(userId) {
    if (!this.prismaConnected) {
      if (this.isDevelopment) {
        console.log('🔧 Mock: Incrementing failed login attempts', userId);
        return this.getMockUser();
      }
      throw new Error('Database not connected');
    }
    return this.prisma.userCredential.update({
      where: { id: userId },
      data: {
        failedLoginAttempts: {
          increment: 1
        }
      }
    });
  }

  async resetFailedLoginAttempts(userId) {
    if (!this.prismaConnected) {
      if (this.isDevelopment) {
        console.log('🔧 Mock: Resetting failed login attempts', userId);
        return this.getMockUser();
      }
      throw new Error('Database not connected');
    }
    return this.prisma.userCredential.update({
      where: { id: userId },
      data: {
        failedLoginAttempts: 0,
        lockedUntil: null,
        lastLogin: new Date()
      }
    });
  }

  async lockAccount(userId, lockDurationMs) {
    if (!this.prismaConnected) {
      if (this.isDevelopment) {
        console.log('🔧 Mock: Locking account', userId);
        return this.getMockUser();
      }
      throw new Error('Database not connected');
    }
    const lockedUntil = new Date(Date.now() + lockDurationMs);
    return this.prisma.userCredential.update({
      where: { id: userId },
      data: { lockedUntil }
    });
  }

  // Magic Link Token operations
  async createMagicLinkToken(userId, token, expiresAt, purpose = 'login', sessionId = null) {
    if (!this.prismaConnected) {
      if (this.isDevelopment) {
        console.log('🔧 Mock: Creating magic link token', token);
        return {
          id: 'mock-token-id',
          userId,
          token,
          expiresAt,
          purpose,
          sessionId,
          used: false,
          usedAt: null,
          createdAt: new Date()
        };
      }
      throw new Error('Database not connected');
    }
    return this.prisma.magicLinkToken.create({
      data: {
        userId,
        token,
        expiresAt,
        purpose,
        sessionId
      }
    });
  }

  async findMagicLinkToken(token) {
    if (!this.prismaConnected) {
      if (this.isDevelopment) {
        console.log('🔧 Mock: Finding magic link token', token);
        return {
          id: 'mock-token-id',
          token,
          used: false,
          expiresAt: new Date(Date.now() + 15 * 60 * 1000), // 15 minutes from now
          user: this.getMockUser()
        };
      }
      throw new Error('Database not connected');
    }
    return this.prisma.magicLinkToken.findUnique({
      where: { token },
      include: { user: true }
    });
  }

  async useMagicLinkToken(id) {
    if (!this.prismaConnected) {
      if (this.isDevelopment) {
        console.log('🔧 Mock: Using magic link token', id);
        return { id, used: true, usedAt: new Date() };
      }
      throw new Error('Database not connected');
    }
    return this.prisma.magicLinkToken.update({
      where: { id },
      data: {
        used: true,
        usedAt: new Date()
      }
    });
  }

  // Session operations (Redis) with in-memory fallback
  mockSessions = new Map();

  async createSession(sessionId, userData, ttlSeconds = 8 * 60 * 60) {
    if (this.redisConnected) {
      const sessionKey = `session:${sessionId}`;
      await this.redis.setEx(sessionKey, ttlSeconds, JSON.stringify(userData));
    } else if (this.isDevelopment) {
      console.log('🔧 Mock: Creating session in memory', sessionId);
      this.mockSessions.set(sessionId, {
        data: userData,
        expires: Date.now() + (ttlSeconds * 1000)
      });
    } else {
      throw new Error('Session storage not available');
    }
    return sessionId;
  }

  async getSession(sessionId) {
    if (this.redisConnected) {
      const sessionKey = `session:${sessionId}`;
      const sessionData = await this.redis.get(sessionKey);
      return sessionData ? JSON.parse(sessionData) : null;
    } else if (this.isDevelopment) {
      console.log('🔧 Mock: Getting session from memory', sessionId);
      const session = this.mockSessions.get(sessionId);
      if (session && session.expires > Date.now()) {
        return session.data;
      }
      return null;
    } else {
      throw new Error('Session storage not available');
    }
  }

  async updateSession(sessionId, userData, ttlSeconds = 8 * 60 * 60) {
    if (this.redisConnected) {
      const sessionKey = `session:${sessionId}`;
      await this.redis.setEx(sessionKey, ttlSeconds, JSON.stringify(userData));
    } else if (this.isDevelopment) {
      console.log('🔧 Mock: Updating session in memory', sessionId);
      this.mockSessions.set(sessionId, {
        data: userData,
        expires: Date.now() + (ttlSeconds * 1000)
      });
    } else {
      throw new Error('Session storage not available');
    }
  }

  async deleteSession(sessionId) {
    if (this.redisConnected) {
      const sessionKey = `session:${sessionId}`;
      await this.redis.del(sessionKey);
    } else if (this.isDevelopment) {
      console.log('🔧 Mock: Deleting session from memory', sessionId);
      this.mockSessions.delete(sessionId);
    } else {
      throw new Error('Session storage not available');
    }
  }

  // Cleanup operations (mock implementations for development)
  async cleanupExpiredMagicLinkTokens() {
    if (this.isDevelopment && !this.prismaConnected) {
      console.log('🔧 Mock: Cleanup expired magic link tokens');
      return { count: 0 };
    }
    return this.prisma.magicLinkToken.deleteMany({
      where: {
        expiresAt: { lt: new Date() }
      }
    });
  }

  async cleanupExpiredRefreshTokens() {
    if (this.isDevelopment && !this.prismaConnected) {
      console.log('🔧 Mock: Cleanup expired refresh tokens');
      return { count: 0 };
    }
    return this.prisma.refreshToken.deleteMany({
      where: {
        OR: [
          { expiresAt: { lt: new Date() } },
          { revoked: true }
        ]
      }
    });
  }
}

// Singleton instance
const databaseService = new DatabaseService();

module.exports = databaseService;
