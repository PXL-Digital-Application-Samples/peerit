/* eslint-disable no-unused-vars */
const Service = require('./Service');
const { getDatabaseService } = require('./database');

/**
* Get user roles
* Retrieve roles assigned to a user
*
* userId UUID 
* returns List
* */
const apiUsersUserIdRolesGET = ({ userId }, req) => new Promise(
  async (resolve, reject) => {
    try {
      const db = getDatabaseService().getPrisma();
      const currentUserId = req.user.id;
      const userRoles = req.user.roles || [];
      
      // Check permissions - users can only view their own roles unless admin/teacher
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
          roleAssignments: {
            where: { isActive: true },
            orderBy: { assignedAt: 'desc' }
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
        userProfile.roleAssignments.map(ra => ({
          id: ra.id,
          role: ra.role,
          assignedBy: ra.assignedBy,
          assignedAt: ra.assignedAt,
          expiresAt: ra.expiresAt,
          metadata: ra.metadata
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
* Assign role to user
* Assign a role to a user (admin only)
*
* userId UUID 
* roleAssignment RoleAssignment 
* no response value expected for this operation
* */
const apiUsersUserIdRolesPOST = ({ userId, roleAssignment }, req) => new Promise(
  async (resolve, reject) => {
    try {
      const db = getDatabaseService().getPrisma();
      const userRoles = req.user.roles || [];
      
      // Only admin can assign roles
      if (!userRoles.includes('admin')) {
        reject(Service.rejectResponse(
          'Admin access required',
          403,
        ));
        return;
      }
      
      // Validate role
      const validRoles = ['admin', 'teacher', 'student'];
      if (!validRoles.includes(roleAssignment.role)) {
        reject(Service.rejectResponse(
          `Invalid role. Must be one of: ${validRoles.join(', ')}`,
          400,
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

      // Check if role already assigned
      const existingRole = await db.roleAssignment.findUnique({
        where: {
          userProfileId_role: {
            userProfileId: userProfile.id,
            role: roleAssignment.role
          }
        }
      });

      if (existingRole && existingRole.isActive) {
        reject(Service.rejectResponse(
          'Role already assigned to user',
          409,
        ));
        return;
      }

      // Create or reactivate role assignment
      const roleData = {
        userProfileId: userProfile.id,
        role: roleAssignment.role,
        assignedBy: req.user.id,
        assignedAt: new Date(),
        expiresAt: roleAssignment.expiresAt ? new Date(roleAssignment.expiresAt) : null,
        isActive: true,
        metadata: roleAssignment.metadata || {}
      };

      let newRole;
      if (existingRole) {
        // Reactivate existing role
        newRole = await db.roleAssignment.update({
          where: { id: existingRole.id },
          data: roleData
        });
      } else {
        // Create new role assignment
        newRole = await db.roleAssignment.create({
          data: roleData
        });
      }

      resolve(Service.successResponse({
        id: newRole.id,
        role: newRole.role,
        assignedBy: newRole.assignedBy,
        assignedAt: newRole.assignedAt,
        expiresAt: newRole.expiresAt,
        metadata: newRole.metadata
      }, 201));
    } catch (e) {
      reject(Service.rejectResponse(
        e.message || 'Database error',
        e.status || 500,
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
const apiUsersUserIdRolesRoleIdDELETE = ({ userId, roleId }, req) => new Promise(
  async (resolve, reject) => {
    try {
      const db = getDatabaseService().getPrisma();
      const userRoles = req.user.roles || [];
      
      // Only admin can remove roles
      if (!userRoles.includes('admin')) {
        reject(Service.rejectResponse(
          'Admin access required',
          403,
        ));
        return;
      }
      
      // Find the role assignment
      const roleAssignment = await db.roleAssignment.findFirst({
        where: {
          id: roleId,
          userProfile: {
            keycloakId: userId
          },
          isActive: true
        }
      });

      if (!roleAssignment) {
        reject(Service.rejectResponse(
          'Role assignment not found',
          404,
        ));
        return;
      }

      // Deactivate the role instead of deleting (for audit trail)
      await db.roleAssignment.update({
        where: { id: roleId },
        data: { 
          isActive: false,
          metadata: {
            ...roleAssignment.metadata,
            deactivatedBy: req.user.id,
            deactivatedAt: new Date().toISOString()
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

module.exports = {
  apiUsersUserIdRolesGET,
  apiUsersUserIdRolesPOST,
  apiUsersUserIdRolesRoleIdDELETE,
};
