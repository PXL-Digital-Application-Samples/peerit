const { PrismaClient } = require('@prisma/client');

/**
 * Database service for handling connection and initialization
 */
class DatabaseService {
  constructor() {
    this.prisma = new PrismaClient({
      datasources: {
        db: {
          url: process.env.DATABASE_URL
        }
      }
    });
  }

  /**
   * Initialize database - connect and ensure schema exists
   */
  async initialize() {
    try {
      console.log('🔗 Connecting to database...');
      
      // Test database connection
      await this.prisma.$connect();
      await this.prisma.$queryRaw`SELECT 1`;
      
      console.log('✅ Database connection established');
      
      // Auto-deploy schema if needed (best practice for services)
      await this.ensureSchema();
      
      console.log('✅ Database schema verified');
      return true;
    } catch (error) {
      console.error('❌ Database initialization failed:', error.message);
      throw error;
    }
  }

  /**
   * Ensure database schema exists by pushing schema
   * This is safer than migrations for automatic deployment
   */
  async ensureSchema() {
    try {
      // Check if tables exist by querying one of them
      await this.prisma.userProfile.findFirst();
      console.log('📊 Database schema already exists');
    } catch (error) {
      if (error.code === 'P2021' || error.message.includes('does not exist')) {
        console.log('📊 Creating database schema...');
        
        try {
          // Use Prisma's push to create schema automatically
          const { execSync } = require('child_process');
          
          // Run prisma db push programmatically
          execSync('npx prisma db push --accept-data-loss', {
            stdio: 'pipe', // Hide output unless there's an error
            env: { ...process.env, DATABASE_URL: process.env.DATABASE_URL }
          });
          
          console.log('✅ Database schema created successfully');
        } catch (pushError) {
          // If execSync fails, try a fallback approach
          console.warn('⚠️  Prisma push failed, tables may already exist');
          
          // Try a simple query again to verify the schema now exists
          try {
            await this.prisma.userProfile.findFirst();
            console.log('✅ Database schema verified after retry');
          } catch (retryError) {
            console.error('❌ Failed to create or verify database schema:', retryError.message);
            throw retryError;
          }
        }
      } else {
        throw error;
      }
    }
  }

  /**
   * Get database health status
   */
  async getHealth() {
    try {
      await this.prisma.$queryRaw`SELECT 1`;
      return {
        status: 'connected',
        timestamp: new Date().toISOString()
      };
    } catch (error) {
      return {
        status: 'disconnected',
        error: error.message,
        timestamp: new Date().toISOString()
      };
    }
  }

  /**
   * Get Prisma client instance
   */
  getClient() {
    return this.prisma;
  }

  /**
   * Disconnect from database
   */
  async disconnect() {
    await this.prisma.$disconnect();
  }
}

// Singleton instance
let databaseService = null;

/**
 * Get singleton database service instance
 */
function getDatabaseService() {
  if (!databaseService) {
    databaseService = new DatabaseService();
  }
  return databaseService;
}

module.exports = {
  DatabaseService,
  getDatabaseService
};
