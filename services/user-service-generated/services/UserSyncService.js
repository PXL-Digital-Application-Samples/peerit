/* eslint-disable no-unused-vars */
const Service = require('./Service');

/**
* Sync users from Keycloak
* Synchronize user data from Keycloak (admin only)
*
* returns SyncResult
* */
const apiSyncKeycloakPOST = () => new Promise(
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
* Sync specific user from Keycloak
* Synchronize specific user data from Keycloak
*
* userId UUID 
* returns UserProfile
* */
const apiSyncUsersUserIdPOST = ({ userId }) => new Promise(
  async (resolve, reject) => {
    try {
      resolve(Service.successResponse({
        userId,
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
  apiSyncKeycloakPOST,
  apiSyncUsersUserIdPOST,
};
