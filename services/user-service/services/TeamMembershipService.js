/* eslint-disable no-unused-vars */
const Service = require('./Service');
const { getDatabaseService } = require('./database');

/**
* Get user's team memberships
* Retrieve all teams a user belongs to
*
* userId UUID 
* returns List
* */
const apiUsersUserIdTeamsGET = ({ userId }, req) => new Promise(
  async (resolve, reject) => {
    try {
      const db = getDatabaseService().getPrisma();
      const currentUserId = req.user.id;
      const userRoles = req.user.roles || [];
      
      // Check permissions - users can only view their own teams unless admin/teacher
      const isOwnProfile = currentUserId === userId;
      const isAdmin = userRoles.includes('admin');
      const isTeacher = userRoles.includes('teacher');
      
      if (!isOwnProfile && !isAdmin && !isTeacher) {
        reject(Service.rejectResponse(
          'Access denied',
          403,
        ));
        return;
      }
      
      const userProfile = await db.userProfile.findUnique({
        where: { keycloakId: userId },
        include: {
          teamMemberships: {
            where: { isActive: true },
            include: {
              team: true
            },
            orderBy: { joinedAt: 'desc' }
          }
        }
      });

      if (!userProfile) {
        reject(Service.rejectResponse(
          'User not found',
          404,
        ));
        return;
      }

      resolve(Service.successResponse(
        userProfile.teamMemberships.map(tm => ({
          id: tm.id,
          teamId: tm.teamId,
          teamName: tm.team.name,
          teamDescription: tm.team.description,
          teamRole: tm.teamRole,
          joinedAt: tm.joinedAt,
          addedBy: tm.addedBy,
          metadata: tm.metadata
        }))
      ));
    } catch (e) {
      reject(Service.rejectResponse(
        e.message || 'Database error',
        e.status || 500,
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
const apiUsersUserIdTeamsTeamIdDELETE = ({ userId, teamId }, req) => new Promise(
  async (resolve, reject) => {
    try {
      const db = getDatabaseService().getPrisma();
      const currentUserId = req.user.id;
      const userRoles = req.user.roles || [];
      
      // Check permissions - users can only remove themselves, or admin/teacher can remove anyone
      const isOwnProfile = currentUserId === userId;
      const isAdmin = userRoles.includes('admin');
      const isTeacher = userRoles.includes('teacher');
      
      if (!isOwnProfile && !isAdmin && !isTeacher) {
        reject(Service.rejectResponse(
          'Access denied',
          403,
        ));
        return;
      }
      
      // Find the team membership
      const teamMembership = await db.teamMembership.findFirst({
        where: {
          userProfile: {
            keycloakId: userId
          },
          teamId: teamId,
          isActive: true
        }
      });

      if (!teamMembership) {
        reject(Service.rejectResponse(
          'Team membership not found',
          404,
        ));
        return;
      }

      // Deactivate the membership instead of deleting (for audit trail)
      await db.teamMembership.update({
        where: { id: teamMembership.id },
        data: { 
          isActive: false,
          metadata: {
            ...teamMembership.metadata,
            removedBy: currentUserId,
            removedAt: new Date().toISOString()
          }
        }
      });

      resolve(Service.successResponse({}, 204));
    } catch (e) {
      reject(Service.rejectResponse(
        e.message || 'Database error',
        e.status || 500,
      ));
    }
  },
);

/**
* Add user to team
* Add a user to a team (admin/teacher only)
*
* userId UUID 
* teamMembership TeamMembership 
* returns TeamMembership
* */
const apiUsersUserIdTeamsPOST = ({ userId, teamMembership }, req) => new Promise(
  async (resolve, reject) => {
    try {
      const db = getDatabaseService().getPrisma();
      const userRoles = req.user.roles || [];
      
      // Only admin and teacher can add users to teams
      if (!userRoles.includes('admin') && !userRoles.includes('teacher')) {
        reject(Service.rejectResponse(
          'Admin or teacher access required',
          403,
        ));
        return;
      }
      
      // Check if user exists
      const userProfile = await db.userProfile.findUnique({
        where: { keycloakId: userId }
      });

      if (!userProfile) {
        reject(Service.rejectResponse(
          'User not found',
          404,
        ));
        return;
      }

      // Check if team exists
      const team = await db.team.findUnique({
        where: { id: teamMembership.teamId }
      });

      if (!team) {
        reject(Service.rejectResponse(
          'Team not found',
          404,
        ));
        return;
      }

      // Check if membership already exists
      const existingMembership = await db.teamMembership.findUnique({
        where: {
          userProfileId_teamId: {
            userProfileId: userProfile.id,
            teamId: teamMembership.teamId
          }
        }
      });

      if (existingMembership && existingMembership.isActive) {
        reject(Service.rejectResponse(
          'User is already a member of this team',
          409,
        ));
        return;
      }

      // Create or reactivate team membership
      const membershipData = {
        userProfileId: userProfile.id,
        teamId: teamMembership.teamId,
        teamRole: teamMembership.teamRole || 'member',
        joinedAt: new Date(),
        isActive: true,
        addedBy: req.user.id,
        metadata: teamMembership.metadata || {}
      };

      let newMembership;
      if (existingMembership) {
        // Reactivate existing membership
        newMembership = await db.teamMembership.update({
          where: { id: existingMembership.id },
          data: membershipData,
          include: { team: true }
        });
      } else {
        // Create new membership
        newMembership = await db.teamMembership.create({
          data: membershipData,
          include: { team: true }
        });
      }

      resolve(Service.successResponse({
        id: newMembership.id,
        teamId: newMembership.teamId,
        teamName: newMembership.team.name,
        teamRole: newMembership.teamRole,
        joinedAt: newMembership.joinedAt,
        addedBy: newMembership.addedBy,
        metadata: newMembership.metadata
      }, 201));
    } catch (e) {
      reject(Service.rejectResponse(
        e.message || 'Database error',
        e.status || 500,
      ));
    }
  },
);

module.exports = {
  apiUsersUserIdTeamsGET,
  apiUsersUserIdTeamsTeamIdDELETE,
  apiUsersUserIdTeamsPOST,
};
