const express = require('express');
const cors = require('cors');
const helmet = require('helmet');
const morgan = require('morgan');
const rateLimit = require('express-rate-limit');
const actuator = require('express-actuator');
const swaggerUi = require('swagger-ui-express');
const YAML = require('yamljs');
const path = require('path');

// Load environment variables
require('dotenv').config();

// Import routes
const userProfileRoutes = require('./routes/userProfiles');
const roleManagementRoutes = require('./routes/roleManagement');
const teamMembershipRoutes = require('./routes/teamMembership');
const userSyncRoutes = require('./routes/userSync');
const serviceRoutes = require('./routes/service');

// Import middleware
const authMiddleware = require('./middleware/auth');
const errorHandler = require('./middleware/errorHandler');

const app = express();
const PORT = process.env.PORT || 3020;

// Security middleware
app.use(helmet());
app.use(cors({
  origin: process.env.FRONTEND_URL || 'http://localhost:3000',
  credentials: true
}));

// Rate limiting
const limiter = rateLimit({
  windowMs: 15 * 60 * 1000, // 15 minutes
  max: 100, // limit each IP to 100 requests per windowMs
  message: 'Too many requests from this IP, please try again later.'
});
app.use(limiter);

// Logging
app.use(morgan('combined'));

// Body parsing
app.use(express.json({ limit: '10mb' }));
app.use(express.urlencoded({ extended: true }));

// Health endpoints (before actuator to take precedence)
app.get('/health', (req, res) => {
  res.json({
    status: 'UP',
    timestamp: new Date().toISOString(),
    version: process.env.npm_package_version || '1.0.0',
    dependencies: {
      database: 'connected', // TODO: implement actual health checks
      redis: 'connected',
      keycloak: 'connected'
    }
  });
});

// Health monitoring
app.use(actuator());

// API Documentation
try {
  const swaggerDocument = YAML.load(path.join(__dirname, '../openapi.yaml'));
  
  // Serve the raw OpenAPI spec before swagger-ui middleware
  app.get('/docs/openapi.json', (req, res) => {
    res.setHeader('Content-Type', 'application/json');
    res.json(swaggerDocument);
  });
  
  app.use('/docs', swaggerUi.serve, swaggerUi.setup(swaggerDocument));
} catch (error) {
  console.warn('Could not load OpenAPI documentation:', error.message);
}

// Routes
app.use('/api/users', authMiddleware.authenticate, userProfileRoutes);
app.use('/api/users', authMiddleware.authenticate, roleManagementRoutes);
app.use('/api/users', authMiddleware.authenticate, teamMembershipRoutes);
app.use('/api/sync', authMiddleware.authenticate, userSyncRoutes);
app.use('/api/service', serviceRoutes);

app.get('/info', (req, res) => {
  res.json({
    name: 'Peerit User Service',
    version: process.env.npm_package_version || '1.0.0',
    description: 'User profiles, roles, and team membership management',
    buildTime: new Date().toISOString(),
    commit: process.env.GIT_COMMIT || 'unknown'
  });
});

// Error handling
app.use(errorHandler);

// 404 handler
app.use('*', (req, res) => {
  res.status(404).json({
    error: 'Not Found',
    message: `Route ${req.originalUrl} not found`,
    code: 404,
    timestamp: new Date().toISOString()
  });
});

// Start server only if not in test mode
if (process.env.NODE_ENV !== 'test') {
  app.listen(PORT, () => {
    console.log(`🚀 User Service running on port ${PORT}`);
    console.log(`📚 API Documentation: http://localhost:${PORT}/docs`);
    console.log(`💚 Health Check: http://localhost:${PORT}/health`);
    console.log(`ℹ️  Service Info: http://localhost:${PORT}/info`);
  });
}

module.exports = app;
