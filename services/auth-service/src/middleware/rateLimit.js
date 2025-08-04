const rateLimit = require('express-rate-limit');

// Rate limiting configurations
const createRateLimiter = (options = {}) => {
  const defaultOptions = {
    windowMs: parseInt(process.env.RATE_LIMIT_WINDOW_MS) || 60000, // 1 minute
    max: parseInt(process.env.RATE_LIMIT_MAX) || 5,
    message: {
      error: 'RATE_LIMITED',
      message: 'Too many requests, please try again later',
      timestamp: new Date().toISOString()
    },
    standardHeaders: true,
    legacyHeaders: false,
    handler: (req, res) => {
      res.status(429).json({
        error: 'RATE_LIMITED',
        message: 'Too many requests, please try again later',
        timestamp: new Date().toISOString(),
        retryAfter: Math.ceil(options.windowMs / 1000)
      });
    }
  };

  return rateLimit({ ...defaultOptions, ...options });
};

// Specific rate limiters for different endpoints
const authRateLimit = createRateLimiter({
  windowMs: 60000, // 1 minute
  max: 5, // 5 attempts per minute
  keyGenerator: (req) => {
    // Rate limit by IP and email combination for login attempts
    const email = req.body?.email || '';
    return `auth:${req.ip}:${email}`;
  }
});

const magicLinkRateLimit = createRateLimiter({
  windowMs: 60000, // 1 minute
  max: 3, // 3 magic link requests per minute
  keyGenerator: (req) => {
    const email = req.body?.email || '';
    return `magic:${req.ip}:${email}`;
  }
});

const passwordResetRateLimit = createRateLimiter({
  windowMs: 300000, // 5 minutes
  max: 3, // 3 password reset requests per 5 minutes
  keyGenerator: (req) => {
    const email = req.body?.email || '';
    return `reset:${req.ip}:${email}`;
  }
});

const generalRateLimit = createRateLimiter({
  windowMs: 60000, // 1 minute
  max: 100 // 100 requests per minute for general endpoints
});

module.exports = {
  authRateLimit,
  magicLinkRateLimit,
  passwordResetRateLimit,
  generalRateLimit,
  createRateLimiter
};
