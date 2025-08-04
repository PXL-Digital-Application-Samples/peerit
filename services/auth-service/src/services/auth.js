const bcrypt = require('bcryptjs');
const jwt = require('jsonwebtoken');
const crypto = require('crypto');
const { v4: uuidv4 } = require('uuid');
const db = require('./database');

class AuthService {
  constructor() {
    this.jwtSecret = process.env.JWT_SECRET || process.env.JWT_SECRET_KEY;
    this.jwtRefreshSecret = process.env.JWT_REFRESH_SECRET || this.jwtSecret;
    this.accessTokenExpiry = process.env.JWT_EXPIRES_IN || process.env.JWT_ACCESS_EXPIRES_IN || '15m';
    this.refreshTokenExpiry = process.env.JWT_REFRESH_EXPIRES_IN || '7d';
    this.bcryptCost = parseInt(process.env.BCRYPT_COST) || 12;
    this.magicLinkExpiryMinutes = parseInt(process.env.MAGIC_LINK_EXPIRES_IN?.replace('m', '')) || 15;
    this.maxFailedAttempts = parseInt(process.env.ACCOUNT_LOCKOUT_ATTEMPTS) || 5;
    this.lockoutDurationMs = parseInt(process.env.ACCOUNT_LOCKOUT_DURATION_MS) || 900000; // 15 minutes
  }

  // Password operations
  async hashPassword(password) {
    return bcrypt.hash(password, this.bcryptCost);
  }

  async verifyPassword(password, hash) {
    return bcrypt.compare(password, hash);
  }

  // JWT Token operations
  generateAccessToken(payload) {
    return jwt.sign(payload, this.jwtSecret, {
      expiresIn: this.accessTokenExpiry,
      issuer: 'peerit-auth',
      audience: 'peerit-services'
    });
  }

  generateRefreshTokenCrypto() {
    return crypto.randomBytes(40).toString('hex');
  }

  verifyAccessToken(token) {
    try {
      return jwt.verify(token, this.jwtSecret, {
        issuer: 'peerit-auth',
        audience: 'peerit-services'
      });
    } catch (error) {
      throw new Error('Invalid or expired token');
    }
  }

  generateRefreshToken(payload) {
    return jwt.sign(payload, this.jwtRefreshSecret, {
      expiresIn: this.refreshTokenExpiry,
      issuer: 'peerit-auth',
      audience: 'peerit-services'
    });
  }

  verifyRefreshToken(token) {
    try {
      return jwt.verify(token, this.jwtRefreshSecret, {
        issuer: 'peerit-auth',
        audience: 'peerit-services'
      });
    } catch (error) {
      throw new Error('Invalid or expired refresh token');
    }
  }

  generateTokens(userId, email) {
    const payload = {
      userId,
      email,
      type: 'access'
    };
    
    const refreshPayload = {
      userId,
      email,
      type: 'refresh'
    };

    return {
      accessToken: this.generateAccessToken(payload),
      refreshToken: this.generateRefreshToken(refreshPayload)
    };
  }

  async authenticateUser(email, password) {
    try {
      const user = await db.findUserByEmail(email);

      if (!user) {
        return {
          success: false,
          reason: 'Invalid credentials'
        };
      }

      // Check if account is locked
      if (user.lockedUntil && new Date() < user.lockedUntil) {
        const remainingTime = Math.ceil((user.lockedUntil - new Date()) / 1000 / 60);
        return {
          success: false,
          reason: `Account locked. Try again in ${remainingTime} minutes`
        };
      }

      if (!user.isActive) {
        return {
          success: false,
          reason: 'Account is inactive'
        };
      }

      // Verify password
      const isValidPassword = await this.verifyPassword(password, user.passwordHash);

      if (!isValidPassword) {
        // Increment failed attempts
        await db.incrementFailedLoginAttempts(user.id);
        
        // Lock account if too many failed attempts
        if (user.failedLoginAttempts + 1 >= this.maxFailedAttempts) {
          await db.lockAccount(user.id, this.lockoutDurationMs);
          return {
            success: false,
            reason: 'Too many failed attempts. Account locked temporarily'
          };
        }

        return {
          success: false,
          reason: 'Invalid credentials'
        };
      }

      // Reset failed attempts on successful login
      await db.resetFailedLoginAttempts(user.id);

      return {
        success: true,
        user: user
      };
    } catch (error) {
      return {
        success: false,
        reason: error.message
      };
    }
  }

