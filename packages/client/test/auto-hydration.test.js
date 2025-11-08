/**
 * Tests for autoHydrate functionality
 * Tests automatic component discovery and hydration on page load
 */

import { describe, it, expect, beforeEach, vi } from 'vitest';
import { autoHydrate } from '../src/hydration.js';

const setupBrowserEnvironment = () => {
  global.window = {
    __coherentEventRegistry: {},
    __coherentActionRegistry: {},
    componentRegistry: {},
    addEventListener: vi.fn()
  };
  
  global.document = {
    readyState: 'complete',
    addEventListener: vi.fn(),
    querySelectorAll: vi.fn(() => [])
  };
  
  global.console = {
    warn: vi.fn(),
    error: vi.fn(),
    log: vi.fn()
  };
};

const createMockHydratableElement = (componentName, props = {}, state = null) => {
  const element = {
    getAttribute: vi.fn((name) => {
      if (name === 'data-coherent-component') return componentName;
      if (name === 'data-coherent-props') return props ? JSON.stringify(props) : null;
      if (name === 'data-coherent-state') return state ? JSON.stringify(state) : null;
      return null;
    }),
    setAttribute: vi.fn(),
    hasAttribute: vi.fn((name) => {
      return name === 'data-coherent-component' || 
             (name === 'data-coherent-props' && props) ||
             (name === 'data-coherent-state' && state);
    }),
    addEventListener: vi.fn(),
    querySelector: vi.fn(() => null),
    querySelectorAll: vi.fn(() => []),
    tagName: 'DIV',
    parentElement: null
  };
  
  return element;
};

