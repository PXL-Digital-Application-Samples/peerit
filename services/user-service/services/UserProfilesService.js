/* eslint-disable no-unused-vars */
const Service = require('./Service');
const { getDatabaseService } = require('./database');

/**
* Get current user profile
* Retrieve the authenticated user's profile information
*
* returns UserProfile
* */
const apiUsersProfileGET = (params, req) => new Promise(
  async (resolve, reject) => {
    try {
      const db = getDatabaseService().getPrisma();
      
      // Get user identifier from token - could be username or email
      const userIdentifier = req.user.username || req.user.email;
      const userEmail = req.user.email;
      
      console.log('Looking up user profile:', { 
        identifier: userIdentifier, 
        email: userEmail,
        fromToken: req.user 
      });
      
      // Try to find user by username first, then by email
      let userProfile = await db.userProfile.findFirst({
        where: {
          OR: [
            { username: userIdentifier },
            { email: userEmail },
            { keycloakId: userIdentifier } // Fallback to keycloakId
          ]
        },
        include: {
          roleAssignments: {
            where: { isActive: true },
            select: {
              role: true,
              assignedAt: true,
              expiresAt: true
            }
          },
          teamMemberships: {
            where: { isActive: true },
            include: {
              team: {
                select: {
                  id: true,
                  name: true
                }
              }
            }
          }
        }
      });

      if (!userProfile) {
        // Auto-create profile from Keycloak token data
        console.log('User profile not found, creating from token data...');
        
        userProfile = await db.userProfile.create({
          data: {
            keycloakId: req.user.keycloakId || userIdentifier,
            username: req.user.username || userIdentifier,
            email: userEmail,
            firstName: req.user.name?.split(' ')[0] || '',
            lastName: req.user.name?.split(' ').slice(1).join(' ') || '',
            emailVerified: true, // Assume verified if they can login
            enabled: true
          },
          include: {
            roleAssignments: {
              where: { isActive: true }
            },
            teamMemberships: {
              where: { isActive: true },
              include: {
                team: {
                  select: {
                    id: true,
                    name: true
                  }
                }
              }
            }
          }
        });
        
        console.log('Created new user profile:', userProfile.id);
      }

      resolve(Service.successResponse({
        id: userProfile.id,
        keycloakId: userProfile.keycloakId,
        username: userProfile.username,
        email: userProfile.email,
        firstName: userProfile.firstName,
        lastName: userProfile.lastName,
        emailVerified: userProfile.emailVerified,
        enabled: userProfile.enabled,
        createdAt: userProfile.createdAt,
        updatedAt: userProfile.updatedAt,
        roles: userProfile.roleAssignments.map(ra => ra.role),
        teams: userProfile.teamMemberships.map(tm => ({
          id: tm.team.id,
          name: tm.team.name,
          role: tm.teamRole,
          joinedAt: tm.joinedAt
        }))
      }));
    } catch (e) {
      console.error('Error in apiUsersProfileGET:', e);
      reject(Service.rejectResponse(
        e.message || 'Database error',
        e.status || 500,
      ));
    }
  },
);

