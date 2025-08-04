#!/usr/bin/env node

/**
 * Docker Compose Test Runner
 * 
 * Provides real-time feedback and manages infrastructure lifecycle
 */

const { spawn } = require('child_process');
const { promisify } = require('util');
const sleep = promisify(setTimeout);

class DockerComposeTestRunner {
  constructor() {
    this.infrastructureStarted = false;
  }

  log(message, type = 'info') {
    const timestamp = new Date().toLocaleTimeString();
    const prefix = {
      info: '🔍',
      success: '✅',
      error: '❌',
      warning: '⚠️',
      docker: '🐳'
    }[type] || 'ℹ️';
    
    console.log(`[${timestamp}] ${prefix} ${message}`);
  }

  async runCommand(command, args = [], options = {}) {
    return new Promise((resolve, reject) => {
      const child = spawn(command, args, {
        stdio: options.silent ? 'pipe' : 'inherit',
        shell: true,
        ...options
      });

      let stdout = '';
      let stderr = '';

      if (options.silent) {
        child.stdout?.on('data', (data) => { stdout += data; });
        child.stderr?.on('data', (data) => { stderr += data; });
      }

      child.on('close', (code) => {
        if (code === 0) {
          resolve({ stdout, stderr, code });
        } else {
          reject(new Error(`Command failed with code ${code}: ${stderr}`));
        }
      });
    });
  }

  async checkInfrastructure() {
    try {
      this.log('Checking Docker Compose infrastructure status...', 'docker');
      
      const result = await this.runCommand('docker', [
        'compose', '-f', '../../infra/docker/compose.yml', 'ps', '--format', 'json'
      ], { silent: true });

      const containers = result.stdout.split('\n')
        .filter(line => line.trim())
        .map(line => {
          try { return JSON.parse(line); } catch { return null; }
        })
        .filter(Boolean);

      const postgres = containers.find(c => c.Service === 'postgres');
      const redis = containers.find(c => c.Service === 'redis');

      const postgresHealthy = postgres?.Health === 'healthy' || postgres?.State === 'running';
      const redisHealthy = redis?.Health === 'healthy' || redis?.State === 'running';

      if (postgresHealthy && redisHealthy) {
        this.log('Infrastructure is running and healthy', 'success');
        return true;
      } else {
        this.log(`Infrastructure status - PostgreSQL: ${postgres?.State || 'not found'}, Redis: ${redis?.State || 'not found'}`, 'warning');
        return false;
      }
    } catch (error) {
      this.log(`Infrastructure check failed: ${error.message}`, 'error');
      return false;
    }
  }

  async startInfrastructure() {
    try {
      this.log('Starting Docker Compose infrastructure...', 'docker');
      
      await this.runCommand('docker', [
        'compose', '-f', '../../infra/docker/compose.yml', 'up', '-d'
      ]);

      this.log('Waiting for services to be healthy...', 'docker');
      
      // Wait up to 30 seconds for services to be healthy
      for (let i = 0; i < 30; i++) {
        if (await this.checkInfrastructure()) {
          this.infrastructureStarted = true;
          return true;
        }
        await sleep(1000);
        process.stdout.write('.');
      }
      console.log(''); // New line after dots
      
      throw new Error('Infrastructure failed to become healthy within 30 seconds');
    } catch (error) {
      this.log(`Failed to start infrastructure: ${error.message}`, 'error');
      return false;
    }
  }

  async stopInfrastructure() {
    if (!this.infrastructureStarted) return;
    
    try {
      this.log('Stopping Docker Compose infrastructure...', 'docker');
      await this.runCommand('docker', [
        'compose', '-f', '../../infra/docker/compose.yml', 'down'
      ], { silent: true });
      this.log('Infrastructure stopped', 'success');
    } catch (error) {
      this.log(`Warning: Failed to stop infrastructure: ${error.message}`, 'warning');
    }
  }

  async runTests() {
    try {
      this.log('Running integration tests against Docker Compose infrastructure...', 'info');
      
      await this.runCommand('npm', [
        'run', 'test:flow'
      ]);
      
      this.log('All tests passed!', 'success');
      return true;
    } catch (error) {
      this.log(`Tests failed: ${error.message}`, 'error');
      return false;
    }
  }

  async run() {
    const startTime = Date.now();
    
    try {
      // Check if infrastructure is already running
      const isRunning = await this.checkInfrastructure();
      
      if (!isRunning) {
        const started = await this.startInfrastructure();
        if (!started) {
          process.exit(1);
        }
      } else {
        this.log('Using existing infrastructure', 'info');
      }

      // Run tests
      const testsPassed = await this.runTests();
      
      const duration = ((Date.now() - startTime) / 1000).toFixed(1);
      this.log(`Complete in ${duration}s`, testsPassed ? 'success' : 'error');
      
      process.exit(testsPassed ? 0 : 1);
      
    } catch (error) {
      this.log(`Runner failed: ${error.message}`, 'error');
      process.exit(1);
    } finally {
      // Only stop infrastructure if we started it
      if (this.infrastructureStarted) {
        await this.stopInfrastructure();
      }
    }
  }
}

// Handle Ctrl+C gracefully
process.on('SIGINT', async () => {
  console.log('\n🛑 Received interrupt signal...');
  process.exit(1);
});

// Run if called directly
if (require.main === module) {
  const runner = new DockerComposeTestRunner();
  runner.run().catch(console.error);
}

module.exports = DockerComposeTestRunner;
