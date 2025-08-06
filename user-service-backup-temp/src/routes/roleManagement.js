const express = require('express');
const { PrismaClient } = require('@prisma/client');
const Joi = require('joi');
const authMiddleware = require('../middleware/auth');

const router = express.Router();
const prisma = new PrismaClient();

// Validation schemas
const roleAssignmentSchema = Joi.object({
  roleName: Joi.string().valid('admin', 'teacher', 'student').required(),
  metadata: Joi.object()
});

// GET /api/users/:userId/roles - Get user roles
router.get('/:userId/roles', async (req, res, next) => {
  try {
    const { userId } = req.params;
    
    // Check permissions
    const isOwnProfile = req.user.id === userId;
    const isAdmin = req.user.roles.includes('admin');
    
    if (!isOwnProfile && !isAdmin) {
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
        roles: true
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

    res.json(userProfile.roles);
  } catch (error) {
    next(error);
  }
});

// POST /api/users/:userId/roles - Assign role to user
router.post('/:userId/roles', authMiddleware.requireRole('admin'), async (req, res, next) => {
  try {
    const { error, value } = roleAssignmentSchema.validate(req.body);
    if (error) {
      return res.status(400).json({
        error: 'Validation Error',
        message: error.details[0].message,
        code: 400,
        timestamp: new Date().toISOString()
      });
    }

    const { userId } = req.params;
    const { roleName, metadata } = value;

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

    // Check if role already exists
    const existingRole = await prisma.userRole.findFirst({
      where: {
        userProfileId: userProfile.id,
        name: roleName
      }
    });

    if (existingRole) {
      return res.status(409).json({
        error: 'Conflict',
        message: 'User already has this role',
        code: 409,
        timestamp: new Date().toISOString()
      });
    }

    // Create role assignment
    const roleAssignment = await prisma.userRole.create({
      data: {
        userProfileId: userProfile.id,
        name: roleName,
        description: getRoleDescription(roleName),
        assignedBy: req.user.id,
        metadata: metadata || {}
      }
    });

    res.status(201).json(roleAssignment);
  } catch (error) {
    next(error);
  }
});

// DELETE /api/users/:userId/roles/:roleId - Remove role from user
router.delete('/:userId/roles/:roleId', authMiddleware.requireRole('admin'), async (req, res, next) => {
  try {
    const { userId, roleId } = req.params;

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

    // Find and delete role
    const roleAssignment = await prisma.userRole.findFirst({
      where: {
        id: roleId,
        userProfileId: userProfile.id
      }
    });

    if (!roleAssignment) {
      return res.status(404).json({
        error: 'Not Found',
        message: 'Role assignment not found',
        code: 404,
        timestamp: new Date().toISOString()
      });
    }

    await prisma.userRole.delete({
      where: { id: roleId }
    });

    res.status(204).send();
  } catch (error) {
    next(error);
  }
});

function getRoleDescription(roleName) {
  const descriptions = {
    admin: 'Platform administrator with full access to all features',
    teacher: 'Course instructor who can create courses, manage teams, and view all reviews',
    student: 'Course participant who can join teams and submit peer reviews'
  };
  return descriptions[roleName] || '';
}

module.exports = router;
