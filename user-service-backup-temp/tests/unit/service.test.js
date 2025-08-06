const request = require('supertest');

// Mock Prisma client
const mockPrismaClient = {
  userProfile: {
    findUnique: jest.fn(),
    findMany: jest.fn(),
    create: jest.fn(),
    update: jest.fn(),
    delete: jest.fn(),
    count: jest.fn()
  },
  userRole: {
    findMany: jest.fn(),
    findFirst: jest.fn(),
    create: jest.fn(),
    delete: jest.fn(),
    count: jest.fn()
  },
  roleAssignment: {
    findMany: jest.fn(),
    findFirst: jest.fn(),
    create: jest.fn(),
    delete: jest.fn(),
    count: jest.fn()
  },
  teamMembership: {
    findFirst: jest.fn(),
    create: jest.fn(),
    delete: jest.fn(),
    count: jest.fn()
  },
  team: {
    findUnique: jest.fn(),
    create: jest.fn()
  },
  $queryRaw: jest.fn()
};

// Mock modules
jest.mock('@prisma/client', () => ({
  PrismaClient: jest.fn(() => mockPrismaClient)
}));

// Mock authentication middleware
jest.mock('../../src/middleware/auth', () => ({
  authenticate: (req, res, next) => {
    const authHeader = req.headers.authorization;
    
    if (!authHeader) {
      return res.status(401).json({
        error: 'Unauthorized',
        message: 'Missing or invalid authorization header',
        code: 401,
        timestamp: new Date().toISOString()
      });
    }

    if (!authHeader.startsWith('Bearer ')) {
      return res.status(401).json({
        error: 'Unauthorized', 
        message: 'Missing or invalid authorization header',
        code: 401,
        timestamp: new Date().toISOString()
      });
    }

    const token = authHeader.substring(7);
    
    try {
      // Use the mocked JWT verify
      const decoded = require('jsonwebtoken').verify(token, 'test-secret');
      req.user = {
        id: decoded.id || decoded.sub,
        roles: decoded.roles || [],
        preferred_username: decoded.preferred_username
      };
      next();
    } catch (error) {
      return res.status(401).json({
        error: 'Unauthorized',
        message: 'Invalid token',
        code: 401,
        timestamp: new Date().toISOString()
      });
    }
  },
  requireRole: (role) => (req, res, next) => {
    if (!req.user.roles.includes(role)) {
      return res.status(403).json({
        error: 'Forbidden',
        message: `${role} role required`,
        code: 403,
        timestamp: new Date().toISOString()
      });
    }
    next();
  }
}));

jest.mock('jsonwebtoken');
jest.mock('jwks-client');
jest.mock('axios');

