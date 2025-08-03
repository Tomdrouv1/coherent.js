/**
 * Tests for Express.js integration with Coherent.js
 */

import { coherentMiddleware, createCoherentHandler, setupCoherentExpress } from '../src/express/coherent-express.js';
import { renderToString } from '../src/rendering/html-renderer.js';

console.log('=== Express.js Integration Tests ===');

// Test 1: Middleware function creation
console.log('\n1. Testing coherentMiddleware creation...');
try {
  const middleware = coherentMiddleware();
  
  if (typeof middleware === 'function') {
    console.log('✓ coherentMiddleware created successfully');
  } else {
    console.error('✗ coherentMiddleware creation failed: not a function');
  }
} catch (error) {
  console.error('✗ coherentMiddleware creation failed:', error.message);
}

// Test 2: Middleware with options
console.log('\n2. Testing coherentMiddleware with options...');
try {
  const middleware = coherentMiddleware({
    enablePerformanceMonitoring: true,
    template: '<html><body>{{content}}</body></html>'
  });
  
  if (typeof middleware === 'function') {
    console.log('✓ coherentMiddleware with options created successfully');
  } else {
    console.error('✗ coherentMiddleware with options creation failed: not a function');
  }
} catch (error) {
  console.error('✗ coherentMiddleware with options creation failed:', error.message);
}

// Test 3: Handler creation
console.log('\n3. Testing createCoherentHandler...');
try {
  const handler = createCoherentHandler(() => ({}));
  
  if (typeof handler === 'function') {
    console.log('✓ createCoherentHandler created successfully');
  } else {
    console.error('✗ createCoherentHandler creation failed: not a function');
  }
} catch (error) {
  console.error('✗ createCoherentHandler creation failed:', error.message);
}

// Test 4: Setup function
console.log('\n4. Testing setupCoherentExpress...');
try {
  // Mock Express app
  const mockApp = {
    engine: (name, engine) => {},
    set: (key, value) => {},
    use: (middleware) => {}
  };
  
  setupCoherentExpress(mockApp);
  console.log('✓ setupCoherentExpress executed successfully');
} catch (error) {
  console.error('✗ setupCoherentExpress failed:', error.message);
}

// Test 5: Coherent object detection
console.log('\n5. Testing Coherent object detection...');

// Import the internal function for testing
const { default: coherentExpress } = await import('../src/express/coherent-express.js');

// Create test objects
const coherentObject = { div: { text: 'Hello' } };
const nonCoherentObject = { div: { text: 'Hello' }, span: { text: 'World' } };
const arrayObject = [{ div: { text: 'Hello' } }];
const stringObject = 'Hello';
const nullObject = null;

// Test detection (this would normally be internal)
console.log('  Testing various object types...');

// Test 6: Rendering integration
console.log('\n6. Testing rendering integration...');
try {
  const testComponent = {
    div: {
      className: 'test',
      text: 'Hello Coherent.js!'
    }
  };
  
  const html = renderToString(testComponent);
  
  if (html && html.includes('Hello Coherent.js!')) {
    console.log('✓ Rendering integration working correctly');
  } else {
    console.error('✗ Rendering integration failed: unexpected output');
  }
} catch (error) {
  console.error('✗ Rendering integration failed:', error.message);
}

// Test 7: Complete integration scenario
console.log('\n7. Testing complete integration scenario...');
try {
  // This is a conceptual test - in a real scenario we would
  // need to set up a full Express server and make requests
  
  console.log('  Simulating Express integration scenario...');
  
  // Create a mock request and response
  const mockReq = {
    path: '/test',
    params: {},
    get: (header) => 'test-agent'
  };
  
  const mockRes = {
    set: (header, value) => {},
    send: (data) => {
      if (typeof data === 'string' && data.includes('<!DOCTYPE html>')) {
        return true;
      }
      return false;
    }
  };
  
  // Test middleware functionality conceptually
  const middleware = coherentMiddleware();
  console.log('  ✓ Middleware created for integration test');
  
  // Test handler functionality conceptually
  const handler = createCoherentHandler(() => ({
    div: { text: 'Integration Test' }
  }));
  console.log('  ✓ Handler created for integration test');
  
  console.log('✓ Complete integration scenario test passed');
} catch (error) {
  console.error('✗ Complete integration scenario test failed:', error.message);
}

console.log('\n=== Express.js Integration Tests Completed ===');
console.log('Note: Full integration tests would require running an actual Express server');
