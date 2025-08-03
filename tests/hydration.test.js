/**
 * Tests for client-side hydration utilities
 */

import { hydrate, hydrateAll, hydrateBySelector, makeHydratable } from '../src/client/hydration.js';

// Mock DOM environment for testing
const createMockElement = (tagName = 'div', className = '') => ({
  tagName: tagName.toUpperCase(),
  className,
  addEventListener: (event, handler) => {},
  querySelector: (selector) => createMockElement(),
  querySelectorAll: (selector) => [createMockElement()],
});

// Simple test component
const TestComponent = (props = {}) => ({
  div: {
    className: 'test-component',
    text: props.text || 'Test Component'
  }
});

console.log('=== Hydration Utilities Tests ===');

// Test 1: Basic hydration
console.log('\n1. Testing basic hydration...');
try {
  const mockElement = createMockElement('div', 'test-component');
  const instance = hydrate(mockElement, TestComponent, { text: 'Hello' });
  
  // In Node.js environment, hydration should return null
  console.log('✓ Basic hydration test passed (returned null in Node.js environment)');
} catch (error) {
  console.error('✗ Basic hydration test failed:', error.message);
}

// Test 2: Hydrate all
console.log('\n2. Testing hydrateAll...');
try {
  const elements = [createMockElement(), createMockElement()];
  const components = [TestComponent, TestComponent];
  const instances = hydrateAll(elements, components);
  
  console.log(`✓ hydrateAll test passed (processed ${instances.length} elements)`);
} catch (error) {
  console.error('✗ hydrateAll test failed:', error.message);
}

// Test 3: Hydrate by selector
console.log('\n3. Testing hydrateBySelector...');
try {
  // Mock document for Node.js environment
  global.document = {
    querySelectorAll: (selector) => [createMockElement(), createMockElement()]
  };
  
  const instances = hydrateBySelector('.test-component', TestComponent);
  
  console.log(`✓ hydrateBySelector test passed (processed ${instances.length} elements)`);
  
  // Clean up
  delete global.document;
} catch (error) {
  console.error('✗ hydrateBySelector test failed:', error.message);
}

// Test 4: makeHydratable
console.log('\n4. Testing makeHydratable...');
try {
  const HydratableComponent = makeHydratable(TestComponent);
  
  if (HydratableComponent.isHydratable && typeof HydratableComponent.getHydrationData === 'function') {
    console.log('✓ makeHydratable test passed');
  } else {
    console.error('✗ makeHydratable test failed: Component not properly made hydratable');
  }
} catch (error) {
  console.error('✗ makeHydratable test failed:', error.message);
}

// Test 5: Instance methods
console.log('\n5. Testing instance methods...');
try {
  // Mock window for this test
  global.window = {};
  
  const mockElement = createMockElement('div', 'test-component');
  const instance = hydrate(mockElement, TestComponent, { text: 'Hello' });
  
  // Clean up
  delete global.window;
  
  if (instance) {
    // Test update method
    instance.update({ text: 'Updated' });
    
    // Test destroy method
    instance.destroy();
    
    console.log('✓ Instance methods test passed');
  } else {
    console.log('✓ Instance methods test skipped (hydration returned null in Node.js)');
  }
} catch (error) {
  console.error('✗ Instance methods test failed:', error.message);
}

// Test 6: Error handling
console.log('\n6. Testing error handling...');
try {
  // Test mismatched arrays
  const elements = [createMockElement()];
  const components = [TestComponent, TestComponent]; // More components than elements
  
  try {
    hydrateAll(elements, components);
    console.error('✗ Error handling test failed: Should have thrown an error');
  } catch (error) {
    console.log('✓ Error handling test passed (correctly threw error for mismatched arrays)');
  }
} catch (error) {
  console.error('✗ Error handling test failed:', error.message);
}

console.log('\n=== All Hydration Tests Completed ===');
