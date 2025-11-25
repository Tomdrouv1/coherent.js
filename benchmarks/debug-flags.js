import http from 'http';
import { createRouter } from '../packages/api/src/index.js';

// Test router configuration flags with debug logging
console.log('Testing Coherent.js configuration flags...');

// Create router with CORS-only configuration
const router = createRouter({
  enableSecurityHeaders: false,
  enableCORS: true
});

// Add debug logging to check flags
console.log('Router configuration:');
console.log('enableSecurityHeaders:', router.enableSecurityHeaders);
console.log('enableCORS:', router.enableCORS);

// Wrap handle method to add debug logging
const originalHandle = router.handle.bind(router);
router.handle = async function(req, res, options = {}) {
  console.log('\\n=== Request Debug ===');
  console.log('enableSecurityHeaders:', this.enableSecurityHeaders);
  console.log('enableCORS:', this.enableCORS);
  console.log('Options:', options);

  const startTime = Date.now();

  try {
    await originalHandle(req, res, options);
    console.log('Request completed successfully');
  } catch (error) {
    console.error('Request failed:', error);
    throw error;
  }
};

router.get('/', (req, res) => {
  return '<h1>Debug Test</h1><p>Checking configuration flags</p>';
});

const server = http.createServer(async (req, res) => {
  try {
    await router.handle(req, res);
  } catch (error) {
    console.error('Server error:', error);
    if (!res.headersSent) {
      res.writeHead(500, { 'Content-Type': 'text/plain' });
      res.end('Internal Server Error');
    }
  }
});

server.listen(9004, () => {
  console.log('\\nDebug server listening on port 9004');
  console.log('Test with: curl -v http://localhost:9004/');
  console.log('This will show which configuration flags are actually being used');
});

process.on('SIGTERM', () => server.close());
process.on('SIGINT', () => server.close());
