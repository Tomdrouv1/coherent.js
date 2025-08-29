/**
 * Tests for Enhanced Object-based Router
 */

import { describe, it, expect } from 'vitest';
import { createObjectRouter } from '../../../src/api/router.js';

// Mock request and response objects for Node.js HTTP server
function createMockReq(method = 'GET', url = '/', body = {}) {
  return {
    method,
    url,
    body,
    headers: {},
    params: {},
    query: {},
    connection: { remoteAddress: '127.0.0.1' }
  };
}

function createMockRes() {
  let statusCode = 200;
  let headers = {};
  let responseData = '';
  
  return {
    writeHead: (code, hdrs = {}) => {
      statusCode = code;
      headers = { ...headers, ...hdrs };
    },
    setHeader: (name, value) => {
      headers[name] = value;
    },
    end: (data = '') => {
      responseData = data;
    },
    getStatusCode: () => statusCode,
    getHeaders: () => headers,
    getData: () => responseData
  };
}

describe('Enhanced Object Router', () => {
  it('should create router with basic routes', () => {
    const simpleRoutes = {
      get: {
        path: '/',
        handler: () => ({ message: 'Hello World' })
      },
      
      api: {
        users: {
          get: {
            handler: () => ({ users: [] })
          },
          
          post: {
            handler: (req) => ({ created: req.body })
          }
        }
      }
    };

    const router = createObjectRouter(simpleRoutes);
    
    expect(typeof router.addRoute).toBe('function');
    expect(typeof router.handle).toBe('function');
    expect(typeof router.createServer).toBe('function');
    expect(typeof router.generateUrl).toBe('function');
    expect(typeof router.use).toBe('function');
    expect(typeof router.group).toBe('function');
  });

  it('should support enhanced router features', async () => {
    const testRouter = createObjectRouter({}, { enableMetrics: true });
    testRouter.addRoute('GET', '/test', () => ({ test: true }), { name: 'test-route' });
    
    // Test named routes
    const url = testRouter.generateUrl('test-route');
    expect(url).toBe('/test');
    
    // Test route groups
    testRouter.group('/api', [], () => {
      testRouter.addRoute('GET', '/users', () => ({ users: [] }));
    });
    
    // Test global middleware
    testRouter.use((req) => {
      req.middlewareRan = true;
    });
    
    // Test parameter constraints
    testRouter.addRoute('GET', '/users/:id(\\d+)', (req) => ({ 
      userId: req.params.id 
    }));
    
    // Test wildcard routes
    testRouter.addRoute('GET', '/files/*', (req) => ({ 
      file: req.params.splat 
    }));

    expect(typeof testRouter.getMetrics).toBe('function');
  });

  it('should handle basic request routing', async () => {
    const routes = {
      get: {
        path: '/',
        handler: () => ({ message: 'Hello World' })
      },
      api: {
        users: {
          get: {
            handler: () => ({ users: [] })
          }
        }
      }
    };

    const router = createObjectRouter(routes);

    // Test simple route
    const req1 = createMockReq('GET', '/');
    const res1 = createMockRes();
    await router.handle(req1, res1);
    
    expect(res1.getStatusCode()).toBe(200);
    
    // Test API route
    const req2 = createMockReq('GET', '/api/users');
    const res2 = createMockRes();
    await router.handle(req2, res2);
    
    expect(res2.getStatusCode()).toBe(200);
    
    // Test 404 for non-existent route
    const req3 = createMockReq('GET', '/nonexistent');
    const res3 = createMockRes();
    await router.handle(req3, res3);
    
    expect(res3.getStatusCode()).toBe(404);
  });

  it('should handle metrics collection', () => {
    const testRouter = createObjectRouter({}, { enableMetrics: true });
    testRouter.addRoute('GET', '/test', () => ({ test: true }));
    
    const metrics = testRouter.getMetrics();
    expect(typeof metrics.requests).toBe('number');
    expect(typeof metrics.averageResponseTime).toBe('number');
  });
});