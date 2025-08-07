#!/usr/bin/env node

/**
 * auto-start.js - Cross-platform automatic setup and startup
 * Works on Windows, Mac, and Linux without any bash scripts
 */

const { execSync } = require('child_process');
const fs = require('fs');
const path = require('path');
const { initializeDatabase } = require('./init-db');

// Colors for console output (works on all platforms)
const colors = {
  reset: '\x1b[0m',
  bright: '\x1b[1m',
  green: '\x1b[32m',
  yellow: '\x1b[33m',
  blue: '\x1b[34m',
  red: '\x1b[31m',
  cyan: '\x1b[36m'
};

function log(message, color = 'reset') {
  console.log(`${colors[color]}${message}${colors.reset}`);
}

function execCommand(command, options = {}) {
  try {
    const result = execSync(command, {
      encoding: 'utf8',
      stdio: options.silent ? 'pipe' : 'inherit',
      shell: true, // Important for cross-platform compatibility
      ...options
    });
    return { success: true, output: result };
  } catch (error) {
    return { success: false, error: error.message };
  }
}

async function checkDependencies() {
  log('📦 Checking dependencies...', 'cyan');
  
  const requiredDeps = ['pg', 'mysql2']; // Database drivers
  const packageJson = JSON.parse(fs.readFileSync('package.json', 'utf8'));
  const missing = [];
  
  for (const dep of requiredDeps) {
    if (
      !(packageJson.dependencies && packageJson.dependencies[dep]) &&
      !(packageJson.devDependencies && packageJson.devDependencies[dep])
    ) {
      try {
        require.resolve(dep);
      } catch {
        missing.push(dep);
      }
    }
  }
  
  if (missing.length > 0) {
    log(`  Installing database drivers: ${missing.join(', ')}`, 'yellow');
    execCommand(`npm install ${missing.join(' ')} --no-save`, { silent: true });
  }
  
  log('✅ Dependencies ready', 'green');
}

