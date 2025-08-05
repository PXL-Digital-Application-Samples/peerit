const express = require('express');
const { PrismaClient } = require('@prisma/client');
const authMiddleware = require('../middleware/auth');

const router = express.Router();

// Configure Prisma with shorter timeouts for tests
const isTest = process.env.NODE_ENV === 'test';
const prisma = new PrismaClient({
  datasources: {
    db: {
      url: process.env.DATABASE_URL
    }
  },
  log: isTest ? [] : ['error'],
  // Note: Prisma doesn't support query timeout in client config
  // We'll handle timeouts at the query level
});

// GET /api/service/health - Health check endpoint
router.get('/health', async (req, res) => {
  try {
    // Check database connectivity with timeout
    const dbTimeout = isTest ? 1000 : 5000; // 1 second for tests, 5 seconds for production
    
    await Promise.race([
      prisma.$queryRaw`SELECT 1`,
      new Promise((_, reject) => 
        setTimeout(() => reject(new Error('Database connection timeout')), dbTimeout)
      )
    ]);
    
    res.json({
      status: 'UP',
      service: 'user-service',
      version: process.env.SERVICE_VERSION || '1.0.0',
      timestamp: new Date().toISOString(),
      uptime: process.uptime(),
      checks: {
        database: 'connected'
      }
    });
  } catch (error) {
    res.status(503).json({
      status: 'DOWN',
      service: 'user-service',
      version: process.env.SERVICE_VERSION || '1.0.0',
      timestamp: new Date().toISOString(),
      uptime: process.uptime(),
      checks: {
        database: 'disconnected'
      },
      error: error.message
    });
  }
});

// GET /api/service/metrics - Service metrics endpoint
router.get('/metrics', authMiddleware.authenticate, async (req, res, next) => {
  try {
    // Check permissions - only admins can view metrics
    if (!req.user.roles || !req.user.roles.includes('admin')) {
      return res.status(403).json({
        error: 'Forbidden',
        message: 'Only admins can view service metrics',
        code: 403,
        timestamp: new Date().toISOString()
      });
    }

    // Get database statistics
    const userCount = await prisma.userProfile.count();
    const activeUsers = await prisma.userProfile.count({
      where: { enabled: true }
    });
    
    const roleAssignments = await prisma.roleAssignment.count();
    const teamMemberships = await prisma.teamMembership.count({
      where: { isActive: true }
    });

    // Get recent activity
    const recentProfiles = await prisma.userProfile.count({
      where: {
        createdAt: {
          gte: new Date(Date.now() - 24 * 60 * 60 * 1000) // Last 24 hours
        }
      }
    });

    const recentRoleChanges = await prisma.roleAssignment.count({
      where: {
        assignedAt: {
          gte: new Date(Date.now() - 24 * 60 * 60 * 1000) // Last 24 hours
        }
      }
    });

    res.json({
      service: 'user-service',
      version: process.env.SERVICE_VERSION || '1.0.0',
      timestamp: new Date().toISOString(),
      uptime: process.uptime(),
      statistics: {
        users: {
          total: userCount,
          active: activeUsers,
          recentlyCreated: recentProfiles
        },
        roles: {
          totalAssignments: roleAssignments,
          recentChanges: recentRoleChanges
        },
        teams: {
          activeMemberships: teamMemberships
        }
      },
      performance: {
        memoryUsage: process.memoryUsage(),
        cpuUsage: process.cpuUsage()
      }
    });
  } catch (error) {
    next(error);
  }
});

// GET /api/service/info - Service information endpoint
router.get('/info', (req, res) => {
  res.json({
    name: 'user-service',
    description: 'User profile and role management service for Peerit platform',
    version: process.env.SERVICE_VERSION || '1.0.0',
    environment: process.env.NODE_ENV || 'development',
    timestamp: new Date().toISOString(),
    features: [
      'User profile management',
      'Role assignment and validation',
      'Team membership tracking',
      'Keycloak integration',
      'User synchronization'
    ],
    endpoints: {
      userProfiles: '/api/users',
      roleManagement: '/api/roles',
      teamMembership: '/api/users/:userId/teams',
      userSync: '/api/sync',
      service: '/api/service'
    }
  });
});

module.exports = router;