  parseTokenExpiry(expiresIn) {
    if (expiresIn.endsWith('m')) {
      return parseInt(expiresIn) * 60 * 1000; // minutes to milliseconds
    }
    if (expiresIn.endsWith('h')) {
      return parseInt(expiresIn) * 60 * 60 * 1000; // hours to milliseconds
    }
    if (expiresIn.endsWith('d')) {
      return parseInt(expiresIn) * 24 * 60 * 60 * 1000; // days to milliseconds
    }
    return parseInt(expiresIn) * 1000; // assume seconds
  }

  // Magic Link operations
  generateMagicLinkToken() {
    return crypto.randomBytes(32).toString('hex');
  }

  async createMagicLink(userIdOrEmail, purpose = 'login', sessionId = null) {
    let user;
    let userId;
    
    // Handle both userId and email parameters
    if (typeof userIdOrEmail === 'string' && userIdOrEmail.includes('@')) {
      // It's an email
      user = await db.findUserByEmail(userIdOrEmail);
      if (!user) {
        // For magic links, we can create a user automatically
        const tempPassword = crypto.randomBytes(32).toString('hex');
        const passwordHash = await this.hashPassword(tempPassword);
        user = await db.createUser(userIdOrEmail, passwordHash);
      }
      userId = user.id;
    } else {
      // It's a userId
      userId = userIdOrEmail;
    }

    const token = this.generateMagicLinkToken();
    const expiresAt = new Date(Date.now() + this.magicLinkExpiryMinutes * 60 * 1000);

    await db.createMagicLinkToken(userId, token, expiresAt, purpose, sessionId);

    return {
      token,
      expiresAt,
      userId: userId,
      magicLink: `${process.env.FRONTEND_URL || 'http://localhost:3000'}/magic-link?token=${token}`
    };
  }

  async validateMagicLink(token) {
    try {
      const magicLinkToken = await db.findMagicLinkToken(token);

      if (!magicLinkToken) {
        return {
          isValid: false,
          reason: 'Invalid magic link token'
        };
      }

      if (magicLinkToken.used) {
        return {
          isValid: false,
          reason: 'Token already used'
        };
      }

      if (new Date() > magicLinkToken.expiresAt) {
        return {
          isValid: false,
          reason: 'Token expired'
        };
      }

      if (!magicLinkToken.user.isActive) {
        return {
          isValid: false,
          reason: 'User account is inactive'
        };
      }

      if (magicLinkToken.user.lockedUntil && new Date() < magicLinkToken.user.lockedUntil) {
        return {
          isValid: false,
          reason: 'User account is locked'
        };
      }

      // Mark token as used
      await db.useMagicLinkToken(magicLinkToken.id);

      return {
        isValid: true,
        user: magicLinkToken.user
      };
    } catch (error) {
      return {
        isValid: false,
        reason: error.message
      };
    }
  }

  // Authentication flow
  async login(email, password, userAgent = null, ipAddress = null) {
    const user = await db.findUserByEmail(email);

    if (!user) {
      throw new Error('Invalid credentials');
    }

    // Check if account is locked
    if (user.lockedUntil && new Date() < user.lockedUntil) {
      const remainingTime = Math.ceil((user.lockedUntil - new Date()) / 1000 / 60);
      throw new Error(`Account locked. Try again in ${remainingTime} minutes`);
    }

    if (!user.isActive) {
      throw new Error('Account is inactive');
    }

    // Verify password
    const isValidPassword = await this.verifyPassword(password, user.passwordHash);

    if (!isValidPassword) {
      // Increment failed attempts
      await db.incrementFailedLoginAttempts(user.id);
      
      // Lock account if too many failed attempts
      if (user.failedLoginAttempts + 1 >= this.maxFailedAttempts) {
        await db.lockAccount(user.id, this.lockoutDurationMs);
        throw new Error('Too many failed attempts. Account locked temporarily');
      }

      throw new Error('Invalid credentials');
    }

    // Reset failed attempts on successful login
    await db.resetFailedLoginAttempts(user.id);

    return this.generateAuthResponse(user, userAgent, ipAddress);
  }

