/**
 * Enhanced Routing System
 *
 * Provides advanced routing features:
 * - Route patterns with `:param` segments and a trailing `*`
 * - Browser history integration (`start()`): pushState/replaceState,
 *   back/forward via popstate, `mode: 'hash'` and a `base` path, and
 *   interception of clicks on links to registered routes
 * - Route prefetching strategies
 * - Page transitions
 * - Code splitting per route
 * - Advanced scroll behavior
 *
 * The router resolves routes and tracks the current one; rendering the
 * matched component is left to the application (see getCurrentRoute()).
 */

/**
 * Compile a route pattern: `/users/:id` captures `id`, a trailing `/*`
 * captures the rest as `params.pathMatch`.
 * @param {string} pattern
 * @returns {{ regex: RegExp, keys: string[] } | null} null for a static path
 */
function compilePattern(pattern) {
  if (!pattern.includes(':') && !pattern.includes('*')) {
    return null;
  }
  const keys = [];
  const source = pattern
    .split('/')
    .map((segment) => {
      if (segment === '*') {
        keys.push('pathMatch');
        return '(.*)';
      }
      if (segment.startsWith(':')) {
        keys.push(segment.slice(1));
        return '([^/]+)';
      }
      return segment.replace(/[.*+?^${}()|[\]\\]/g, '\\$&');
    })
    .join('/');
  return { regex: new RegExp(`^${source}/?$`), keys };
}

/**
 * Split `/path?query#hash` into its parts.
 * @param {string} fullPath
 * @returns {{ path: string, query: Object, hash: string }}
 */
