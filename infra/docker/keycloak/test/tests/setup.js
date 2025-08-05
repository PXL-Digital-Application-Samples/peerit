// Test setup and utilities
global.KEYCLOAK_URL = process.env.KEYCLOAK_URL || 'http://localhost:8081';
global.TEST_TIMEOUT = parseInt(process.env.TEST_TIMEOUT) || 30000;

// Global test utilities
global.delay = (ms) => new Promise(resolve => setTimeout(resolve, ms));

global.waitForKeycloak = async () => {
  const maxAttempts = 20;
  let attempts = 0;
  
  while (attempts < maxAttempts) {
    try {
      const response = await fetch(`${global.KEYCLOAK_URL}/health/ready`);
      if (response.ok) return true;
    } catch (error) {
      // Continue trying
    }
    await global.delay(3000);
    attempts++;
  }
  throw new Error('Keycloak did not become ready in time');
};
