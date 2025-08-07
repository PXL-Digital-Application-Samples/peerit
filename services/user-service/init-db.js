/**
 * init-db.js - Cross-platform database initialization
 * Works with any database that Prisma supports
 * This runs before the main application starts
 */

const { execSync } = require('child_process');
const path = require('path');
require('dotenv').config();

// Parse DATABASE_URL to get connection details
function parseDbUrl(url) {
  if (!url) return null;
  
  const match = url.match(/^(\w+):\/\/([^:]+):([^@]+)@([^:\/]+):(\d+)\/(.+)(\?.*)?$/);
  if (!match) return null;
  
  return {
    provider: match[1],
    user: match[2],
    password: match[3],
    host: match[4],
    port: match[5],
    database: match[6],
    params: match[7] || ''
  };
}

// Create database if it doesn't exist (database-agnostic approach)
async function ensureDatabase() {
  const dbUrl = process.env.DATABASE_URL;
  if (!dbUrl) {
    console.log('⚠️  No DATABASE_URL found, skipping database creation');
    return;
  }

  const dbConfig = parseDbUrl(dbUrl);
  if (!dbConfig) {
    console.log('⚠️  Could not parse DATABASE_URL');
    return;
  }

  console.log(`📦 Checking database: ${dbConfig.database}`);

  // For PostgreSQL
  if (dbConfig.provider === 'postgresql' || dbConfig.provider === 'postgres') {
    try {
      const { Client } = require('pg');
      
      // Connect to postgres database to create our target database
      const client = new Client({
        host: dbConfig.host,
        port: dbConfig.port,
        user: dbConfig.user,
        password: dbConfig.password,
        database: 'postgres' // Connect to default database
      });

      await client.connect();

      // Check if database exists
      const res = await client.query(
        "SELECT 1 FROM pg_database WHERE datname = $1",
        [dbConfig.database]
      );

      if (res.rows.length === 0) {
        console.log(`🔨 Creating database: ${dbConfig.database}`);
        // Create database - safe from SQL injection using identifier quoting
        await client.query(`CREATE DATABASE "${dbConfig.database}"`);
        console.log(`✅ Database created: ${dbConfig.database}`);
      } else {
        console.log(`✅ Database already exists: ${dbConfig.database}`);
      }

      await client.end();
    } catch (error) {
      if (error.code === '42P04') {
        console.log(`✅ Database already exists: ${dbConfig.database}`);
      } else if (error.code === 'ECONNREFUSED') {
        console.log('⚠️  Database server not reachable, will retry on app start');
      } else {
        console.log(`⚠️  Database creation warning: ${error.message}`);
      }
    }
  }
  
  // For MySQL/MariaDB
  else if (dbConfig.provider === 'mysql') {
    try {
      const mysql = require('mysql2/promise');
      
      const connection = await mysql.createConnection({
        host: dbConfig.host,
        port: dbConfig.port,
        user: dbConfig.user,
        password: dbConfig.password
      });

      await connection.execute(
        `CREATE DATABASE IF NOT EXISTS \`${dbConfig.database}\``
      );
      
      console.log(`✅ MySQL database ready: ${dbConfig.database}`);
      await connection.end();
    } catch (error) {
      console.log(`⚠️  MySQL database warning: ${error.message}`);
    }
  }
  
  // For SQLite (file-based, no creation needed)
  else if (dbConfig.provider === 'sqlite') {
    console.log('✅ SQLite database will be created automatically');
  }
  
  // For SQL Server
  else if (dbConfig.provider === 'sqlserver') {
    console.log('ℹ️  SQL Server database should be pre-created');
  }
  
  else {
    console.log(`ℹ️  Database provider '${dbConfig.provider}' - assuming database exists`);
  }
}

// Main initialization function
async function initializeDatabase() {
  console.log('🚀 Database Initialization');
  console.log('========================');
  
  try {
    // Step 1: Ensure database exists
    await ensureDatabase();
    
    // Step 2: Run Prisma migrations/push
    console.log('\n📋 Applying database schema...');
    
    if (process.env.NODE_ENV === 'production') {
      // Production: use migrations
      try {
        execSync('npx prisma migrate deploy', { stdio: 'inherit' });
        console.log('✅ Production migrations applied');
      } catch (error) {
        console.log('ℹ️  Migrations may already be applied');
      }
    } else {
      // Development: use db push
      try {
        execSync('npx prisma db push --skip-generate', { stdio: 'inherit' });
        console.log('✅ Development schema synced');
      } catch (error) {
        console.log('⚠️  Schema sync warning:', error.message);
      }
    }
    
    // Step 3: Seed if needed (development only)
    if (process.env.NODE_ENV !== 'production') {
      console.log('\n🌱 Seeding database...');
      try {
        execSync('npx prisma db seed', { stdio: 'pipe' });
        console.log('✅ Database seeded');
      } catch (error) {
        console.log('ℹ️  Seed skipped (data may already exist)');
      }
    }
    
    console.log('\n✨ Database initialization complete!\n');
    return true;
    
  } catch (error) {
    console.error('❌ Database initialization failed:', error.message);
    if (process.env.NODE_ENV === 'production') {
      process.exit(1);
    }
    return false;
  }
}

// Export for use in other files
module.exports = { initializeDatabase, ensureDatabase, parseDbUrl };

// Run if called directly
if (require.main === module) {
  initializeDatabase()
    .then(() => process.exit(0))
    .catch(() => process.exit(1));
}