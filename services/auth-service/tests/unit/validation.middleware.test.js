const { 
  validateEmail, 
  validatePassword, 
  validateLoginRequest, 
  validateMagicLinkRequest, 
  validateTokenRefreshRequest,
  validateValidateMagicLinkRequest 
} = require('../../src/middleware/validation');

describe('Validation Middleware', () => {
  let mockReq, mockRes, mockNext;

  beforeEach(() => {
    mockReq = {
      body: {}
    };
    mockRes = {
      status: jest.fn().mockReturnThis(),
      json: jest.fn()
    };
    mockNext = jest.fn();
  });

  describe('validateEmail', () => {
    test('should pass validation for valid email', () => {
      mockReq.body = { email: 'test@example.com' };
      
      validateEmail(mockReq, mockRes, mockNext);
      
      expect(mockNext).toHaveBeenCalled();
      expect(mockRes.status).not.toHaveBeenCalled();
    });

    test('should reject invalid email format', () => {
      mockReq.body = { email: 'invalid-email' };
      
      validateEmail(mockReq, mockRes, mockNext);
      
      expect(mockRes.status).toHaveBeenCalledWith(400);
      expect(mockRes.json).toHaveBeenCalledWith(
        expect.objectContaining({
          error: 'Validation failed',
          details: expect.arrayContaining([
            expect.objectContaining({
              field: 'email',
              message: expect.stringContaining('valid email')
            })
          ])
        })
      );
      expect(mockNext).not.toHaveBeenCalled();
    });

    test('should reject missing email', () => {
      mockReq.body = {};
      
      validateEmail(mockReq, mockRes, mockNext);
      
      expect(mockRes.status).toHaveBeenCalledWith(400);
      expect(mockNext).not.toHaveBeenCalled();
    });

    test('should reject email that is too long', () => {
      const longEmail = 'a'.repeat(250) + '@example.com';
      mockReq.body = { email: longEmail };
      
      validateEmail(mockReq, mockRes, mockNext);
      
      expect(mockRes.status).toHaveBeenCalledWith(400);
      expect(mockNext).not.toHaveBeenCalled();
    });
  });

  describe('validatePassword', () => {
    test('should pass validation for valid password', () => {
      mockReq.body = { password: 'StrongPassword123!' };
      
      validatePassword(mockReq, mockRes, mockNext);
      
      expect(mockNext).toHaveBeenCalled();
      expect(mockRes.status).not.toHaveBeenCalled();
    });

    test('should reject password that is too short', () => {
      mockReq.body = { password: 'short' };
      
      validatePassword(mockReq, mockRes, mockNext);
      
      expect(mockRes.status).toHaveBeenCalledWith(400);
      expect(mockRes.json).toHaveBeenCalledWith(
        expect.objectContaining({
          error: 'Validation failed',
          details: expect.arrayContaining([
            expect.objectContaining({
              field: 'password',
              message: expect.stringContaining('at least 8 characters')
            })
          ])
        })
      );
      expect(mockNext).not.toHaveBeenCalled();
    });

    test('should reject password without uppercase letter', () => {
      mockReq.body = { password: 'weakpassword123!' };
      
      validatePassword(mockReq, mockRes, mockNext);
      
      expect(mockRes.status).toHaveBeenCalledWith(400);
      expect(mockNext).not.toHaveBeenCalled();
    });

    test('should reject password without lowercase letter', () => {
      mockReq.body = { password: 'WEAKPASSWORD123!' };
      
      validatePassword(mockReq, mockRes, mockNext);
      
      expect(mockRes.status).toHaveBeenCalledWith(400);
      expect(mockNext).not.toHaveBeenCalled();
    });

    test('should reject password without number', () => {
      mockReq.body = { password: 'WeakPassword!' };
      
      validatePassword(mockReq, mockRes, mockNext);
      
      expect(mockRes.status).toHaveBeenCalledWith(400);
      expect(mockNext).not.toHaveBeenCalled();
    });

    test('should reject password without special character', () => {
      mockReq.body = { password: 'WeakPassword123' };
      
      validatePassword(mockReq, mockRes, mockNext);
      
      expect(mockRes.status).toHaveBeenCalledWith(400);
      expect(mockNext).not.toHaveBeenCalled();
    });

    test('should reject missing password', () => {
      mockReq.body = {};
      
      validatePassword(mockReq, mockRes, mockNext);
      
      expect(mockRes.status).toHaveBeenCalledWith(400);
      expect(mockNext).not.toHaveBeenCalled();
    });
  });

  describe('validateLoginRequest', () => {
    test('should pass validation for valid login request', () => {
      mockReq.body = {
        email: 'test@example.com',
        password: 'StrongPassword123!'
      };
      
      validateLoginRequest(mockReq, mockRes, mockNext);
      
      expect(mockNext).toHaveBeenCalled();
      expect(mockRes.status).not.toHaveBeenCalled();
    });

    test('should reject request with invalid email and password', () => {
      mockReq.body = {
        email: 'invalid-email',
        password: 'weak'
      };
      
      validateLoginRequest(mockReq, mockRes, mockNext);
      
      expect(mockRes.status).toHaveBeenCalledWith(400);
      expect(mockRes.json).toHaveBeenCalledWith(
        expect.objectContaining({
          error: 'Validation failed',
          details: expect.arrayContaining([
            expect.objectContaining({ field: 'email' }),
            expect.objectContaining({ field: 'password' })
          ])
        })
      );
      expect(mockNext).not.toHaveBeenCalled();
    });
  });

  describe('validateMagicLinkRequest', () => {
    test('should pass validation for valid magic link request', () => {
      mockReq.body = {
        email: 'test@example.com',
        purpose: 'login'
      };
      
      validateMagicLinkRequest(mockReq, mockRes, mockNext);
      
      expect(mockNext).toHaveBeenCalled();
      expect(mockRes.status).not.toHaveBeenCalled();
    });

    test('should pass validation for password reset purpose', () => {
      mockReq.body = {
        email: 'test@example.com',
        purpose: 'password_reset'
      };
      
      validateMagicLinkRequest(mockReq, mockRes, mockNext);
      
      expect(mockNext).toHaveBeenCalled();
      expect(mockRes.status).not.toHaveBeenCalled();
    });

    test('should use default purpose when not provided', () => {
      mockReq.body = {
        email: 'test@example.com'
      };
      
      validateMagicLinkRequest(mockReq, mockRes, mockNext);
      
      expect(mockNext).toHaveBeenCalled();
      expect(mockReq.body.purpose).toBe('login');
    });

    test('should reject invalid purpose', () => {
      mockReq.body = {
        email: 'test@example.com',
        purpose: 'invalid_purpose'
      };
      
      validateMagicLinkRequest(mockReq, mockRes, mockNext);
      
      expect(mockRes.status).toHaveBeenCalledWith(400);
      expect(mockNext).not.toHaveBeenCalled();
    });
  });

  describe('validateTokenRefreshRequest', () => {
    test('should pass validation for valid refresh token request', () => {
      mockReq.body = {
        refreshToken: 'valid.refresh.token'
      };
      
      validateTokenRefreshRequest(mockReq, mockRes, mockNext);
      
      expect(mockNext).toHaveBeenCalled();
      expect(mockRes.status).not.toHaveBeenCalled();
    });

    test('should reject missing refresh token', () => {
      mockReq.body = {};
      
      validateTokenRefreshRequest(mockReq, mockRes, mockNext);
      
      expect(mockRes.status).toHaveBeenCalledWith(400);
      expect(mockNext).not.toHaveBeenCalled();
    });

    test('should reject empty refresh token', () => {
      mockReq.body = {
        refreshToken: ''
      };
      
      validateTokenRefreshRequest(mockReq, mockRes, mockNext);
      
      expect(mockRes.status).toHaveBeenCalledWith(400);
      expect(mockNext).not.toHaveBeenCalled();
    });
  });

  describe('validateValidateMagicLinkRequest', () => {
    test('should pass validation for valid magic link validation request', () => {
      mockReq.body = {
        token: 'valid-magic-link-token-123'
      };
      
      validateValidateMagicLinkRequest(mockReq, mockRes, mockNext);
      
      expect(mockNext).toHaveBeenCalled();
      expect(mockRes.status).not.toHaveBeenCalled();
    });

    test('should reject missing token', () => {
      mockReq.body = {};
      
      validateValidateMagicLinkRequest(mockReq, mockRes, mockNext);
      
      expect(mockRes.status).toHaveBeenCalledWith(400);
      expect(mockNext).not.toHaveBeenCalled();
    });

    test('should reject empty token', () => {
      mockReq.body = {
        token: ''
      };
      
      validateValidateMagicLinkRequest(mockReq, mockRes, mockNext);
      
      expect(mockRes.status).toHaveBeenCalledWith(400);
      expect(mockNext).not.toHaveBeenCalled();
    });

    test('should reject token that is too short', () => {
      mockReq.body = {
        token: 'short'
      };
      
      validateValidateMagicLinkRequest(mockReq, mockRes, mockNext);
      
      expect(mockRes.status).toHaveBeenCalledWith(400);
      expect(mockNext).not.toHaveBeenCalled();
    });
  });

  describe('Error Response Format', () => {
    test('should return consistent error format', () => {
      mockReq.body = { email: 'invalid' };
      
      validateEmail(mockReq, mockRes, mockNext);
      
      expect(mockRes.json).toHaveBeenCalledWith({
        error: 'Validation failed',
        details: expect.any(Array),
        timestamp: expect.any(String)
      });
    });

    test('should include field and message in error details', () => {
      mockReq.body = { email: 'invalid' };
      
      validateEmail(mockReq, mockRes, mockNext);
      
      const errorResponse = mockRes.json.mock.calls[0][0];
      expect(errorResponse.details[0]).toHaveProperty('field');
      expect(errorResponse.details[0]).toHaveProperty('message');
    });
  });
});
