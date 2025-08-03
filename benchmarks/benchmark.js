import http from 'http';
import express from 'express';
import { createApiRouter } from '../src/api/index.js';
import { performance } from 'perf_hooks';

// Simple HTTP server benchmark
function createHttpServer() {
  return http.createServer((req, res) => {
    res.writeHead(200, { 'Content-Type': 'text/html' });
    res.end('<h1>Hello World</h1><p>This is a simple HTTP server</p>');
  });
}

// Express server benchmark
function createExpressServer() {
  const app = express();
  
  app.get('/', (req, res) => {
    res.send('<h1>Hello World</h1><p>This is an Express server</p>');
  });
  
  return app;
}

// Coherent.js API server benchmark
function createCoherentServer() {
  const router = createApiRouter();
  
  router.get('/', (req, res) => {
    return '<h1>Hello World</h1><p>This is a Coherent.js API server</p>';
  });
  
  const app = express();
  app.use(router.toExpress());
  return app;
}

// Benchmark function
async function runBenchmark(serverFactory, port, name, requests = 1000) {
  console.log(`\n🚀 Starting ${name} benchmark...`);
  
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
    requestsPerSecond
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

// Run benchmarks
runAllBenchmarks().catch(console.error);