/**
* Update user profile
* Update the authenticated user's profile information
*
* userProfileUpdate UserProfileUpdate 
* returns UserProfile
* */
const apiUsersProfilePUT = ({ userProfileUpdate }, req) => new Promise(
  async (resolve, reject) => {
    try {
      const db = getDatabaseService().getPrisma();
      const userIdentifier = req.user.username || req.user.email;
      
      // Find existing profile
      const existingProfile = await db.userProfile.findFirst({
        where: {
          OR: [
            { username: userIdentifier },
            { email: req.user.email },
            { keycloakId: userIdentifier }
          ]
        }
      });

      if (!existingProfile) {
        reject(Service.rejectResponse(
          'User profile not found',
          404,
        ));
        return;
      }

      // Update only allowed fields
      const updateData = {};
      if (userProfileUpdate.firstName !== undefined) updateData.firstName = userProfileUpdate.firstName;
      if (userProfileUpdate.lastName !== undefined) updateData.lastName = userProfileUpdate.lastName;

      const updatedProfile = await db.userProfile.update({
        where: { id: existingProfile.id },
        data: updateData,
        include: {
          roleAssignments: {
            where: { isActive: true },
            select: {
              role: true,
              assignedAt: true,
              expiresAt: true
            }
          },
          teamMemberships: {
            where: { isActive: true },
            include: {
              team: {
                select: {
                  id: true,
                  name: true
                }
              }
            }
          }
        }
      });

      resolve(Service.successResponse({
        id: updatedProfile.id,
        keycloakId: updatedProfile.keycloakId,
        username: updatedProfile.username,
        email: updatedProfile.email,
        firstName: updatedProfile.firstName,
        lastName: updatedProfile.lastName,
        emailVerified: updatedProfile.emailVerified,
        enabled: updatedProfile.enabled,
        createdAt: updatedProfile.createdAt,
        updatedAt: updatedProfile.updatedAt,
        roles: updatedProfile.roleAssignments.map(ra => ra.role),
        teams: updatedProfile.teamMemberships.map(tm => ({
          id: tm.team.id,
          name: tm.team.name,
          role: tm.teamRole,
          joinedAt: tm.joinedAt
        }))
      }));
    } catch (e) {
      console.error('Error in apiUsersProfilePUT:', e);
      reject(Service.rejectResponse(
        e.message || 'Database error',
        e.status || 500,
      ));
    }
  },
);

/**
* Get user profile by ID
* Retrieve a specific user's profile (admin or team members only)
*
* userId UUID 
* returns UserProfile
* */
const apiUsersUserIdProfileGET = ({ userId }, req) => new Promise(
  async (resolve, reject) => {
    try {
      const db = getDatabaseService().getPrisma();
      const currentUserIdentifier = req.user.username || req.user.email;
      const userRoles = req.user.roles || [];
      
      // Check permissions - users can only access their own profile unless admin/teacher
      const isOwnProfile = currentUserIdentifier === userId;
      const isAdmin = userRoles.includes('admin');
      const isTeacher = userRoles.includes('teacher');
      
      if (!isOwnProfile && !isAdmin && !isTeacher) {
        reject(Service.rejectResponse(
          'Access denied',
          403,
        ));
        return;
      }
      
      // Find user by various identifiers
      const userProfile = await db.userProfile.findFirst({
        where: {
          OR: [
            { id: userId },
            { keycloakId: userId },
            { username: userId },
            { email: userId }
          ]
        },
        include: {
          roleAssignments: {
            where: { isActive: true },
            select: {
              role: true,
              assignedAt: true,
              expiresAt: true
            }
          },
          teamMemberships: {
            where: { isActive: true },
            include: {
              team: {
                select: {
                  id: true,
                  name: true
                }
              }
            }
          }
        }
      });

      if (!userProfile) {
        reject(Service.rejectResponse(
          'User profile not found',
          404,
        ));
        return;
      }

      resolve(Service.successResponse({
        id: userProfile.id,
        keycloakId: userProfile.keycloakId,
        username: userProfile.username,
        email: userProfile.email,
        firstName: userProfile.firstName,
        lastName: userProfile.lastName,
        emailVerified: userProfile.emailVerified,
        enabled: userProfile.enabled,
        createdAt: userProfile.createdAt,
        updatedAt: userProfile.updatedAt,
        roles: userProfile.roleAssignments.map(ra => ra.role),
        teams: userProfile.teamMemberships.map(tm => ({
          id: tm.team.id,
          name: tm.team.name,
          role: tm.teamRole,
          joinedAt: tm.joinedAt
        }))
      }));
    } catch (e) {
      console.error('Error in apiUsersUserIdProfileGET:', e);
      reject(Service.rejectResponse(
        e.message || 'Database error',
        e.status || 500,
      ));
    }
  },
);

module.exports = {
  apiUsersProfileGET,
  apiUsersProfilePUT,
  apiUsersUserIdProfileGET,
};