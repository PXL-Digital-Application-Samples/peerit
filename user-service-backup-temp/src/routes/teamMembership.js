const express = require('express');
const { PrismaClient } = require('@prisma/client');
const Joi = require('joi');

const router = express.Router();
const prisma = new PrismaClient();

// Validation schemas
const teamMembershipRequestSchema = Joi.object({
  teamRole: Joi.string().valid('leader', 'member').default('member'),
  metadata: Joi.object()
});

// GET /api/users/:userId/teams - Get user's team memberships
router.get('/:userId/teams', async (req, res, next) => {
  try {
    const { userId } = req.params;
    
    // Check permissions
    const isOwnProfile = req.user.id === userId;
    const isAdmin = req.user.roles.includes('admin');
    const isTeacher = req.user.roles.includes('teacher');
    
    if (!isOwnProfile && !isAdmin && !isTeacher) {
      return res.status(403).json({
        error: 'Forbidden',
        message: 'Access denied',
        code: 403,
        timestamp: new Date().toISOString()
      });
    }

    const userProfile = await prisma.userProfile.findUnique({
      where: { keycloakId: userId },
      include: {
        teamMemberships: {
          include: {
            team: true
          }
        }
      }
    });

    if (!userProfile) {
      return res.status(404).json({
        error: 'Not Found',
        message: 'User not found',
        code: 404,
        timestamp: new Date().toISOString()
      });
    }

    const teamMemberships = userProfile.teamMemberships.map(membership => ({
      teamId: membership.team.id,
      teamName: membership.team.name,
      teamRole: membership.teamRole,
      joinedAt: membership.joinedAt,
      isActive: membership.isActive
    }));

    res.json(teamMemberships);
  } catch (error) {
    next(error);
  }
});

// POST /api/users/:userId/teams/:teamId - Add user to team
router.post('/:userId/teams/:teamId', async (req, res, next) => {
  try {
    const { error, value } = teamMembershipRequestSchema.validate(req.body);
    if (error) {
      return res.status(400).json({
        error: 'Validation Error',
        message: error.details[0].message,
        code: 400,
        timestamp: new Date().toISOString()
      });
    }

    const { userId, teamId } = req.params;
    const { teamRole, metadata } = value;

    // Check permissions - only admin, teacher, or team leaders can add members
    const isAdmin = req.user.roles.includes('admin');
    const isTeacher = req.user.roles.includes('teacher');
    
    if (!isAdmin && !isTeacher) {
      return res.status(403).json({
        error: 'Forbidden',
        message: 'Only admins and teachers can manage team memberships',
        code: 403,
        timestamp: new Date().toISOString()
      });
    }

    // Find user profile
    const userProfile = await prisma.userProfile.findUnique({
      where: { keycloakId: userId }
    });

    if (!userProfile) {
      return res.status(404).json({
        error: 'Not Found',
        message: 'User not found',
        code: 404,
        timestamp: new Date().toISOString()
      });
    }

    // Check if team exists (assuming teams are managed by team-service)
    // For now, we'll create a placeholder team if it doesn't exist
    let team = await prisma.team.findUnique({
      where: { id: teamId }
    });

    if (!team) {
      // In production, you'd call the team-service API to verify the team exists
      team = await prisma.team.create({
        data: {
          id: teamId,
          name: `Team ${teamId}`, // Placeholder name
          description: 'Team managed by team-service'
        }
      });
    }

    // Check if user is already in the team
    const existingMembership = await prisma.teamMembership.findFirst({
      where: {
        userProfileId: userProfile.id,
        teamId: teamId
      }
    });

    if (existingMembership) {
      return res.status(409).json({
        error: 'Conflict',
        message: 'User is already a member of this team',
        code: 409,
        timestamp: new Date().toISOString()
      });
    }

    // Create team membership
    const membership = await prisma.teamMembership.create({
      data: {
        userProfileId: userProfile.id,
        teamId: teamId,
        teamRole: teamRole,
        addedBy: req.user.id,
        metadata: metadata || {}
      }
    });

    res.status(201).json({
      teamId: teamId,
      teamName: team.name,
      teamRole: membership.teamRole,
      joinedAt: membership.joinedAt,
      isActive: membership.isActive
    });
  } catch (error) {
    next(error);
  }
});

// DELETE /api/users/:userId/teams/:teamId - Remove user from team
router.delete('/:userId/teams/:teamId', async (req, res, next) => {
  try {
    const { userId, teamId } = req.params;

    // Check permissions
    const isAdmin = req.user.roles.includes('admin');
    const isTeacher = req.user.roles.includes('teacher');
    const isOwnProfile = req.user.id === userId;
    
    if (!isAdmin && !isTeacher && !isOwnProfile) {
      return res.status(403).json({
        error: 'Forbidden',
        message: 'Access denied',
        code: 403,
        timestamp: new Date().toISOString()
      });
    }

    // Find user profile
    const userProfile = await prisma.userProfile.findUnique({
      where: { keycloakId: userId }
    });

    if (!userProfile) {
      return res.status(404).json({
        error: 'Not Found',
        message: 'User not found',
        code: 404,
        timestamp: new Date().toISOString()
      });
    }

    // Find and delete team membership
    const membership = await prisma.teamMembership.findFirst({
      where: {
        userProfileId: userProfile.id,
        teamId: teamId
      }
    });

    if (!membership) {
      return res.status(404).json({
        error: 'Not Found',
        message: 'Team membership not found',
        code: 404,
        timestamp: new Date().toISOString()
      });
    }

    await prisma.teamMembership.delete({
      where: { id: membership.id }
    });

    res.status(204).send();
  } catch (error) {
    next(error);
  }
});

module.exports = router;
