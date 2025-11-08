/**
 * Enhanced tests for client-side hydration utilities
 * These tests work within the existing environment constraints
 */

import { describe, it, expect } from 'vitest';
import { hydrate, hydrateAll, hydrateBySelector, makeHydratable } from '../src/hydration.js';

// Simple mock components that match the expected structure
const createMockElement = (tagName = 'div', className = '') => ({
  tagName: tagName.toUpperCase(),
  className,
  getAttribute: () => null,
  setAttribute: () => {},
  hasAttribute: () => false,
  addEventListener: () => {},
  querySelector: () => null,
  querySelectorAll: () => []
});

const TestComponent = (props = {}) => ({
  div: {
    className: 'test-component',
    text: props.text || 'Test Component'
  }
});

describe('Enhanced Hydration Tests', () => {
  it('should handle hydration gracefully in Node.js environment', () => {
    const mockElement = createMockElement('div', 'test-component');
    const result = hydrate(mockElement, TestComponent, { text: 'Hello' });
    
    // In Node.js environment, hydration should return null
    expect(result).toBe(null);
  });

  it('should validate component arrays in hydrateAll', () => {
    const elements = [createMockElement(), createMockElement()];
    const components = [TestComponent]; // Intentional mismatch
    
    expect(() => {
      hydrateAll(elements, components);
    }).toThrow('Number of elements must match number of components');
  });

  it('should handle empty element queries in hydrateBySelector', () => {
    // Mock document for Node.js environment
    global.document = {
      querySelectorAll: () => []
    };
    
    const instances = hydrateBySelector('.nonexistent', TestComponent);
    expect(Array.isArray(instances)).toBe(true);
    expect(instances.length).toBe(0);
    
    // Clean up
    delete global.document;
  });

  it('should create hydratable components correctly', () => {
    const HydratableComponent = makeHydratable(TestComponent, {
      componentName: 'TestComponent',
      initialState: { count: 0 }
    });
    
    expect(HydratableComponent.isHydratable).toBe(true);
    expect(HydratableComponent.name).toBe('TestComponent');
    expect(typeof HydratableComponent.getHydrationData).toBe('function');
    
    const hydrationData = HydratableComponent.getHydrationData({ text: 'test' });
    expect(hydrationData).toMatchObject({
      componentName: 'TestComponent',
      props: { text: 'test' },
      initialState: { count: 0 }
    });
  });

  it('should handle various component props types', () => {
    const mockElement = createMockElement();
    
    // Test with different prop types
    const testCases = [
      { props: { text: 'string' }, expected: 'string' },
      { props: { count: 42 }, expected: 42 },
      { props: { active: true }, expected: true },
      { props: { data: null }, expected: null }
    ];
    
    testCases.forEach(({ props, _expected }) => {
      const component = (p) => ({ div: { text: String(p[Object.keys(p)[0]]) } });
      const result = hydrate(mockElement, component, props);
      
      // Should handle all prop types without crashing
      expect(result).toBe(null); // Node.js environment
    });
  });

  it('should validate hydratable component rendering', () => {
    const component = (props) => ({
      div: {
        className: 'hydratable-test',
        text: props.message,
        'data-testid': 'hydration-test'
      }
    });
    
    const HydratableComponent = makeHydratable(component, {
      componentName: 'HydratableTest'
    });
    
    const rendered = HydratableComponent.renderWithHydration({ message: 'hello' });
    
    expect(rendered.div).toBeDefined();
    expect(rendered.div.text).toBe('hello');
    expect(rendered.div['data-coherent-component']).toBeTruthy();
    expect(rendered.div['data-coherent-props']).toBeTruthy();
  });
});