function parseLocation(fullPath) {
  let rest = String(fullPath);
  let hash = '';
  const hashIndex = rest.indexOf('#');
  if (hashIndex !== -1) {
    hash = rest.slice(hashIndex);
    rest = rest.slice(0, hashIndex);
  }
  let search = '';
  const queryIndex = rest.indexOf('?');
  if (queryIndex !== -1) {
    search = rest.slice(queryIndex + 1);
    rest = rest.slice(0, queryIndex);
  }
  return {
    path: rest || '/',
    query: Object.fromEntries(new URLSearchParams(search)),
    hash,
  };
}

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

  // '/app/' and '/app' mean the same base; '/' means none. Trimmed with a
  // loop: /\/+$/ is quadratic on input like '////…x'.
  let baseEnd = opts.base.length;
  while (baseEnd > 0 && opts.base[baseEnd - 1] === '/') baseEnd--;
  const base = opts.base.slice(0, baseEnd);

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
    transitionState: null,
    forwardStack: []
  };

  /** Incremented per navigation; only the latest one may commit */
  let navigationId = 0;

  /** Browser listeners attached by start() */
  let listening = null;

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
      pattern: compilePattern(path),
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
   * Find the route for a path: an exact registration first, then patterns in
   * registration order.
   * @param {string} path - Path without query or hash
   * @returns {{ route: Object, params: Object } | null}
   */
  function matchRoute(path) {
    const exact = state.routes.get(path);
    if (exact) {
      return { route: exact, params: {} };
    }
    for (const route of state.routes.values()) {
      const match = route.pattern?.regex.exec(path);
      if (match) {
        const params = {};
        route.pattern.keys.forEach((key, i) => {
          params[key] = decodeURIComponent(match[i + 1]);
        });
        return { route, params };
      }
    }
    return null;
  }

  /**
   * Load a route component
   */
  async function loadRoute(path) {
    const route = state.routes.get(path) ?? matchRoute(parseLocation(path).path)?.route;
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

    const route = state.routes.get(path) ?? matchRoute(parseLocation(path).path)?.route;
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
    // Without a DOM there is nothing to scroll. This runs after the route is
    // committed, so throwing here (document is not defined) reported a
    // navigation that had happened as failed.
    if (!opts.scrollBehavior.enabled || typeof document === 'undefined') return;

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
      // Scroll to hash. By id rather than querySelector(to.hash), which
      // throws on ids that aren't valid selectors (#123, #a.b).
      let id = to.hash.slice(1);
      try {
        id = decodeURIComponent(id);
      } catch {
        // keep the raw id
      }
      const element = document.getElementById(id);
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

  /** Whether the browser History API is available */
  function hasHistoryApi() {
    return typeof window !== 'undefined' &&
      Boolean(window.history) &&
      typeof window.history.pushState === 'function';
  }

  /** The URL written to the address bar for a router path */
  function toURL(fullPath) {
    if (opts.mode === 'hash') {
      return `#${fullPath}`;
    }
    return `${base}${fullPath}` || '/';
  }

  /** The router path of the browser's current location */
  function currentLocation() {
    if (opts.mode === 'hash') {
      return window.location.hash.slice(1) || '/';
    }
    let path = window.location.pathname;
    if (base && (path === base || path.startsWith(`${base}/`))) {
      path = path.slice(base.length) || '/';
    }
    return `${path}${window.location.search}${window.location.hash}`;
  }

  /**
   * Resolve, guard, load and commit a navigation.
   *
   * @param {string} fullPath - Path, optionally with ?query and #hash
   * @param {Object} options - Extra fields for the route record
   * @param {'push'|'replace'|'pop'} historyAction - How to record it
   * @returns {Promise<boolean>} false when not found, cancelled by a guard,
   *   failed, or superseded by a later navigation
   */
  async function navigate(fullPath, options, historyAction) {
    stats.navigations++;
    const id = ++navigationId;

    const from = state.currentRoute;
    const location = parseLocation(fullPath);
    const matched = matchRoute(location.path);
    const to = {
      ...options,
      path: location.path,
      fullPath: String(fullPath),
      params: matched?.params ?? {},
      query: location.query,
      hash: location.hash,
      meta: matched?.route.meta ?? {}
    };

    // Save scroll position
    if (from) {
      saveScrollPosition(from.path);
    }

    try {
      if (!matched) {
        throw new Error(`Route not found: ${location.path}`);
      }

      // Guards: returning false cancels the navigation
      const leaving = from ? matchRoute(from.path)?.route : null;
      if (leaving?.beforeLeave && (await leaving.beforeLeave(to, from)) === false) {
        return false;
      }
      if (matched.route.beforeEnter && (await matched.route.beforeEnter(to, from)) === false) {
        return false;
      }
      if (id !== navigationId) {
        return false;
      }

      // Execute transition (leave phase)
      if (opts.transitions.enabled) {
        await executeTransition(from?.path, location.path);
      }

      // Load route component
      const component = await loadRoute(matched.route.path);

      // A later navigation started meanwhile: it wins
      if (id !== navigationId) {
        return false;
      }

      // Update current route
      state.currentRoute = { ...to, component };

      // Record in history
      const entry = { path: location.path, fullPath: String(fullPath), timestamp: Date.now() };
      if (historyAction === 'replace' && state.history.length > 0) {
        state.history[state.history.length - 1] = entry;
      } else if (historyAction === 'push' || state.history.length === 0) {
        state.history.push(entry);
        if (historyAction === 'push') state.forwardStack = [];
      }

      if (hasHistoryApi() && historyAction !== 'pop') {
        const method = historyAction === 'replace' ? 'replaceState' : 'pushState';
        window.history[method]({ path: String(fullPath) }, '', toURL(String(fullPath)));
      }

      // Handle scroll
      const savedPosition = state.savedPositions.get(location.path);
      handleScroll(to, from, historyAction === 'pop' ? savedPosition : null);

      return true;
    } catch (error) {
      console.error('Navigation failed:', error);
      return false;
    }
  }

  /**
   * Navigate to a route, adding a history entry
   */
  function push(path, options = {}) {
    return navigate(path, options, 'push');
  }

  /**
   * Replace current route (and the current history entry)
   */
  function replace(path, options = {}) {
    return navigate(path, options, 'replace');
  }

  /**
   * Go back in history. After start() the browser's history drives it
   * (popstate); otherwise the router's own history is used.
   */
  function back() {
    if (listening) {
      window.history.back();
      return;
    }
    if (state.history.length > 1) {
      state.forwardStack.push(state.history.pop());
      const previous = state.history[state.history.length - 1];
      navigate(previous.fullPath ?? previous.path, {}, 'pop');
    }
  }

  /**
   * Go forward in history
   */
  function forward() {
    if (listening) {
      window.history.forward();
      return;
    }
    const next = state.forwardStack.pop();
    if (next) {
      state.history.push(next);
      navigate(next.fullPath ?? next.path, {}, 'pop');
    }
  }

  /**
   * Follow the browser: navigate to the current location, then handle
   * back/forward (popstate, or hashchange in hash mode) and, unless
   * `interceptLinks` is false, clicks on same-origin links whose path is a
   * registered route. Idempotent; stop() detaches.
   *
   * @param {Object} [startOptions]
   * @param {boolean} [startOptions.interceptLinks=true]
   * @returns {Promise<boolean>} Result of the initial navigation
   */
  function start(startOptions = {}) {
    if (typeof window === 'undefined' || listening) {
      return Promise.resolve(false);
    }

    const onPop = () => {
      navigate(currentLocation(), {}, 'pop');
    };

    const onClick = (event) => {
      if (event.defaultPrevented || event.button !== 0 ||
          event.metaKey || event.ctrlKey || event.shiftKey || event.altKey) {
        return;
      }
      const link = typeof event.target?.closest === 'function' ? event.target.closest('a[href]') : null;
      const target = link?.getAttribute('target');
      if (!link || link.hasAttribute('download') || link.hasAttribute('data-router-ignore') ||
          (target && target !== '_self')) {
        return;
      }

      let url;
      try {
        url = new URL(link.getAttribute('href'), window.location.href);
      } catch {
        return;
      }
      if (url.origin !== window.location.origin) return;

      let fullPath;
      if (opts.mode === 'hash') {
        if (!url.hash.startsWith('#/')) return;
        fullPath = url.hash.slice(1);
      } else {
        if (base && url.pathname !== base && !url.pathname.startsWith(`${base}/`)) return;
        fullPath = `${url.pathname.slice(base.length) || '/'}${url.search}${url.hash}`;
      }
      if (!matchRoute(parseLocation(fullPath).path)) return;

      event.preventDefault();
      push(fullPath);
    };

    const popEvent = opts.mode === 'hash' ? 'hashchange' : 'popstate';
    window.addEventListener(popEvent, onPop);
    if (startOptions.interceptLinks !== false && typeof document !== 'undefined') {
      document.addEventListener('click', onClick);
    }
    listening = { popEvent, onPop, onClick };

    return navigate(currentLocation(), {}, 'replace');
  }

  /**
   * Detach the listeners added by start()
   */
  function stop() {
    if (!listening) return;
    window.removeEventListener(listening.popEvent, listening.onPop);
    if (typeof document !== 'undefined') {
      document.removeEventListener('click', listening.onClick);
    }
    listening = null;
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
    return state.routes.get(path) ?? matchRoute(parseLocation(path).path)?.route;
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
    start,
    stop,
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
