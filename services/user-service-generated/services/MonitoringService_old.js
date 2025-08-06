/* eslint-disable no-unused-vars */
const Service = require('./Service');

/**
* Health check
* Service health status
*
* returns HealthStatus
* */
const healthGET = () => new Promise(
  async (resolve, reject) => {
    try {
      resolve(Service.successResponse({
      }));
    } catch (e) {
      reject(Service.rejectResponse(
        e.message || 'Invalid input',
        e.status || 405,
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
const infoGET = () => new Promise(
  async (resolve, reject) => {
    try {
      resolve(Service.successResponse({
      }));
    } catch (e) {
      reject(Service.rejectResponse(
        e.message || 'Invalid input',
        e.status || 405,
      ));
    }
  },
);

module.exports = {
  healthGET,
  infoGET,
};
