/**
 * @fileoverview Component Lazy Loading with Intersection Observer
 * Provides lazy loading capabilities for Coherent.js components
 * @module @coherent.js/core/components/lazy-loading
 */

/**
 * @typedef {Object} LazyLoadOptions
 * @property {boolean} [enabled=true] - Enable lazy loading
 * @property {string} [rootMargin='200px'] - Root margin for intersection observer
 * @property {number} [threshold=0] - Intersection threshold (0.0 to 1.0)
 * @property {Function} [placeholder] - Placeholder component function
 * @property {string} [strategy='viewport'] - Loading strategy: 'viewport', 'eager', 'idle'
 * @property {number} [delay=0] - Delay before loading (ms)
 * @property {Function} [onLoad] - Callback when component loads
 * @property {Function} [onError] - Callback when loading fails
 * @property {boolean} [preload=false] - Preload on hover/focus
 * @property {number} [preloadDelay=200] - Delay before preloading (ms)
 * @property {boolean} [unloadOnHidden=false] - Unload when out of viewport
 * @property {boolean} [retryOnError=true] - Retry loading on error
 * @property {number} [maxRetries=3] - Maximum retry attempts
 * @property {number} [retryDelay=1000] - Delay between retries (ms)
 */

/**
 * @typedef {Object} LazyComponentState
 * @property {'pending'|'loading'|'loaded'|'error'} status - Current loading status
 * @property {Error|null} error - Error if loading failed
 * @property {number} retries - Number of retry attempts
 * @property {any} componentResult - Rendered component result
 * @property {Function|null} cleanup - Cleanup function
 */

/**
 * Default placeholder component
 * @returns {Object} Placeholder component
 */
const defaultPlaceholder = () => ({
  div: {
    className: 'coherent-lazy-placeholder',
    style: 'min-height: 100px; display: flex; align-items: center; justify-content: center;',
    children: [
      {
        div: {
          className: 'coherent-lazy-spinner',
          text: 'Loading...'
        }
      }
    ]
  }
});

/**
 * Default error component
 * @param {Error} error - The error that occurred
 * @param {Function} retry - Retry function
 * @returns {Object} Error component
 */
const defaultErrorComponent = (error, retry) => ({
  div: {
    className: 'coherent-lazy-error',
    style: 'min-height: 100px; display: flex; flex-direction: column; align-items: center; justify-content: center; color: #d32f2f;',
    children: [
      {
        p: {
          text: 'Failed to load component'
        }
      },
      {
        p: {
          style: 'font-size: 0.875rem; color: #666;',
          text: error.message
        }
      },
      {
        button: {
          text: 'Retry',
          onclick: retry,
          style: 'margin-top: 8px; padding: 8px 16px; cursor: pointer;'
        }
      }
    ]
  }
});

/**
 * Create a lazy-loaded component wrapper
 * @param {Function|Promise<Function>} componentLoader - Component loader function
 * @param {LazyLoadOptions} options - Lazy loading options
 * @returns {Function} Lazy-loaded component wrapper
 */
