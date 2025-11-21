import http from 'http';
import { createRouter } from '../packages/api/src/index.js';

// Test smart routing implementation
console.log('Testing Smart Route Matching Implementation...');

// Create router with smart routing enabled
const router = createRouter(null, {
  enableSecurityHeaders: false,
  enableCORS: false,
  enableSmartRouting: true,
  enableRouteMetrics: true
});

// Add static routes (should use O(1) lookup)
router.get('/', (req, res) => {
  return '<h1>Static Route</h1><p>This should be fast!</p>';
});

router.get('/health', (req, res) => {
  return { status: 'ok', routing: 'smart' };
});

// Add dynamic routes (should use regex fallback)
router.get('/users/:id', (req, res) => {
  return { user: { id: req.params.id, routing: 'dynamic' } };
});

router.get('/posts/:postId/comments/:commentId', (req, res) => {
  return {
    postId: req.params.postId,
    commentId: req.params.commentId,
    routing: 'dynamic'
  };
});

console.log('Router configuration:');
console.log('Smart routing enabled:', router.enableSmartRouting);
console.log('Static routes count:', router.staticRoutes.size);
console.log('Total routes count:', router.routes.length);

// Display static routes
console.log('\\nStatic routes (O(1) lookup):');
for (const [key, route] of router.staticRoutes) {
  console.log(`  ${key} -> ${route.path}`);
}

// Display dynamic routes
console.log('\\nDynamic routes (regex matching):');
const dynamicRoutes = router.routes.filter(route => !route.isStatic);
for (const route of dynamicRoutes) {
  console.log(`  ${route.method}:${route.path}`);
}

const server = http.createServer(async (req, res) => {
  try {
    await router.handle(req, res);
  } catch (error) {
    console.error('Server error:', error);
    console.error('Error stack:', error.stack);
    if (!res.headersSent) {
      res.writeHead(500, { 'Content-Type': 'text/plain' });
      res.end(`Internal Server Error: ${error.message}`);
    }
  }
});

server.listen(3000, () => {
  console.log('\\nTest server listening on port 3000');
  console.log('\\nTest these endpoints:');
  console.log('curl http://localhost:3000/                    # Static route (fast)');
  console.log('curl http://localhost:3000/health               # Static route (fast)');
  console.log('curl http://localhost:3000/users/123            # Dynamic route (regex)');
  console.log('curl http://localhost:3000/posts/45/comments/78 # Dynamic route (regex)');
  console.log('\\nAfter testing, run the smart routing benchmark!');
});

process.on('SIGTERM', () => server.close());
process.on('SIGINT', () => server.close());
