import { describe, it, expect, beforeEach, afterEach } from 'vitest';
import http from 'http';
import { createRouter } from '../src/index.js';

describe('Smart Route Matching Optimization', () => {
  let server;
  let router;

  afterEach(async () => {
    if (server) {
      await new Promise((resolve) => {
        server.close(resolve);
      });
    }
  });

  async function makeRequest(port = 3000, path = '/') {
    return new Promise((resolve, reject) => {
      const req = http.get(`http://localhost:${port}${path}`, (res) => {
        let data = '';
        res.on('data', chunk => data += chunk);
        res.on('end', () => {
          resolve({
            statusCode: res.statusCode,
            headers: res.headers,
            body: data
          });
        });
      });

      req.on('error', reject);
      req.setTimeout(1000, () => {
        req.destroy();
        reject(new Error('Request timeout'));
      });
    });
  }

  describe('Static Route Detection', () => {
    it('should correctly identify static routes', () => {
      const router = createRouter();

      // Static routes should be detected and stored in staticRoutes Map
      router.get('/', () => 'home');
      router.get('/health', () => 'ok');
      router.get('/api/status', () => 'status');

      expect(router.staticRoutes.size).toBe(3);
      expect(router.staticRoutes.has('GET:/')).toBe(true);
      expect(router.staticRoutes.has('GET:/health')).toBe(true);
      expect(router.staticRoutes.has('GET:/api/status')).toBe(true);
    });

    it('should correctly identify dynamic routes', () => {
      const router = createRouter();

      // Dynamic routes should NOT be stored in staticRoutes Map
      router.get('/users/:id', () => 'user');
      router.get('/posts/:id/comments/:commentId', () => 'comment');
      router.get('/files/*', () => 'file');

      expect(router.staticRoutes.size).toBe(0);
      expect(router.routes.length).toBe(3);

      // Check that dynamic routes are marked correctly
      const dynamicRoutes = router.routes.filter(route => !route.isStatic);
      expect(dynamicRoutes.length).toBe(3);
    });

    it('should handle mixed static and dynamic routes correctly', () => {
      const router = createRouter();

      // Mix of static and dynamic routes
      router.get('/', () => 'home');                    // static
      router.get('/users/:id', () => 'user');           // dynamic
      router.get('/health', () => 'ok');                // static
      router.get('/posts/:id', () => 'post');           // dynamic
      router.get('/api/status', () => 'status');        // static

      expect(router.staticRoutes.size).toBe(3);
      expect(router.routes.length).toBe(5);

      // Verify static routes
      expect(router.staticRoutes.has('GET:/')).toBe(true);
      expect(router.staticRoutes.has('GET:/health')).toBe(true);
      expect(router.staticRoutes.has('GET:/api/status')).toBe(true);

      // Verify dynamic routes
      const dynamicRoutes = router.routes.filter(route => !route.isStatic);
      expect(dynamicRoutes.length).toBe(2);
      expect(dynamicRoutes[0].path).toBe('/users/:id');
      expect(dynamicRoutes[1].path).toBe('/posts/:id');
    });
  });

  describe('Smart Routing Configuration', () => {
    it('should enable smart routing by default', () => {
      const router = createRouter();
      expect(router.enableSmartRouting).toBe(true);
    });

    it('should allow disabling smart routing', () => {
      const router = createRouter(null, { enableSmartRouting: false });
      expect(router.enableSmartRouting).toBe(false);
    });

    it('should allow enabling route metrics', () => {
      const router = createRouter(null, {
        enableSmartRouting: true,
        enableRouteMetrics: true,
        enableMetrics: true
      });
      expect(router.enableSmartRouting).toBe(true);
      expect(router.enableRouteMetrics).toBe(true);
    });
  });

  describe('Static Route Performance', () => {
    beforeEach(() => {
      router = createRouter(null, {
        enableSecurityHeaders: false,
        enableCORS: false,
        enableSmartRouting: true
      });

      // Add static routes
      router.get('/', () => '<h1>Home</h1>');
      router.get('/health', () => ({ status: 'ok' }));
      router.get('/api/status', () => ({ api: 'running' }));

      server = http.createServer(async (_req, _res) => {
        try {
          await router.handle(_req, _res);
        } catch {
          if (!_res.headersSent) {
            _res.writeHead(500, { 'Content-Type': 'text/plain' });
            _res.end('Internal Server Error');
          }
        }
      });
    });

    it('should handle static routes with O(1) lookup', async () => {
      await new Promise((resolve) => server.listen(3100, resolve));

      const response = await makeRequest(3100);

      expect(response.statusCode).toBe(200);
      expect(response.body).toBe('<h1>Home</h1>');
      expect(response.headers['content-type']).toBe('text/html');
    });

    it('should handle JSON responses from static routes', async () => {
      await new Promise((resolve) => server.listen(3101, resolve));

      const response = await makeRequest(3101, '/health');

      expect(response.statusCode).toBe(200);
      expect(response.body).toBe('{"status":"ok"}');
      expect(response.headers['content-type']).toBe('application/json');
    });

    it('should handle multiple static routes correctly', async () => {
      await new Promise((resolve) => server.listen(3102, resolve));

      const homeResponse = await makeRequest(3102, '/');
      const healthResponse = await makeRequest(3102, '/health');
      const statusResponse = await makeRequest(3102, '/api/status');

      expect(homeResponse.body).toBe('<h1>Home</h1>');
      expect(healthResponse.body).toBe('{"status":"ok"}');
      expect(statusResponse.body).toBe('{"api":"running"}');
    });
  });

  describe('Dynamic Route Fallback', () => {
    beforeEach(() => {
      router = createRouter(null, {
        enableSecurityHeaders: false,
        enableCORS: false,
        enableSmartRouting: true
      });

      // Add dynamic routes
      router.get('/users/:id', (req, _res) => ({
        userId: req.params.id,
        type: 'dynamic'
      }));
      router.get('/posts/:postId/comments/:commentId', (req, _res) => ({
        postId: req.params.postId,
        commentId: req.params.commentId,
        type: 'dynamic'
      }));

      server = http.createServer(async (_req, _res) => {
        try {
          await router.handle(_req, _res);
        } catch {
          if (!_res.headersSent) {
            _res.writeHead(500, { 'Content-Type': 'text/plain' });
            _res.end('Internal Server Error');
          }
        }
      });
    });

    it('should handle dynamic routes with regex fallback', async () => {
      await new Promise((resolve) => server.listen(3103, resolve));

      const response = await makeRequest(3103, '/users/123');

      expect(response.statusCode).toBe(200);
      expect(response.body).toBe('{"userId":"123","type":"dynamic"}');
    });

    it('should handle complex dynamic routes with multiple parameters', async () => {
      await new Promise((resolve) => server.listen(3104, resolve));

      const response = await makeRequest(3104, '/posts/45/comments/78');

      expect(response.statusCode).toBe(200);
      expect(response.body).toBe('{"postId":"45","commentId":"78","type":"dynamic"}');
    });
  });

  describe('Mixed Static and Dynamic Routing', () => {
    beforeEach(() => {
      router = createRouter(null, {
        enableSecurityHeaders: false,
        enableCORS: false,
        enableSmartRouting: true
      });

      // Mix of static and dynamic routes
      router.get('/', () => '<h1>Home</h1>');
      router.get('/users/:id', (req, _res) => ({ userId: req.params.id }));
      router.get('/health', () => ({ status: 'ok' }));
      router.get('/posts/:id', (req, _res) => ({ postId: req.params.id }));

      server = http.createServer(async (_req, _res) => {
        try {
          await router.handle(_req, _res);
        } catch {
          if (!_res.headersSent) {
            _res.writeHead(500, { 'Content-Type': 'text/plain' });
            _res.end('Internal Server Error');
          }
        }
      });
    });

    it('should route static routes using O(1) lookup', async () => {
      await new Promise((resolve) => server.listen(3105, resolve));

      const homeResponse = await makeRequest(3105, '/');
      const healthResponse = await makeRequest(3105, '/health');

      expect(homeResponse.body).toBe('<h1>Home</h1>');
      expect(healthResponse.body).toBe('{"status":"ok"}');
    });

    it('should route dynamic routes using regex fallback', async () => {
      await new Promise((resolve) => server.listen(3106, resolve));

      const userResponse = await makeRequest(3106, '/users/456');
      const postResponse = await makeRequest(3106, '/posts/789');

      expect(userResponse.body).toBe('{"userId":"456"}');
      expect(postResponse.body).toBe('{"postId":"789"}');
    });
  });

  describe('Backward Compatibility', () => {
    it('should work with smart routing disabled', async () => {
      const router = createRouter(null, {
        enableSecurityHeaders: false,
        enableCORS: false,
        enableSmartRouting: false // Disable smart routing
      });

      router.get('/', () => '<h1>Home</h1>');
      router.get('/users/:id', (req, _res) => ({ userId: req.params.id }));

      const server = http.createServer(async (_req, _res) => {
        try {
          await router.handle(_req, _res);
        } catch {
          if (!_res.headersSent) {
            _res.writeHead(500, { 'Content-Type': 'text/plain' });
            _res.end('Internal Server Error');
          }
        }
      });

      await new Promise((resolve) => server.listen(3107, resolve));

      // Should still work with regex-only routing
      const staticResponse = await makeRequest(3107, '/');
      const dynamicResponse = await makeRequest(3107, '/users/123');

      expect(staticResponse.body).toBe('<h1>Home</h1>');
      expect(dynamicResponse.body).toBe('{"userId":"123"}');

      // No static routes should be stored when smart routing is disabled
      expect(router.staticRoutes.size).toBe(0);

      server.close();
    });

    it('should maintain all existing router functionality', async () => {
      const router = createRouter(null, {
        enableSecurityHeaders: false,
        enableCORS: false,
        enableSmartRouting: true
      });

      // Test all HTTP methods
      router.get('/', () => 'GET');
      router.post('/', () => 'POST');
      router.put('/', () => 'PUT');
      router.patch('/', () => 'PATCH');
      router.delete('/', () => 'DELETE');
      router.options('/', () => 'OPTIONS');

      const server = http.createServer(async (_req, _res) => {
        try {
          await router.handle(_req, _res);
        } catch {
          if (!_res.headersSent) {
            _res.writeHead(500, { 'Content-Type': 'text/plain' });
            _res.end('Internal Server Error');
          }
        }
      });

      await new Promise((resolve) => server.listen(3108, resolve));

      // All methods should work with static routes
      const getResponse = await makeRequest(3108, '/');

      expect(getResponse.statusCode).toBe(200);
      expect(getResponse.body).toBe('GET');

      // All static routes should be stored
      expect(router.staticRoutes.size).toBe(6);
      expect(router.staticRoutes.has('GET:/')).toBe(true);
      expect(router.staticRoutes.has('POST:/')).toBe(true);
      expect(router.staticRoutes.has('PUT:/')).toBe(true);
      expect(router.staticRoutes.has('PATCH:/')).toBe(true);
      expect(router.staticRoutes.has('DELETE:/')).toBe(true);
      expect(router.staticRoutes.has('OPTIONS:/')).toBe(true);

      server.close();
    });
  });

  describe('Route Metrics', () => {
    it('should track static and dynamic route matches when enabled', async () => {
      const router = createRouter(null, {
        enableSecurityHeaders: false,
        enableCORS: false,
        enableSmartRouting: true,
        enableRouteMetrics: true,
        enableMetrics: true
      });

      router.get('/', () => 'static');
      router.get('/users/:id', (req, _res) => ({ userId: req.params.id }));

      const server = http.createServer(async (_req, _res) => {
        try {
          await router.handle(_req, _res);
        } catch {
          if (!_res.headersSent) {
            _res.writeHead(500, { 'Content-Type': 'text/plain' });
            _res.end('Internal Server Error');
          }
        }
      });

      await new Promise((resolve) => server.listen(3109, resolve));

      // Make requests to static and dynamic routes
      await makeRequest(3109, '/');
      await makeRequest(3109, '/users/123');

      // Check metrics
      expect(router.metrics.staticRouteMatches).toBe(1);
      expect(router.metrics.dynamicRouteMatches).toBe(1);

      server.close();
    });

    it('should not track metrics when disabled', async () => {
      const router = createRouter(null, {
        enableSecurityHeaders: false,
        enableCORS: false,
        enableSmartRouting: true,
        enableRouteMetrics: false,
        enableMetrics: false
      });

      router.get('/', () => 'static');

      const server = http.createServer(async (_req, _res) => {
        try {
          await router.handle(_req, _res);
        } catch {
          if (!_res.headersSent) {
            _res.writeHead(500, { 'Content-Type': 'text/plain' });
            _res.end('Internal Server Error');
          }
        }
      });

      await new Promise((resolve) => server.listen(3110, resolve));

      await makeRequest(3110, '/');

      // Metrics should not exist when disabled
      expect(router.metrics).toBeUndefined();

      server.close();
    });
  });
});
