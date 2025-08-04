const express = require('express');
const authService = require('../services/auth');
const databaseService = require('../services/database');
const { version: packageVersion } = require('../../package.json');

const router = express.Router();

/**
 * @swagger
 * /auth/validate:
 *   get:
 *     summary: Validate JWT token
 *     description: Validates a JWT token for internal service use
 *     tags:
 *       - Service
 *     security:
 *       - bearerAuth: []
 *     responses:
 *       200:
 *         description: Token is valid
 *         content:
 *           application/json:
 *             schema:
 *               type: object
 *               properties:
 *                 valid:
 *                   type: boolean
 *                   example: true
 *                 userId:
 *                   type: string
 *                   example: "user123"
 *                 email:
 *                   type: string
 *                   example: "user@example.com"
 *       401:
 *         description: Token is invalid or missing
 *         content:
 *           application/json:
 *             schema:
 *               $ref: '#/components/schemas/ErrorResponse'
 */
// GET /auth/validate - Validate JWT token (internal service use)
router.get('/validate', async (req, res) => {
  try {
    const authHeader = req.headers.authorization;

    if (!authHeader?.startsWith('Bearer ')) {
      return res.status(401).json({
        error: 'MISSING_TOKEN',
        message: 'Authorization header with Bearer token required',
        timestamp: new Date().toISOString()
      });
    }

    const token = authHeader.substring(7);
    const validation = await authService.validateToken(token);

    res.json(validation);
  } catch (error) {
    console.error('Token validation error:', error.message);

    res.status(401).json({
      error: 'INVALID_TOKEN',
      message: error.message,
      timestamp: new Date().toISOString()
    });
  }
});

/**
 * @swagger
 * /auth/health:
 *   get:
 *     summary: Health check endpoint
 *     description: Returns the health status of the authentication service
 *     tags:
 *       - Service
 *     responses:
 *       200:
 *         description: Service is healthy
 *         content:
 *           application/json:
 *             schema:
 *               type: object
 *               properties:
 *                 status:
 *                   type: string
 *                   enum: [UP, DOWN]
 *                   example: UP
 *                 timestamp:
 *                   type: string
 *                   format: date-time
 *                   example: "2024-01-15T10:30:45.123Z"
 *                 version:
 *                   type: string
 *                   example: "1.0.0"
 *                 uptime:
 *                   type: number
 *                   example: 3600.5
 *                 database:
 *                   type: object
 *                   properties:
 *                     status:
 *                       type: string
 *                       enum: [UP, DOWN, UNKNOWN]
 *                       example: UP
 *                     type:
 *                       type: string
 *                       example: "postgresql"
 *       503:
 *         description: Service is unhealthy
 *         content:
 *           application/json:
 *             schema:
 *               type: object
 *               properties:
 *                 status:
 *                   type: string
 *                   enum: [DOWN]
 *                 timestamp:
 *                   type: string
 *                   format: date-time
 *                 error:
 *                   type: string
 */
// GET /auth/health - Health check
router.get('/health', async (req, res) => {
  try {
    const dbHealth = await databaseService.healthCheck();
    const isHealthy = dbHealth.status === 'UP';
    
    const health = {
      status: isHealthy ? 'UP' : 'DOWN',
      timestamp: new Date().toISOString(),
      version: packageVersion || '1.0.0',
      uptime: process.uptime(),
      database: dbHealth
    };

    res.status(isHealthy ? 200 : 503).json(health);
  } catch (error) {
    console.error('Health check error:', error.message);

    res.status(503).json({
      status: 'DOWN',
      timestamp: new Date().toISOString(),
      error: error.message
    });
  }
});

/**
 * @swagger
 * /auth/info:
 *   get:
 *     summary: Service information endpoint
 *     description: Returns configuration and environment information about the authentication service
 *     tags:
 *       - Service
 *     responses:
 *       200:
 *         description: Service information retrieved successfully
 *         content:
 *           application/json:
 *             schema:
 *               type: object
 *               properties:
 *                 service:
 *                   type: object
 *                   properties:
 *                     name:
 *                       type: string
 *                       example: "auth-service"
 *                     version:
 *                       type: string
 *                       example: "1.0.0"
 *                     description:
 *                       type: string
 *                       example: "Authentication and authorization service for Peerit platform"
 *                 environment:
 *                   type: object
 *                   properties:
 *                     nodeVersion:
 *                       type: string
 *                       example: "v18.19.0"
 *                     environment:
 *                       type: string
 *                       example: "development"
 *                     port:
 *                       type: integer
 *                       example: 3020
 *                 database:
 *                   type: object
 *                   properties:
 *                     provider:
 *                       type: string
 *                       example: "prisma"
 *                     type:
 *                       type: string
 *                       example: "postgresql"
 *                     url:
 *                       type: string
 *                       example: "postgresql://***:***@localhost:5432/peerit_auth"
 *                     connected:
 *                       type: boolean
 *                       example: true
 *                     mode:
 *                       type: string
 *                       enum: [connected, mock, offline]
 *                       example: "connected"
 *                 sessions:
 *                   type: object
 *                   properties:
 *                     provider:
 *                       type: string
 *                       example: "redis"
 *                     connected:
 *                       type: boolean
 *                       example: true
 *                     mode:
 *                       type: string
 *                       enum: [redis, memory, offline]
 *                       example: "redis"
 *                 features:
 *                   type: object
 *                   properties:
 *                     magicLinks:
 *                       type: boolean
 *                       example: true
 *                     jwtRefresh:
 *                       type: boolean
 *                       example: true
 *                     rateLimiting:
 *                       type: boolean
 *                       example: true
 *                 build:
 *                   type: object
 *                   properties:
 *                     timestamp:
 *                       type: string
 *                       format: date-time
 *                       example: "2024-01-15T10:30:45.123Z"
 *                     commit:
 *                       type: string
 *                       example: "abc123def"
 */
// GET /auth/info - Service information
router.get('/info', async (req, res) => {
  try {
    const dbHealth = await databaseService.healthCheck();
    const sessionHealth = await databaseService.getSessionHealth();
    
    // Parse database URL to get type (remove credentials for security)
    const databaseUrl = process.env.DATABASE_URL || '';
    const dbType = databaseUrl.split('://')[0] || 'unknown';
    const sanitizedUrl = databaseUrl.replace(/:\/\/[^@]+@/, '://***:***@');
    
    const info = {
      service: {
        name: 'auth-service',
        version: packageVersion || '1.0.0',
        description: 'Authentication and authorization service for Peerit platform'
      },
      environment: {
        nodeVersion: process.version,
        environment: process.env.NODE_ENV || 'development',
        port: parseInt(process.env.PORT || '3020', 10)
      },
      database: {
        provider: 'prisma',
        type: dbType,
        url: sanitizedUrl || 'not configured',
        connected: dbHealth.status === 'UP',
        mode: dbHealth.mode || 'unknown'
      },
      sessions: {
        provider: process.env.REDIS_URL ? 'redis' : 'memory',
        connected: sessionHealth.connected,
        mode: sessionHealth.mode
      },
      features: {
        magicLinks: true,
        jwtRefresh: true,
        rateLimiting: true
      },
      build: {
        timestamp: new Date().toISOString(),
        commit: process.env.GIT_COMMIT || 'unknown'
      }
    };

    res.json(info);
  } catch (error) {
    console.error('Service info error:', error.message);
    res.status(500).json({
      error: 'Failed to retrieve service information',
      message: error.message
    });
  }
});

module.exports = router;
