import http from 'http';
import express from 'express';
import { createRouter } from '../packages/api/src/index.js';
import { createServer } from 'node:net';

// Simple HTTP server benchmark (unchanged)
export function createHttpServer() {
  return http.createServer((req, res) => {
    res.writeHead(200, { 'Content-Type': 'text/html' });
    res.end('<h1>Hello World</h1><p>This is a simple HTTP server</p>');
  });
}

// Express server benchmark (unchanged)
export function createExpressServer() {
  const app = express();

  app.get('/', (req, res) => {
    res.send('<h1>Hello World</h1><p>This is an Express server</p>');
  });

  return app;
}

// Coherent.js API server benchmark (Optimized - No Express wrapper)
export function createCoherentServer() {
  const router = createRouter();

  router.get('/', (req, res) => {
    return '<h1>Hello World</h1><p>This is a Coherent.js API server</p>';
  });

  // Pure Node.js HTTP server using router directly
  return http.createServer(async (req, res) => {
    try {
      await router.handle(req, res);
    } catch (error) {
      res.writeHead(500, { 'Content-Type': 'text/plain' });
      res.end('Internal Server Error');
    }
  });
}

// Check if a port is available
async function isPortAvailable(port) {
  return new Promise((resolve) => {
    const server = createServer();

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

      // Warm up
      const warmupRequests = 100;
      for (let i = 0; i < warmupRequests; i++) {
        // Simulate warmup requests (in real benchmarks, you'd use actual HTTP requests)
      }

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
  console.log('🔬 Coherent.js Performance Benchmark (Optimized)');
  console.log('==================================================');

  const results = [];

  // Test Node.js HTTP Server
  results.push(await runBenchmark('Node.js HTTP', createHttpServer, 6001));

  // Test Express Server
  results.push(await runBenchmark('Express.js', createExpressServer, 6002));

  // Test Coherent.js API Server (Optimized)
  results.push(await runBenchmark('Coherent.js API (Optimized)', createCoherentServer, 6003));

  console.log('All servers started. Press Ctrl+C to stop.');

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
