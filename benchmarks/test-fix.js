import http from 'http';
import { createRouter } from '../packages/api/src/index.js';

// Test the fixed createRouter usage
const router = createRouter(null, {
  enableSecurityHeaders: false,
  enableCORS: true
});

router.get('/', (req, res) => {
  return '<h1>Fixed Test</h1><p>Security headers optimization working!</p>';
});

console.log('Router configuration:');
console.log('enableSecurityHeaders:', router.enableSecurityHeaders);
console.log('enableCORS:', router.enableCORS);

const server = http.createServer(async (req, res) => {
  try {
    await router.handle(req, res);
  } catch (error) {
    if (!res.headersSent) {
      res.writeHead(500, { 'Content-Type': 'text/plain' });
      res.end('Internal Server Error');
    }
  }
});

server.listen(9005, () => {
  console.log('Fixed test server listening on port 9005');
  console.log('Test with: curl -v http://localhost:9005/');
  console.log('Should show only CORS headers, no security headers');
});

process.on('SIGTERM', () => server.close());
process.on('SIGINT', () => server.close());
