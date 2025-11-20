import http from 'http';
import express from 'express';
import path from 'node:path';
import { pathToFileURL } from 'node:url';
import { createRouter } from '../packages/api/src/index.js';
import { performance } from 'perf_hooks';
import { createServer } from 'node:net';

// Simple HTTP server benchmark
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

// Coherent.js API server benchmark
export function createCoherentServer() {
  const router = createRouter();

  router.get('/', (req, res) => {
    return '<h1>Hello World</h1><p>This is a Coherent.js API server</p>';
  });

  const app = express();
  app.use((req, res, next) => {
    router.handle(req, res).catch(next);
  });
  return app;
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

// Find an available port starting from the given port
async function findAvailablePort(startPort) {
  let port = startPort;
  while (!(await isPortAvailable(port))) {
    port++;
    if (port > startPort + 100) {
      throw new Error(`No available ports found starting from ${startPort}`);
    }
  }
  return port;
}

// Benchmark function
async function runBenchmark(serverFactory, port, name, requests = 1000) {
  console.log(`\n🚀 Starting ${name} benchmark...`);

  // Find an available port
  const availablePort = await findAvailablePort(port);
  if (availablePort !== port) {
    console.log(`  Port ${port} was busy, using ${availablePort} instead`);
    port = availablePort;
  }

  // Create server
  const server = serverFactory();
  const listener = server.listen(port);

  // Wait for server to start
  await new Promise(resolve => setTimeout(resolve, 100));

  const startTime = performance.now();

  // Make requests
  for (let i = 0; i < requests; i++) {
    await fetch(`http://localhost:${port}/`);
  }

  const endTime = performance.now();
  const totalTime = endTime - startTime;
  const avgTime = totalTime / requests;
  const requestsPerSecond = (requests / totalTime) * 1000;

  // Close server
  listener.close();

  console.log(`${name} Results:`);
  console.log(`  Total time: ${totalTime.toFixed(2)}ms`);
  console.log(`  Average time per request: ${avgTime.toFixed(2)}ms`);
  console.log(`  Requests per second: ${requestsPerSecond.toFixed(2)}`);

  return {
    name,
    totalTime,
    avgTime,
    requestsPerSecond,
    port: port
  };
}

// Run all benchmarks
async function runAllBenchmarks() {
  console.log('🔬 Coherent.js vs Express.js Performance Benchmark');
  console.log('================================================');

  const results = [];

  // Run benchmarks
  results.push(await runBenchmark(createHttpServer, 6001, 'Node.js HTTP Server'));
  results.push(await runBenchmark(createExpressServer, 6002, 'Express.js Server'));
  results.push(await runBenchmark(createCoherentServer, 6003, 'Coherent.js API Server'));

  // Summary
  console.log('\n📊 Summary:');
  console.log('============');

  // Sort by requests per second
  results.sort((a, b) => b.requestsPerSecond - a.requestsPerSecond);

  results.forEach((result, index) => {
    const relative = (result.requestsPerSecond / results[0].requestsPerSecond) * 100;
    console.log(`${index + 1}. ${result.name}: ${result.requestsPerSecond.toFixed(2)} req/s (${relative.toFixed(1)}% of fastest)`);
  });

  console.log('\n✅ Benchmark complete!');
}

const isDirectRun = (() => {
  if (!process.argv[1]) {
    return false;
  }
  const entryUrl = pathToFileURL(path.resolve(process.argv[1])).href;
  return entryUrl === import.meta.url;
})();

if (isDirectRun) {
  runAllBenchmarks().catch((error) => {
    console.error(error);
    process.exitCode = 1;
  });
}
