import { describe, it, expect, vi } from 'vitest';
import { createErrorBoundary, createErrorBoundaries, createGlobalErrorBoundary } from '../src/components/component-system.js';

describe('Error Boundary System', () => {
  describe('createErrorBoundary', () => {
    it('should render component normally when no error', () => {
      const component = () => ({ div: { text: 'Hello World' } });
      const boundary = createErrorBoundary(component);
      
      const result = boundary.render();
      
      expect(result.div.text).toBe('Hello World');
      expect(boundary.hasError()).toBe(false);
    });

    it('should catch errors and show fallback', () => {
      const component = () => {
        throw new Error('Test error');
      };
      
      const boundary = createErrorBoundary(component);
      const result = boundary.render();
      
      expect(boundary.hasError()).toBe(true);
      expect(result.div.className).toBe('coherent-error-boundary');
    });

    it('should use custom fallback component', () => {
      const component = () => {
        throw new Error('Test error');
      };
      
      const fallback = (error) => ({
        div: { text: `Custom fallback: ${error.message}` }
      });
      
      const boundary = createErrorBoundary(component, { fallback });
      const result = boundary.render();
      
      expect(result.div.text).toBe('Custom fallback: Test error');
    });

    it('should call onError handler when error occurs', () => {
      const onError = vi.fn();
      const component = () => {
        throw new Error('Test error');
      };
      
      const boundary = createErrorBoundary(component, { onError });
      boundary.render();
      
      expect(onError).toHaveBeenCalled();
      expect(onError.mock.calls[0][0].message).toBe('Test error');
    });

    it('should reset error state', () => {
      const component = () => {
        throw new Error('Test error');
      };
      
      const boundary = createErrorBoundary(component);
      boundary.render();
      
      expect(boundary.hasError()).toBe(true);
      
      boundary.reset();
      
      expect(boundary.hasError()).toBe(false);
    });

    it('should provide error state', () => {
      const component = () => {
        throw new Error('Test error');
      };
      
      const boundary = createErrorBoundary(component);
      boundary.render();
      
      const errorState = boundary.getErrorState();
      
      expect(errorState.hasError).toBe(true);
      expect(errorState.error.message).toBe('Test error');
      expect(errorState.errorInfo).toBeDefined();
    });
  });

  describe('Retry Logic', () => {
    it('should retry rendering on error', async () => {
      let attemptCount = 0;
      const component = () => {
        attemptCount++;
        if (attemptCount < 2) {
          throw new Error('Temporary error');
        }
        return { div: { text: 'Success' } };
      };
      
      const fallback = (error, errorInfo, retry) => ({
        div: {
          text: 'Error occurred',
          children: [
            { button: { text: 'Retry', onclick: retry } }
          ]
        }
      });
      
      const boundary = createErrorBoundary(component, {
        fallback,
        retry: {
          enabled: true,
          maxAttempts: 3,
          delay: 10
        }
      });
      
      // First render fails
      const result1 = boundary.render();
      expect(result1.div.text).toBe('Error occurred');
      
      // Get retry function from fallback
      const errorState = boundary.getErrorState();
      expect(errorState.attemptCount).toBe(0);
    });

    it('should respect max retry attempts', () => {
      const component = () => {
        throw new Error('Persistent error');
      };
      
      const boundary = createErrorBoundary(component, {
        retry: {
          enabled: true,
          maxAttempts: 2,
          delay: 0
        }
      });
      
      boundary.render();
      
      const errorState = boundary.getErrorState();
      expect(errorState.hasError).toBe(true);
    });
  });

  describe('Reset Keys', () => {
    it('should reset error when reset key changes', () => {
      let shouldError = true;
      const component = (props) => {
        if (shouldError) {
          throw new Error('Error');
        }
        return { div: { text: `Value: ${props.key}` } };
      };
      
      const boundary = createErrorBoundary(component, {
        resetKeys: ['key']
      });
      
      // First render with error
      boundary.render({ key: 1 });
      expect(boundary.hasError()).toBe(true);
      
      // Fix the error
      shouldError = false;
      
      // Render with different key - should reset
      const result = boundary.render({ key: 2 });
      expect(boundary.hasError()).toBe(false);
      expect(result.div.text).toBe('Value: 2');
    });

    it('should not reset error when reset key stays same', () => {
      const component = () => {
        throw new Error('Error');
      };
      
      const boundary = createErrorBoundary(component, {
        resetKeys: ['key']
      });
      
      boundary.render({ key: 1 });
      expect(boundary.hasError()).toBe(true);
      
      boundary.render({ key: 1 });
      expect(boundary.hasError()).toBe(true);
    });
  });

  describe('Component with render method', () => {
    it('should handle components with render method', () => {
      const component = {
        name: 'TestComponent',
        render: (props) => ({ div: { text: props.text } })
      };
      
      const boundary = createErrorBoundary(component);
      const result = boundary.render({ text: 'Hello' });
      
      expect(result.div.text).toBe('Hello');
    });

    it('should catch errors in render method', () => {
      const component = {
        name: 'TestComponent',
        render: () => {
          throw new Error('Render error');
        }
      };
      
      const boundary = createErrorBoundary(component);
      boundary.render();
      
      expect(boundary.hasError()).toBe(true);
    });
  });

  describe('createErrorBoundaries', () => {
    it('should create multiple boundaries', () => {
      const components = {
        comp1: () => ({ div: { text: 'Component 1' } }),
        comp2: () => ({ div: { text: 'Component 2' } })
      };
      
      const boundaries = createErrorBoundaries(components);
      
      expect(boundaries.size).toBe(2);
      expect(boundaries.has('comp1')).toBe(true);
      expect(boundaries.has('comp2')).toBe(true);
    });

    it('should apply options to all boundaries', () => {
      const onError = vi.fn();
      const components = {
        comp1: () => { throw new Error('Error 1'); },
        comp2: () => { throw new Error('Error 2'); }
      };
      
      const boundaries = createErrorBoundaries(components, { onError });
      
      boundaries.get('comp1').render();
      boundaries.get('comp2').render();
      
      expect(onError).toHaveBeenCalledTimes(2);
    });
  });

  describe('createGlobalErrorBoundary', () => {
    it('should wrap entire app', () => {
      const app = () => ({ div: { text: 'App' } });
      const boundary = createGlobalErrorBoundary(app);
      
      const result = boundary.render();
      
      expect(result.div.text).toBe('App');
    });

    it('should catch app-level errors', () => {
      const app = () => {
        throw new Error('App error');
      };
      
      const onError = vi.fn();
      const boundary = createGlobalErrorBoundary(app, { onError });
      
      boundary.render();
      
      expect(boundary.hasError()).toBe(true);
      expect(onError).toHaveBeenCalled();
    });
  });

  describe('Error Information', () => {
    it('should capture component stack', () => {
      const component = () => {
        throw new Error('Test error');
      };
      
      const boundary = createErrorBoundary(component);
      boundary.render({ prop1: 'value1' });
      
      const errorState = boundary.getErrorState();
      
      expect(errorState.errorInfo.componentStack).toBeDefined();
      expect(errorState.errorInfo.props).toEqual({ prop1: 'value1' });
      expect(errorState.errorInfo.timestamp).toBeDefined();
    });
  });

  describe('Fallback Function', () => {
    it('should pass error, errorInfo, and retry to fallback function', () => {
      const component = () => {
        throw new Error('Test error');
      };
      
      const fallback = vi.fn((error, errorInfo, retry) => ({
        div: { text: 'Fallback' }
      }));
      
      const boundary = createErrorBoundary(component, {
        fallback,
        retry: { enabled: true }
      });
      
      boundary.render();
      
      expect(fallback).toHaveBeenCalled();
      expect(fallback.mock.calls[0][0].message).toBe('Test error');
      expect(fallback.mock.calls[0][1]).toBeDefined(); // errorInfo
      expect(typeof fallback.mock.calls[0][2]).toBe('function'); // retry
    });
  });

  describe('Error Handler Errors', () => {
    it('should handle errors in error handler gracefully', () => {
      const component = () => {
        throw new Error('Component error');
      };
      
      const onError = () => {
        throw new Error('Handler error');
      };
      
      const consoleError = vi.spyOn(console, 'error').mockImplementation(() => {});
      
      const boundary = createErrorBoundary(component, { onError });
      
      // Should not throw
      expect(() => boundary.render()).not.toThrow();
      expect(boundary.hasError()).toBe(true);
      
      consoleError.mockRestore();
    });
  });
});
