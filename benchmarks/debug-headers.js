import http from 'http';
import { createRouter } from '../packages/api/src/index.js';

// Test each configuration individually to debug
console.log('Testing Coherent.js header configurations...');

// Test 1: Original (All headers enabled)
const router1 = createRouter();
router1.get('/', (req, res) => {
  return '<h1>Test 1 - Original</h1>';
});

// Test 2: CORS Only
const router2 = createRouter({
  enableSecurityHeaders: false,
  enableCORS: true
});
router2.get('/', (req, res) => {
  return '<h1>Test 2 - CORS Only</h1>';
});

// Test 3: Minimal (No headers)
const router3 = createRouter({
  enableSecurityHeaders: false,
  enableCORS: false
});
router3.get('/', (req, res) => {
  return '<h1>Test 3 - Minimal</h1>';
});

// Create servers on different ports
const server1 = http.createServer(async (req, res) => {
  try {
    console.log('Request to Original server');
    await router1.handle(req, res);
  } catch (error) {
    console.error('Original server error:', error);
    if (!res.headersSent) {
      res.writeHead(500, { 'Content-Type': 'text/plain' });
      res.end('Internal Server Error');
    }
  }
});

const server2 = http.createServer(async (req, res) => {
  try {
    console.log('Request to CORS-only server');
    await router2.handle(req, res);
  } catch (error) {
    console.error('CORS-only server error:', error);
    if (!res.headersSent) {
      res.writeHead(500, { 'Content-Type': 'text/plain' });
      res.end('Internal Server Error');
    }
  }
});

const server3 = http.createServer(async (req, res) => {
  try {
    console.log('Request to Minimal server');
    await router3.handle(req, res);
  } catch (error) {
    console.error('Minimal server error:', error);
    if (!res.headersSent) {
      res.writeHead(500, { 'Content-Type': 'text/plain' });
      res.end('Internal Server Error');
    }
  }
});

// Start servers
server1.listen(9001, () => {
  console.log('Original server (all headers) listening on port 9001');
});

server2.listen(9002, () => {
  console.log('CORS-only server listening on port 9002');
});

server3.listen(9003, () => {
  console.log('Minimal server (no headers) listening on port 9003');
  console.log('\\nTest each server with curl:');
  console.log('curl -v http://localhost:9001/  # Original');
  console.log('curl -v http://localhost:9002/  # CORS Only');
  console.log('curl -v http://localhost:9003/  # Minimal');
});

process.on('SIGTERM', () => {
  server1.close();
  server2.close();
  server3.close();
});

process.on('SIGINT', () => {
  server1.close();
  server2.close();
  server3.close();
});
