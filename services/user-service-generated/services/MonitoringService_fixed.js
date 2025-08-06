/* eslint-disable no-unused-vars */
const Service = require('./Service');
const { getDatabaseService } = require('./database');
const packageInfo = require('../package.json');

/**
* Health check
* Service health status
*
* returns HealthStatus
* */
const healthGET = (params, req) => new Promise(
  async (resolve, reject) => {
    try {
      const dbService = getDatabaseService();
      const isDbHealthy = await dbService.healthCheck();
      
      const status = isDbHealthy ? 'healthy' : 'unhealthy';
      const statusCode = isDbHealthy ? 200 : 503;
      
      resolve(Service.successResponse({
        status,
        timestamp: new Date().toISOString(),
        service: 'user-service',
        version: packageInfo.version,
        checks: {
          database: isDbHealthy ? 'up' : 'down'
        }
      }, statusCode));
    } catch (e) {
      reject(Service.rejectResponse(
        e.message || 'Health check failed',
        503,
      ));
    }
  },
);

/**
* Service information
* Service version and build information
*
* returns ServiceInfo
* */
const infoGET = (params, req) => new Promise(
  async (resolve, reject) => {
    try {
      resolve(Service.successResponse({
        name: packageInfo.name,
        version: packageInfo.version,
        description: packageInfo.description,
        environment: process.env.NODE_ENV || 'development',
        nodeVersion: process.version,
        uptime: process.uptime(),
        timestamp: new Date().toISOString(),
        keycloakConfig: {
          url: process.env.KEYCLOAK_URL || 'http://localhost:8080',
          realm: process.env.KEYCLOAK_REALM || 'peerit',
          clientId: process.env.KEYCLOAK_CLIENT_ID || 'peerit-services'
        }
      }));
    } catch (e) {
      reject(Service.rejectResponse(
        e.message || 'Service info failed',
        e.status || 500,
      ));
    }
  },
);

module.exports = {
  healthGET,
  infoGET,
};
