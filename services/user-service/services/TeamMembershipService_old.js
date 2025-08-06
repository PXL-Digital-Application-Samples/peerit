/* eslint-disable no-unused-vars */
const Service = require('./Service');

/**
* Get user's team memberships
* Retrieve all teams a user belongs to
*
* userId UUID 
* returns List
* */
const apiUsersUserIdTeamsGET = ({ userId }) => new Promise(
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
* Remove user from team
* Remove a user from a team
*
* userId UUID 
* teamId UUID 
* no response value expected for this operation
* */
const apiUsersUserIdTeamsTeamIdDELETE = ({ userId, teamId }) => new Promise(
  async (resolve, reject) => {
    try {
      resolve(Service.successResponse({
        userId,
        teamId,
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
* Add user to team
* Add a user to a team with specified role
*
* userId UUID 
* teamId UUID 
* teamMembershipRequest TeamMembershipRequest 
* no response value expected for this operation
* */
const apiUsersUserIdTeamsTeamIdPOST = ({ userId, teamId, teamMembershipRequest }) => new Promise(
  async (resolve, reject) => {
    try {
      resolve(Service.successResponse({
        userId,
        teamId,
        teamMembershipRequest,
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
  apiUsersUserIdTeamsGET,
  apiUsersUserIdTeamsTeamIdDELETE,
  apiUsersUserIdTeamsTeamIdPOST,
};
