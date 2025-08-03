/**
 * Tests for Fastify integration with Coherent.js
 */

import { coherentFastify, createCoherentFastifyHandler, setupCoherentFastify } from '../src/fastify/coherent-fastify.js';
import { renderToString } from '../src/rendering/html-renderer.js';

console.log('=== Fastify Integration Tests ===');

// Test 1: Plugin function creation
console.log('\n1. Testing coherentFastify plugin creation...');
try {
  if (typeof coherentFastify === 'function') {
    console.log('✓ coherentFastify plugin created successfully');
  } else {
    console.error('✗ coherentFastify plugin creation failed: not a function');
  }
} catch (error) {
  console.error('✗ coherentFastify plugin creation failed:', error.message);
}

// Test 2: Plugin with options
console.log('\n2. Testing coherentFastify with options...');
try {
  // Mock Fastify instance for testing
  const mockFastify = {
    decorateReply: (name, fn) => {},
    addHook: (hook, handler) => {},
    register: (plugin, options) => {}
  };
  
  coherentFastify(mockFastify, {
    enablePerformanceMonitoring: true,
    template: '<html><body>{{content}}</body></html>'
  }, () => {});
  
  console.log('✓ coherentFastify with options executed successfully');
} catch (error) {
  console.error('✗ coherentFastify with options execution failed:', error.message);
}

// Test 3: Handler creation
console.log('\n3. Testing createCoherentFastifyHandler...');
try {
  const handler = createCoherentFastifyHandler(() => ({}));
  
  if (typeof handler === 'function') {
    console.log('✓ createCoherentFastifyHandler created successfully');
  } else {
    console.error('✗ createCoherentFastifyHandler creation failed: not a function');
  }
} catch (error) {
  console.error('✗ createCoherentFastifyHandler creation failed:', error.message);
}

// Test 4: Setup function
console.log('\n4. Testing setupCoherentFastify...');
try {
  // Mock Fastify instance
  const mockFastify = {
    register: (plugin, options) => {}
  };
  
  setupCoherentFastify(mockFastify);
  console.log('✓ setupCoherentFastify executed successfully');
} catch (error) {
  console.error('✗ setupCoherentFastify failed:', error.message);
}

// Test 5: Rendering integration
console.log('\n5. Testing rendering integration...');
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

// Test 6: Complete integration scenario
console.log('\n6. Testing complete integration scenario...');
try {
  // This is a conceptual test - in a real scenario we would
  // need to set up a full Fastify server and make requests
  
  console.log('  Simulating Fastify integration scenario...');
  
  // Create a mock request and reply
  const mockRequest = {
    url: '/test',
    params: {},
    headers: { 'user-agent': 'test-agent' }
  };
  
  const mockReply = {
    header: (name, value) => mockReply,
    send: (data) => {},
    status: (code) => mockReply
  };
  
  // Test plugin functionality conceptually
  const mockFastify = {
    decorateReply: (name, fn) => {},
    addHook: (hook, handler) => {},
    register: (plugin, options) => {}
  };
  
  coherentFastify(mockFastify, {}, () => {});
  console.log('  ✓ Plugin registered for integration test');
  
  // Test handler functionality conceptually
  const handler = createCoherentFastifyHandler(() => ({
    div: { text: 'Integration Test' }
  }));
  console.log('  ✓ Handler created for integration test');
  
  console.log('✓ Complete integration scenario test passed');
} catch (error) {
  console.error('✗ Complete integration scenario test failed:', error.message);
}

console.log('\n=== Fastify Integration Tests Completed ===');
console.log('Note: Full integration tests would require running an actual Fastify server');
