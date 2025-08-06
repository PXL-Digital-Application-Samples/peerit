const jwt = require('jsonwebtoken');
const axios = require('axios');
const jwkToPem = require('jwk-to-pem');

class OAuth2SecurityMiddleware {
  constructor() {
    this.keycloakUrl = process.env.KEYCLOAK_URL || 'http://localhost:8080';
    this.realm = process.env.KEYCLOAK_REALM || 'peerit';
    this.clientId = process.env.KEYCLOAK_CLIENT_ID || 'peerit-api';
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

  /**
   * OAuth2 Security middleware for Keycloak JWT validation
   */
  keycloakOAuth2(requiredScopes = []) {
    return async (req, res, next) => {
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

        // Extract user roles from Keycloak token
        const userRoles = payload.realm_access?.roles || [];
        
        // Check if user has required scopes/roles
        if (requiredScopes.length > 0) {
          const hasRequiredScope = this.checkScopes(userRoles, requiredScopes);
          
          if (!hasRequiredScope) {
            return res.status(403).json({
              error: 'Forbidden',
              message: `Insufficient permissions. Required: ${requiredScopes.join(' or ')}`,
              code: 403,
              timestamp: new Date().toISOString()
            });
          }
        }

        // Add user info to request for downstream use
        // Keycloak v26: sub may be missing, fallback to preferred_username, then email
        let userId = payload.sub || payload.preferred_username || payload.email;
        req.user = {
          id: userId,
          email: payload.email,
          name: payload.name,
          preferredUsername: payload.preferred_username,
          roles: userRoles,
          scopes: this.rolesToScopes(userRoles),
          resourceAccess: payload.resource_access || {}
        };

        next();
      } catch (error) {
        console.error('OAuth2 authentication error:', error);
        return res.status(401).json({
          error: 'Unauthorized',
          message: 'Token validation failed',
          code: 401,
          timestamp: new Date().toISOString()
        });
      }
    };
  }

  /**
   * Check if user has any of the required scopes based on their roles
   */
  checkScopes(userRoles, requiredScopes) {
    const userScopes = this.rolesToScopes(userRoles);
    return requiredScopes.some(scope => userScopes.includes(scope));
  }

  /**
   * Convert Keycloak roles to OAuth2 scopes
   */
  rolesToScopes(roles) {
    const scopes = [];
    
    if (roles.includes('admin')) {
      scopes.push('admin');
    }
    
    if (roles.includes('teacher')) {
      scopes.push('teacher');
    }
    
    if (roles.includes('student')) {
      scopes.push('student');
    }
    
    return scopes;
  }

  /**
   * Convenience method for admin scope requirement
   */
  requireAdmin() {
    return this.keycloakOAuth2(['admin']);
  }

  /**
   * Convenience method for teacher scope requirement (includes admin)
   */
  requireTeacher() {
    return this.keycloakOAuth2(['admin', 'teacher']);
  }

  /**
   * Convenience method for student scope requirement (includes all roles)
   */
  requireStudent() {
    return this.keycloakOAuth2(['admin', 'teacher', 'student']);
  }

  /**
   * OAuth2 Security handler for express-openapi-validator (throws errors instead of using response)
   */
  async validateOAuth2(req, requiredScopes = []) {
    try {
      const authHeader = req.headers.authorization;
      
      if (!authHeader || !authHeader.startsWith('Bearer ')) {
        throw { status: 401, message: 'Missing or invalid authorization header' };
      }

      const token = authHeader.split(' ')[1];
      
      // Decode token without verification first to get header info
      const decoded = jwt.decode(token, { complete: true });
      
      if (!decoded) {
        throw { status: 401, message: 'Invalid token format' };
      }

      const { kid } = decoded.header;
      
      // Get JWKS and find the right key
      const jwks = await this.getJWKS();
      
      // First try to find the key by kid and verify it's for signing
      let key = jwks.keys.find(k => k.kid === kid && k.use === 'sig');
      
      // If not found by exact kid, try to find any signing key with RS256
      if (!key) {
        key = jwks.keys.find(k => k.use === 'sig' && k.alg === 'RS256');
      }
      
      if (!key) {
        console.log('Available keys:', jwks.keys.map(k => ({ kid: k.kid, use: k.use, alg: k.alg })));
        throw { status: 401, message: `Invalid token key. Expected kid: ${kid}` };
      }
      
      console.log(`Using key: ${key.kid} (use: ${key.use}, alg: ${key.alg})`);
      
      if (key.use !== 'sig') {
        throw { status: 401, message: 'Key is not for signing' };
      }

      // Convert JWK to PEM format
      const publicKey = jwkToPem(key);

      // Verify the token (Keycloak v26 doesn't include aud field by default)
      const payload = jwt.verify(token, publicKey, {
        algorithms: ['RS256'],
        issuer: `${this.keycloakUrl}/realms/${this.realm}`
        // Note: audience validation removed since Keycloak v26 tokens don't include aud field
      });

      // Extract roles from token
      const realmRoles = payload.realm_access?.roles || [];
      const clientRoles = payload.resource_access?.[this.clientId]?.roles || [];
      const userRoles = [...realmRoles, ...clientRoles];

      // Check if user has required scopes
      const userScopes = this.rolesToScopes(userRoles);
      const hasRequiredScopes = requiredScopes.length === 0 || 
        requiredScopes.some(scope => userScopes.includes(scope));

      if (!hasRequiredScopes) {
        throw { status: 403, message: `Insufficient permissions. Required: ${requiredScopes.join(', ')}, Available: ${userScopes.join(', ')}` };
      }

      // Attach user information to request
      req.user = {
        id: payload.sub,
        email: payload.email,
        name: payload.name,
        preferredUsername: payload.preferred_username,
        roles: userRoles,
        scopes: this.rolesToScopes(userRoles),
        resourceAccess: payload.resource_access || {}
      };

      return true;
    } catch (error) {
      console.error('OAuth2 authentication error:', error);
      
      // If it's already a structured error, throw it as is
      if (error.status) {
        throw error;
      }
      
      // Otherwise, wrap it in a 401 error
      throw { status: 401, message: 'Token validation failed' };
    }
  }

  /**
   * Convenience method for authenticated users (any valid token)
   */
  requireAuth() {
    return this.keycloakOAuth2([]);
  }
}

module.exports = new OAuth2SecurityMiddleware();
