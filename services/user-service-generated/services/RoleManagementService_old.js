/* eslint-disable no-unused-vars */
const Service = require('./Service');

/**
* Get user roles
* Retrieve roles assigned to a user
*
* userId UUID 
* returns List
* */
const apiUsersUserIdRolesGET = ({ userId }) => new Promise(
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
/**
* Assign role to user
* Assign a role to a user (admin only)
*
* userId UUID 
* roleAssignment RoleAssignment 
* no response value expected for this operation
* */
const apiUsersUserIdRolesPOST = ({ userId, roleAssignment }) => new Promise(
  async (resolve, reject) => {
    try {
      resolve(Service.successResponse({
        userId,
        roleAssignment,
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
* Remove role from user
* Remove a role from a user (admin only)
*
* userId UUID 
* roleId String 
* no response value expected for this operation
* */
const apiUsersUserIdRolesRoleIdDELETE = ({ userId, roleId }) => new Promise(
  async (resolve, reject) => {
    try {
      resolve(Service.successResponse({
        userId,
        roleId,
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
  apiUsersUserIdRolesGET,
  apiUsersUserIdRolesPOST,
  apiUsersUserIdRolesRoleIdDELETE,
};
