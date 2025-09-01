/**
 * Advanced Router Features Demo - Complete Implementation
 * 
 * This example demonstrates all the advanced router features:
 * 1. Route compilation and optimization
 * 2. Route introspection and debugging
 * 3. Conditional middleware execution
 * 4. Route versioning support
 * 5. Performance metrics and monitoring
 */

import { createObjectRouter } from '../packages/api/src/router.js';

// Create router with all advanced features enabled
const router = createObjectRouter({}, {
  enableMetrics: true,
  enableCompilation: true,
  enableVersioning: true,
  defaultVersion: 'v1',
  versionHeader: 'api-version',
  maxCacheSize: 1000
});

// 1. CONDITIONAL MIDDLEWARE EXAMPLES

// Conditional middleware based on request method
router.use({
  condition: { method: 'POST' },
  middleware: async (req, res) => {
    console.log('🔒 POST request security check');
    req.securityChecked = true;
  },
  name: 'post-security'
});

// Conditional middleware based on path pattern
router.use({
  condition: { path: /^\/admin/ },
  middleware: async (req, res) => {
    console.log('👑 Admin route accessed');
    if (!req.headers.authorization) {
      res.writeHead(401, { 'Content-Type': 'application/json' });
      res.end(JSON.stringify({ error: 'Admin access requires authorization' }));
      return true; // Stop execution
    }
    req.isAdmin = true;
  },
  name: 'admin-auth'
});

// Conditional middleware based on custom function
router.use({
  condition: async (req, res) => {
    // Only run during business hours (9 AM - 5 PM)
    const hour = new Date().getHours();
    return hour >= 9 && hour < 17;
  },
  middleware: async (req, res) => {
    console.log('⏰ Business hours middleware active');
    req.businessHours = true;
  },
  name: 'business-hours'
});

// 2. VERSIONED ROUTES

// Version 1 API
router.addVersionedRoute('v1', 'GET', '/users', async (req, res) => {
  return {
    version: 'v1',
    users: [
      { id: 1, name: 'John Doe', email: 'john@example.com' }
    ],
    deprecated: true,
    message: 'This API version is deprecated. Please use v2.'
  };
}, { name: 'users-v1' });

// Version 2 API with enhanced data
router.addVersionedRoute('v2', 'GET', '/users', async (req, res) => {
  return {
    version: 'v2',
    users: [
      { 
        id: 1, 
        name: 'John Doe', 
        email: 'john@example.com',
        profile: {
          avatar: 'https://example.com/avatar.jpg',
          bio: 'Software developer'
        },
        createdAt: '2024-01-01T00:00:00Z'
      }
    ],
    pagination: {
      page: 1,
      limit: 10,
      total: 1
    }
  };
}, { name: 'users-v2' });

// Version 3 API with different structure
router.addVersionedRoute('v3', 'GET', '/users', async (req, res) => {
  return {
    version: 'v3',
    data: {
      users: [
        { 
          id: 1, 
          fullName: 'John Doe', 
          contact: { email: 'john@example.com' },
          metadata: {
            avatar: 'https://example.com/avatar.jpg',
            bio: 'Software developer',
            joinDate: '2024-01-01'
          }
        }
      ]
    },
    meta: {
      pagination: { page: 1, limit: 10, total: 1 },
      version: 'v3',
      timestamp: new Date().toISOString()
    }
  };
}, { name: 'users-v3' });

// 3. ADVANCED ROUTE PATTERNS WITH COMPILATION

// Complex parameter constraints
router.addRoute('GET', '/users/:id(\\d+)/posts/:postId(\\d+)', async (req, res) => {
  return {
    userId: parseInt(req.params.id),
    postId: parseInt(req.params.postId),
    post: {
      title: `Post ${req.params.postId} by User ${req.params.id}`,
      content: 'Lorem ipsum...'
    }
  };
}, { name: 'user-post' });

// Optional parameters with constraints
router.addRoute('GET', '/search/:query/:category(\\w+)?', async (req, res) => {
  return {
    query: req.params.query,
    category: req.params.category || 'all',
    results: []
  };
});

// Multi-segment wildcards
router.addRoute('GET', '/files/**', async (req, res) => {
  return {
    filePath: req.params.splat,
    type: 'file',
    exists: true
  };
});

// 4. DEBUGGING AND INTROSPECTION ENDPOINTS

router.addRoute('GET', '/debug/routes', async (req, res) => {
  return {
    routes: router.getRoutes(),
    debugInfo: router.getDebugInfo()
  };
}, { name: 'debug-routes' });

router.addRoute('GET', '/debug/test/:method/:path', async (req, res) => {
  const testResult = router.testRoute(req.params.method, `/${req.params.path}`);
  return {
    testResult,
    compilationStats: router.getCompilationStats()
  };
});

