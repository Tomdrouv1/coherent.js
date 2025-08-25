#!/usr/bin/env node
import { exec } from 'node:child_process';
import { promisify } from 'node:util';

const execAsync = promisify(exec);
const PORT = process.env.PORT || 3000;

async function buildAndServe() {
  try {
    console.log('🔨 Building website...');
    await execAsync('npm run website:build');
    console.log('✅ Website built successfully!');
    
    console.log('🚀 Starting development server...');
    const serverProcess = exec(`PORT=${PORT} node scripts/serve-website.js`);
    
    serverProcess.stdout.on('data', (data) => {
      console.log(data.toString().trim());
    });
    
    serverProcess.stderr.on('data', (data) => {
      console.error(data.toString().trim());
    });
    
    // Handle graceful shutdown
    process.on('SIGINT', () => {
      console.log('\n👋 Shutting down server...');
      serverProcess.kill();
      process.exit(0);
    });
    
  } catch (error) {
    console.error('❌ Error:', error.message);
    process.exit(1);
  }
}

buildAndServe();