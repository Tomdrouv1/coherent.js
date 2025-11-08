/**
 * Coherent.js Error Boundary
 * 
 * Catches rendering errors and provides fallback UI.
 * Similar to React's Error Boundaries but for Coherent.js.
 * 
 * @module components/error-boundary
 */

/**
 * Error boundary state
 */
class ErrorBoundaryState {
  constructor() {
    this.hasError = false;
    this.error = null;
    this.errorInfo = null;
    this.errorCount = 0;
    this.lastError = null;
  }

  reset() {
    this.hasError = false;
    this.error = null;
    this.errorInfo = null;
  }

  setError(error, errorInfo = {}) {
    this.hasError = true;
    this.error = error;
    this.errorInfo = errorInfo;
    this.errorCount++;
    this.lastError = Date.now();
  }
}

/**
 * Create an error boundary
 * 
 * @param {Object} options - Error boundary options
 * @param {Object|Function} options.fallback - Fallback component or function
 * @param {Function} [options.onError] - Error callback
 * @param {Function} [options.onReset] - Reset callback
 * @param {Array<string>} [options.resetKeys] - Keys that trigger reset
 * @param {boolean} [options.resetOnPropsChange] - Reset on props change
 * @param {number} [options.maxErrors] - Maximum errors before permanent fallback
 * @param {number} [options.resetTimeout] - Auto-reset timeout in ms
 * @returns {Function} Error boundary wrapper function
 * 
 * @example
 * const boundary = createErrorBoundary({
 *   fallback: { div: { text: 'Something went wrong' } },
 *   onError: (error, errorInfo) => console.error(error),
 *   resetKeys: ['userId']
 * });
 * 
 * const SafeComponent = boundary(MyComponent);
 */
export function createErrorBoundary(options = {}) {
  const {
    fallback = { div: { className: 'error-boundary', text: 'An error occurred' } },
    onError = null,
    onReset = null,
    resetKeys = [],
    resetOnPropsChange = false,
    maxErrors = Infinity,
    resetTimeout = null
  } = options;

  const state = new ErrorBoundaryState();
  let previousProps = {};
  let resetTimer = null;

  /**
   * Wrap a component with error boundary
   */
  return function errorBoundaryWrapper(component) {
    return function wrappedComponent(props = {}) {
      try {
        // Check if we should reset based on props
        if (resetOnPropsChange && shouldReset(props, previousProps, resetKeys)) {
          state.reset();
          if (onReset) {
            onReset();
          }
        }

        previousProps = { ...props };

        // If we have an error and haven't exceeded max errors
        if (state.hasError) {
          if (state.errorCount >= maxErrors) {
            // Permanent fallback
            return typeof fallback === 'function'
              ? fallback(state.error, state.errorInfo, { permanent: true })
              : fallback;
          }

          // Return fallback with reset option
          const fallbackComponent = typeof fallback === 'function'
            ? fallback(state.error, state.errorInfo, {
                reset: () => {
                  state.reset();
                  if (onReset) {
                    onReset();
                  }
                },
                errorCount: state.errorCount
              })
            : fallback;

          return fallbackComponent;
        }

        // Try to render the component
        const result = typeof component === 'function'
          ? component(props)
          : component;

        return result;

      } catch (error) {
        // Capture error
        const errorInfo = {
          componentStack: error.stack,
          props,
          timestamp: Date.now()
        };

        state.setError(error, errorInfo);

        // Call error callback
        if (onError) {
          try {
            onError(error, errorInfo);
          } catch (callbackError) {
            console.error('Error in onError callback:', callbackError);
          }
        }

        // Set auto-reset timer if configured
        if (resetTimeout && !resetTimer) {
          resetTimer = setTimeout(() => {
            state.reset();
            resetTimer = null;
            if (onReset) {
              onReset();
            }
          }, resetTimeout);
        }

        // Return fallback
        return typeof fallback === 'function'
          ? fallback(error, errorInfo, {
              reset: () => {
                state.reset();
                if (resetTimer) {
                  clearTimeout(resetTimer);
                  resetTimer = null;
                }
                if (onReset) {
                  onReset();
                }
              },
              errorCount: state.errorCount
            })
          : fallback;
      }
    };
  };
}

/**
 * Check if error boundary should reset based on props
 */
function shouldReset(newProps, oldProps, resetKeys) {
  if (resetKeys.length === 0) {
    return false;
  }

  return resetKeys.some(key => newProps[key] !== oldProps[key]);
}

/**
 * Create a default error fallback component
 * 
 * @param {Object} options - Fallback options
 * @returns {Function} Fallback component function
 */
