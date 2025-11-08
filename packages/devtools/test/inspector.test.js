/**
 * Tests for DevTools - ComponentInspector
 * 
 * Coverage areas:
 * - Component inspection and analysis
 * - Validation and error detection
 * - Performance tracking
 * - History management
 */

import { describe, it, expect, beforeEach, afterEach, vi } from 'vitest';
import { ComponentInspector, createInspector, inspect, validateComponent } from '../src/inspector.js';

describe('ComponentInspector', () => {
  let inspector;

  beforeEach(() => {
    inspector = new ComponentInspector({
      trackHistory: true,
      maxHistory: 100,
      verbose: false
    });
  });

  afterEach(() => {
    vi.clearAllMocks();
  });

  describe('Component Inspection', () => {
    it('should inspect basic component structure', () => {
      const component = {
        div: {
          className: 'test',
          text: 'Hello World'
        }
      };

      const result = inspector.inspect(component);

      expect(result).toHaveProperty('id');
      expect(result).toHaveProperty('type');
      expect(result).toHaveProperty('structure');
      expect(result.structure).toHaveProperty('div');
    });

    it('should track component hierarchy', () => {
      const component = {
        div: {
          children: [
            { h1: { text: 'Title' } },
            { p: { text: 'Content' } }
          ]
        }
      };

      const result = inspector.inspect(component);

      expect(result.structure.div.children).toHaveLength(2);
      expect(result.depth).toBeGreaterThan(0);
    });

    it('should detect component props', () => {
      const component = {
        div: {
          className: 'container',
          id: 'main',
          'data-test': 'value'
        }
      };

      const result = inspector.inspect(component);

      expect(result.props).toBeDefined();
      expect(result.props).toContain('className');
      expect(result.props).toContain('id');
    });

    it('should identify component type', () => {
      const simpleComponent = { div: { text: 'Simple' } };
      const complexComponent = { div: { children: [{ span: {} }] } };

      const simple = inspector.inspect(simpleComponent);
      const complex = inspector.inspect(complexComponent);

      expect(simple.type).toBeDefined();
      expect(complex.type).toBeDefined();
    });

    it('should handle nested components', () => {
      const component = {
        article: {
          children: [
            {
              header: {
                children: [{ h1: { text: 'Title' } }]
              }
            },
            {
              main: {
                children: [{ p: { text: 'Content' } }]
              }
            }
          ]
        }
      };

      const result = inspector.inspect(component);

      expect(result.depth).toBeGreaterThanOrEqual(3);
      expect(result.childCount).toBeGreaterThan(0);
    });
  });

  describe('Validation', () => {
    it('should validate correct component structure', () => {
      const component = {
        div: {
          className: 'valid',
          text: 'Valid component'
        }
      };

      const result = validateComponent(component);

      expect(result.valid).toBe(true);
      expect(result.errors).toHaveLength(0);
    });

    it('should detect invalid component structure', () => {
      const invalidComponent = null;

      const result = validateComponent(invalidComponent);

      expect(result.valid).toBe(false);
      expect(result.errors.length).toBeGreaterThan(0);
    });

    it('should detect missing required props', () => {
      const component = {
        img: {
          // Missing src attribute
          alt: 'Image'
        }
      };

      const result = inspector.inspect(component);

      expect(result.warnings).toBeDefined();
    });

    it('should detect circular references', () => {
      const component = { div: {} };
      component.div.self = component;

      const result = inspector.inspect(component);

      expect(result.warnings).toBeDefined();
      expect(result.warnings.some(w => w.includes('circular'))).toBe(true);
    });

    it('should validate prop types', () => {
      const component = {
        div: {
          className: 123, // Should be string
          onClick: 'not a function' // Should be function
        }
      };

      const result = inspector.inspect(component);

      expect(result.warnings.length).toBeGreaterThan(0);
    });
  });

  describe('Performance Tracking', () => {
    it('should measure inspection time', () => {
      const component = { div: { text: 'Test' } };

      const result = inspector.inspect(component);

      expect(result).toHaveProperty('inspectionTime');
      expect(result.inspectionTime).toBeGreaterThanOrEqual(0);
    });

    it('should track component complexity', () => {
      const simpleComponent = { div: { text: 'Simple' } };
      const complexComponent = {
        div: {
          children: Array.from({ length: 100 }, (_, i) => ({
            span: { text: `Item ${i}` }
          }))
        }
      };

      const simple = inspector.inspect(simpleComponent);
      const complex = inspector.inspect(complexComponent);

      expect(complex.complexity).toBeGreaterThan(simple.complexity);
    });

    it('should identify slow components', () => {
      const largeComponent = {
        div: {
          children: Array.from({ length: 1000 }, (_, i) => ({
            div: {
              children: [
                { h3: { text: `Title ${i}` } },
                { p: { text: `Content ${i}` } }
              ]
            }
          }))
        }
      };

      const result = inspector.inspect(largeComponent);

      expect(result.complexity).toBeGreaterThan(1000);
    });

    it('should track component updates', () => {
      const component = { div: { text: 'Version 1' } };

      inspector.inspect(component);
      inspector.inspect(component);
      inspector.inspect(component);

      const stats = inspector.getStats();

      expect(stats.totalInspections).toBe(3);
    });
  });

  describe('History Management', () => {
    it('should track inspection history', () => {
      const component1 = { div: { text: 'First' } };
      const component2 = { div: { text: 'Second' } };

      inspector.inspect(component1);
      inspector.inspect(component2);

      const history = inspector.getHistory();

      expect(history).toHaveLength(2);
    });

    it('should limit history size', () => {
      const limitedInspector = new ComponentInspector({
        trackHistory: true,
        maxHistory: 5
      });

      for (let i = 0; i < 10; i++) {
        limitedInspector.inspect({ div: { text: `Item ${i}` } });
      }

      const history = limitedInspector.getHistory();

      expect(history.length).toBeLessThanOrEqual(5);
    });

    it('should clear history', () => {
      inspector.inspect({ div: { text: 'Test' } });
      inspector.inspect({ div: { text: 'Test 2' } });

      inspector.clearHistory();

      const history = inspector.getHistory();

      expect(history).toHaveLength(0);
    });

    it('should export inspection data', () => {
      inspector.inspect({ div: { text: 'Test' } });

      const exported = inspector.export();

      expect(exported).toHaveProperty('inspections');
      expect(exported).toHaveProperty('stats');
      expect(exported.inspections).toHaveLength(1);
    });

    it('should filter history by criteria', () => {
      inspector.inspect({ div: { className: 'error', text: 'Error' } });
      inspector.inspect({ div: { className: 'success', text: 'Success' } });

      const history = inspector.getHistory();
      const errorComponents = history.filter(h => 
        h.structure.div?.className === 'error'
      );

      expect(errorComponents).toHaveLength(1);
    });
  });

  describe('Helper Functions', () => {
    it('should create inspector with factory function', () => {
      const newInspector = createInspector({ verbose: true });

      expect(newInspector).toBeInstanceOf(ComponentInspector);
    });

    it('should use standalone inspect function', () => {
      const component = { div: { text: 'Test' } };

      const result = inspect(component);

      expect(result).toHaveProperty('id');
      expect(result).toHaveProperty('structure');
    });

    it('should handle invalid input gracefully', () => {
      expect(() => inspect(null)).not.toThrow();
      expect(() => inspect(undefined)).not.toThrow();
      expect(() => inspect('string')).not.toThrow();
    });
  });
});
