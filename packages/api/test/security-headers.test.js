import { describe, it, expect, beforeEach, afterEach } from 'vitest';
import http from 'http';
import { createRouter } from '../src/index.js';

describe('Security Headers Optimization', () => {
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

  describe('Default Behavior (Backward Compatibility)', () => {
    beforeEach(() => {
      // Test default router (should have all headers enabled)
      router = createRouter();
      router.get('/', (_req, _res) => {
        return '<h1>Test</h1>';
      });

      server = http.createServer(async (_req, _res) => {
        try {
          await router.handle(_req, _res);
        } catch (_error) {
          if (!_res.headersSent) {
            _res.writeHead(500, { 'Content-Type': 'text/plain' });
            _res.end('Internal Server Error');
          }
        }
      });
    });

    it('should enable all security headers by default for backward compatibility', async () => {
      await new Promise((resolve) => server.listen(3000, resolve));

      const response = await makeRequest();

      expect(response.statusCode).toBe(200);
      expect(response.headers['access-control-allow-origin']).toBe('http://localhost:3000');
      expect(response.headers['x-content-type-options']).toBe('nosniff');
      expect(response.headers['x-frame-options']).toBe('DENY');
      expect(response.headers['x-xss-protection']).toBe('1; mode=block');
      expect(response.headers['strict-transport-security']).toBe('max-age=31536000; includeSubDomains');
      expect(response.headers['content-security-policy']).toContain("default-src 'self'");
      expect(response.headers['referrer-policy']).toBe('strict-origin-when-cross-origin');
      expect(response.body).toBe('<h1>Test</h1>');
    });

    it('should have correct default configuration flags', () => {
      expect(router.enableSecurityHeaders).toBe(true);
      expect(router.enableCORS).toBe(true);
    });
  });

  describe('Security Headers Disabled', () => {
    beforeEach(() => {
      router = createRouter(null, {
        enableSecurityHeaders: false,
        enableCORS: false
      });

      router.get('/', (_req, _res) => {
        return '<h1>Minimal Headers</h1>';
      });

      server = http.createServer(async (_req, _res) => {
        try {
          await router.handle(_req, _res);
        } catch (_error) {
          if (!_res.headersSent) {
            _res.writeHead(500, { 'Content-Type': 'text/plain' });
            _res.end('Internal Server Error');
          }
        }
      });
    });

    it('should disable all security and CORS headers when both flags are false', async () => {
      await new Promise((resolve) => server.listen(3001, resolve));

      const response = await makeRequest(3001);

      expect(response.statusCode).toBe(200);
      expect(response.headers['access-control-allow-origin']).toBeUndefined();
      expect(response.headers['x-content-type-options']).toBeUndefined();
      expect(response.headers['x-frame-options']).toBeUndefined();
      expect(response.headers['x-xss-protection']).toBeUndefined();
      expect(response.headers['strict-transport-security']).toBeUndefined();
      expect(response.headers['content-security-policy']).toBeUndefined();
      expect(response.headers['referrer-policy']).toBeUndefined();
      expect(response.body).toBe('<h1>Minimal Headers</h1>');
    });

    it('should have correct configuration flags when disabled', () => {
      expect(router.enableSecurityHeaders).toBe(false);
      expect(router.enableCORS).toBe(false);
    });
  });

  describe('CORS Only Mode', () => {
    beforeEach(() => {
      router = createRouter(null, {
        enableSecurityHeaders: false,
        enableCORS: true
      });

      router.get('/', (_req, _res) => {
        return '<h1>CORS Only</h1>';
      });

      server = http.createServer(async (_req, _res) => {
        try {
          await router.handle(_req, _res);
        } catch (_error) {
          if (!_res.headersSent) {
            _res.writeHead(500, { 'Content-Type': 'text/plain' });
            _res.end('Internal Server Error');
          }
        }
      });
    });

    it('should include only CORS headers when security headers are disabled but CORS is enabled', async () => {
      await new Promise((resolve) => server.listen(3002, resolve));

      const response = await makeRequest(3002);

      expect(response.statusCode).toBe(200);
      expect(response.headers['access-control-allow-origin']).toBe('http://localhost:3000');
      expect(response.headers['access-control-allow-methods']).toBe('GET, POST, PUT, DELETE, PATCH, OPTIONS');
      expect(response.headers['access-control-allow-headers']).toBe('Content-Type, Authorization');
      expect(response.headers['access-control-allow-credentials']).toBe('true');

      // Security headers should be absent
      expect(response.headers['x-content-type-options']).toBeUndefined();
      expect(response.headers['x-frame-options']).toBeUndefined();
      expect(response.headers['x-xss-protection']).toBeUndefined();
      expect(response.headers['strict-transport-security']).toBeUndefined();
      expect(response.headers['content-security-policy']).toBeUndefined();
      expect(response.headers['referrer-policy']).toBeUndefined();

      expect(response.body).toBe('<h1>CORS Only</h1>');
    });

    it('should have correct configuration flags for CORS-only mode', () => {
      expect(router.enableSecurityHeaders).toBe(false);
      expect(router.enableCORS).toBe(true);
    });
  });

  describe('Edge Cases and Configuration', () => {
    it('should handle undefined options correctly', () => {
      const router = createRouter(null, {});

      expect(router.enableSecurityHeaders).toBe(true);
      expect(router.enableCORS).toBe(true);
    });

    it('should handle missing options object correctly', () => {
      const router = createRouter();

      expect(router.enableSecurityHeaders).toBe(true);
      expect(router.enableCORS).toBe(true);
    });

    it('should handle explicit boolean values correctly', () => {
      const router1 = createRouter(null, { enableSecurityHeaders: true, enableCORS: false });
      const router2 = createRouter(null, { enableSecurityHeaders: false, enableCORS: true });

      expect(router1.enableSecurityHeaders).toBe(true);
      expect(router1.enableCORS).toBe(false);
      expect(router2.enableSecurityHeaders).toBe(false);
      expect(router2.enableCORS).toBe(true);
    });

    it('should maintain backward compatibility with routeConfig parameter', () => {
      const router = createRouter({
        '/test': {
          get: () => 'test'
        }
      }, {
        enableSecurityHeaders: false,
        enableCORS: false
      });

      expect(router.enableSecurityHeaders).toBe(false);
      expect(router.enableCORS).toBe(false);
    });
  });

  describe('Performance and Response Handling', () => {
    it('should handle string responses correctly with minimal headers', async () => {
      const router = createRouter(null, {
        enableSecurityHeaders: false,
        enableCORS: false
      });

      router.get('/', (_req, _res) => {
        return '<h1>String Response</h1>';
      });

      const server = http.createServer(async (_req, _res) => {
        try {
          await router.handle(_req, _res);
        } catch (_error) {
          if (!_res.headersSent) {
            _res.writeHead(500, { 'Content-Type': 'text/plain' });
            _res.end('Internal Server Error');
          }
        }
      });

      await new Promise((resolve) => server.listen(3003, resolve));

      const response = await makeRequest(3003);

      expect(response.statusCode).toBe(200);
      expect(response.headers['content-type']).toBe('text/html');
      expect(response.body).toBe('<h1>String Response</h1>');

      server.close();
    });

    it('should handle object responses correctly with minimal headers', async () => {
      const router = createRouter(null, {
        enableSecurityHeaders: false,
        enableCORS: false
      });

      router.get('/', (_req, _res) => {
        return { message: 'Object Response' };
      });

      const server = http.createServer(async (_req, _res) => {
        try {
          await router.handle(_req, _res);
        } catch (_error) {
          if (!_res.headersSent) {
            _res.writeHead(500, { 'Content-Type': 'text/plain' });
            _res.end('Internal Server Error');
          }
        }
      });

      await new Promise((resolve) => server.listen(3004, resolve));

      const response = await makeRequest(3004);

      expect(response.statusCode).toBe(200);
      expect(response.headers['content-type']).toBe('application/json');
      expect(response.body).toBe('{"message":"Object Response"}');

      server.close();
    });
  });

  describe('OPTIONS Request Handling', () => {
    it('should handle OPTIONS requests correctly with CORS enabled', async () => {
      const router = createRouter(null, {
        enableSecurityHeaders: false,
        enableCORS: true
      });

      const server = http.createServer(async (_req, _res) => {
        try {
          await router.handle(_req, _res);
        } catch (_error) {
          if (!_res.headersSent) {
            _res.writeHead(500, { 'Content-Type': 'text/plain' });
            _res.end('Internal Server Error');
          }
        }
      });

      await new Promise((resolve) => server.listen(3005, resolve));

      const response = await new Promise((resolve, reject) => {
        const req = http.request({
          hostname: 'localhost',
          port: 3005,
          method: 'OPTIONS',
          path: '/'
        }, (res) => {
          resolve({
            statusCode: res.statusCode,
            headers: res.headers
          });
        });

        req.on('error', reject);
        req.end();
      });

      expect(response.statusCode).toBe(204);
      expect(response.headers['access-control-allow-origin']).toBe('http://localhost:3000');
      expect(response.headers['access-control-allow-methods']).toBe('GET, POST, PUT, DELETE, PATCH, OPTIONS');

      server.close();
    });
  });
});