router.addRoute('GET', '/debug/metrics', async (req, res) => {
  return {
    metrics: router.getMetrics(),
    compilationStats: router.getCompilationStats()
  };
}, { name: 'debug-metrics' });

// 5. PERFORMANCE MONITORING ENDPOINTS

router.addRoute('GET', '/health', async (req, res) => {
  const metrics = router.getMetrics();
  const compilationStats = router.getCompilationStats();
  
  return {
    status: 'healthy',
    uptime: process.uptime(),
    memory: process.memoryUsage(),
    performance: {
      totalRequests: metrics.requests,
      averageResponseTime: metrics.averageResponseTime,
      cacheHitRate: metrics.cacheHitRate,
      compilationHitRate: metrics.compilationHitRate,
      errorRate: metrics.errors / metrics.requests * 100
    },
    compilation: {
      enabled: compilationStats.compilationEnabled,
      routesCompiled: `${compilationStats.compiledRoutes}/${compilationStats.totalRoutes}`,
      cacheSize: compilationStats.compilationCacheSize
    },
    versioning: {
      enabled: router.enableVersioning,
      defaultVersion: router.defaultVersion,
      versionRequests: Object.fromEntries(metrics.versionRequests || [])
    }
  };
}, { name: 'health-check' });

// 6. ADMIN ROUTES WITH CONDITIONAL ACCESS

router.group('/admin', [], () => {
  router.addRoute('GET', '/dashboard', async (req, res) => {
    if (!req.isAdmin) {
      res.writeHead(403, { 'Content-Type': 'application/json' });
      res.end(JSON.stringify({ error: 'Admin access required' }));
      return;
    }
    
    return {
      dashboard: 'Admin Dashboard',
      stats: {
        totalRoutes: router.routes.length,
        cacheSize: router.routeCache.size,
        uptime: process.uptime()
      }
    };
  });
  
  router.addRoute('POST', '/cache/clear', async (req, res) => {
    if (!req.isAdmin) {
      res.writeHead(403, { 'Content-Type': 'application/json' });
      res.end(JSON.stringify({ error: 'Admin access required' }));
      return;
    }
    
    router.clearCache();
    router.clearCompilationCache();
    
    return {
      message: 'All caches cleared successfully',
      timestamp: new Date().toISOString()
    };
  });
});

// 7. URL GENERATION EXAMPLES

router.addRoute('GET', '/urls', async (req, res) => {
  return {
    generatedUrls: {
      usersV1: router.url('users-v1'),
      usersV2: router.url('users-v2'),
      usersV3: router.url('users-v3'),
      userPost: router.url('user-post', { id: '123', postId: '456' }),
      healthCheck: router.url('health-check'),
      debugRoutes: router.url('debug-routes')
    }
  };
});

// Create and start server
const server = router.createServer();

const PORT = process.env.PORT || 3002;
server.listen(PORT, () => {
  console.log(`🚀 Advanced Router Features Demo running on http://localhost:${PORT}`);
  console.log('\n📋 Try these advanced features:');
  console.log('\n🔄 VERSIONING:');
  console.log(`   GET  http://localhost:${PORT}/users                    - Default version (v1)`);
  console.log(`   GET  http://localhost:${PORT}/users -H "api-version: v2" - Version 2 API`);
  console.log(`   GET  http://localhost:${PORT}/users -H "api-version: v3" - Version 3 API`);
  console.log(`   GET  http://localhost:${PORT}/v2/users                 - Version in URL`);
  
  console.log('\n🔍 DEBUGGING & INTROSPECTION:');
  console.log(`   GET  http://localhost:${PORT}/debug/routes             - All registered routes`);
  console.log(`   GET  http://localhost:${PORT}/debug/test/GET/users     - Test route matching`);
  console.log(`   GET  http://localhost:${PORT}/debug/metrics            - Performance metrics`);
  
  console.log('\n⚡ PERFORMANCE & HEALTH:');
  console.log(`   GET  http://localhost:${PORT}/health                   - Health check with metrics`);
  console.log(`   GET  http://localhost:${PORT}/urls                     - Generated URLs`);
  
  console.log('\n🔒 CONDITIONAL MIDDLEWARE:');
  console.log(`   GET  http://localhost:${PORT}/admin/dashboard          - Admin route (needs auth)`);
  console.log(`   POST http://localhost:${PORT}/admin/cache/clear        - Clear caches (admin)`);
  
  console.log('\n🎯 ADVANCED PATTERNS:');
  console.log(`   GET  http://localhost:${PORT}/users/123/posts/456      - Parameter constraints`);
  console.log(`   GET  http://localhost:${PORT}/search/javascript/web    - Optional parameters`);
  console.log(`   GET  http://localhost:${PORT}/files/docs/api/guide.md  - Multi-segment wildcards`);
  
  console.log('\n🔐 Add Authorization header for admin routes: Authorization: Bearer admin-token');
});

export default router;
