const express = require('express');
const authService = require('../services/auth');
const db = require('../services/database');

const router = express.Router();

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

// GET /auth/health - Health check
router.get('/health', async (req, res) => {
  try {
    const dependencies = await db.healthCheck();
    
    const health = {
      status: 'healthy',
      timestamp: new Date().toISOString(),
      version: process.env.npm_package_version || '1.0.0',
      uptime: process.uptime(),
      dependencies
    };

    // Check if any critical dependencies are down
    const isHealthy = dependencies.database === 'connected' && dependencies.redis === 'connected';
    
    if (!isHealthy) {
      health.status = 'unhealthy';
      return res.status(503).json(health);
    }

    res.json(health);
  } catch (error) {
    console.error('Health check error:', error.message);

    res.status(503).json({
      status: 'unhealthy',
      timestamp: new Date().toISOString(),
      error: error.message
    });
  }
});

module.exports = router;
