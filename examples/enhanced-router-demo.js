/**
 * Enhanced Router Demo - Showcasing all new features
 * 
 * This example demonstrates:
 * - Route caching for performance
 * - Parameter constraints (:id(\d+))
 * - Named routes for URL generation
 * - Route groups with shared middleware
 * - Wildcard routes (* and **)
 * - Performance metrics collection
 */

import { createObjectRouter } from '../packages/api/src/router.js';

// Create router with enhanced features enabled
const router = createObjectRouter({}, {
  enableMetrics: true,
  maxCacheSize: 500,
  corsOrigin: '*',
  rateLimit: { windowMs: 60000, maxRequests: 100 }
});

// 1. Global middleware
router.use(async (req, res) => {
  console.log(`🔍 Global middleware: ${req.method} ${req.url}`);
  req.startTime = Date.now();
});

// 2. Named routes for URL generation
router.addRoute('GET', '/', async (req, res) => {
  return { 
    message: 'Welcome to Enhanced Router!',
    features: ['caching', 'constraints', 'named-routes', 'groups', 'wildcards', 'metrics']
  };
}, { name: 'home' });

// 3. Parameter constraints - only numeric IDs
router.addRoute('GET', '/users/:id(\\d+)', async (req, res) => {
  return { 
    user: { 
      id: parseInt(req.params.id),
      name: `User ${req.params.id}` 
    }
  };
}, { name: 'user-detail' });

// 4. Optional parameters
router.addRoute('GET', '/posts/:id/:slug?', async (req, res) => {
  return {
    post: {
      id: req.params.id,
      slug: req.params.slug || 'untitled'
    }
  };
});

// 5. Route groups with shared middleware
const authMiddleware = async (req, res) => {
  // Simulate auth check
  if (!req.headers.authorization) {
    res.writeHead(401, { 'Content-Type': 'application/json' });
    res.end(JSON.stringify({ error: 'Unauthorized' }));
    return true; // Stop execution
  }
  req.user = { id: 1, role: 'admin' };
};

const logMiddleware = async (req, res) => {
  console.log(`📝 Admin action: ${req.method} ${req.url}`);
};

router.group('/admin', [authMiddleware, logMiddleware], () => {
  router.addRoute('GET', '/dashboard', async (req, res) => {
    return { 
      dashboard: 'Admin Dashboard',
      user: req.user 
    };
  });
  
  router.addRoute('GET', '/users', async (req, res) => {
    return { 
      users: [
        { id: 1, name: 'Admin User' },
        { id: 2, name: 'Regular User' }
      ]
    };
  });
});

// 6. Wildcard routes
router.addRoute('GET', '/files/*', async (req, res) => {
  return { 
    file: req.params.splat,
    type: 'single-segment-wildcard'
  };
});

router.addRoute('GET', '/docs/**', async (req, res) => {
  return { 
    path: req.params.splat,
    type: 'multi-segment-wildcard'
  };
});

// 7. API group with versioning
router.group('/api/v1', [], () => {
  router.addRoute('GET', '/health', async (req, res) => {
    const metrics = router.getMetrics();
    return {
      status: 'healthy',
      version: '1.0.0',
      uptime: process.uptime(),
      metrics: {
        requests: metrics.requests,
        cacheHitRate: metrics.cacheHitRate,
        avgResponseTime: metrics.averageResponseTime
      }
    };
  }, { name: 'health-check' });
});

// 8. Metrics endpoint
router.addRoute('GET', '/metrics', async (req, res) => {
  return router.getMetrics();
}, { name: 'metrics' });

// 9. URL generation endpoint
router.addRoute('GET', '/urls', async (req, res) => {
  return {
    home: router.url('home'),
    userDetail: router.url('user-detail', { id: '123' }),
    healthCheck: router.url('health-check'),
    metrics: router.url('metrics')
  };
});

// Create and start server
const server = router.createServer();

const PORT = process.env.PORT || 3001;
server.listen(PORT, () => {
  console.log(`🚀 Enhanced Router Demo running on http://localhost:${PORT}`);
  console.log('\n📋 Try these endpoints:');
  console.log(`   GET  http://localhost:${PORT}/                    - Home page`);
  console.log(`   GET  http://localhost:${PORT}/users/123           - User detail (numeric ID only)`);
  console.log(`   GET  http://localhost:${PORT}/users/abc           - 404 (non-numeric ID)`);
  console.log(`   GET  http://localhost:${PORT}/posts/1/my-post     - Post with slug`);
  console.log(`   GET  http://localhost:${PORT}/posts/1             - Post without slug`);
  console.log(`   GET  http://localhost:${PORT}/admin/dashboard     - Admin (needs auth header)`);
  console.log(`   GET  http://localhost:${PORT}/files/image.jpg     - Single wildcard`);
  console.log(`   GET  http://localhost:${PORT}/docs/api/users      - Multi wildcard`);
  console.log(`   GET  http://localhost:${PORT}/api/v1/health       - Health check with metrics`);
  console.log(`   GET  http://localhost:${PORT}/metrics             - Performance metrics`);
  console.log(`   GET  http://localhost:${PORT}/urls               - Generated URLs`);
  console.log('\n🔐 For admin endpoints, add header: Authorization: Bearer token');
});

export default router;
