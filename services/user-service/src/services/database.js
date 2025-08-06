
// Minimal mock for getDatabaseService to allow service startup
function getDatabaseService() {
  return {
    // Add mock methods as needed for endpoints
    getUserById: async (id) => ({
      id,
      email: `user${id}@example.com`,
      name: `User ${id}`,
      preferred_username: `user${id}`,
      roles: ['user'],
    }),
  };
}

module.exports = { getDatabaseService };
