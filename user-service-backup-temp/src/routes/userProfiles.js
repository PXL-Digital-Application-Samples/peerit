const express = require('express');
const { PrismaClient } = require('@prisma/client');
const Joi = require('joi');
const authMiddleware = require('../middleware/auth');

const router = express.Router();
const prisma = new PrismaClient();

// Validation schemas
const userProfileUpdateSchema = Joi.object({
  firstName: Joi.string().min(1).max(50),
  lastName: Joi.string().min(1).max(50),
  displayName: Joi.string().min(1).max(100),
  bio: Joi.string().max(500).allow(''),
  profilePicture: Joi.string().uri().allow(''),
  preferences: Joi.object()
});

// GET /api/users/:userId - Get user profile by ID
router.get('/:userId', async (req, res, next) => {
  try {
    const { userId } = req.params;
    
    // Check permissions - users can only access their own profile unless admin/teacher
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
      where: { keycloakId: userId }
    });

    if (!userProfile) {
      return res.status(404).json({
        error: 'Not Found',
        message: 'User profile not found',
        code: 404,
        timestamp: new Date().toISOString()
      });
    }

    res.json(userProfile);
  } catch (error) {
    next(error);
  }
});

// PUT /api/users/:userId - Update user profile
router.put('/:userId', async (req, res, next) => {
  try {
    const { error, value } = userProfileUpdateSchema.validate(req.body);
    if (error) {
      return res.status(400).json({
        error: 'Validation Error',
        message: error.details[0].message,
        code: 400,
        timestamp: new Date().toISOString()
      });
    }

    const { userId } = req.params;
    
    // Check permissions - users can only update their own profile unless admin
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
    
    const userProfile = await prisma.userProfile.update({
      where: { keycloakId: userId },
      data: {
        ...value,
        updatedAt: new Date()
      }
    });

    res.json(userProfile);
  } catch (error) {
    next(error);
  }
});

module.exports = router;
