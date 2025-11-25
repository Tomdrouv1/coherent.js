import http from 'http';
import { createRouter } from '../packages/api/src/index.js';

// Create router with extensive logging
const router = createRouter();

// Disable features to isolate core issue
router.enableCompilation = false;
router.enableMetrics = false;
router.routeCache.clear();
router.maxCacheSize = 0;

// Add route with logging
router.get('/', async (req, res) => {
  const handlerStart = Date.now();
  console.log(`[${handlerStart}] HANDLER: Starting execution`);

  try {
    const result = '<h1>Hello World</h1><p>Debug Coherent.js route test</p>';
    console.log(`[${Date.now()}] HANDLER: Generated result, length: ${result.length}`);
    return result;
  } catch (error) {
    console.log(`[${Date.now()}] HANDLER: ERROR - ${error.message}`);
    throw error;
  }
});

// Wrap router.handle with extensive logging
const originalHandle = router.handle.bind(router);
router.handle = async function(req, res) {
  const requestId = Math.random().toString(36).substr(2, 9);
  const startTime = Date.now();

  console.log(`[${startTime}] [${requestId}] START: ${req.method} ${req.url}`);

  try {
    // Log URL parsing
    console.log(`[${Date.now()}] [${requestId}] URL parsing: ${req.url}`);

    // Call original handle
    console.log(`[${Date.now()}] [${requestId}] Calling original handle...`);
    await originalHandle(req, res);

    // Check if response was sent
    const endTime = Date.now();
    if (res.headersSent) {
      console.log(`[${endTime}] [${requestId}] SUCCESS: Response sent in ${endTime - startTime}ms`);
    } else {
      console.log(`[${endTime}] [${requestId}] WARNING: No response sent in ${endTime - startTime}ms`);
    }

  } catch (error) {
    const endTime = Date.now();
    console.log(`[${endTime}] [${requestId}] ERROR: ${error.message} in ${endTime - startTime}ms`);

    // Send error response if not already sent
    if (!res.headersSent) {
      console.log(`[${endTime}] [${requestId}] SENDING ERROR RESPONSE`);
      res.writeHead(500, { 'Content-Type': 'text/plain' });
      res.end('Internal Server Error');
    }
  }
};

const server = http.createServer(async (req, res) => {
  console.log(`\n=== NEW HTTP REQUEST ===`);
  await router.handle(req, res);
});

server.listen(7003, () => {
  console.log('Debug Coherent.js test server listening on port 7003');
  console.log('All features disabled, extensive logging enabled');
  console.log('Run: wrk -t1 -c5 -d3s http://localhost:7003/ to see detailed logs');
});

process.on('SIGTERM', () => server.close());
process.on('SIGINT', () => server.close());
