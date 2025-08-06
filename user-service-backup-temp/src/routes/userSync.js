const express = require('express');
const { PrismaClient } = require('@prisma/client');
const axios = require('axios');

const router = express.Router();
const prisma = new PrismaClient();

// GET /api/sync/keycloak/users - Sync all users from Keycloak
router.get('/keycloak/users', async (req, res, next) => {
  try {
    // Only admins can perform sync operations
    if (!req.user.roles.includes('admin')) {
      return res.status(403).json({
        error: 'Forbidden',
        message: 'Only admins can perform sync operations',
        code: 403,
        timestamp: new Date().toISOString()
      });
    }

    // Get admin token for Keycloak API
    const tokenResponse = await axios.post(`${process.env.KEYCLOAK_URL}/realms/master/protocol/openid-connect/token`, {
      grant_type: 'client_credentials',
      client_id: process.env.KEYCLOAK_ADMIN_CLIENT_ID || 'admin-cli',
      client_secret: process.env.KEYCLOAK_ADMIN_CLIENT_SECRET
    }, {
      headers: { 'Content-Type': 'application/x-www-form-urlencoded' }
    });

    const accessToken = tokenResponse.data.access_token;

    // Fetch users from Keycloak
    const usersResponse = await axios.get(
      `${process.env.KEYCLOAK_URL}/admin/realms/peerit/users`,
      {
        headers: { Authorization: `Bearer ${accessToken}` }
      }
    );

    const keycloakUsers = usersResponse.data;
    const syncResults = {
      processed: 0,
      created: 0,
      updated: 0,
      errors: []
    };

    // Process each user
    for (const kcUser of keycloakUsers) {
      try {
        syncResults.processed++;

        // Check if user profile already exists
        const existingUserProfile = await prisma.userProfile.findUnique({
          where: { keycloakId: kcUser.id }
        });

        const userData = {
          keycloakId: kcUser.id,
          username: kcUser.username,
          email: kcUser.email,
          firstName: kcUser.firstName || '',
          lastName: kcUser.lastName || '',
          emailVerified: kcUser.emailVerified || false,
          enabled: kcUser.enabled || true,
          lastSyncAt: new Date()
        };

        if (existingUserProfile) {
          // Update existing profile
          await prisma.userProfile.update({
            where: { id: existingUserProfile.id },
            data: userData
          });
          syncResults.updated++;
        } else {
          // Create new profile
          await prisma.userProfile.create({
            data: userData
          });
          syncResults.created++;
        }
      } catch (error) {
        syncResults.errors.push({
          userId: kcUser.id,
          username: kcUser.username,
          error: error.message
        });
      }
    }

    res.json({
      message: 'User sync completed',
      results: syncResults,
      timestamp: new Date().toISOString()
    });
  } catch (error) {
    next(error);
  }
});

// POST /api/sync/keycloak/users/:userId - Sync specific user from Keycloak
router.post('/keycloak/users/:userId', async (req, res, next) => {
  try {
    const { userId } = req.params;

    // Only admins can perform sync operations
    if (!req.user.roles.includes('admin')) {
      return res.status(403).json({
        error: 'Forbidden',
        message: 'Only admins can perform sync operations',
        code: 403,
        timestamp: new Date().toISOString()
      });
    }

    // Get admin token for Keycloak API
    const tokenResponse = await axios.post(`${process.env.KEYCLOAK_URL}/realms/master/protocol/openid-connect/token`, {
      grant_type: 'client_credentials',
      client_id: process.env.KEYCLOAK_ADMIN_CLIENT_ID || 'admin-cli',
      client_secret: process.env.KEYCLOAK_ADMIN_CLIENT_SECRET
    }, {
      headers: { 'Content-Type': 'application/x-www-form-urlencoded' }
    });

    const accessToken = tokenResponse.data.access_token;

    // Fetch specific user from Keycloak
    const userResponse = await axios.get(
      `${process.env.KEYCLOAK_URL}/admin/realms/peerit/users/${userId}`,
      {
        headers: { Authorization: `Bearer ${accessToken}` }
      }
    );

    const kcUser = userResponse.data;

    // Check if user profile already exists
    let userProfile = await prisma.userProfile.findUnique({
      where: { keycloakId: userId }
    });

    const userData = {
      keycloakId: kcUser.id,
      username: kcUser.username,
      email: kcUser.email,
      firstName: kcUser.firstName || '',
      lastName: kcUser.lastName || '',
      emailVerified: kcUser.emailVerified || false,
      enabled: kcUser.enabled || true,
      lastSyncAt: new Date()
    };

    let operation;
    if (userProfile) {
      // Update existing profile
      userProfile = await prisma.userProfile.update({
        where: { id: userProfile.id },
        data: userData
      });
      operation = 'updated';
    } else {
      // Create new profile
      userProfile = await prisma.userProfile.create({
        data: userData
      });
      operation = 'created';
    }

    res.json({
      message: `User profile ${operation} successfully`,
      user: {
        id: userProfile.id,
        keycloakId: userProfile.keycloakId,
        username: userProfile.username,
        email: userProfile.email,
        firstName: userProfile.firstName,
        lastName: userProfile.lastName,
        lastSyncAt: userProfile.lastSyncAt
      },
      operation,
      timestamp: new Date().toISOString()
    });
  } catch (error) {
    if (error.response && error.response.status === 404) {
      return res.status(404).json({
        error: 'Not Found',
        message: 'User not found in Keycloak',
        code: 404,
        timestamp: new Date().toISOString()
      });
    }
    next(error);
  }
});

// GET /api/sync/status - Get sync status and statistics
router.get('/status', async (req, res, next) => {
  try {
    // Check permissions
    const isAdmin = req.user.roles.includes('admin');
    const isTeacher = req.user.roles.includes('teacher');
    
    if (!isAdmin && !isTeacher) {
      return res.status(403).json({
        error: 'Forbidden',
        message: 'Only admins and teachers can view sync status',
        code: 403,
        timestamp: new Date().toISOString()
      });
    }

    // Get sync statistics
    const totalUsers = await prisma.userProfile.count();
    const recentlySync = await prisma.userProfile.count({
      where: {
        lastSyncAt: {
          gte: new Date(Date.now() - 24 * 60 * 60 * 1000) // Last 24 hours
        }
      }
    });

    const neverSynced = await prisma.userProfile.count({
      where: {
        lastSyncAt: null
      }
    });

    const lastSyncedUser = await prisma.userProfile.findFirst({
      where: {
        lastSyncAt: {
          not: null
        }
      },
      orderBy: {
        lastSyncAt: 'desc'
      },
      select: {
        lastSyncAt: true
      }
    });

    res.json({
      statistics: {
        totalUsers,
        recentlySync,
        neverSynced,
        lastSyncAt: lastSyncedUser?.lastSyncAt || null
      },
      timestamp: new Date().toISOString()
    });
  } catch (error) {
    next(error);
  }
});

module.exports = router;
