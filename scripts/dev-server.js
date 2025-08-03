#!/usr/bin/env node

/**
 * Coherent.js Development Server CLI
 * Run with: node scripts/dev-server.js
 */

import { DevServer } from '../src/dev/dev-server.js';

// Default configuration
const config = {
  port: parseInt(process.env.PORT) || 3000,
  host: process.env.HOST || 'localhost',
  watchPaths: ['src/**/*', 'examples/**/*'],
  staticPaths: ['examples', 'public']
};

// Create and start the development server
const server = new DevServer(config);

// Handle graceful shutdown
process.on('SIGINT', () => {
  console.log('\n🛑 Shutting down development server...');
  server.stop();
  process.exit(0);
});

process.on('SIGTERM', () => {
  console.log('\n🛑 Shutting down development server...');
  server.stop();
  process.exit(0);
});

// Start the server
server.start();

console.log(`\n🚀 Coherent.js Development Server`);
console.log(`📡 http://${config.host}:${config.port}`);
console.log(`🔄 Hot reload enabled`);
console.log(`📁 Watching: ${config.watchPaths.join(', ')}`);
