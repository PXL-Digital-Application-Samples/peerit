/* eslint-disable no-unused-vars */
const Service = require('./Service');
const { getDatabaseService } = require('./database');

/**
* Search users
* Search users by various criteria (internal service use)
*
* query String  (optional)
* role String  (optional)
* team UUID  (optional)
* limit Integer  (optional)
* offset Integer  (optional)
* returns UserSearchResult
* */
const apiUsersSearchGET = ({ query, role, team, limit = 20, offset = 0 }, req) => new Promise(
  async (resolve, reject) => {
    try {
      const db = getDatabaseService().getPrisma();
      const userRoles = req.user.roles || [];
      
      // Only admin and teacher can search users
      const isAdmin = userRoles.includes('admin');
      const isTeacher = userRoles.includes('teacher');
      
      if (!isAdmin && !isTeacher) {
        reject(Service.rejectResponse(
          'Access denied',
          403,
        ));
        return;
      }

      const where = {};
      
      // Text search in username, email, firstName, lastName
      if (query) {
        where.OR = [
          { username: { contains: query, mode: 'insensitive' } },
          { email: { contains: query, mode: 'insensitive' } },
          { firstName: { contains: query, mode: 'insensitive' } },
          { lastName: { contains: query, mode: 'insensitive' } }
        ];
      }

      // Role filter
      if (role) {
        where.roleAssignments = {
          some: {
            role: role,
            isActive: true
          }
        };
      }

      // Team filter
      if (team) {
        where.teamMemberships = {
          some: {
            teamId: team,
            isActive: true
          }
        };
      }

      const [users, total] = await Promise.all([
        db.userProfile.findMany({
          where,
          skip: offset,
          take: limit,
          include: {
            roleAssignments: {
              where: { isActive: true },
              select: { role: true }
            },
            teamMemberships: {
              where: { isActive: true },
              include: {
                team: {
                  select: { id: true, name: true }
                }
              }
            }
          },
          orderBy: { createdAt: 'desc' }
        }),
        db.userProfile.count({ where })
      ]);

      resolve(Service.successResponse({
        users: users.map(user => ({
          id: user.id,
          keycloakId: user.keycloakId,
          username: user.username,
          email: user.email,
          firstName: user.firstName,
          lastName: user.lastName,
          enabled: user.enabled,
          createdAt: user.createdAt,
          roles: user.roleAssignments.map(ra => ra.role),
          teams: user.teamMemberships.map(tm => ({
            id: tm.team.id,
            name: tm.team.name,
            role: tm.teamRole
          }))
        })),
        pagination: {
          total,
          limit,
          offset,
          hasMore: offset + limit < total
        }
      }));
    } catch (e) {
      reject(Service.rejectResponse(
        e.message || 'Database error',
        e.status || 500,
      ));
    }
  },
);

module.exports = {
  apiUsersSearchGET,
};
