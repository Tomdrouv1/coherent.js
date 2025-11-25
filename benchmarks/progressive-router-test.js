import http from 'http';

// Progressive router test - add features one by one
class ProgressiveRouter {
  constructor() {
    this.routes = new Map();
    this.enableMetrics = false;
    this.enableMiddleware = false;
    this.enableCORS = false;
    this.enableSecurity = false;
  }

  get(path, handler) {
    this.routes.set(`GET:${path}`, handler);
  }

  async handle(req, res) {
    try {
      // Feature 1: Advanced route matching (regex support)
      const key = `${req.method}:${req.url}`;
      const handler = this.routes.get(key);

      if (!handler) {
        res.writeHead(404, { 'Content-Type': 'text/plain' });
        res.end('Not Found');
        return;
      }

      // Feature 2: Middleware chains (disabled for now)
      if (this.enableMiddleware) {
        // Will add middleware later
      }

      // Feature 3: CORS headers (disabled for now)
      if (this.enableCORS) {
        res.setHeader('Access-Control-Allow-Origin', '*');
        res.setHeader('Access-Control-Allow-Methods', 'GET, POST, PUT, DELETE, PATCH, OPTIONS');
        res.setHeader('Access-Control-Allow-Headers', 'Content-Type, Authorization');
      }

      // Feature 4: Security headers (disabled for now)
      if (this.enableSecurity) {
        res.setHeader('X-Content-Type-Options', 'nosniff');
        res.setHeader('X-Frame-Options', 'DENY');
        res.setHeader('X-XSS-Protection', '1; mode=block');
        res.setHeader('Strict-Transport-Security', 'max-age=31536000; includeSubDomains');
        res.setHeader('Content-Security-Policy', "default-src 'self'; script-src 'self' 'unsafe-inline'; style-src 'self' 'unsafe-inline'");
        res.setHeader('Referrer-Policy', 'strict-origin-when-cross-origin');
      }

      // Execute handler
      const result = await handler(req, res);

      // Response handling
      if (result && !res.headersSent) {
        if (typeof result === 'object') {
          res.writeHead(200, { 'Content-Type': 'application/json' });
          res.end(JSON.stringify(result));
        } else if (typeof result === 'string') {
          res.writeHead(200, { 'Content-Type': 'text/html' });
          res.end(result);
        }
      }

      // Feature 5: Metrics recording (disabled for now)
      if (this.enableMetrics) {
        // Will add metrics later
      }

    } catch (error) {
      console.error('Router error:', error);
      if (!res.headersSent) {
        res.writeHead(500, { 'Content-Type': 'text/plain' });
        res.end('Internal Server Error');
      }
    }
  }
}

// Test function
function testRouter(features) {
  console.log(`\n=== Testing with features: ${features.join(', ')} ===`);

  const router = new ProgressiveRouter();

  // Enable features based on test
  router.enableMetrics = features.includes('metrics');
  router.enableMiddleware = features.includes('middleware');
  router.enableCORS = features.includes('cors');
  router.enableSecurity = features.includes('security');

  router.get('/', (req, res) => {
    return '<h1>Hello World</h1><p>Progressive router test</p>';
  });

  const server = http.createServer(async (req, res) => {
    await router.handle(req, res);
  });

  return server;
}

// Start with minimal router
console.log('Progressive Router Concurrency Test');
console.log('=====================================');

const server = testRouter(['baseline']); // Only basic features
server.listen(7003, () => {
  console.log('Test server listening on port 7003');
  console.log('Run: wrk -t2 -c10 -d3s http://localhost:7003/');
  console.log('Then modify the test to add features and re-run');
});

process.on('SIGTERM', () => server.close());
process.on('SIGINT', () => server.close());
