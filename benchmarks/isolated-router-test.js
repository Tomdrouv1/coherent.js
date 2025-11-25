import http from 'http';
import { createRouter } from '../packages/api/src/index.js';

// Test Coherent.js router with features systematically disabled
const router = createRouter();

// Disable problematic features
router.enableCompilation = false;  // Disable regex compilation
router.enableMetrics = false;      // Disable metrics (already fixed)
router.routeCache.clear();         // Clear route cache
router.maxCacheSize = 0;           // Disable caching

// Add simple route
router.get('/', (req, res) => {
  return '<h1>Hello World</h1><p>Isolated Coherent.js route test</p>';
});

// Test without Express wrapper (pure Node.js)
const server = http.createServer(async (req, res) => {
  try {
    await router.handle(req, res);
  } catch (error) {
    console.error('Router error:', error);
    if (!res.headersSent) {
      res.writeHead(500, { 'Content-Type': 'text/plain' });
      res.end('Internal Server Error');
    }
  }
});

server.listen(7003, () => {
  console.log('Isolated Coherent.js test server listening on port 7003');
  console.log('Features disabled:');
  console.log('- Regex compilation: false');
  console.log('- Route caching: disabled');
  console.log('- Metrics: disabled');
  console.log('- Express wrapper: removed');
  console.log('Run: wrk -t2 -c10 -d5s http://localhost:7003/');
});

process.on('SIGTERM', () => server.close());
process.on('SIGINT', () => server.close());