  async loginWithMagicLink(token, userAgent = null, ipAddress = null) {
    const user = await this.validateMagicLink(token);
    await db.resetFailedLoginAttempts(user.id);
    return this.generateAuthResponse(user, userAgent, ipAddress);
  }

  async generateAuthResponse(user, userAgent = null, ipAddress = null) {
    const sessionId = uuidv4();
    
    // Generate tokens
    const accessToken = this.generateAccessToken({
      userId: user.id,
      email: user.email,
      sessionId
    });

    const refreshToken = this.generateRefreshTokenCrypto();
    const refreshExpiresAt = new Date(Date.now() + this.parseTokenExpiry(this.refreshTokenExpiry));

    // Store refresh token
    await db.createRefreshToken(user.id, refreshToken, refreshExpiresAt, userAgent, ipAddress);

    // Create session
    const sessionData = {
      user_id: user.id,
      email: user.email,
      session_id: sessionId,
      created_at: new Date().toISOString(),
      last_activity: new Date().toISOString(),
      ip_address: ipAddress,
      user_agent: userAgent
    };

    await db.createSession(sessionId, sessionData);

    return {
      access_token: accessToken,
      refresh_token: refreshToken,
      token_type: 'Bearer',
      expires_in: this.parseTokenExpiry(this.accessTokenExpiry) / 1000,
      user: {
        id: user.id,
        email: user.email,
        is_active: user.isActive,
        created_at: user.createdAt,
        updated_at: user.updatedAt,
        last_login: user.lastLogin
      }
    };
  }

  async refreshAccessToken(refreshToken, userAgent = null, ipAddress = null) {
    const tokenRecord = await db.findRefreshToken(refreshToken);

    if (!tokenRecord) {
      throw new Error('Invalid refresh token');
    }

    if (tokenRecord.revoked) {
      throw new Error('Refresh token revoked');
    }

    if (new Date() > tokenRecord.expiresAt) {
      throw new Error('Refresh token expired');
    }

    if (!tokenRecord.user.isActive) {
      throw new Error('User account is inactive');
    }

    // Update last used
    await db.updateRefreshTokenLastUsed(tokenRecord.id);

    // Generate new access token
    const sessionId = uuidv4();
    const accessToken = this.generateAccessToken({
      userId: tokenRecord.user.id,
      email: tokenRecord.user.email,
      sessionId
    });

    // Update session
    const sessionData = {
      user_id: tokenRecord.user.id,
      email: tokenRecord.user.email,
      session_id: sessionId,
      created_at: new Date().toISOString(),
      last_activity: new Date().toISOString(),
      ip_address: ipAddress,
      user_agent: userAgent
    };

    await db.createSession(sessionId, sessionData);

    return {
      access_token: accessToken,
      token_type: 'Bearer',
      expires_in: this.parseTokenExpiry(this.accessTokenExpiry) / 1000
    };
  }

  async logout(sessionId, refreshToken = null) {
    // Delete session
    if (sessionId) {
      await db.deleteSession(sessionId);
    }

    // Revoke refresh token
    if (refreshToken) {
      const tokenRecord = await db.findRefreshToken(refreshToken);
      if (tokenRecord) {
        await db.revokeRefreshToken(tokenRecord.id);
      }
    }
  }

  async logoutAllSessions(userId) {
    await db.deleteAllUserSessions(userId);
    await db.revokeAllUserRefreshTokens(userId);
  }

  async validateToken(token) {
    const payload = this.verifyAccessToken(token);
    
    // Check if session exists
    const session = await db.getSession(payload.sessionId);
    if (!session) {
      throw new Error('Session not found');
    }

    // Update last activity
    session.last_activity = new Date().toISOString();
    await db.updateSession(payload.sessionId, session);

    return {
      valid: true,
      user_id: payload.userId,
      email: payload.email,
      session_id: payload.sessionId,
      expires_at: new Date(payload.exp * 1000).toISOString()
    };
  }

  // Cleanup operations
  async cleanup() {
    await db.cleanupExpiredMagicLinkTokens();
    await db.cleanupExpiredRefreshTokens();
  }
}

module.exports = new AuthService();