describe('User Service - Unit Tests', () => {
  let app;
  const originalEnv = process.env;
  
  beforeEach(() => {
    jest.clearAllMocks();
    
    // Set test environment variables
    process.env = {
      ...originalEnv,
      NODE_ENV: 'test',
      DATABASE_URL: 'postgresql://test:test@localhost:5432/test',
      KEYCLOAK_URL: 'http://localhost:8180',
      KEYCLOAK_REALM: 'peerit',
      PORT: '3020'
    };

    // Clear module cache to get fresh app instance
    delete require.cache[require.resolve('../../src/index')];
    app = require('../../src/index');
  });

  afterAll(() => {
    process.env = originalEnv;
  });

  describe('Service Health Endpoints', () => {
    test('should return healthy status when database is connected', async () => {
      mockPrismaClient.$queryRaw.mockResolvedValue([{ '?column?': 1 }]);

      const response = await request(app)
        .get('/health')
        .expect(200);

      expect(response.body.status).toBe('UP');
      expect(response.body.timestamp).toBeDefined();
    });

    test('should return unhealthy status when database is disconnected', async () => {
      mockPrismaClient.$queryRaw.mockRejectedValue(new Error('Database connection failed'));

      const response = await request(app)
        .get('/api/service/health')
        .expect(503);

      expect(response.body.status).toBe('DOWN');
      expect(response.body.checks.database).toBe('disconnected');
      expect(response.body.error).toBeDefined();
    });

    test('should return service info without authentication', async () => {
      const response = await request(app)
        .get('/api/service/info')
        .expect(200);

      expect(response.body.name).toBe('user-service');
      expect(response.body.description).toContain('User profile and role management');
      expect(response.body.features).toEqual([
        'User profile management',
        'Role assignment and validation',
        'Team membership tracking',
        'Keycloak integration',
        'User synchronization'
      ]);
    });
  });

  describe('Authentication Middleware', () => {
    test('should reject requests without authorization header', async () => {
      const response = await request(app)
        .get('/api/users/test-user-id')
        .expect(401);

      expect(response.body.error).toBe('Unauthorized');
      expect(response.body.message).toContain('Missing or invalid authorization header');
    });

    test('should reject requests with invalid authorization format', async () => {
      const response = await request(app)
        .get('/api/users/test-user-id')
        .set('Authorization', 'InvalidFormat')
        .expect(401);

      expect(response.body.error).toBe('Unauthorized');
      expect(response.body.message).toContain('Missing or invalid authorization header');
    });

    test('should reject requests with malformed JWT token', async () => {
      const jwt = require('jsonwebtoken');
      jwt.verify.mockImplementation(() => {
        throw new Error('Invalid token');
      });

      const response = await request(app)
        .get('/api/users/test-user-id')
        .set('Authorization', 'Bearer invalid-jwt-token')
        .expect(401);

      expect(response.body.error).toBe('Unauthorized');
      expect(response.body.message).toBe('Invalid token');
    });
  });

  describe('User Profile Endpoints', () => {
    const mockUser = {
      id: 'test-user-id',
      roles: ['student'],
      preferred_username: 'testuser'
    };

    beforeEach(() => {
      // Mock successful JWT verification
      const jwt = require('jsonwebtoken');
      jwt.verify.mockReturnValue(mockUser);
    });

    test('should get user profile for own profile', async () => {
      const mockProfile = {
        id: 'profile-id',
        keycloakId: 'test-user-id',
        username: 'testuser',
        email: 'test@example.com',
        firstName: 'Test',
        lastName: 'User'
      };

      mockPrismaClient.userProfile.findUnique.mockResolvedValue(mockProfile);

      const response = await request(app)
        .get('/api/users/test-user-id')
        .set('Authorization', 'Bearer valid-jwt-token')
        .expect(200);

      expect(response.body.username).toBe('testuser');
      expect(response.body.email).toBe('test@example.com');
      expect(mockPrismaClient.userProfile.findUnique).toHaveBeenCalledWith({
        where: { keycloakId: 'test-user-id' }
      });
    });

    test('should return 404 for non-existent user profile', async () => {
      mockPrismaClient.userProfile.findUnique.mockResolvedValue(null);

      const response = await request(app)
        .get('/api/users/test-user-id')
        .set('Authorization', 'Bearer valid-jwt-token')
        .expect(404);

      expect(response.body.error).toBe('Not Found');
      expect(response.body.message).toBe('User profile not found');
    });

    test('should forbid access to other user profiles for non-admin', async () => {
      const response = await request(app)
        .get('/api/users/other-user-id')
        .set('Authorization', 'Bearer valid-jwt-token')
        .expect(403);

      expect(response.body.error).toBe('Forbidden');
      expect(response.body.message).toBe('Access denied');
    });

    test('should allow admin to access any user profile', async () => {
      const adminUser = {
        id: 'admin-user-id',
        roles: ['admin'],
        preferred_username: 'admin'
      };
      const jwt = require('jsonwebtoken');
      jwt.verify.mockReturnValue(adminUser);

      const mockProfile = {
        id: 'profile-id',
        keycloakId: 'other-user-id',
        username: 'otheruser',
        email: 'other@example.com'
      };

      mockPrismaClient.userProfile.findUnique.mockResolvedValue(mockProfile);

      const response = await request(app)
        .get('/api/users/other-user-id')
        .set('Authorization', 'Bearer valid-admin-token')
        .expect(200);

      expect(response.body.username).toBe('otheruser');
    });
  });

  describe('Role Management Endpoints', () => {
    const adminUser = {
      id: 'admin-user-id',
      roles: ['admin'],
      preferred_username: 'admin'
    };

    beforeEach(() => {
      const jwt = require('jsonwebtoken');
      jwt.verify.mockReturnValue(adminUser);
    });

    test('should get user roles', async () => {
      const mockProfile = {
        id: 'profile-id',
        keycloakId: 'test-user-id',
        roles: [
          { role: 'student', assignedAt: new Date(), isActive: true },
          { role: 'team-member', assignedAt: new Date(), isActive: true }
        ]
      };

      mockPrismaClient.userProfile.findUnique.mockResolvedValue(mockProfile);

      const response = await request(app)
        .get('/api/users/test-user-id/roles')
        .set('Authorization', 'Bearer valid-admin-token')
        .expect(200);

      expect(response.body).toHaveLength(2);
      expect(response.body[0].role).toBe('student');
      expect(response.body[1].role).toBe('team-member');
    });

    test('should assign role to user (admin only)', async () => {
      const mockProfile = { id: 'profile-id', keycloakId: 'test-user-id' };
      const mockRoleAssignment = {
        id: 'assignment-id',
        role: 'teacher',
        assignedAt: new Date(),
        isActive: true
      };

      mockPrismaClient.userProfile.findUnique.mockResolvedValue(mockProfile);
      mockPrismaClient.userRole.findFirst.mockResolvedValue(null);
      mockPrismaClient.userRole.create.mockResolvedValue(mockRoleAssignment);

      const response = await request(app)
        .post('/api/users/test-user-id/roles')
        .set('Authorization', 'Bearer valid-admin-token')
        .send({ roleName: 'teacher' })
        .expect(201);

      expect(response.body.role).toBe('teacher');
      expect(response.body.isActive).toBe(true);
    });

    test('should forbid role assignment for non-admin users', async () => {
      const studentUser = {
        id: 'student-user-id',
        roles: ['student'],
        preferred_username: 'student'
      };
      const jwt = require('jsonwebtoken');
      jwt.verify.mockReturnValue(studentUser);

      const response = await request(app)
        .post('/api/users/test-user-id/roles')
        .set('Authorization', 'Bearer valid-student-token')
        .send({ role: 'teacher' })
        .expect(403);

      expect(response.body.error).toBe('Forbidden');
      expect(response.body.message).toBe('admin role required');
    });
  });

  describe('Team Membership Endpoints', () => {
    const teacherUser = {
      id: 'teacher-user-id',
      roles: ['teacher'],
      preferred_username: 'teacher'
    };

    beforeEach(() => {
      const jwt = require('jsonwebtoken');
      jwt.verify.mockReturnValue(teacherUser);
    });

    test('should get user team memberships', async () => {
      const mockProfile = {
        id: 'profile-id',
        keycloakId: 'test-user-id',
        teamMemberships: [
          {
            teamRole: 'member',
            joinedAt: new Date(),
            isActive: true,
            team: { id: 'team-1', name: 'Team Alpha' }
          }
        ]
      };

      mockPrismaClient.userProfile.findUnique.mockResolvedValue(mockProfile);

      const response = await request(app)
        .get('/api/users/test-user-id/teams')
        .set('Authorization', 'Bearer valid-teacher-token')
        .expect(200);

      expect(response.body).toHaveLength(1);
      expect(response.body[0].teamName).toBe('Team Alpha');
      expect(response.body[0].teamRole).toBe('member');
    });

    test('should add user to team', async () => {
      const mockProfile = { id: 'profile-id', keycloakId: 'test-user-id' };
      const mockTeam = { id: 'team-1', name: 'Team Alpha' };
      const mockMembership = {
        teamRole: 'member',
        joinedAt: new Date(),
        isActive: true
      };

      mockPrismaClient.userProfile.findUnique.mockResolvedValue(mockProfile);
      mockPrismaClient.team.findUnique.mockResolvedValue(mockTeam);
      mockPrismaClient.teamMembership.findFirst.mockResolvedValue(null);
      mockPrismaClient.teamMembership.create.mockResolvedValue(mockMembership);

      const response = await request(app)
        .post('/api/users/test-user-id/teams/team-1')
        .set('Authorization', 'Bearer valid-teacher-token')
        .send({ teamRole: 'member' })
        .expect(201);

      expect(response.body.teamName).toBe('Team Alpha');
      expect(response.body.teamRole).toBe('member');
    });
  });

  describe('Error Handling', () => {
    test('should handle Prisma database errors', async () => {
      mockPrismaClient.userProfile.findUnique.mockRejectedValue(new Error('Database connection failed'));
      const jwt = require('jsonwebtoken');
      jwt.verify.mockReturnValue({ id: 'user-id', roles: ['student'] });

      const response = await request(app)
        .get('/api/users/user-id')
        .set('Authorization', 'Bearer valid-token')
        .expect(500);

      expect(response.body.error).toBe('Internal Server Error');
    });

    test('should handle validation errors', async () => {
      const jwt = require('jsonwebtoken');
      jwt.verify.mockReturnValue({ id: 'admin-id', roles: ['admin'] });

      const response = await request(app)
        .post('/api/users/test-user-id/roles')
        .set('Authorization', 'Bearer valid-admin-token')
        .send({ role: 'invalid-role-name-that-is-too-long' })
        .expect(400);

      expect(response.body.error).toBe('Validation Error');
    });
  });
});
