import http from 'http';
import { createRouter } from '../packages/api/src/index.js';

// Create Coherent.js server for debugging
const router = createRouter();

router.get('/', (req, res) => {
  return '<h1>Hello World</h1><p>This is a Coherent.js API server</p>';
});

const server = http.createServer(async (req, res) => {
  const startTime = Date.now();
  console.log(`[${startTime}] Request started: ${req.method} ${req.url}`);

  try {
    await router.handle(req, res);
    const endTime = Date.now();
    console.log(`[${endTime}] Request completed in ${endTime - startTime}ms`);
  } catch (error) {
    const endTime = Date.now();
    console.log(`[${endTime}] Request ERROR in ${endTime - startTime}ms:`, error.message);

    if (!res.headersSent) {
      res.writeHead(500, { 'Content-Type': 'text/plain' });
      res.end('Internal Server Error');
    }
  }
});

server.listen(7003, () => {
  console.log('Debug server listening on port 7003');

  // Test with concurrent requests
  console.log('Testing concurrent requests...');

  const makeRequest = () => {
    return new Promise((resolve, reject) => {
      const req = http.get('http://localhost:7003/', (res) => {
        let data = '';
        res.on('data', chunk => data += chunk);
        res.on('end', () => {
          resolve({
            statusCode: res.statusCode,
            headers: res.headers,
            body: data
          });
        });
      });

      req.on('error', reject);
      req.setTimeout(1000, () => {
        req.destroy();
        reject(new Error('Request timeout'));
      });
    });
  };

  // Test single request
  console.log('Single request test:');
  makeRequest().then(result => {
    console.log('Single request result:', {
      statusCode: result.statusCode,
      bodyLength: result.body.length
    });
  }).catch(err => {
    console.log('Single request error:', err.message);
  });

  // Test concurrent requests
  console.log('Concurrent request test (10 requests):');
  const concurrentPromises = Array(10).fill().map(() => makeRequest());

  Promise.allSettled(concurrentPromises).then(results => {
    console.log('Concurrent results:');
    results.forEach((result, index) => {
      if (result.status === 'fulfilled') {
        console.log(`  Request ${index + 1}: ${result.value.statusCode} (${result.value.body.length} bytes)`);
      } else {
        console.log(`  Request ${index + 1}: ERROR - ${result.reason.message}`);
      }
    });

    console.log('\nDebug test complete. Server will stay running...');
  });
});

process.on('SIGTERM', () => server.close());
process.on('SIGINT', () => server.close());
