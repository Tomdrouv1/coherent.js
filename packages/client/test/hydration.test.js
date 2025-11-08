/**
 * Tests for client-side hydration utilities
 */

import { describe, it, expect } from 'vitest';
import { hydrate, hydrateAll, hydrateBySelector, makeHydratable } from '../src/hydration.js';

// Mock DOM environment for testing
const createMockElement = (tagName = 'div', className = '') => ({
  tagName: tagName.toUpperCase(),
  className,
  addEventListener: () => {},
  querySelector: () => createMockElement(),
  querySelectorAll: () => [createMockElement()],
});

// Simple test component
const TestComponent = (props = {}) => ({
  div: {
    className: 'test-component',
    text: props.text || 'Test Component'
  }
});

describe('Hydration Utilities', () => {
  it('should handle basic hydration', () => {
    const mockElement = createMockElement('div', 'test-component');
    const result = hydrate(mockElement, TestComponent, { text: 'Hello' });
    
    // In Node.js environment, hydration should return null
    expect(result).toBe(null);
  });

  it('should hydrate all elements', () => {
    const elements = [createMockElement(), createMockElement()];
    const components = [TestComponent, TestComponent];
    const instances = hydrateAll(elements, components);
    
    expect(Array.isArray(instances)).toBe(true);
    expect(instances.length).toBe(2);
  });

  it('should hydrate by selector', () => {
    // Mock document for Node.js environment
    global.document = {
      querySelectorAll: () => [createMockElement(), createMockElement()]
    };
    
    const instances = hydrateBySelector('.test-component', TestComponent);
    expect(Array.isArray(instances)).toBe(true);
    
    // Clean up
    delete global.document;
  });

  it('should make components hydratable', () => {
    const HydratableComponent = makeHydratable(TestComponent);
    
    expect(HydratableComponent.isHydratable).toBe(true);
    expect(typeof HydratableComponent.getHydrationData).toBe('function');
  });

  it('should handle _error cases', () => {
    // Test mismatched arrays
    const elements = [createMockElement()];
    const components = [TestComponent, TestComponent]; // More components than elements
    
    expect(() => {
      hydrateAll(elements, components);
    }).toThrow();
  });
});
