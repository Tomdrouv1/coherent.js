import http from 'http';

// Create a minimal router without any features
class MinimalRouter {
  constructor() {
    this.routes = new Map();
  }

  get(path, handler) {
    this.routes.set(`GET:${path}`, handler);
  }

  async handle(req, res) {
    try {
      const key = `${req.method}:${req.url}`;
      const handler = this.routes.get(key);

      if (handler) {
        const result = await handler(req, res);

        // Minimal response handling - no metrics, no middleware
        if (result && !res.headersSent) {
          res.writeHead(200, { 'Content-Type': 'text/html' });
          res.end(result);
        }
      } else {
        res.writeHead(404, { 'Content-Type': 'text/plain' });
        res.end('Not Found');
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

// Test the minimal router
const router = new MinimalRouter();
router.get('/', (req, res) => {
  return '<h1>Hello World</h1><p>Minimal router test</p>';
});

const server = http.createServer(async (req, res) => {
  console.log(`Request: ${req.method} ${req.url}`);
  await router.handle(req, res);
});

server.listen(7003, () => {
  console.log('Minimal router test server listening on port 7003');
  console.log('Test with: curl http://localhost:7003/');
  console.log('Load test with: wrk -t2 -c10 -d5s http://localhost:7003/');
});

process.on('SIGTERM', () => server.close());
process.on('SIGINT', () => server.close());
