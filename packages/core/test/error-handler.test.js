import { describe, it, expect, beforeEach, afterEach, vi } from 'vitest';
import {
  CoherentError,
  ComponentValidationError,
  RenderingError,
  PerformanceError,
  StateError,
  ErrorHandler,
  globalErrorHandler,
  throwValidationError,
  throwRenderingError,
  throwPerformanceError,
  throwStateError,
  safeExecute,
  safeExecuteAsync,
  createErrorHandler,
  default as ErrorHandlerDefault
} from '../src/utils/error-handler.js';

describe('Error Handler', () => {
  beforeEach(() => {
    vi.clearAllMocks();
  });

  afterEach(() => {
    vi.restoreAllMocks();
  });

  describe('CoherentError', () => {
    it('should create basic CoherentError', () => {
      const error = new CoherentError('Test error');

      expect(error).toBeInstanceOf(Error);
      expect(error).toBeInstanceOf(CoherentError);
      expect(error.name).toBe('CoherentError');
      expect(error.message).toBe('Test error');
      expect(error.type).toBe('generic');
      expect(error.timestamp).toBeGreaterThan(0);
    });

    it('should create CoherentError with options', () => {
      const options = {
        type: 'custom',
        component: 'TestComponent',
        context: { prop: 'value' },
        suggestions: ['Try this', 'Try that']
      };
      const error = new CoherentError('Test error', options);

      expect(error.type).toBe('custom');
      expect(error.component).toBe('TestComponent');
      expect(error.context).toEqual({ prop: 'value' });
      expect(error.suggestions).toEqual(['Try this', 'Try that']);
    });

    it('should serialize to JSON correctly', () => {
      const error = new CoherentError('Test error', {
        type: 'test',
        component: 'TestComp',
        context: { key: 'value' },
        suggestions: ['suggestion1']
      });

      const json = error.toJSON();

      expect(json).toMatchObject({
        name: 'CoherentError',
        message: 'Test error',
        type: 'test',
        component: 'TestComp',
        context: { key: 'value' },
        suggestions: ['suggestion1']
      });
      expect(json.timestamp).toBeGreaterThan(0);
      expect(json.stack).toBeDefined();
    });

    it('should capture stack trace', () => {
      const error = new CoherentError('Test error');

      expect(error.stack).toBeDefined();
      expect(typeof error.stack).toBe('string');
    });
  });

  describe('ComponentValidationError', () => {
    it('should create ComponentValidationError', () => {
      const error = new ComponentValidationError('Invalid component', 'TestComponent');

      expect(error).toBeInstanceOf(CoherentError);
      expect(error).toBeInstanceOf(ComponentValidationError);
      expect(error.name).toBe('ComponentValidationError');
      expect(error.type).toBe('validation');
      expect(error.component).toBe('TestComponent');
    });

    it('should include default suggestions', () => {
      const error = new ComponentValidationError('Test error', 'Component');

      expect(error.suggestions).toContain('Check component structure and syntax');
      expect(error.suggestions).toContain('Ensure all required properties are present');
      expect(error.suggestions).toContain('Validate prop types and values');
    });

    it('should merge custom suggestions', () => {
      const customSuggestions = ['Custom suggestion 1', 'Custom suggestion 2'];
      const error = new ComponentValidationError('Test error', 'Component', customSuggestions);

      expect(error.suggestions).toContain('Custom suggestion 1');
      expect(error.suggestions).toContain('Custom suggestion 2');
      expect(error.suggestions).toContain('Check component structure and syntax');
    });
  });

  describe('RenderingError', () => {
    it('should create RenderingError', () => {
      const error = new RenderingError('Render failed', 'TestComponent', { prop: 'value' });

      expect(error).toBeInstanceOf(CoherentError);
      expect(error).toBeInstanceOf(RenderingError);
      expect(error.name).toBe('RenderingError');
      expect(error.type).toBe('rendering');
      expect(error.component).toBe('TestComponent');
      expect(error.context).toEqual({ prop: 'value' });
    });

    it('should include default rendering suggestions', () => {
      const error = new RenderingError('Test error', 'Component', {});

      expect(error.suggestions).toBeDefined();
      expect(Array.isArray(error.suggestions)).toBe(true);
    });
  });

  describe('PerformanceError', () => {
    it('should create PerformanceError', () => {
      const metrics = { renderTime: 1000, memory: 500 };
      const error = new PerformanceError('Performance issue', metrics);

      expect(error).toBeInstanceOf(CoherentError);
      expect(error).toBeInstanceOf(PerformanceError);
      expect(error.name).toBe('PerformanceError');
      expect(error.type).toBe('performance');
      expect(error.context).toEqual(metrics);
    });

    it('should include default performance suggestions', () => {
      const error = new PerformanceError('Test error', {});

      expect(error.suggestions).toBeDefined();
      expect(Array.isArray(error.suggestions)).toBe(true);
    });
  });

  describe('StateError', () => {
    it('should create StateError', () => {
      const state = { counter: 0, loading: false };
      const error = new StateError('State error', state);

      expect(error).toBeInstanceOf(CoherentError);
      expect(error).toBeInstanceOf(StateError);
      expect(error.name).toBe('StateError');
      expect(error.type).toBe('state');
      expect(error.context).toEqual(state);
    });

    it('should include default state suggestions', () => {
      const error = new StateError('Test error', {});

      expect(error.suggestions).toBeDefined();
      expect(Array.isArray(error.suggestions)).toBe(true);
    });
  });

  describe('ErrorHandler', () => {
    let handler;

    beforeEach(() => {
      handler = new ErrorHandler();
    });

    it('should create ErrorHandler with default options', () => {
      expect(handler).toBeInstanceOf(ErrorHandler);
      expect(handler.errorHistory).toEqual([]);
      expect(handler.options.maxErrorHistory).toBe(100);
    });

    it('should create ErrorHandler with custom options', () => {
      const options = { maxErrorHistory: 50, enableLogging: false };
      const customHandler = new ErrorHandler(options);

      expect(customHandler.options.maxErrorHistory).toBe(50);
      expect(customHandler.options.enableLogging).toBe(false);
    });

    it('should handle errors', () => {
      const error = new Error('Test error');
      const result = handler.handle(error, { context: 'test' });

      expect(result).toBeInstanceOf(CoherentError);
      expect(handler.errorHistory.length).toBeGreaterThan(0);
    });

    it('should respect maxErrorHistory limit', () => {
      const options = { maxErrorHistory: 2 };
      const limitedHandler = new ErrorHandler(options);

      limitedHandler.handle(new Error('Error 1'));
      limitedHandler.handle(new Error('Error 2'));
      limitedHandler.handle(new Error('Error 3')); // Should be ignored

      expect(limitedHandler.errorHistory.length).toBe(2);
    });
  });

  describe('Global Error Handler', () => {
    it('should export globalErrorHandler instance', () => {
      expect(globalErrorHandler).toBeInstanceOf(ErrorHandler);
    });

    it('should be a singleton instance', () => {
      expect(globalErrorHandler).toBe(globalErrorHandler);
    });
  });

  describe('Error Throwing Functions', () => {
    it('should throw ValidationError', () => {
      expect(() => throwValidationError('Invalid component', 'TestComponent'))
        .toThrow(ComponentValidationError);
    });

    it('should throw RenderingError', () => {
      expect(() => throwRenderingError('Render failed', 'Component', {}))
        .toThrow(RenderingError);
    });

    it('should throw PerformanceError', () => {
      expect(() => throwPerformanceError('Slow render', { time: 1000 }))
        .toThrow(PerformanceError);
    });

    it('should throw StateError', () => {
      expect(() => throwStateError('Invalid state', { counter: 0 }))
        .toThrow(StateError);
    });
    it('should execute function successfully', () => {
      const result = safeExecute(() => 42);

      expect(result).toBe(42);
    });

    it('should handle errors and return fallback', () => {
      const result = safeExecute(() => {
        throw new Error('Test error');
      }, {}, 'fallback');

      expect(result).toBe('fallback');
    });

    it('should handle errors and call fallback function', () => {
      const fallback = vi.fn((error) => `Error: ${error.message}`);
      const result = safeExecute(() => {
        throw new Error('Test error');
      }, {}, fallback);

      expect(fallback).toHaveBeenCalled();
      expect(result).toBe('Error: Test error');
    });

    it('should throw enhanced error when no fallback provided', () => {
      expect(() => safeExecute(() => {
        throw new Error('Test error');
      })).toThrow(CoherentError);
    });
  });

  describe('safeExecuteAsync', () => {
    it('should execute async function successfully', async () => {
      const result = await safeExecuteAsync(async () => 42);

      expect(result).toBe(42);
    });

    it('should handle async errors and return fallback', async () => {
      const result = await safeExecuteAsync(async () => {
        throw new Error('Test error');
      }, {}, 'fallback');

      expect(result).toBe('fallback');
    });

    it('should handle async errors and call fallback function', async () => {
      const fallback = vi.fn((error) => `Error: ${error.message}`);
      const result = await safeExecuteAsync(async () => {
        throw new Error('Test error');
      }, {}, fallback);

      expect(fallback).toHaveBeenCalled();
      expect(result).toBe('Error: Test error');
    });
  });

  describe('createErrorHandler', () => {
    it('should create custom error handler', () => {
      const options = { maxErrorHistory: 25 };
      const handler = createErrorHandler(options);

      expect(handler).toBeInstanceOf(ErrorHandler);
      expect(handler.options.maxErrorHistory).toBe(25);
    });

    it('should return new instance each time', () => {
      const handler1 = createErrorHandler();
      const handler2 = createErrorHandler();

      expect(handler1).not.toBe(handler2);
    });
  });

  describe('Default Export', () => {
    it('should export ErrorHandler class as default', () => {
      expect(ErrorHandlerDefault).toBe(ErrorHandler);
    });
  });

  describe('Integration Tests', () => {
    it('should work with complete error handling flow', () => {
      const _handler = createErrorHandler({ maxErrorHistory: 10 });

      try {
        safeExecute(() => {
          throw new ComponentValidationError('Test error', 'TestComponent');
        });
      } catch (error) {
        expect(error).toBeInstanceOf(ComponentValidationError);
      }

      expect(globalErrorHandler.errorHistory.length).toBeGreaterThan(0);
    });

    it('should handle async error flow', async () => {
      const result = await safeExecuteAsync(async () => {
        throw new RenderingError('Async render error', 'AsyncComponent', {});
      }, {}, 'async fallback');

      expect(result).toBe('async fallback');
    });

    it('should chain error types properly', () => {
      const error = new ComponentValidationError('Test', 'Component');

      expect(error).toBeInstanceOf(CoherentError);
      expect(error).toBeInstanceOf(ComponentValidationError);
      expect(error).toBeInstanceOf(Error);
    });
  });
});
