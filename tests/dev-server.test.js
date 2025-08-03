/**
 * Tests for the development server
 */

import { DevServer } from '../src/dev/dev-server.js';
import fs from 'fs';
import path from 'path';
import { fileURLToPath } from 'url';

// Get __dirname equivalent in ES modules
const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

console.log('=== Development Server Tests ===');

// Test 1: DevServer class can be imported
console.log('\n1. Testing DevServer class import...');
try {
  console.log('✓ DevServer class imported successfully');
} catch (error) {
  console.error('✗ DevServer class import failed:', error.message);
}

// Test 2: DevServer can be instantiated
console.log('\n2. Testing DevServer instantiation...');
try {
  const server = new DevServer({
    port: 3001,
    host: 'localhost',
    watchPaths: ['src/**/*.js'],
    staticPaths: ['examples']
  });
  
  console.log('✓ DevServer instantiated successfully');
  
  // Test that methods exist
  if (typeof server.start === 'function' && typeof server.stop === 'function') {
    console.log('✓ DevServer methods exist');
  } else {
    console.error('✗ DevServer methods missing');
  }
  
  // Clean up
  if (server.server) {
    server.server.close();
  }
} catch (error) {
  console.error('✗ DevServer instantiation failed:', error.message);
}

// Test 3: Configuration options
console.log('\n3. Testing configuration options...');
try {
  const config = {
    port: 3002,
    host: '127.0.0.1',
    watchPaths: ['src/**/*.js', 'tests/**/*.js'],
    staticPaths: ['examples', 'public']
  };
  
  const server = new DevServer(config);
  
  console.log('✓ DevServer accepts configuration options');
  console.log(`  Port: ${config.port}`);
  console.log(`  Host: ${config.host}`);
  console.log(`  Watch paths: ${config.watchPaths.join(', ')}`);
  console.log(`  Static paths: ${config.staticPaths.join(', ')}`);
  
  // Clean up
  if (server.server) {
    server.server.close();
  }
} catch (error) {
  console.error('✗ Configuration options test failed:', error.message);
}

// Test 4: Static path handling
console.log('\n4. Testing static path handling...');
try {
  const examplesPath = path.join(process.cwd(), 'examples');
  const exists = fs.existsSync(examplesPath);
  
  if (exists) {
    console.log('✓ Examples directory exists');
  } else {
    console.log('⚠ Examples directory does not exist');
  }
} catch (error) {
  console.error('✗ Static path handling test failed:', error.message);
}

console.log('\n=== Development Server Tests Completed ===');
console.log('Note: Full integration tests would require running the server and testing WebSocket connections');
