/**
 * Enhanced Routing System
 *
 * Provides advanced routing features:
 * - Route prefetching strategies
 * - Page transitions
 * - Code splitting per route
 * - Advanced scroll behavior
 */

/**
 * Create an enhanced router with advanced features
 *
 * @param {Object} options - Configuration options
 * @param {Object} [options.prefetch] - Prefetching configuration
 * @param {Object} [options.transitions] - Page transition configuration
 * @param {Object} [options.codeSplitting] - Code splitting configuration
 * @param {Object} [options.scrollBehavior] - Scroll behavior configuration
 * @returns {Object} Enhanced router instance
 */
export function createRouter(options = {}) {
  const opts = {
    mode: options.mode || 'history',
    base: options.base || '/',
    ...options
  };

  // Ensure nested defaults are preserved
  opts.prefetch = {
    enabled: false,
    strategy: 'hover',
    delay: 100,
    maxConcurrent: 3,
    priority: {
      critical: 100,
      high: 50,
      normal: 0,
      low: -50
    },
    ...(options.prefetch || {})
  };

  opts.transitions = {
    enabled: false,
    default: {
      enter: 'fade-in',
      leave: 'fade-out',
      duration: 300
    },
    routes: {},
    onStart: null,
    onComplete: null,
    ...(options.transitions || {})
  };

  opts.codeSplitting = {
    enabled: false,
    strategy: 'route',
    chunkNaming: '[name]-[hash]',
    preload: [],
    onLoad: null,
    ...(options.codeSplitting || {})
  };

  opts.scrollBehavior = {
    enabled: true,
    behavior: 'smooth',
    position: 'top',
    delay: 0,
    savePosition: true,
    custom: null,
    ...(options.scrollBehavior || {})
  };

  // Router state
  const state = {
    routes: new Map(),
    currentRoute: null,
    history: [],
    prefetchQueue: [],
    prefetching: new Set(),
    loadedChunks: new Map(),
    savedPositions: new Map(),
    transitionState: null
  };

  // Statistics
  const stats = {
    navigations: 0,
    prefetches: 0,
    transitionsCompleted: 0,
    chunksLoaded: 0,
    scrollRestores: 0
  };

  /**
   * Register a route
   */
  function addRoute(path, config) {
    state.routes.set(path, {
      path,
      component: config.component,
      meta: config.meta || {},
      beforeEnter: config.beforeEnter,
      beforeLeave: config.beforeLeave,
      priority: config.priority || opts.prefetch.priority.normal,
      transition: config.transition || opts.transitions.default,
      lazy: typeof config.component === 'function',
      loaded: !config.component || typeof config.component !== 'function',
      chunk: null
    });

    // Preload if configured
    if (opts.codeSplitting.enabled &&
        Array.isArray(opts.codeSplitting.preload) &&
        opts.codeSplitting.preload.includes(path)) {
      loadRoute(path);
    }
  }

  /**
   * Load a route component
   */
  async function loadRoute(path) {
    const route = state.routes.get(path);
    if (!route) {
      throw new Error(`Route not found: ${path}`);
    }

    if (route.loaded) {
      return route.component;
    }

    try {
      const startTime = performance.now();

      // Load the component
      const component = await route.component();
      route.component = component;
      route.loaded = true;
      route.chunk = opts.codeSplitting.chunkNaming
        .replace('[name]', path.replace(/\//g, '-'))
        .replace('[hash]', generateHash(path));

      const loadTime = performance.now() - startTime;

      state.loadedChunks.set(path, {
        path,
        loadTime,
        timestamp: Date.now()
      });

      stats.chunksLoaded++;

      if (opts.codeSplitting.onLoad) {
        opts.codeSplitting.onLoad(path, component, loadTime);
      }

      return component;
    } catch (error) {
      route.loaded = false;
      throw new Error(`Failed to load route ${path}: ${error.message}`);
    }
  }

  /**
   * Prefetch a route
   */
  async function prefetchRoute(path, priority = opts.prefetch.priority.normal) {
    if (!opts.prefetch.enabled) return;

    const route = state.routes.get(path);
    if (!route || route.loaded || state.prefetching.has(path)) {
      return;
    }

    // Add to queue with priority
    state.prefetchQueue.push({ path, priority });
    state.prefetchQueue.sort((a, b) => b.priority - a.priority);

    // Process queue
    processPrefetchQueue();
  }

  /**
   * Process prefetch queue
   */
  async function processPrefetchQueue() {
    // Limit concurrent prefetches
    if (state.prefetching.size >= opts.prefetch.maxConcurrent) {
      return;
    }

    const item = state.prefetchQueue.shift();
    if (!item) return;

    const { path } = item;
    state.prefetching.add(path);

    try {
      await loadRoute(path);
      stats.prefetches++;
    } catch (error) {
      console.warn(`Prefetch failed for ${path}:`, error);
    } finally {
      state.prefetching.delete(path);
      // Process next item in queue
      if (state.prefetchQueue.length > 0) {
        processPrefetchQueue();
      }
    }
  }

  /**
   * Setup prefetch strategy
   */
  function setupPrefetchStrategy(element, path) {
    if (!opts.prefetch.enabled || !element) return;

    if (opts.prefetch.strategy === 'hover') {
      let timeoutId;
      element.addEventListener('mouseenter', () => {
        timeoutId = setTimeout(() => {
          prefetchRoute(path);
        }, opts.prefetch.delay);
      });
      element.addEventListener('mouseleave', () => {
        clearTimeout(timeoutId);
      });
    } else if (opts.prefetch.strategy === 'visible') {
      const observer = new IntersectionObserver((entries) => {
        entries.forEach(entry => {
          if (entry.isIntersecting) {
            prefetchRoute(path);
            observer.unobserve(element);
          }
        });
      });
      observer.observe(element);
    } else if (opts.prefetch.strategy === 'idle') {
      if ('requestIdleCallback' in window) {
        requestIdleCallback(() => prefetchRoute(path));
      } else {
        setTimeout(() => prefetchRoute(path), 1);
      }
    }
  }

  /**
   * Execute page transition
   */
  async function executeTransition(from, to) {
    if (!opts.transitions.enabled) return;

    const transition = state.routes.get(to)?.transition || opts.transitions.default;

    state.transitionState = {
      from,
      to,
      phase: 'start'
    };

    if (opts.transitions.onStart) {
      opts.transitions.onStart(from, to);
    }

    // Leave transition
    state.transitionState.phase = 'leave';
    await applyTransition(transition.leave, transition.duration / 2);

    // Enter transition
    state.transitionState.phase = 'enter';
    await applyTransition(transition.enter, transition.duration / 2);

    state.transitionState.phase = 'complete';
    stats.transitionsCompleted++;

    if (opts.transitions.onComplete) {
      opts.transitions.onComplete(from, to);
    }

    state.transitionState = null;
  }

  /**
   * Apply transition animation
   */
  function applyTransition(animationName, duration) {
    return new Promise(resolve => {
      const element = document.querySelector('[data-router-view]');
      if (!element) {
        resolve();
        return;
      }

      element.style.animation = `${animationName} ${duration}ms`;

      setTimeout(() => {
        element.style.animation = '';
        resolve();
      }, duration);
    });
  }

  /**
   * Handle scroll behavior
   */
  function handleScroll(to, from, savedPosition) {
    if (!opts.scrollBehavior.enabled) return;

    // Custom scroll behavior
    if (opts.scrollBehavior.custom) {
      const position = opts.scrollBehavior.custom(to, from, savedPosition);
      scrollToPosition(position);
      return;
    }

    // Default scroll behavior
    let position;

    if (savedPosition && opts.scrollBehavior.savePosition) {
      // Restore saved position
      position = savedPosition;
      stats.scrollRestores++;
    } else if (to.hash) {
      // Scroll to hash
      const element = document.querySelector(to.hash);
      if (element) {
        position = {
          el: element,
          behavior: opts.scrollBehavior.behavior
        };
      }
    } else if (opts.scrollBehavior.position === 'top') {
      // Scroll to top
      position = { x: 0, y: 0 };
    } else if (opts.scrollBehavior.position === 'saved' && savedPosition) {
      position = savedPosition;
    }

    if (position) {
      setTimeout(() => {
        scrollToPosition(position);
      }, opts.scrollBehavior.delay);
    }
  }

  /**
   * Scroll to position
   */
  function scrollToPosition(position) {
    if (typeof window === 'undefined') return;

    if (position.el) {
      position.el.scrollIntoView({
        behavior: position.behavior || opts.scrollBehavior.behavior
      });
    } else {
      window.scrollTo({
        left: position.x || 0,
        top: position.y || 0,
        behavior: position.behavior || opts.scrollBehavior.behavior
      });
    }
  }

  /**
   * Save current scroll position
   */
  function saveScrollPosition(path) {
    if (!opts.scrollBehavior.savePosition || typeof window === 'undefined') return;

    state.savedPositions.set(path, {
      x: window.scrollX,
      y: window.scrollY
    });
  }

  /**
   * Navigate to a route
   */
  async function push(path, options = {}) {
    stats.navigations++;

    const from = state.currentRoute;
    const to = { path, ...options };

    // Save scroll position
    if (from) {
      saveScrollPosition(from.path);
    }

    try {
      // Execute transition (leave phase)
      if (opts.transitions.enabled) {
        await executeTransition(from?.path, path);
      }

      // Load route component
      const component = await loadRoute(path);

      // Update current route
      state.currentRoute = {
        path,
        component,
        meta: state.routes.get(path)?.meta || {},
        ...options
      };

      // Add to history
      state.history.push({
        path,
        timestamp: Date.now()
      });

      // Handle scroll
      const savedPosition = state.savedPositions.get(path);
      handleScroll(to, from, savedPosition);

      return true;
    } catch (error) {
      console.error('Navigation failed:', error);
      return false;
    }
  }

  /**
   * Replace current route
   */
  async function replace(path, options = {}) {
    const result = await push(path, options);

    if (result && state.history.length > 1) {
      // Remove the previous history entry
      state.history.splice(state.history.length - 2, 1);
    }

    return result;
  }

  /**
   * Go back in history
   */
  function back() {
    if (state.history.length > 1) {
      const previous = state.history[state.history.length - 2];
      push(previous.path);
    }
  }

  /**
   * Go forward (if supported by browser)
   */
  function forward() {
    if (typeof window !== 'undefined') {
      window.history.forward();
    }
  }

  /**
   * Prefetch multiple routes
   */
  function prefetchRoutes(paths, priority) {
    paths.forEach(path => prefetchRoute(path, priority));
  }

  /**
   * Get route by path
   */
  function getRoute(path) {
    return state.routes.get(path);
  }

  /**
   * Get all routes
   */
  function getRoutes() {
    return Array.from(state.routes.values());
  }

  /**
   * Get current route
   */
  function getCurrentRoute() {
    return state.currentRoute;
  }

  /**
   * Get router statistics
   */
  function getStats() {
    return {
      ...stats,
      routesRegistered: state.routes.size,
      prefetchQueueSize: state.prefetchQueue.length,
      activePrefetches: state.prefetching.size,
      loadedChunks: state.loadedChunks.size,
      savedPositions: state.savedPositions.size,
      historyLength: state.history.length
    };
  }

  /**
   * Clear all caches
   */
  function clearCaches() {
    state.prefetchQueue = [];
    state.prefetching.clear();
    state.savedPositions.clear();

    // Unload lazy-loaded chunks
    state.routes.forEach(route => {
      if (route.lazy && route.loaded) {
        route.loaded = false;
      }
    });

    state.loadedChunks.clear();
  }

  /**
   * Generate hash for chunk naming
   */
  function generateHash(input) {
    let hash = 0;
    for (let i = 0; i < input.length; i++) {
      const char = input.charCodeAt(i);
      hash = ((hash << 5) - hash) + char;
      hash = hash & hash;
    }
    return Math.abs(hash).toString(36).substring(0, 8);
  }

  // Initialize
  if (opts.prefetch.enabled && opts.prefetch.strategy === 'idle') {
    // Prefetch all routes on idle
    if (typeof window !== 'undefined' && 'requestIdleCallback' in window) {
      requestIdleCallback(() => {
        state.routes.forEach((route, path) => {
          if (!route.loaded) {
            prefetchRoute(path, opts.prefetch.priority.low);
          }
        });
      });
    }
  }

  return {
    addRoute,
    push,
    replace,
    back,
    forward,
    prefetchRoute,
    prefetchRoutes,
    setupPrefetchStrategy,
    getRoute,
    getRoutes,
    getCurrentRoute,
    getStats,
    clearCaches,
    // Expose state for testing
    _state: state
  };
}

// Export default instance
export const router = createRouter();