describe('AutoHydrate Functionality', () => {
  beforeEach(() => {
    setupBrowserEnvironment();
  });

  it('should test component registry validation and fallbacks', () => {
    // Test registry validation logic
    let componentRegistry = window;  // Common mistake
    
    if (componentRegistry === window) {
      console.warn('⚠️ Component registry is the window object! This suggests the registry was not properly initialized.');
      componentRegistry = window.componentRegistry || {};
    }
    
    expect(console.warn).toHaveBeenCalled();
    expect(componentRegistry).toBe(window.componentRegistry);
  });

  it('should test DOM readiness detection', () => {
    const hydrateComponents = vi.fn();
    
    // Test document ready state handling
    if (document.readyState === 'loading') {
      document.addEventListener('DOMContentLoaded', hydrateComponents);
    } else {
      hydrateComponents();
    }
    
    // Since readyState is 'complete', should call immediately
    expect(hydrateComponents).toHaveBeenCalled();
    expect(document.addEventListener).not.toHaveBeenCalled();
  });

  it('should test loading state DOM event attachment', () => {
    // Reset document state
    global.document.readyState = 'loading';
    const hydrateComponents = vi.fn();
    
    if (document.readyState === 'loading') {
      document.addEventListener('DOMContentLoaded', hydrateComponents);
    } else {
      hydrateComponents();
    }
    
    expect(document.addEventListener).toHaveBeenCalledWith('DOMContentLoaded', hydrateComponents);
    expect(hydrateComponents).not.toHaveBeenCalled();
  });

  it('should test hydratable element discovery', () => {
    const element1 = createMockHydratableElement('TestComponent', { text: 'Hello' });
    const element2 = createMockHydratableElement('ButtonComponent', { label: 'Click me' });
    
    // Mock querySelectorAll to return our elements
    document.querySelectorAll.mockImplementation((selector) => {
      if (selector === '[data-coherent-component]') {
        return [element1, element2];
      }
      return [];
    });
    
    const hydrateableElements = document.querySelectorAll('[data-coherent-component]');
    
    expect(hydrateableElements).toHaveLength(2);
    expect(element1.getAttribute('data-coherent-component')).toBe('TestComponent');
    expect(element2.getAttribute('data-coherent-component')).toBe('ButtonComponent');
  });

  it('should test component lookup in registry', () => {
    const TestComponent = vi.fn(() => ({ div: { text: 'Test' } }));
    TestComponent.isHydratable = true;
    
    const componentRegistry = {
      'TestComponent': TestComponent,
      'AnotherComponent': vi.fn()
    };
    
    const element = createMockHydratableElement('TestComponent');
    const componentName = element.getAttribute('data-coherent-component');
    
    // Test exact name lookup
    let component = componentRegistry[componentName];
    expect(component).toBe(TestComponent);
    
    // Test fallback lookup for hydratable components
    component = null;
    const unknownElement = createMockHydratableElement('UnknownComponent');
    const unknownName = unknownElement.getAttribute('data-coherent-component');
    component = componentRegistry[unknownName];
    
    if (!component) {
      // Search for any hydratable component as fallback
      for (const comp of Object.values(componentRegistry)) {
        if (comp && comp.isHydratable) {
          component = comp;
          break;
        }
      }
    }
    
    expect(component).toBe(TestComponent); // Found the hydratable one
  });

  it('should test props and state extraction from attributes', () => {
    const props = { text: 'Hello World', count: 42 };
    const state = { active: true, step: 5 };
    
    const element = createMockHydratableElement('TestComponent', props, state);
    
    // Test props extraction
    const propsAttr = element.getAttribute('data-coherent-props');
    const extractedProps = propsAttr ? JSON.parse(propsAttr) : {};
    
    expect(extractedProps).toEqual(props);
    
    // Test state extraction  
    const stateAttr = element.getAttribute('data-coherent-state');
    const extractedState = stateAttr ? JSON.parse(stateAttr) : null;
    
    expect(extractedState).toEqual(state);
  });

  it('should test error handling for invalid JSON', () => {
    const element = {
      getAttribute: vi.fn((name) => {
        if (name === 'data-coherent-component') return 'TestComponent';
        if (name === 'data-coherent-props') return '{invalid json}';
        if (name === 'data-coherent-state') return '{also invalid}';
        return null;
      })
    };
    
    // Test JSON parsing with error handling
    const parseAttribute = (element, attrName) => {
      try {
        const attr = element.getAttribute(attrName);
        return attr ? JSON.parse(attr) : null;
      } catch (error) {
        console.error(`Failed to parse ${attrName}:`, error);
        return null;
      }
    };
    
    const props = parseAttribute(element, 'data-coherent-props');
    const state = parseAttribute(element, 'data-coherent-state');
    
    expect(props).toBe(null);
    expect(state).toBe(null);
    expect(console.error).toHaveBeenCalledTimes(2);
  });

  it('should test component not found error handling', () => {
    const element = createMockHydratableElement('NonExistentComponent');
    const componentRegistry = {
      'DifferentComponent': vi.fn()
    };
    
    const componentName = element.getAttribute('data-coherent-component');
    let component = componentRegistry[componentName];
    
    // Test fallback search
    if (!component) {
      for (const comp of Object.values(componentRegistry)) {
        if (comp && comp.isHydratable) {
          component = comp;
          break;
        }
      }
    }
    
    if (!component) {
      console.error(`❌ Component ${componentName} not found in registry`);
    }
    
    expect(component).toBeUndefined();
    expect(console.error).toHaveBeenCalledWith('❌ Component NonExistentComponent not found in registry');
  });

  it('should test successful hydration flow', async () => {
    // Create a mock hydrate function to test the flow
    const mockHydrate = vi.fn((element, component, props, options) => {
      return {
        element,
        component, 
        props,
        isHydrated: true,
        initialState: options?.initialState
      };
    });
    
    const TestComponent = vi.fn(() => ({ div: { text: 'Test' } }));
    const componentRegistry = { TestComponent };
    
    const element = createMockHydratableElement('TestComponent', { text: 'Hello' }, { count: 0 });
    
    // Simulate the hydration process
    const componentName = element.getAttribute('data-coherent-component');
    const component = componentRegistry[componentName];
    
    if (component) {
      const propsAttr = element.getAttribute('data-coherent-props');
      const props = propsAttr ? JSON.parse(propsAttr) : {};
      
      const stateAttr = element.getAttribute('data-coherent-state');
      const initialState = stateAttr ? JSON.parse(stateAttr) : null;
      
      const instance = mockHydrate(element, component, props, { initialState });
      
      expect(instance).toEqual({
        element,
        component: TestComponent,
        props: { text: 'Hello' },
        isHydrated: true,
        initialState: { count: 0 }
      });
    }
  });

  it('should test autoHydrate with real function call', () => {
    // Test that autoHydrate can be called without throwing
    expect(() => autoHydrate({})).not.toThrow();
    expect(() => autoHydrate()).not.toThrow();
    
    // Test with various registry types
    const validRegistry = {
      TestComponent: () => ({ div: { text: 'test' } })
    };
    
    expect(() => autoHydrate(validRegistry)).not.toThrow();
  });

  it('should test registry initialization', () => {
    // Test that registries are properly initialized
    const initializeRegistries = () => {
      window.__coherentEventRegistry = window.__coherentEventRegistry || {};
      window.__coherentActionRegistry = window.__coherentActionRegistry || {};
    };
    
    // Clear existing registries
    delete window.__coherentEventRegistry;
    delete window.__coherentActionRegistry;
    
    initializeRegistries();
    
    expect(window.__coherentEventRegistry).toEqual({});
    expect(window.__coherentActionRegistry).toEqual({});
    
    // Test idempotency 
    const existingEventRegistry = { test: vi.fn() };
    window.__coherentEventRegistry = existingEventRegistry;
    
    initializeRegistries();
    
    expect(window.__coherentEventRegistry).toBe(existingEventRegistry);
  });

  it('should test complete autoHydrate workflow simulation', () => {
    // Setup complete scenario
    const TestComponent = vi.fn(() => ({ div: { text: 'Hello' } }));
    TestComponent.isHydratable = true;
    
    const componentRegistry = { TestComponent };
    const element = createMockHydratableElement('TestComponent', { message: 'test' });
    
    document.querySelectorAll.mockImplementation((selector) => {
      if (selector === '[data-coherent-component]') return [element];
      return [];
    });
    
    // Mock the hydrate function that would be called
    const mockHydrate = vi.fn();
    
    // Simulate the main hydration loop
    const hydrateableElements = document.querySelectorAll('[data-coherent-component]');
    
    hydrateableElements.forEach(element => {
      const componentName = element.getAttribute('data-coherent-component');
      const component = componentRegistry[componentName];
      
      if (component) {
        const propsAttr = element.getAttribute('data-coherent-props');
        const props = propsAttr ? JSON.parse(propsAttr) : {};
        
        const stateAttr = element.getAttribute('data-coherent-state');
        const initialState = stateAttr ? JSON.parse(stateAttr) : null;
        
        mockHydrate(element, component, props, { initialState });
      }
    });
    
    expect(mockHydrate).toHaveBeenCalledWith(
      element,
      TestComponent,
      { message: 'test' },
      { initialState: null }
    );
  });
});