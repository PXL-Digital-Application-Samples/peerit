const express = require('express');
const authService = require('../services/auth');
const { validate, validateMagicToken } = require('../middleware/validation');
const { authRateLimit, magicLinkRateLimit, passwordResetRateLimit } = require('../middleware/rateLimit');

const router = express.Router();

// Helper function to extract client info
const getClientInfo = (req) => ({
  userAgent: req.headers['user-agent'],
  ipAddress: req.ip || req.connection.remoteAddress
});

// POST /auth/login - Email/password authentication
router.post('/login', 
  authRateLimit,
  validate('login'),
  async (req, res) => {
    try {
      const { email, password } = req.body;
      const { userAgent, ipAddress } = getClientInfo(req);

      const authResponse = await authService.login(email, password, userAgent, ipAddress);

      res.json(authResponse);
    } catch (error) {
      console.error('Login error:', error.message);

      // Map specific errors to appropriate HTTP status codes
      let status = 401;
      let errorCode = 'AUTHENTICATION_FAILED';

      if (error.message.includes('locked')) {
        status = 423;
        errorCode = 'ACCOUNT_LOCKED';
      } else if (error.message.includes('inactive')) {
        status = 403;
        errorCode = 'ACCOUNT_INACTIVE';
      } else if (error.message.includes('Too many failed attempts')) {
        status = 423;
        errorCode = 'ACCOUNT_LOCKED';
      }

      res.status(status).json({
        error: errorCode,
        message: error.message,
        timestamp: new Date().toISOString()
      });
    }
  }
);

// POST /auth/magic-link - Request magic link
router.post('/magic-link',
  magicLinkRateLimit,
  validate('magicLink'),
  async (req, res) => {
    try {
      const { email, purpose, session_id } = req.body;

      const magicLink = await authService.createMagicLink(email, purpose, session_id);

      // TODO: Send email with magic link
      // For now, in development, we'll log it
      if (process.env.NODE_ENV === 'development') {
        console.log(`🔗 Magic Link for ${email}: http://localhost:3020/auth/magic/${magicLink.token}`);
      }

      res.json({
        message: 'Magic link sent to your email',
        expires_in: Math.floor((magicLink.expiresAt - new Date()) / 1000)
      });
    } catch (error) {
      console.error('Magic link error:', error.message);

      res.status(500).json({
        error: 'MAGIC_LINK_FAILED',
        message: 'Failed to generate magic link',
        timestamp: new Date().toISOString()
      });
    }
  }
);

// GET /auth/magic/:token - Validate magic link
router.get('/magic/:token',
  validateMagicToken,
  async (req, res) => {
    try {
      const { token } = req.params;
      const { userAgent, ipAddress } = getClientInfo(req);

      const authResponse = await authService.loginWithMagicLink(token, userAgent, ipAddress);

      res.json(authResponse);
    } catch (error) {
      console.error('Magic link validation error:', error.message);

      let status = 400;
      let errorCode = 'INVALID_MAGIC_LINK';

      if (error.message.includes('expired')) {
        errorCode = 'MAGIC_LINK_EXPIRED';
      } else if (error.message.includes('used')) {
        status = 410;
        errorCode = 'MAGIC_LINK_ALREADY_USED';
      }

      res.status(status).json({
        error: errorCode,
        message: error.message,
        timestamp: new Date().toISOString()
      });
    }
  }
);

// POST /auth/refresh - Refresh access token
router.post('/refresh',
  validate('refreshToken'),
  async (req, res) => {
    try {
      const { refresh_token } = req.body;
      const { userAgent, ipAddress } = getClientInfo(req);

      const tokenResponse = await authService.refreshAccessToken(refresh_token, userAgent, ipAddress);

      res.json(tokenResponse);
    } catch (error) {
      console.error('Token refresh error:', error.message);

      res.status(401).json({
        error: 'INVALID_REFRESH_TOKEN',
        message: error.message,
        timestamp: new Date().toISOString()
      });
    }
  }
);

// POST /auth/logout - Logout user
router.post('/logout',
  async (req, res) => {
    try {
      // Extract session ID from Authorization header
      const authHeader = req.headers.authorization;
      let sessionId = null;
      
      if (authHeader?.startsWith('Bearer ')) {
        try {
          const token = authHeader.substring(7);
          const payload = await authService.verifyAccessToken(token);
          sessionId = payload.sessionId;
        } catch (error) {
          // Token might be invalid, but we still want to attempt logout
          console.log('Invalid token during logout, continuing...');
        }
      }

      const refreshToken = req.body.refresh_token;

      await authService.logout(sessionId, refreshToken);

      res.json({
        message: 'Successfully logged out'
      });
    } catch (error) {
      console.error('Logout error:', error.message);

      res.status(500).json({
        error: 'LOGOUT_FAILED',
        message: 'Failed to logout',
        timestamp: new Date().toISOString()
      });
    }
  }
);

// POST /auth/reset-password - Request password reset
router.post('/reset-password',
  passwordResetRateLimit,
  validate('resetPasswordRequest'),
  async (req, res) => {
    try {
      const { email } = req.body;

      // TODO: Implement password reset logic
      // For now, return not implemented

      res.status(501).json({
        error: 'NOT_IMPLEMENTED',
        message: 'Password reset not yet implemented',
        timestamp: new Date().toISOString()
      });
    } catch (error) {
      console.error('Password reset request error:', error.message);

      res.status(500).json({
        error: 'PASSWORD_RESET_FAILED',
        message: 'Failed to process password reset request',
        timestamp: new Date().toISOString()
      });
    }
  }
);

// PUT /auth/reset-password - Complete password reset
router.put('/reset-password',
  validate('resetPasswordComplete'),
  async (req, res) => {
    try {
      const { token, new_password } = req.body;

      // TODO: Implement password reset completion logic
      // For now, return not implemented

      res.status(501).json({
        error: 'NOT_IMPLEMENTED',
        message: 'Password reset completion not yet implemented',
        timestamp: new Date().toISOString()
      });
    } catch (error) {
      console.error('Password reset completion error:', error.message);

      res.status(500).json({
        error: 'PASSWORD_RESET_FAILED',
        message: 'Failed to reset password',
        timestamp: new Date().toISOString()
      });
    }
  }
);

module.exports = router;
