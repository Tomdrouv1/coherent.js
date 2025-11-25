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

// Coherent.js API server benchmark (Original - All Headers)
export function createCoherentServerOriginal() {
  const router = createRouter(); // Default: all headers enabled

  router.get('/', (req, res) => {
    return '<h1>Hello World</h1><p>This is a Coherent.js API server (original)</p>';
  });

  const app = express();
  app.use((req, res, next) => {
    router.handle(req, res).catch(next);
  });
  return app;
}

// Coherent.js API server benchmark (CORS Only)
export function createCoherentServerCORSOnly() {
  const router = createRouter(null, { // Pass options as second parameter
    enableSecurityHeaders: false, // Disable security headers
    enableCORS: true // Keep CORS
  });

  router.get('/', (req, res) => {
    return '<h1>Hello World</h1><p>This is a Coherent.js API server (CORS only)</p>';
  });

  const app = express();
  app.use((req, res, next) => {
    router.handle(req, res).catch(next);
  });
  return app;
}

// Coherent.js API server benchmark (Minimal Headers - Ultra Optimized)
export function createCoherentServerMinimal() {
  const router = createRouter(null, { // Pass options as second parameter
    enableSecurityHeaders: false, // Disable security headers
    enableCORS: false, // Disable CORS
    enableMetrics: false, // Disable metrics
    enableCompilation: false // Disable compilation for simple routes
  });

  router.get('/', (req, res) => {
    return '<h1>Hello World</h1><p>This is a Coherent.js API server (minimal headers)</p>';
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
  console.log('🚀 Coherent.js Security Header Optimization Benchmark');
  console.log('=======================================================');

  const results = [];

  // Test Node.js HTTP Server (baseline)
  results.push(await runBenchmark('Node.js HTTP (Baseline)', createHttpServer, 7001));

  // Test Express Server
  results.push(await runBenchmark('Express.js', createExpressServer, 7002));

  // Test Coherent.js API Server (Original - All Headers)
  results.push(await runBenchmark('Coherent.js (Original)', createCoherentServerOriginal, 7003));

  // Test Coherent.js API Server (CORS Only)
  results.push(await runBenchmark('Coherent.js (CORS Only)', createCoherentServerCORSOnly, 7004));

  // Test Coherent.js API Server (Minimal Headers - Ultra Optimized)
  results.push(await runBenchmark('Coherent.js (Minimal Headers)', createCoherentServerMinimal, 7005));

  console.log('\\nAll servers started. Press Ctrl+C to stop.');
  console.log('\\nExpected Performance Ranking:');
  console.log('1. Node.js HTTP (Baseline) - Fastest');
  console.log('2. Coherent.js (Minimal Headers) - Should be close to baseline');
  console.log('3. Coherent.js (CORS Only) - Moderate improvement');
  console.log('4. Coherent.js (Original) - Current performance');
  console.log('5. Express.js - Slowest');

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
