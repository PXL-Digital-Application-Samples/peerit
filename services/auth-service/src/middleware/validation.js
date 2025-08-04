const Joi = require('joi');

// Validation schemas
const schemas = {
  login: Joi.object({
    email: Joi.string().email().required(),
    password: Joi.string().min(8).required()
  }),

  magicLink: Joi.object({
    email: Joi.string().email().required(),
    purpose: Joi.string().valid('login', 'review_session').default('login'),
    session_id: Joi.string().uuid().optional()
  }),

  refreshToken: Joi.object({
    refresh_token: Joi.string().required()
  }),

  resetPasswordRequest: Joi.object({
    email: Joi.string().email().required()
  }),

  resetPasswordComplete: Joi.object({
    token: Joi.string().required(),
    new_password: Joi.string().min(8).required()
  })
};

const validate = (schemaName) => {
  return (req, res, next) => {
    const schema = schemas[schemaName];
    
    if (!schema) {
      return res.status(500).json({
        error: 'VALIDATION_SCHEMA_NOT_FOUND',
        message: 'Validation schema not configured',
        timestamp: new Date().toISOString()
      });
    }

    const { error, value } = schema.validate(req.body, {
      stripUnknown: true,
      abortEarly: false
    });

    if (error) {
      const details = error.details.map(detail => ({
        field: detail.path.join('.'),
        message: detail.message,
        value: detail.context?.value
      }));

      return res.status(400).json({
        error: 'VALIDATION_ERROR',
        message: 'Request validation failed',
        details,
        timestamp: new Date().toISOString()
      });
    }

    // Replace req.body with validated and sanitized data
    req.body = value;
    next();
  };
};

// Parameter validation
const validateParam = (paramName, schema) => {
  return (req, res, next) => {
    const { error, value } = schema.validate(req.params[paramName]);

    if (error) {
      return res.status(400).json({
        error: 'VALIDATION_ERROR',
        message: `Invalid ${paramName}: ${error.message}`,
        timestamp: new Date().toISOString()
      });
    }

    req.params[paramName] = value;
    next();
  };
};

// Token parameter validation
const validateMagicToken = validateParam('token', Joi.string().alphanum().min(32).max(128));

module.exports = {
  validate,
  validateParam,
  validateMagicToken,
  schemas
};
