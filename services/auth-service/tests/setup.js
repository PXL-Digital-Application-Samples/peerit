// Test environment setup
process.env.NODE_ENV = 'test';
process.env.JWT_SECRET = 'test-secret-key-for-unit-tests';
process.env.JWT_REFRESH_SECRET = 'test-refresh-secret-for-unit-tests';
process.env.JWT_EXPIRES_IN = '15m';
process.env.JWT_REFRESH_EXPIRES_IN = '7d';
process.env.BCRYPT_ROUNDS = '10';
process.env.MAGIC_LINK_BASE_URL = 'http://localhost:3000';
process.env.MAX_FAILED_LOGIN_ATTEMPTS = '5';
process.env.ACCOUNT_LOCK_DURATION_MS = '900000';

// Suppress console output during tests (uncomment if needed)
// global.console = {
//   ...console,
//   log: jest.fn(),
//   warn: jest.fn(),
//   error: jest.fn(),
// };

// Global test utilities
global.createMockUser = (overrides = {}) => ({
  id: 'mock-user-id-123',
  email: 'test@example.com',
  passwordHash: '$2a$10$mockhashedpassword',
  isActive: true,
  failedLoginAttempts: 0,
  lockedUntil: null,
  createdAt: new Date(),
  updatedAt: new Date(),
  lastLogin: new Date(),
  ...overrides
});

global.createMockTokenData = (overrides = {}) => ({
  id: 'mock-token-id',
  token: 'mock-magic-token-123',
  used: false,
  expiresAt: new Date(Date.now() + 15 * 60 * 1000),
  purpose: 'login',
  sessionId: null,
  createdAt: new Date(),
  user: createMockUser(),
  ...overrides
});

// Mock timers for consistent testing
beforeEach(() => {
  jest.useFakeTimers();
  jest.setSystemTime(new Date('2025-08-04T18:00:00.000Z'));
});

afterEach(() => {
  jest.useRealTimers();
  jest.clearAllMocks();
});
