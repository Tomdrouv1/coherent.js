import http from 'http';
import { createApiRouter } from '../src/api/index.js';
import { performance } from 'perf_hooks';

// Pure Node.js server with Coherent.js API router
function createPureNodeServer() {
  const router = createApiRouter();
  
  router.get('/', (req, res) => {
    res.statusCode = 200;
    res.setHeader('Content-Type', 'text/html');
    res.end('<h1>Hello World</h1><p>This is a pure Node.js server with Coherent.js API router</p>');
    return null; // Indicate that we've handled the response
  });
  
  // Create HTTP server that uses the router
  const server = http.createServer(async (req, res) => {
    try {
      // Create Coherent.js style request object
      const coherentReq = {
        method: req.method,
        url: req.url,
        headers: req.headers,
        params: {},
        query: {},
        body: null
      };
      
      // Parse body for POST/PUT requests
      if (req.method === 'POST' || req.method === 'PUT') {
        const buffers = [];
        for await (const chunk of req) {
          buffers.push(chunk);
        }
        coherentReq.body = Buffer.concat(buffers).toString();
      }
      
      // Create Coherent.js style response object
      const coherentRes = {
        statusCode: res.statusCode,
        setHeader: (name, value) => res.setHeader(name, value),
        write: (data) => res.write(data),
        end: (data) => res.end(data),
        headersSent: false
      };
      
      // Handle the request with Coherent.js router
      await router.handleRequest(coherentReq, coherentRes);
      
      // If no response was sent, send a default response
      if (!res.headersSent) {
        res.statusCode = 404;
        res.end('Not Found');
      }
    } catch (error) {
      if (!res.headersSent) {
        res.statusCode = 500;
        res.end(`Server Error: ${error.message}`);
      }
    }
  });
  
  return server;
}

// Benchmark function
async function runBenchmark(serverFactory, port, name, requests = 1000) {
  console.log(`\n🚀 Starting ${name} benchmark...`);
  
  // Create server
  const server = serverFactory();
  const listener = server.listen(port, () => {
    console.log(`${name} listening on port ${port}`);
  });
  
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
  console.log('🔬 Coherent.js Pure Node.js vs Express.js Performance Benchmark');
  console.log('===============================================================');
  
  const results = [];
  
  // Run benchmarks
  results.push(await runBenchmark(createPureNodeServer, 6004, 'Pure Node.js + Coherent.js API Server'));
  
  console.log('\n📊 Summary:');
  console.log('============');
  
  results.forEach((result, index) => {
    console.log(`${index + 1}. ${result.name}: ${result.requestsPerSecond.toFixed(2)} req/s`);
  });
  
  console.log('\n✅ Benchmark complete!');
}

// Run benchmarks
runAllBenchmarks().catch(console.error);
