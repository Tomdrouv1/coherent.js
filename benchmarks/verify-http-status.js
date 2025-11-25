import http from 'http';
import { createRouter } from '../packages/api/src/index.js';

// Create router to test actual HTTP status codes
const router = createRouter();
router.enableCompilation = false;
router.enableMetrics = false;
router.routeCache.clear();
router.maxCacheSize = 0;

router.get('/', (req, res) => {
  return '<h1>Hello World</h1><p>HTTP status verification test</p>';
});

// Wrap router to log actual HTTP status codes
const originalHandle = router.handle.bind(router);
router.handle = async function(req, res) {
  const originalWriteHead = res.writeHead.bind(res);
  const originalEnd = res.end.bind(res);

  res.writeHead = function(statusCode, headers) {
    console.log(`[HTTP] Writing status: ${statusCode}`, headers);
    return originalWriteHead(statusCode, headers);
  };

  res.end = function(data) {
    console.log(`[HTTP] Ending response with ${data ? data.length : 0} bytes`);
    return originalEnd(data);
  };

  await originalHandle(req, res);
};

const server = http.createServer(async (req, res) => {
  await router.handle(req, res);
});

server.listen(7003, () => {
  console.log('HTTP status verification server listening on port 7003');
  console.log('Test 1: curl -v http://localhost:7003/');
  console.log('Test 2: wrk -t1 -c5 -d3s http://localhost:7003/');
  console.log('Test 3: Run curl simultaneously during wrk to capture actual responses');
});

process.on('SIGTERM', () => server.close());
process.on('SIGINT', () => server.close());