export function createErrorFallback(options = {}) {
  const {
    title = 'Something went wrong',
    showError = true,
    showStack = false,
    showReset = true,
    className = 'error-boundary-fallback',
    style = {}
  } = options;

  return function errorFallback(error, errorInfo, context = {}) {
    const children = [
      {
        h2: {
          className: 'error-title',
          text: title
        }
      }
    ];

    if (showError && error) {
      children.push({
        p: {
          className: 'error-message',
          text: error.message || 'Unknown error'
        }
      });
    }

    if (showStack && error && error.stack) {
      children.push({
        pre: {
          className: 'error-stack',
          text: error.stack
        }
      });
    }

    if (showReset && context.reset && !context.permanent) {
      children.push({
        button: {
          className: 'error-reset-button',
          text: 'Try Again',
          onclick: context.reset
        }
      });
    }

    if (context.errorCount > 1) {
      children.push({
        p: {
          className: 'error-count',
          text: `Error occurred ${context.errorCount} times`
        }
      });
    }

    return {
      div: {
        className,
        style: {
          padding: '20px',
          border: '1px solid #f44336',
          borderRadius: '4px',
          backgroundColor: '#ffebee',
          color: '#c62828',
          ...style
        },
        children
      }
    };
  };
}

/**
 * Wrap multiple components with the same error boundary
 * 
 * @param {Object} options - Error boundary options
 * @param {Object} components - Components to wrap
 * @returns {Object} Wrapped components
 * 
 * @example
 * const safeComponents = withErrorBoundary(
 *   { fallback: ErrorFallback },
 *   { Header, Footer, Content }
 * );
 */
export function withErrorBoundary(options, components) {
  const boundary = createErrorBoundary(options);
  const wrapped = {};

  Object.entries(components).forEach(([name, component]) => {
    wrapped[name] = boundary(component);
  });

  return wrapped;
}

/**
 * Error boundary for async components
 * 
 * @param {Object} options - Error boundary options
 * @returns {Function} Async error boundary wrapper
 */
export function createAsyncErrorBoundary(options = {}) {
  const {
    fallback = { div: { text: 'Loading...' } },
    errorFallback = { div: { text: 'Failed to load' } },
    onError = null,
    timeout = 10000
  } = options;

  return function asyncBoundaryWrapper(asyncComponent) {
    return async function wrappedAsyncComponent(props = {}) {
      try {
        // Set timeout
        const timeoutPromise = new Promise((_, reject) => {
          setTimeout(() => reject(new Error('Component load timeout')), timeout);
        });

        // Race between component load and timeout
        const result = await Promise.race([
          typeof asyncComponent === 'function'
            ? asyncComponent(props)
            : asyncComponent,
          timeoutPromise
        ]);

        return result ?? fallback;
      } catch (error) {
        if (onError) {
          onError(error, { props, async: true });
        }

        return typeof errorFallback === 'function'
          ? errorFallback(error, { props })
          : errorFallback;
      }
    };
  };
}

/**
 * Global error handler for uncaught errors
 */
export class GlobalErrorHandler {
  constructor(options = {}) {
    this.options = options;
    this.errors = [];
    this.maxErrors = options.maxErrors || 100;
    this.onError = options.onError || null;
    this.enabled = options.enabled !== false;
  }

  /**
   * Capture an error
   */
  captureError(error, context = {}) {
    if (!this.enabled) return;

    const errorEntry = {
      error,
      context,
      timestamp: Date.now(),
      stack: error.stack
    };

    this.errors.push(errorEntry);

    // Limit stored errors
    if (this.errors.length > this.maxErrors) {
      this.errors.shift();
    }

    // Call error callback
    if (this.onError) {
      try {
        this.onError(error, context);
      } catch (callbackError) {
        console.error('Error in global error handler callback:', callbackError);
      }
    }
  }

  /**
   * Get all captured errors
   */
  getErrors() {
    return [...this.errors];
  }

  /**
   * Clear all errors
   */
  clearErrors() {
    this.errors = [];
  }

  /**
   * Get error statistics
   */
  getStats() {
    return {
      totalErrors: this.errors.length,
      enabled: this.enabled,
      maxErrors: this.maxErrors
    };
  }

  /**
   * Enable error handler
   */
  enable() {
    this.enabled = true;
  }

  /**
   * Disable error handler
   */
  disable() {
    this.enabled = false;
  }
}

/**
 * Create a global error handler
 */
export function createGlobalErrorHandler(options = {}) {
  return new GlobalErrorHandler(options);
}

/**
 * Export all error boundary utilities
 */
export default {
  createErrorBoundary,
  createErrorFallback,
  withErrorBoundary,
  createAsyncErrorBoundary,
  GlobalErrorHandler,
  createGlobalErrorHandler
};
