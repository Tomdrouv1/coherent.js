import http from 'http';
import express from 'express';
import { createRouter } from '../packages/api/src/index.js';

// Simple HTTP server benchmark (baseline)
export function createHttpServer() {
  return http.createServer((req, res) => {
    res.writeHead(200, { 'Content-Type': 'text/html' });
    res.end('<h1>Hello World</h1><p>This is a simple HTTP server</p>');
  });
}

// Express server benchmark
export function createExpressServer() {
  const app = express();

  app.get('/', (req, res) => {
    res.send('<h1>Hello World</h1><p>This is an Express server</p>');
  });

  return app;
}

// Coherent.js API server benchmark (Original - No Smart Routing)
export function createCoherentServerOriginal() {
  const router = createRouter(null, {
    enableSecurityHeaders: false,
    enableCORS: false,
    enableSmartRouting: false // Disable smart routing
  });

  router.get('/', (req, res) => {
    return '<h1>Hello World</h1><p>This is a Coherent.js API server (original routing)</p>';
  });

  // Pure Node.js HTTP server (no Express wrapper)
  return http.createServer(async (req, res) => {
    try {
      await router.handle(req, res);
    } catch (error) {
      if (!res.headersSent) {
        res.writeHead(500, { 'Content-Type': 'text/plain' });
        res.end('Internal Server Error');
      }
    }
  });
}

// Coherent.js API server benchmark (Smart Routing Enabled)
export function createCoherentServerSmartRouting() {
  const router = createRouter(null, {
    enableSecurityHeaders: false,
    enableCORS: false,
    enableSmartRouting: true, // Enable smart routing
    enableRouteMetrics: true // Track performance
  });

  router.get('/', (req, res) => {
    return '<h1>Hello World</h1><p>This is a Coherent.js API server (smart routing)</p>';
  });

  // Add some dynamic routes to show the difference
  router.get('/users/:id', (req, res) => {
    return { user: { id: req.params.id } };
  });

  router.get('/posts/:postId/comments/:commentId', (req, res) => {
    return { postId: req.params.postId, commentId: req.params.commentId };
  });

  // Pure Node.js HTTP server (no Express wrapper)
  return http.createServer(async (req, res) => {
    try {
      await router.handle(req, res);
    } catch (error) {
      if (!res.headersSent) {
        res.writeHead(500, { 'Content-Type': 'text/plain' });
        res.end('Internal Server Error');
      }
    }
  });
}

// Coherent.js API server benchmark (Ultra-Optimized - Smart + Minimal Headers)
export function createCoherentServerUltraOptimized() {
  const router = createRouter(null, {
    enableSecurityHeaders: false,
    enableCORS: false,
    enableMetrics: false,
    enableCompilation: false,
    enableSmartRouting: true, // Enable smart routing
    enableRouteMetrics: true
  });

  router.get('/', (req, res) => {
    return '<h1>Hello World</h1><p>This is a Coherent.js API server (ultra-optimized)</p>';
  });

  // Pure Node.js HTTP server (no Express wrapper)
  return http.createServer(async (req, res) => {
    try {
      await router.handle(req, res);
    } catch (error) {
      if (!res.headersSent) {
        res.writeHead(500, { 'Content-Type': 'text/plain' });
        res.end('Internal Server Error');
      }
    }
  });
}

// Check if a port is available
async function isPortAvailable(port) {
  return new Promise((resolve) => {
    const server = http.createServer();

    server.listen(port, () => {
      server.once('close', () => resolve(true));
      server.close();
    });

    server.on('error', () => resolve(false));
  });
}

// Find an available port
async function findAvailablePort(startPort) {
  let port = startPort;
  while (!(await isPortAvailable(port))) {
    port++;
  }
  return port;
}

// Run a single benchmark
async function runBenchmark(name, serverFactory, port) {
  return new Promise((resolve) => {
    const server = serverFactory();

    server.listen(port, async () => {
      console.log(`${name} listening on port ${port}`);
      resolve({ server, port, name });
    });

    server.on('error', async () => {
      const availablePort = await findAvailablePort(port + 1);
      const retryServer = serverFactory();
      retryServer.listen(availablePort, () => {
        console.log(`${name} listening on port ${availablePort} (fallback)`);
        resolve({ server: retryServer, port: availablePort, name });
      });
    });
  });
}

// Main benchmark runner
async function main() {
  console.log('🚀 Coherent.js Smart Route Matching Benchmark');
  console.log('==================================================');

  const results = [];

  // Test Node.js HTTP Server (baseline)
  results.push(await runBenchmark('Node.js HTTP (Baseline)', createHttpServer, 7001));

  // Test Express Server
  results.push(await runBenchmark('Express.js', createExpressServer, 7002));

  // Test Coherent.js API Server (Original Routing)
  results.push(await runBenchmark('Coherent.js (Original Routing)', createCoherentServerOriginal, 7003));

  // Test Coherent.js API Server (Smart Routing)
  results.push(await runBenchmark('Coherent.js (Smart Routing)', createCoherentServerSmartRouting, 7004));

  // Test Coherent.js API Server (Ultra-Optimized)
  results.push(await runBenchmark('Coherent.js (Ultra-Optimized)', createCoherentServerUltraOptimized, 7005));

  console.log('\\nAll servers started. Press Ctrl+C to stop.');
  console.log('\\nExpected Performance Ranking:');
  console.log('1. Node.js HTTP (Baseline) - Fastest');
  console.log('2. Coherent.js (Ultra-Optimized) - Smart + minimal headers');
  console.log('3. Coherent.js (Smart Routing) - Smart routing enabled');
  console.log('4. Coherent.js (Original Routing) - No smart routing');
  console.log('5. Express.js - Slowest');
  console.log('\\nSmart routing should provide significant improvement for static routes!');

  // Keep process alive
  process.on('SIGTERM', () => {
    results.forEach(({ server }) => server.close());
    process.exit(0);
  });

  process.on('SIGINT', () => {
    results.forEach(({ server }) => server.close());
    process.exit(0);
  });
}

main().catch(console.error);
