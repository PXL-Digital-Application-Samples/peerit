require('dotenv').config();
const express = require('express');
const cors = require('cors');
const helmet = require('helmet');
const morgan = require('morgan');
const swaggerUi = require('swagger-ui-express');
const actuator = require('express-actuator');
const YAML = require('yamljs');
const path = require('path');

// Import routes
const authRoutes = require('./routes/auth');
const { generalRateLimit } = require('./middleware/rateLimit');

const app = express();
const PORT = process.env.PORT || 3020;

// Load OpenAPI specification
const openApiSpec = YAML.load(path.join(__dirname, '../openapi.yaml'));

// Security middleware
app.use(helmet({
  contentSecurityPolicy: {
    directives: {
      defaultSrc: ["'self'"],
      styleSrc: ["'self'", "'unsafe-inline'", "https://fonts.googleapis.com"],
      fontSrc: ["'self'", "https://fonts.gstatic.com"],
      scriptSrc: ["'self'", "'unsafe-inline'"],
      imgSrc: ["'self'", "data:", "https:"],
    },
  },
}));

app.use(cors({
  origin: process.env.CORS_ORIGIN || 'http://localhost:3000',
  credentials: true
}));

app.use(morgan('combined'));
app.use(express.json({ limit: '10mb' }));
app.use(express.urlencoded({ extended: true }));

// Trust proxy for correct IP addresses in rate limiting
app.set('trust proxy', 1);

// Global rate limiting
app.use(generalRateLimit);

// Add express-actuator for industry-standard monitoring endpoints
const databaseService = require('./services/database');

app.use('/auth', actuator({
  basePath: '/management',
  customEndpoints: [
    {
      id: 'database',
      controller: async (req, res) => {
        try {
          const dbHealth = await databaseService.healthCheck();
          const sessionHealth = await databaseService.getSessionHealth();
          
          res.json({
            database: dbHealth,
            session: sessionHealth,
            timestamp: new Date().toISOString()
          });
        } catch (error) {
          res.status(503).json({
            error: 'Database health check failed',
            message: error.message,
            timestamp: new Date().toISOString()
          });
        }
      }
    }
  ]
}));

// API Documentation
if (process.env.SWAGGER_ENABLED !== 'false') {
  app.use('/auth/docs', swaggerUi.serve);
  app.get('/auth/docs', swaggerUi.setup(openApiSpec, {
    explorer: true,
    customSiteTitle: 'Peerit Auth Service API',
    swaggerOptions: {
      persistAuthorization: true,
      displayRequestDuration: true,
      docExpansion: 'none',
      filter: true,
      tryItOutEnabled: true
    }
  }));

  // Serve OpenAPI spec as JSON and YAML
  app.get('/auth/docs/json', (req, res) => {
    res.json(openApiSpec);
  });

  app.get('/auth/docs/yaml', (req, res) => {
    res.type('text/yaml');
    res.send(YAML.stringify(openApiSpec, 4));
  });
}

// Backward compatibility endpoints for OpenAPI spec
app.get('/auth/health', async (req, res) => {
  try {
    const dbHealth = await databaseService.healthCheck();
    const sessionHealth = await databaseService.getSessionHealth();
    
    const allHealthy = dbHealth.status === 'UP' && sessionHealth.status === 'UP';
    const status = allHealthy ? 'UP' : 'DOWN';
    const httpStatus = allHealthy ? 200 : 503;
    
    res.status(httpStatus).json({
      status,
      timestamp: new Date().toISOString(),
      version: process.env.npm_package_version || '1.0.0',
      uptime: process.uptime(),
      dependencies: {
        database: dbHealth,
        session: sessionHealth
      }
    });
  } catch (error) {
    res.status(500).json({
      status: 'DOWN',
      error: 'Health check failed',
      message: error.message,
      timestamp: new Date().toISOString()
    });
  }
});

app.get('/auth/info', async (req, res) => {
  try {
    const dbHealth = await databaseService.healthCheck();
    const sessionHealth = await databaseService.getSessionHealth();
    
    res.json({
      service: {
        name: 'auth-service',
        version: process.env.npm_package_version || '1.0.0',
        description: 'Authentication and authorization service for Peerit platform'
      },
      environment: {
        nodeVersion: process.version,
        environment: process.env.NODE_ENV || 'development',
        port: PORT
      },
      database: {
        provider: 'prisma',
        type: dbHealth.type || 'postgresql',
        connected: dbHealth.status === 'UP',
        mode: dbHealth.mode || 'connected'
      },
      session: {
        provider: sessionHealth.provider || 'redis',
        connected: sessionHealth.status === 'UP',
        mode: sessionHealth.mode || 'redis'
      },
      features: {
        magicLinks: true,
        jwtRefresh: true,
        rateLimiting: true
      },
      build: {
        timestamp: new Date().toISOString(),
        commit: process.env.BUILD_COMMIT || 'unknown'
      }
    });
  } catch (error) {
    res.status(500).json({
      error: 'Error retrieving service information',
      message: error.message,
      timestamp: new Date().toISOString()
    });
  }
});

// Routes
app.use('/auth', authRoutes);

// Root endpoint
app.get('/', (req, res) => {
  res.json({
    service: 'Peerit Authentication Service',
    version: process.env.npm_package_version || '1.0.0',
    status: 'running',
    timestamp: new Date().toISOString(),
    documentation: '/auth/docs'
  });
});

// 404 handler
app.use('*', (req, res) => {
  res.status(404).json({
    error: 'NOT_FOUND',
    message: `Route ${req.method} ${req.originalUrl} not found`,
    timestamp: new Date().toISOString()
  });
});

// Error handler
app.use((err, req, res, _next) => {
  console.error('Error:', err);
  
  res.status(err.status || 500).json({
    error: err.code || 'INTERNAL_SERVER_ERROR',
    message: err.message || 'An unexpected error occurred',
    timestamp: new Date().toISOString(),
    ...(process.env.NODE_ENV === 'development' && { stack: err.stack })
  });
});

// Graceful shutdown
process.on('SIGINT', async () => {
  console.log('🛑 Shutting down gracefully...');
  const db = require('./services/database');
  await db.disconnect();
  process.exit(0);
});

// Start server
const server = app.listen(PORT, '0.0.0.0', () => {
  console.log(`🚀 Auth Service running on port ${PORT}`);
  console.log(`📚 API Documentation: http://localhost:${PORT}/auth/docs`);
  console.log(`🔍 Health Check: http://localhost:${PORT}/auth/health`);
  console.log(`📋 OpenAPI JSON: http://localhost:${PORT}/auth/docs/json`);
  console.log(`📋 OpenAPI YAML: http://localhost:${PORT}/auth/docs/yaml`);
  console.log(`🌍 Environment: ${process.env.NODE_ENV || 'development'}`);
});

// Export both app and server for testing
app.server = server;
module.exports = app;
