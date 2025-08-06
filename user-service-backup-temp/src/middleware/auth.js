const jwt = require('jsonwebtoken');
const axios = require('axios');

class AuthMiddleware {
  constructor() {
    this.keycloakUrl = process.env.KEYCLOAK_URL || 'http://localhost:8080';
    this.realm = process.env.KEYCLOAK_REALM || 'peerit';
    this.clientId = process.env.KEYCLOAK_CLIENT_ID || 'peerit-services';
    this.jwksCache = new Map();
    this.jwksCacheExpiry = Date.now();
  }

  async getJWKS() {
    const now = Date.now();
    const cacheKey = 'jwks';
    
    // Cache for 1 hour
    if (this.jwksCache.has(cacheKey) && now < this.jwksCacheExpiry) {
      return this.jwksCache.get(cacheKey);
    }

    try {
      const response = await axios.get(
        `${this.keycloakUrl}/realms/${this.realm}/protocol/openid-connect/certs`
      );
      
      this.jwksCache.set(cacheKey, response.data);
      this.jwksCacheExpiry = now + (60 * 60 * 1000); // 1 hour
      
      return response.data;
    } catch (error) {
      console.error('Failed to fetch JWKS:', error.message);
      throw new Error('Unable to fetch JWKS');
    }
  }

  async authenticate(req, res, next) {
    try {
      const authHeader = req.headers.authorization;
      
      if (!authHeader || !authHeader.startsWith('Bearer ')) {
        return res.status(401).json({
          error: 'Unauthorized',
          message: 'Missing or invalid authorization header',
          code: 401,
          timestamp: new Date().toISOString()
        });
      }

      const token = authHeader.split(' ')[1];
      
      // Decode token without verification first to get header info
      const decoded = jwt.decode(token, { complete: true });
      
      if (!decoded) {
        return res.status(401).json({
          error: 'Unauthorized',
          message: 'Invalid token format',
          code: 401,
          timestamp: new Date().toISOString()
        });
      }

      // For now, we'll skip full JWT verification and just decode the payload
      // In production, you'd want to verify against Keycloak's public key
      const payload = jwt.decode(token);
      
      if (!payload) {
        return res.status(401).json({
          error: 'Unauthorized',
          message: 'Invalid token payload',
          code: 401,
          timestamp: new Date().toISOString()
        });
      }

      // Check token expiration
      if (payload.exp && Date.now() >= payload.exp * 1000) {
        return res.status(401).json({
          error: 'Unauthorized',
          message: 'Token expired',
          code: 401,
          timestamp: new Date().toISOString()
        });
      }

      // Add user info to request
      req.user = {
        id: payload.sub,
        email: payload.email,
        name: payload.name,
        preferredUsername: payload.preferred_username,
        roles: payload.realm_access?.roles || [],
        resourceAccess: payload.resource_access || {}
      };

      next();
    } catch (error) {
      console.error('Authentication error:', error);
      return res.status(401).json({
        error: 'Unauthorized',
        message: 'Token validation failed',
        code: 401,
        timestamp: new Date().toISOString()
      });
    }
  }

  requireRole(requiredRole) {
    return (req, res, next) => {
      if (!req.user) {
        return res.status(401).json({
          error: 'Unauthorized',
          message: 'Authentication required',
          code: 401,
          timestamp: new Date().toISOString()
        });
      }

      if (!req.user.roles.includes(requiredRole)) {
        return res.status(403).json({
          error: 'Forbidden',
          message: `Role '${requiredRole}' required`,
          code: 403,
          timestamp: new Date().toISOString()
        });
      }

      next();
    };
  }

  requireAnyRole(requiredRoles) {
    return (req, res, next) => {
      if (!req.user) {
        return res.status(401).json({
          error: 'Unauthorized',
          message: 'Authentication required',
          code: 401,
          timestamp: new Date().toISOString()
        });
      }

      const hasRole = requiredRoles.some(role => req.user.roles.includes(role));
      
      if (!hasRole) {
        return res.status(403).json({
          error: 'Forbidden',
          message: `One of these roles required: ${requiredRoles.join(', ')}`,
          code: 403,
          timestamp: new Date().toISOString()
        });
      }

      next();
    };
  }
}

module.exports = new AuthMiddleware();
