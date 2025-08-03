import http2 from 'http2';
import fs from 'fs';
import path from 'path';
import { createApiRouter } from '../src/api/index.js';
import { performance } from 'perf_hooks';

// HTTP/2 server with Coherent.js API router
function createHttp2Server() {
  // Create self-signed certificates for HTTP/2 with ALPN
  const server = http2.createSecureServer({
    key: fs.readFileSync(path.resolve('tests/fixtures/localhost-privkey.pem')),
    cert: fs.readFileSync(path.resolve('tests/fixtures/localhost-cert.pem')),
    allowHTTP1: true, // Allow HTTP/1.1 connections
    ALPNProtocols: ['h2', 'http/1.1'] // Specify ALPN protocols
  });
  
  const router = createApiRouter();
  
  router.get('/', (req, res) => {
    res.setHeader('Content-Type', 'text/html');
    res.end('<h1>Hello World</h1><p>This is an HTTP/2 server with Coherent.js API router</p>');
    return null; // Indicate that we've handled the response
  });
  
  // Handle HTTP/2 requests
  server.on('stream', async (stream, headers) => {
    try {
      const method = headers[':method'] || 'GET';
      const url = headers[':path'] || '/';
      
      // Create Coherent.js style request object
      const coherentReq = {
        method,
        url,
        headers,
        params: {},
        query: {},
        body: null
      };
      
      // Create Coherent.js style response object
      const coherentRes = {
        statusCode: 200,
        setHeader: (name, value) => {
          if (!stream.headersSent) {
            stream.respond({
              'content-type': value,
              ':status': 200
            });
          }
        },
        write: (data) => {
          if (!stream.headersSent) {
            stream.respond({ ':status': 200 });
          }
          stream.write(data);
        },
        end: (data) => {
          if (!stream.headersSent) {
            stream.respond({ ':status': 200 });
          }
          stream.end(data);
        },
        headersSent: false
      };
      
      // Handle the request with Coherent.js router
      await router.handleRequest(coherentReq, coherentRes);
      
      // If no response was sent, send a default response
      if (!stream.headersSent && !stream.closed && !stream.destroyed) {
        stream.respond({ ':status': 404 });
        stream.end('Not Found');
      }
    } catch (error) {
      if (!stream.headersSent && !stream.closed && !stream.destroyed) {
        stream.respond({ ':status': 500 });
        stream.end(`Server Error: ${error.message}`);
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
  // Create an HTTP/2 client session
  const http2 = await import('http2');
  const client = http2.connect(`https://localhost:${port}`, {
    rejectUnauthorized: false // Ignore self-signed certificate errors
  });
  
  for (let i = 0; i < requests; i++) {
    const req = client.request({
      ':method': 'GET',
      ':path': '/'
    });
    
    // Wait for response
    await new Promise((resolve) => {
      req.on('response', () => {
        req.on('end', resolve);
        req.resume(); // Consume the response
      });
      req.end();
    });
  }
  
  // Close the client session
  client.close();
  
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
  console.log('🔬 Coherent.js HTTP/2 Performance Benchmark');
  console.log('===========================================');
  
  const results = [];
  
  // Run benchmarks
  results.push(await runBenchmark(createHttp2Server, 6005, 'HTTP/2 + Coherent.js API Server'));
  
  console.log('\n📊 Summary:');
  console.log('============');
  
  results.forEach((result, index) => {
    console.log(`${index + 1}. ${result.name}: ${result.requestsPerSecond.toFixed(2)} req/s`);
  });
  
  console.log('\n✅ Benchmark complete!');
}

// Run benchmarks
runAllBenchmarks().catch(console.error);
