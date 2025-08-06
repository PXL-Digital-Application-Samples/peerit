const { PrismaClient } = require('@prisma/client');

class DatabaseService {
  constructor() {
    this.prisma = null;
    this.isConnected = false;
  }

  async connect() {
    if (!process.env.DATABASE_URL) {
      throw new Error('DATABASE_URL environment variable is not set');
    }

    if (!this.prisma) {
      this.prisma = new PrismaClient({
        log: process.env.NODE_ENV === 'development' ? ['query', 'info', 'warn', 'error'] : ['warn', 'error'],
      });

      try {
        await this.prisma.$connect();
        this.isConnected = true;
        console.log('Connected to database');
      } catch (error) {
        console.error('Failed to connect to database:', error);
        throw error;
      }
    }
    return this.prisma;
  }

  async disconnect() {
    if (this.prisma) {
      await this.prisma.$disconnect();
      this.isConnected = false;
      console.log('Disconnected from database');
    }
  }

  getPrisma() {
    if (!this.prisma || !this.isConnected) {
      throw new Error('Database not connected. Call connect() first.');
    }
    return this.prisma;
  }

  async healthCheck() {
    try {
      await this.prisma.$queryRaw`SELECT 1`;
      return true;
    } catch (error) {
      console.error('Database health check failed:', error);
      return false;
    }
  }
}

// Export singleton instance
const databaseService = new DatabaseService();

module.exports = {
  getDatabaseService: () => databaseService,
  DatabaseService
};
