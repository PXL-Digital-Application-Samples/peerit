const jwt = require('jsonwebtoken');
const axios = require('axios');
const jwkToPem = require('jwk-to-pem');

class OAuth2SecurityMiddleware {
  constructor() {
    this.keycloakUrl = process.env.KEYCLOAK_URL || 'http://localhost:8080';
    this.realm = process.env.KEYCLOAK_REALM || 'peerit';
    this.clientId = process.env.KEYCLOAK_CLIENT_ID || 'peerit-services';
    this.jwksCache = new Map();
    this.jwksCacheExpiry = Date.now();
    this.realmPublicKey = null;
  }

  async getRealmPublicKey() {
    try {
      const response = await axios.get(
        `${this.keycloakUrl}/realms/${this.realm}`
      );
      
      if (response.data.public_key) {
        // Convert the public key to PEM format
        const publicKey = `-----BEGIN PUBLIC KEY-----\n${response.data.public_key}\n-----END PUBLIC KEY-----`;
        this.realmPublicKey = publicKey;
        return publicKey;
      }
      
      throw new Error('Public key not found in realm response');
    } catch (error) {
      console.error('Failed to fetch realm public key:', error.message);
      throw error;
    }
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
   * OAuth2 Security handler for express-openapi-validator
   */
  async validateOAuth2(req, requiredScopes = []) {
    try {
      const authHeader = req.headers.authorization;
      
      if (!authHeader || !authHeader.startsWith('Bearer ')) {
        throw { status: 401, message: 'Missing or invalid authorization header' };
      }

      const token = authHeader.split(' ')[1];
      
      // First, try to decode without verification to check structure
      const decoded = jwt.decode(token, { complete: true });
      
      if (!decoded) {
        throw { status: 401, message: 'Invalid token format' };
      }

      let payload;
      
      // Try multiple verification strategies for Keycloak v26
      try {
        // Strategy 1: Try with JWKS
        const jwks = await this.getJWKS();
        const { kid } = decoded.header;
        
        // Find the right key - Keycloak v26 uses 'sig' for signature verification
        let key = jwks.keys.find(k => k.kid === kid && (k.use === 'sig' || !k.use));
        
        if (!key && jwks.keys.length > 0) {
          // Fallback to first available key if no kid match
          key = jwks.keys.find(k => k.alg === 'RS256' || k.alg === 'RSA256');
        }
        
        if (key) {
          const publicKey = jwkToPem(key);
          
          // Verify with more lenient options for Keycloak v26
          payload = jwt.verify(token, publicKey, {
            algorithms: ['RS256'],
            issuer: [`${this.keycloakUrl}/realms/${this.realm}`],
            // Don't verify audience since Keycloak v26 doesn't include it by default
            ignoreExpiration: false
          });
        } else {
          throw new Error('No suitable key found in JWKS');
        }
      } catch (jwksError) {
        console.log('JWKS verification failed, trying realm public key:', jwksError.message);
        
        // Strategy 2: Try with realm public key
        try {
          const publicKey = await this.getRealmPublicKey();
          payload = jwt.verify(token, publicKey, {
            algorithms: ['RS256'],
            issuer: [`${this.keycloakUrl}/realms/${this.realm}`]
          });
        } catch (realmKeyError) {
          console.log('Realm key verification failed:', realmKeyError.message);
          
          // Strategy 3: For development, decode without verification
          if (process.env.NODE_ENV === 'development') {
            console.warn('WARNING: Using unverified token in development mode');
            payload = decoded.payload;
            
            // Still check expiration manually
            if (payload.exp && Date.now() >= payload.exp * 1000) {
              throw { status: 401, message: 'Token expired' };
            }
          } else {
            throw { status: 401, message: 'Token verification failed' };
          }
        }
      }

      // Extract roles from different possible locations in Keycloak v26 token
      let userRoles = [];
      
      // Check realm_access.roles (most common)
      if (payload.realm_access?.roles) {
        userRoles = [...userRoles, ...payload.realm_access.roles];
      }
      
      // Check resource_access for client-specific roles
      if (payload.resource_access) {
        // Check for the specific client
        if (payload.resource_access[this.clientId]?.roles) {
          userRoles = [...userRoles, ...payload.resource_access[this.clientId].roles];
        }
        
        // Also check peerit-frontend and peerit-api clients
        ['peerit-frontend', 'peerit-api'].forEach(client => {
          if (payload.resource_access[client]?.roles) {
            userRoles = [...userRoles, ...payload.resource_access[client].roles];
          }
        });
      }
      
      // Remove duplicates
      userRoles = [...new Set(userRoles)];
      
      console.log('Extracted roles:', userRoles);
      console.log('Required scopes:', requiredScopes);

      // Check if user has required scopes
      if (requiredScopes.length > 0) {
        const hasRequiredScope = requiredScopes.some(scope => 
          userRoles.includes(scope)
        );
        
        if (!hasRequiredScope) {
          throw { 
            status: 403, 
            message: `Insufficient permissions. Required: ${requiredScopes.join(' or ')}, Available: ${userRoles.join(', ')}` 
          };
        }
      }

      // Attach user information to request
      // IMPORTANT: Keycloak v26 tokens may not have 'sub' field
      // Use preferred_username as the primary identifier
      const userId = payload.preferred_username || payload.email || payload.sub || payload.sid;
      
      if (!userId) {
        console.error('No user identifier found in token:', payload);
        throw { status: 401, message: 'Invalid token: no user identifier' };
      }
      
      req.user = {
        id: userId, // This will be the username (e.g., 'admin', 'teacher1')
        keycloakId: payload.sub || userId, // Fallback to username if no sub
        username: payload.preferred_username,
        email: payload.email || payload.preferred_username,
        name: payload.name || `${payload.given_name || ''} ${payload.family_name || ''}`.trim(),
        preferredUsername: payload.preferred_username,
        roles: userRoles,
        scopes: userRoles, // Use roles as scopes
        resourceAccess: payload.resource_access || {},
        raw: payload // Include raw payload for debugging
      };

      console.log('User authenticated:', {
        id: req.user.id,
        email: req.user.email,
        roles: req.user.roles
      });

      return true;
    } catch (error) {
      console.error('OAuth2 authentication error:', error);
      
      // If it's already a structured error, throw it as is
      if (error.status) {
        throw error;
      }
      
      // Otherwise, wrap it in a 401 error
      throw { status: 401, message: error.message || 'Token validation failed' };
    }
  }

  /**
   * Express middleware for Keycloak JWT validation
   */
  keycloakOAuth2(requiredScopes = []) {
    return async (req, res, next) => {
      try {
        await this.validateOAuth2(req, requiredScopes);
        next();
      } catch (error) {
        console.error('Authentication failed:', error);
        return res.status(error.status || 401).json({
          error: error.status === 403 ? 'Forbidden' : 'Unauthorized',
          message: error.message,
          code: error.status || 401,
          timestamp: new Date().toISOString()
        });
      }
    };
  }

  /**
   * Convenience methods for role requirements
   */
  requireAdmin() {
    return this.keycloakOAuth2(['admin']);
  }

  requireTeacher() {
    return this.keycloakOAuth2(['admin', 'teacher']);
  }

  requireStudent() {
    return this.keycloakOAuth2(['admin', 'teacher', 'student']);
  }

  requireAuth() {
    return this.keycloakOAuth2([]);
  }
}

module.exports = new OAuth2SecurityMiddleware();