async function createEnvFile() {
  const envPath = path.join(__dirname, '.env');
  
  if (!fs.existsSync(envPath)) {
    log('📝 Creating .env file...', 'yellow');
    
    // Detect if running in Docker
    const isDocker = fs.existsSync('/.dockerenv');
    const dbHost = isDocker ? 'postgres' : 'localhost';
    const keycloakHost = isDocker ? 'keycloak' : 'localhost';
    
    const envContent = `# Auto-generated environment configuration
# Database
DATABASE_URL="${process.env.DATABASE_URL || `postgresql://testuser:testpass@${dbHost}:5434/user_service_test`}"

# Keycloak Configuration  
KEYCLOAK_URL="${process.env.KEYCLOAK_URL || `http://${keycloakHost}:8080`}"
KEYCLOAK_REALM="${process.env.KEYCLOAK_REALM || 'peerit'}"
KEYCLOAK_CLIENT_ID="${process.env.KEYCLOAK_CLIENT_ID || 'peerit-services'}"

# Application Configuration
NODE_ENV="${process.env.NODE_ENV || 'development'}"
PORT="${process.env.PORT || '3020'}"
FRONTEND_URL="${process.env.FRONTEND_URL || 'http://localhost:3000'}"

# Logging
LOG_LEVEL="${process.env.LOG_LEVEL || 'info'}"
`;
    
    fs.writeFileSync(envPath, envContent);
    log('✅ .env file created', 'green');
  } else {
    log('✅ .env file exists', 'green');
  }
  
  // Load the .env file
  require('dotenv').config();
}

async function waitForService(name, checkCommand, maxAttempts = 30) {
  log(`⏳ Waiting for ${name}...`, 'yellow');
  
  for (let i = 0; i < maxAttempts; i++) {
    const result = execCommand(checkCommand, { silent: true });
    if (result.success) {
      log(`✅ ${name} is ready`, 'green');
      return true;
    }
    
    process.stdout.write('.');
    await new Promise(resolve => setTimeout(resolve, 2000));
  }
  
  log(`\n⚠️  ${name} is not responding`, 'yellow');
  return false;
}

async function waitForPostgres() {
  // Cross-platform PostgreSQL check using Node.js
  const { parseDbUrl } = require('./init-db');
  const dbConfig = parseDbUrl(process.env.DATABASE_URL);
  
  if (!dbConfig) {
    log('⚠️  No DATABASE_URL configured', 'yellow');
    return false;
  }
  
  log(`⏳ Waiting for PostgreSQL at ${dbConfig.host}:${dbConfig.port}...`, 'yellow');
  
  for (let i = 0; i < 30; i++) {
    try {
      const { Client } = require('pg');
      const client = new Client({
        host: dbConfig.host,
        port: dbConfig.port,
        user: dbConfig.user,
        password: dbConfig.password,
        database: 'postgres'
      });
      
      await client.connect();
      await client.end();
      
      log('✅ PostgreSQL is ready', 'green');
      return true;
    } catch (error) {
      process.stdout.write('.');
      await new Promise(resolve => setTimeout(resolve, 1000));
    }
  }
  
  log('\n❌ PostgreSQL is not responding', 'red');
  return false;
}

async function waitForKeycloak() {
  const keycloakUrl = process.env.KEYCLOAK_URL || 'http://localhost:8080';
  
  log(`⏳ Waiting for Keycloak at ${keycloakUrl}...`, 'yellow');
  
  // Use axios or node-fetch if available, otherwise skip
  try {
    const axios = require('axios');
    
    for (let i = 0; i < 30; i++) {
      try {
        await axios.get(`${keycloakUrl}/realms/peerit`);
        log('✅ Keycloak is ready', 'green');
        return true;
      } catch {
        process.stdout.write('.');
        await new Promise(resolve => setTimeout(resolve, 2000));
      }
    }
  } catch {
    log('⚠️  Cannot check Keycloak (axios not installed)', 'yellow');
    return true; // Continue anyway
  }
  
  log('\n⚠️  Keycloak may not be ready', 'yellow');
  return false;
}

async function main() {
  console.clear();
  log('═══════════════════════════════════════════════════', 'blue');
  log('   Peerit User Service - Automatic Setup & Start   ', 'bright');
  log('        Cross-Platform ✓ Windows ✓ Mac ✓ Linux    ', 'cyan');
  log('═══════════════════════════════════════════════════', 'blue');
  log('');
  
  try {
    // Step 1: Create .env file if needed
    await createEnvFile();
    
    // Step 2: Check/install dependencies
    await checkDependencies();
    
    // Step 3: Install npm packages if needed
    if (!fs.existsSync(path.join(__dirname, 'node_modules'))) {
      log('📦 Installing npm packages...', 'yellow');
      execCommand('npm install');
      log('✅ Packages installed', 'green');
    }
    
    // Step 4: Generate Prisma client
    log('🔧 Generating Prisma client...', 'cyan');
    execCommand('npx prisma generate', { silent: true });
    log('✅ Prisma client ready', 'green');
    
    // Step 5: Wait for services
    const postgresReady = await waitForPostgres();
    if (!postgresReady && process.env.NODE_ENV === 'production') {
      log('\n❌ Cannot start without database in production', 'red');
      process.exit(1);
    }
    
    await waitForKeycloak(); // Optional, just warn
    
    // Step 6: Initialize database (cross-platform!)
    log('\n🗄️  Initializing database...', 'blue');
    const dbInitialized = await initializeDatabase();
    
    if (!dbInitialized && process.env.NODE_ENV === 'production') {
      log('❌ Database initialization failed', 'red');
      process.exit(1);
    }
    
    // Step 7: Start the service
    log('\n' + '═'.repeat(52), 'green');
    log('✨ All systems ready! Starting service...', 'green');
    log('═'.repeat(52) + '\n', 'green');
    
    // Start the actual service
    require('./index.js');
    
  } catch (error) {
    log(`\n❌ Setup failed: ${error.message}`, 'red');
    console.error(error);
    process.exit(1);
  }
}

// Graceful shutdown
process.on('SIGINT', () => {
  log('\n👋 Shutting down gracefully...', 'yellow');
  process.exit(0);
});

process.on('SIGTERM', () => {
  log('\n👋 Shutting down gracefully...', 'yellow');
  process.exit(0);
});

// Windows-specific signal handling
if (process.platform === 'win32') {
  const readline = require('readline').createInterface({
    input: process.stdin,
    output: process.stdout
  });
  
  readline.on('SIGINT', () => {
    process.emit('SIGINT');
  });
}

// Run the setup
if (require.main === module) {
  main().catch(error => {
    log(`\n❌ Fatal error: ${error.message}`, 'red');
    process.exit(1);
  });
}

module.exports = { main };