export function createLazyComponent(componentLoader, options = {}) {
  const opts = {
    enabled: true,
    rootMargin: '200px',
    threshold: 0,
    placeholder: defaultPlaceholder,
    strategy: 'viewport',
    delay: 0,
    onLoad: null,
    onError: null,
    preload: false,
    preloadDelay: 200,
    unloadOnHidden: false,
    retryOnError: true,
    maxRetries: 3,
    retryDelay: 1000,
    errorComponent: defaultErrorComponent,
    ...options
  };

  // If lazy loading is disabled, return component directly
  if (!opts.enabled) {
    return async function LazyComponentEager(props) {
      const component = typeof componentLoader === 'function'
        ? await componentLoader()
        : await componentLoader;
      return component(props);
    };
  }

  /** @type {LazyComponentState} */
  const state = {
    status: 'pending',
    error: null,
    retries: 0,
    componentResult: null,
    cleanup: null
  };

  let observer = null;
  let preloadTimeout = null;
  let cachedComponent = null;

  /**
   * Load the component
   * @param {any} props - Component props
   * @returns {Promise<any>} Loaded component result
   */
  async function loadComponent(props) {
    if (state.status === 'loading') {
      return state.componentResult;
    }

    if (state.status === 'loaded' && cachedComponent) {
      return cachedComponent(props);
    }

    state.status = 'loading';

    try {
      // Add delay if specified
      if (opts.delay > 0) {
        await new Promise(resolve => setTimeout(resolve, opts.delay));
      }

      // Load the component
      const component = typeof componentLoader === 'function'
        ? await componentLoader()
        : await componentLoader;

      cachedComponent = component;
      state.status = 'loaded';
      state.error = null;
      state.retries = 0;

      // Render component
      const result = await component(props);
      state.componentResult = result;

      // Call onLoad callback
      if (opts.onLoad) {
        opts.onLoad(result);
      }

      return result;
    } catch (error) {
      state.status = 'error';
      state.error = error;

      // Call onError callback
      if (opts.onError) {
        opts.onError(error);
      }

      // Retry if enabled
      if (opts.retryOnError && state.retries < opts.maxRetries) {
        state.retries++;
        await new Promise(resolve => setTimeout(resolve, opts.retryDelay));
        return loadComponent(props);
      }

      throw error;
    }
  }

  /**
   * Setup intersection observer for viewport strategy
   * @param {HTMLElement} element - Element to observe
   * @param {any} props - Component props
   */
  function setupViewportObserver(element, props) {
    if (typeof IntersectionObserver === 'undefined') {
      // Fallback: load immediately if IntersectionObserver not supported
      loadComponent(props);
      return;
    }

    observer = new IntersectionObserver(
      (entries) => {
        entries.forEach((entry) => {
          if (entry.isIntersecting && state.status === 'pending') {
            loadComponent(props).then((result) => {
              if (element && element.parentNode) {
                // Replace placeholder with loaded component
                const tempDiv = document.createElement('div');
                tempDiv.innerHTML = renderComponentToHTML(result);
                const newElement = tempDiv.firstElementChild;
                if (newElement) {
                  element.parentNode.replaceChild(newElement, element);
                }
              }
            }).catch((error) => {
              console.error('Failed to load lazy component:', error);
              if (element && element.parentNode) {
                // Show error component
                const tempDiv = document.createElement('div');
                tempDiv.innerHTML = renderComponentToHTML(opts.errorComponent(error, () => {
                  state.status = 'pending';
                  state.retries = 0;
                  setupViewportObserver(element, props);
                }));
                const errorElement = tempDiv.firstElementChild;
                if (errorElement) {
                  element.parentNode.replaceChild(errorElement, element);
                }
              }
            });
            observer.disconnect();
          } else if (!entry.isIntersecting && opts.unloadOnHidden && state.status === 'loaded') {
            // Unload component when out of viewport
            if (state.cleanup) {
              state.cleanup();
            }
            state.status = 'pending';
            cachedComponent = null;
          }
        });
      },
      {
        rootMargin: opts.rootMargin,
        threshold: opts.threshold
      }
    );

    observer.observe(element);
  }

  /**
   * Setup preloading on hover/focus
   * @param {HTMLElement} element - Element to attach listeners
   * @param {any} props - Component props
   */
  function setupPreload(element, props) {
    if (!opts.preload) return;

    const preloadHandler = () => {
      if (state.status === 'pending') {
        clearTimeout(preloadTimeout);
        preloadTimeout = setTimeout(() => {
          loadComponent(props);
        }, opts.preloadDelay);
      }
    };

    element.addEventListener('mouseenter', preloadHandler);
    element.addEventListener('focus', preloadHandler);

    // Store cleanup function
    state.cleanup = () => {
      clearTimeout(preloadTimeout);
      element.removeEventListener('mouseenter', preloadHandler);
      element.removeEventListener('focus', preloadHandler);
      if (observer) {
        observer.disconnect();
      }
    };
  }

  /**
   * Lazy component wrapper function
   * @param {any} props - Component props
   * @returns {Object} Component result (placeholder, loaded, or error)
   */
  function LazyComponentWrapper(props) {
    // Strategy: eager - load immediately
    if (opts.strategy === 'eager') {
      if (state.status === 'pending') {
        loadComponent(props).catch(() => {});
      }

      if (state.status === 'loaded') {
        return state.componentResult || cachedComponent(props);
      } else if (state.status === 'error') {
        return opts.errorComponent(state.error, () => {
          state.status = 'pending';
          state.retries = 0;
          return LazyComponentWrapper(props);
        });
      }

      return opts.placeholder(props);
    }

    // Strategy: idle - load when browser is idle
    if (opts.strategy === 'idle') {
      if (state.status === 'pending') {
        if (typeof requestIdleCallback !== 'undefined') {
          requestIdleCallback(() => loadComponent(props).catch(() => {}));
        } else {
          setTimeout(() => loadComponent(props).catch(() => {}), 1);
        }
      }

      if (state.status === 'loaded') {
        return state.componentResult || cachedComponent(props);
      } else if (state.status === 'error') {
        return opts.errorComponent(state.error, () => {
          state.status = 'pending';
          state.retries = 0;
          return LazyComponentWrapper(props);
        });
      }

      return opts.placeholder(props);
    }

    // Strategy: viewport - load when in viewport (default)
    if (state.status === 'loaded') {
      return state.componentResult || cachedComponent(props);
    } else if (state.status === 'error') {
      return opts.errorComponent(state.error, () => {
        state.status = 'pending';
        state.retries = 0;
        return LazyComponentWrapper(props);
      });
    }

    // Return placeholder with data attribute for hydration
    const placeholder = opts.placeholder(props);

    // Add lazy loading marker
    return {
      ...placeholder,
      [Object.keys(placeholder)[0]]: {
        ...placeholder[Object.keys(placeholder)[0]],
        'data-lazy-loading': 'true',
        'data-lazy-id': `lazy-${Math.random().toString(36).substring(2, 11)}`
      }
    };
  }

  // Expose methods for manual control
  LazyComponentWrapper.load = (props) => loadComponent(props);
  LazyComponentWrapper.reset = () => {
    state.status = 'pending';
    state.error = null;
    state.retries = 0;
    state.componentResult = null;
    cachedComponent = null;
    if (state.cleanup) {
      state.cleanup();
    }
  };
  LazyComponentWrapper.getState = () => ({ ...state });
  LazyComponentWrapper.setupViewportObserver = setupViewportObserver;
  LazyComponentWrapper.setupPreload = setupPreload;

  return LazyComponentWrapper;
}

