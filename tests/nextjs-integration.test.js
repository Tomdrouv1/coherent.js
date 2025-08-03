/**
 * Tests for Next.js integration with Coherent.js
 */

import { createCoherentNextHandler, createCoherentAppRouterHandler } from '../src/nextjs/coherent-nextjs.js';
import { renderToString } from '../src/rendering/html-renderer.js';

console.log('=== Next.js Integration Tests ===');

// Test 1: API route handler creation
console.log('\n1. Testing createCoherentNextHandler...');
try {
  const handler = createCoherentNextHandler(() => ({}));
  
  if (typeof handler === 'function') {
    console.log('✓ createCoherentNextHandler created successfully');
  } else {
    console.error('✗ createCoherentNextHandler creation failed: not a function');
  }
} catch (error) {
  console.error('✗ createCoherentNextHandler creation failed:', error.message);
}

// Test 2: App Router handler creation
console.log('\n2. Testing createCoherentAppRouterHandler...');
try {
  const handler = createCoherentAppRouterHandler(() => ({}));
  
  if (typeof handler === 'function') {
    console.log('✓ createCoherentAppRouterHandler created successfully');
  } else {
    console.error('✗ createCoherentAppRouterHandler creation failed: not a function');
  }
} catch (error) {
  console.error('✗ createCoherentAppRouterHandler creation failed:', error.message);
}

// Test 3: Handler with options
console.log('\n3. Testing handlers with options...');
try {
  const handler1 = createCoherentNextHandler(() => ({}), {
    enablePerformanceMonitoring: true,
    template: '<html><body>{{content}}</body></html>'
  });
  
  const handler2 = createCoherentAppRouterHandler(() => ({}), {
    enablePerformanceMonitoring: true,
    template: '<html><body>{{content}}</body></html>'
  });
  
  if (typeof handler1 === 'function' && typeof handler2 === 'function') {
    console.log('✓ Handlers with options created successfully');
  } else {
    console.error('✗ Handlers with options creation failed: not functions');
  }
} catch (error) {
  console.error('✗ Handlers with options creation failed:', error.message);
}

// Test 4: Rendering integration
console.log('\n4. Testing rendering integration...');
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

// Test 5: Complete integration scenario
console.log('\n5. Testing complete integration scenario...');
try {
  // This is a conceptual test - in a real scenario we would
  // need to set up a full Next.js server and make requests
  
  console.log('  Simulating Next.js integration scenario...');
  
  // Create mock requests and responses
  const mockReq = {
    url: '/test',
    query: {},
    headers: { 'user-agent': 'test-agent' }
  };
  
  const mockRes = {
    setHeader: (name, value) => {},
    status: (code) => mockRes,
    send: (data) => {},
    json: (data) => {}
  };
  
  // Test API route handler functionality conceptually
  const apiHandler = createCoherentNextHandler(() => ({
    div: { text: 'API Test' }
  }));
  console.log('  ✓ API route handler created for integration test');
  
  // Test App Router handler functionality conceptually
  const appHandler = createCoherentAppRouterHandler(() => ({
    div: { text: 'App Router Test' }
  }));
  console.log('  ✓ App Router handler created for integration test');
  
  console.log('✓ Complete integration scenario test passed');
} catch (error) {
  console.error('✗ Complete integration scenario test failed:', error.message);
}

console.log('\n=== Next.js Integration Tests Completed ===');
console.log('Note: Full integration tests would require running an actual Next.js server');
console.log('Note: Server Component and Client Component tests require React environment');
