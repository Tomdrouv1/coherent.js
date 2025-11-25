import { describe, it, expect, beforeEach, afterEach, vi } from 'vitest';
import {
  createErrorBoundary,
  createErrorFallback,
  withErrorBoundary,
  createAsyncErrorBoundary,
  GlobalErrorHandler,
  createGlobalErrorHandler,
  default as errorBoundaryDefault
} from '../src/components/error-boundary.js';

describe('Error Boundary', () => {
  beforeEach(() => {
    vi.clearAllMocks();
  });

  afterEach(() => {
    vi.restoreAllMocks();
  });

  describe('createErrorBoundary', () => {
    it('should create error boundary with default options', () => {
      const boundary = createErrorBoundary();

      expect(typeof boundary).toBe('function');
    });

    it('should wrap component with error boundary', () => {
      const boundary = createErrorBoundary();
      const mockComponent = vi.fn(() => ({ div: 'Success' }));
      const wrappedComponent = boundary(mockComponent);

      expect(typeof wrappedComponent).toBe('function');
    });

    it('should render component successfully when no error', () => {
      const boundary = createErrorBoundary();
      const mockComponent = vi.fn(() => ({ div: 'Success' }));
      const wrappedComponent = boundary(mockComponent);

      const result = wrappedComponent();

      expect(result).toEqual({ div: 'Success' });
      expect(mockComponent).toHaveBeenCalled();
    });

    it('should catch errors and return fallback', () => {
      const fallback = { div: { text: 'Error occurred' } };
      const boundary = createErrorBoundary({ fallback });
      const errorComponent = vi.fn(() => {
        throw new Error('Component error');
      });
      const wrappedComponent = boundary(errorComponent);

      const result = wrappedComponent();

      expect(result).toEqual(fallback);
    });

    it('should call onError callback when error occurs', () => {
      const onError = vi.fn();
      const boundary = createErrorBoundary({ onError });
      const errorComponent = vi.fn(() => {
        throw new Error('Test error');
      });
      const wrappedComponent = boundary(errorComponent);

      wrappedComponent();

      expect(onError).toHaveBeenCalledTimes(1);
    });

    it('should use function fallback when error occurs', () => {
      const fallback = vi.fn((error, _errorInfo) => ({
        div: { text: `Error: ${error.message}` }
      }));
      const boundary = createErrorBoundary({ fallback });
      const errorComponent = vi.fn(() => {
        throw new Error('Test error');
      });
      const wrappedComponent = boundary(errorComponent);

      const result = wrappedComponent();

      expect(fallback).toHaveBeenCalledWith(
        expect.any(Error),
        expect.any(Object),
        expect.any(Object)
      );
      expect(result).toEqual({ div: { text: 'Error: Test error' } });
    });
  });

  describe('createErrorFallback', () => {
    it('should create error fallback with default options', () => {
      const fallback = createErrorFallback();

      expect(typeof fallback).toBe('function');
    });

    it('should render fallback UI with error message', () => {
      const fallback = createErrorFallback();
      const error = new Error('Test error');
      const _errorInfo = { component: 'TestComponent' };

      const result = fallback(error, _errorInfo);

      expect(result).toBeDefined();
      expect(typeof result).toBe('object');
    });
  });

  describe('withErrorBoundary', () => {
    it('should wrap components with error boundary', () => {
      const components = {
        SafeComponent: vi.fn(() => ({ div: 'Safe' })),
        UnsafeComponent: vi.fn(() => {
          throw new Error('Unsafe');
        })
      };

      const wrappedComponents = withErrorBoundary({}, components);

      expect(typeof wrappedComponents.SafeComponent).toBe('function');
      expect(typeof wrappedComponents.UnsafeComponent).toBe('function');
    });
  });

  describe('createAsyncErrorBoundary', () => {
    it('should create async error boundary', () => {
      const boundary = createAsyncErrorBoundary();

      expect(typeof boundary).toBe('function');
    });

    it('should handle async component errors', async () => {
      const boundary = createAsyncErrorBoundary();
      const asyncComponent = vi.fn(async () => {
        throw new Error('Async error');
      });
      const wrappedComponent = boundary(asyncComponent);

      const result = await wrappedComponent();

      expect(result).toBeDefined();
    });

    it('should handle successful async components', async () => {
      const boundary = createAsyncErrorBoundary();
      const asyncComponent = vi.fn(async () => ({ div: 'Async Success' }));
      const wrappedComponent = boundary(asyncComponent);

      const result = await wrappedComponent();

      expect(result).toEqual({ div: 'Async Success' });
    });

    it('should handle non-function async components', async () => {
      const boundary = createAsyncErrorBoundary();
      const staticComponent = { div: 'Static' };
      const wrappedComponent = boundary(staticComponent);

      const result = await wrappedComponent();

      expect(result).toEqual(staticComponent);
    });
  });

  describe('GlobalErrorHandler', () => {
    it('should initialize with default state', () => {
      const handler = new GlobalErrorHandler();

      expect(handler.errors).toEqual([]);
      expect(handler.maxErrors).toBe(100);
      expect(handler.enabled).toBe(true);
    });

    it('should handle errors', () => {
      const handler = new GlobalErrorHandler();
      const error = new Error('Global error');

      handler.captureError(error, { context: 'test' });

      expect(handler.errors.length).toBe(1);
      expect(handler.errors[0].error).toBe(error);
    });

    it('should respect maxErrors limit', () => {
      const handler = new GlobalErrorHandler({ maxErrors: 2 });

      handler.captureError(new Error('Error 1'));
      handler.captureError(new Error('Error 2'));
      handler.captureError(new Error('Error 3')); // Should be ignored

      expect(handler.errors.length).toBe(2);
    });

    it('should clear errors', () => {
      const handler = new GlobalErrorHandler();

      handler.captureError(new Error('Test'));
      handler.clearErrors();

      expect(handler.errors).toEqual([]);
    });

    it('should enable/disable handler', () => {
      const handler = new GlobalErrorHandler();

      handler.disable();
      expect(handler.enabled).toBe(false);

      handler.enable();
      expect(handler.enabled).toBe(true);
    });

    it('should get error statistics', () => {
      const handler = new GlobalErrorHandler();

      handler.captureError(new Error('Error 1'));
      handler.captureError(new Error('Error 2'));

      const stats = handler.getStats();

      expect(stats.totalErrors).toBe(2);
      expect(stats.enabled).toBe(true);
    });
  });

  describe('createGlobalErrorHandler', () => {
    it('should create global error handler with options', () => {
      const options = { maxErrors: 50 };
      const handler = createGlobalErrorHandler(options);

      expect(handler).toBeInstanceOf(GlobalErrorHandler);
      expect(handler.maxErrors).toBe(50);
    });

    it('should return handler instance', () => {
      const handler = createGlobalErrorHandler();

      expect(handler).toBeInstanceOf(GlobalErrorHandler);
    });
  });

  describe('Default Export', () => {
    it('should export all error boundary functions', () => {
      expect(typeof errorBoundaryDefault.createErrorBoundary).toBe('function');
      expect(typeof errorBoundaryDefault.createErrorFallback).toBe('function');
      expect(typeof errorBoundaryDefault.withErrorBoundary).toBe('function');
      expect(typeof errorBoundaryDefault.createAsyncErrorBoundary).toBe('function');
      expect(typeof errorBoundaryDefault.GlobalErrorHandler).toBe('function');
      expect(typeof errorBoundaryDefault.createGlobalErrorHandler).toBe('function');
    });
  });

  describe('Integration Tests', () => {
    it('should handle complete error boundary flow', () => {
      const onError = vi.fn();
      const fallback = { div: { text: 'Something went wrong' } };

      const boundary = createErrorBoundary({
        fallback,
        onError
      });

      const errorComponent = vi.fn(() => {
        throw new Error('Test error');
      });

      const wrappedComponent = boundary(errorComponent);

      // Initial error
      const result = wrappedComponent();
      expect(result).toEqual(fallback);
      expect(onError).toHaveBeenCalled();
    });

    it('should handle async error boundary with fallback', async () => {
      const boundary = createAsyncErrorBoundary();

      const asyncErrorComponent = vi.fn(async () => {
        throw new Error('Async error');
      });

      const wrappedComponent = boundary(asyncErrorComponent);
      const result = await wrappedComponent();

      expect(result).toBeDefined();
    });
  });
});