/**
 * Simple HTML renderer helper (basic implementation)
 * @param {Object} component - Component to render
 * @returns {string} HTML string
 */
function renderComponentToHTML(component) {
  if (!component || typeof component !== 'object') {
    return String(component || '');
  }

  const tag = Object.keys(component)[0];
  const props = component[tag];

  if (!props) {
    return `<${tag}></${tag}>`;
  }

  const attributes = [];
  let content = '';

  Object.entries(props).forEach(([key, value]) => {
    if (key === 'children') {
      content = Array.isArray(value)
        ? value.map(child => renderComponentToHTML(child)).join('')
        : renderComponentToHTML(value);
    } else if (key === 'text') {
      content = escapeHTML(String(value));
    } else if (key === 'html') {
      content = String(value);
    } else if (key !== 'onclick' && key !== 'onload' && !key.startsWith('on')) {
      attributes.push(`${key}="${escapeHTML(String(value))}"`);
    }
  });

  const attrsStr = attributes.length > 0 ? ` ${  attributes.join(' ')}` : '';
  return `<${tag}${attrsStr}>${content}</${tag}>`;
}

/**
 * Escape HTML special characters
 * @param {string} str - String to escape
 * @returns {string} Escaped string
 */
function escapeHTML(str) {
  return str
    .replace(/&/g, '&amp;')
    .replace(/</g, '&lt;')
    .replace(/>/g, '&gt;')
    .replace(/"/g, '&quot;')
    .replace(/'/g, '&#39;');
}

/**
 * Initialize lazy loading for all components with data-lazy-loading attribute
 * Call this after hydration
 */
export function initializeLazyLoading() {
  if (typeof document === 'undefined') {
    return;
  }

  const lazyElements = document.querySelectorAll('[data-lazy-loading="true"]');

  lazyElements.forEach((element) => {
    const lazyId = element.getAttribute('data-lazy-id');

    // Setup intersection observer for this element
    if (typeof IntersectionObserver !== 'undefined') {
      const observer = new IntersectionObserver(
        (entries) => {
          entries.forEach((entry) => {
            if (entry.isIntersecting) {
              // Trigger lazy load event
              element.dispatchEvent(new CustomEvent('lazy-load', {
                detail: { lazyId }
              }));
              observer.disconnect();
            }
          });
        },
        {
          rootMargin: '200px',
          threshold: 0
        }
      );

      observer.observe(element);
    }
  });
}

/**
 * Higher-order component for lazy loading
 * @param {Function} Component - Component to wrap
 * @param {LazyLoadOptions} options - Lazy loading options
 * @returns {Function} Lazy-loaded component
 */
export function withLazyLoading(Component, options = {}) {
  return createLazyComponent(() => Promise.resolve(Component), options);
}

/**
 * Batch lazy load multiple components
 * @param {Array<{loader: Function, options?: LazyLoadOptions}>} components - Components to lazy load
 * @returns {Array<Function>} Array of lazy-loaded components
 */
export function batchLazyLoad(components) {
  return components.map(({ loader, options = {} }) =>
    createLazyComponent(loader, options)
  );
}

/**
 * Preload a component without rendering it
 * @param {Function|Promise<Function>} componentLoader - Component loader
 * @returns {Promise<Function>} Loaded component
 */
export async function preloadComponent(componentLoader) {
  const component = typeof componentLoader === 'function'
    ? await componentLoader()
    : await componentLoader;
  return component;
}

export default {
  createLazyComponent,
  withLazyLoading,
  batchLazyLoad,
  preloadComponent,
  initializeLazyLoading
};
