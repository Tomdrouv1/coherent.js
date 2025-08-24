/**
 * Tests for Enhanced Object-based Router
 */

import { createObjectRouter } from '../src/api/router.js';

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

// Test basic object router creation
console.log('🧪 Testing enhanced router creation...');

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

// Test that router has expected methods
console.assert(typeof router.addRoute === 'function', 'Router should have addRoute method');
console.assert(typeof router.handle === 'function', 'Router should have handle method');
console.assert(typeof router.createServer === 'function', 'Router should have createServer method');
console.assert(typeof router.generateUrl === 'function', 'Router should have generateUrl method for named routes');
console.assert(typeof router.use === 'function', 'Router should have use method for global middleware');
console.assert(typeof router.group === 'function', 'Router should have group method for route groups');

// Test enhanced router features
console.log('Testing enhanced router features...');

async function testEnhancedFeatures() {
  try {
    // Test route caching
    const testRouter = createObjectRouter({}, { enableMetrics: true });
    testRouter.addRoute('GET', '/test', () => ({ test: true }), { name: 'test-route' });
    
    // Test named routes
    const url = testRouter.generateUrl('test-route');
    console.assert(url === '/test', 'Named route URL generation should work');
    
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
    
    // Test request handling with new features
    const req1 = createMockReq('GET', '/test');
    const res1 = createMockRes();
    await testRouter.handle(req1, res1);
    
    console.assert(res1.getStatusCode() === 200, 'Route should return 200');
    console.assert(res1.getData().includes('test'), 'Route should return test data');
    
    // Test metrics collection
    const metrics = testRouter.getMetrics();
    console.assert(metrics.requests >= 1, 'Metrics should track requests');
    console.assert(typeof metrics.averageResponseTime === 'number', 'Metrics should include response time');
    
    console.log('✅ All enhanced router tests passed!');
  } catch (error) {
    console.error('❌ Enhanced router test failed:', error.message);
  }
}

testEnhancedFeatures();

// Test basic request handling
console.log('Testing basic request handling...');

async function testBasicHandling() {
  try {
    // Test simple route
    const req1 = createMockReq('GET', '/');
    const res1 = createMockRes();
    await router.handle(req1, res1);
    
    console.assert(res1.getStatusCode() === 200, 'Root route should return 200');
    
    // Test API route
    const req2 = createMockReq('GET', '/api/users');
    const res2 = createMockRes();
    await router.handle(req2, res2);
    
    console.assert(res2.getStatusCode() === 200, 'API route should return 200');
    
    // Test 404 for non-existent route
    const req3 = createMockReq('GET', '/nonexistent');
    const res3 = createMockRes();
    await router.handle(req3, res3);
    
    console.assert(res3.getStatusCode() === 404, 'Non-existent route should return 404');
    
    console.log('✅ Basic request handling tests passed!');
  } catch (error) {
    console.error('❌ Basic handling test failed:', error.message);
  }
}

testBasicHandling();
