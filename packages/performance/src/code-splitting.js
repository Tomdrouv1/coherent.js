/**
 * Coherent.js Code Splitting
 * 
 * Dynamic imports and code splitting utilities
 * 
 * @module performance/code-splitting
 */

/**
 * Code Splitter
 * Manages dynamic imports and lazy loading
 */
export class CodeSplitter {
  constructor(options = {}) {
    this.options = {
      preload: [],
      prefetch: [],
      timeout: 10000,
      retries: 3,
      ...options
    };
    
    this.modules = new Map();
    this.loading = new Map();
    this.failed = new Set();
  }

  /**
   * Dynamically import a module
   * 
   * @param {string} path - Module path
   * @param {Object} [options] - Import options
   * @returns {Promise} Module exports
   */
  async import(path, options = {}) {
    // Check cache
    if (this.modules.has(path)) {
      return this.modules.get(path);
    }

    // Check if already loading
    if (this.loading.has(path)) {
      return this.loading.get(path);
    }

    // Create import promise
    const importPromise = this.loadModule(path, options);
    this.loading.set(path, importPromise);

    try {
      const module = await importPromise;
      this.modules.set(path, module);
      this.loading.delete(path);
      return module;
    } catch (error) {
      this.loading.delete(path);
      this.failed.add(path);
      throw error;
    }
  }

  /**
   * Load module with retries
   */
  async loadModule(path, options = {}) {
    const maxRetries = options.retries ?? this.options.retries;
    const timeout = options.timeout ?? this.options.timeout;
    
    let lastError;
    
    for (let attempt = 0; attempt <= maxRetries; attempt++) {
      try {
        // Add cache busting if retry
        const importPath = attempt > 0 
          ? `${path}?retry=${attempt}&t=${Date.now()}`
          : path;

        // Import with timeout
        const module = await Promise.race([
          import(importPath),
          new Promise((_, reject) => 
            setTimeout(() => reject(new Error('Import timeout')), timeout)
          )
        ]);

        return module;
      } catch (error) {
        lastError = error;
        
        if (attempt < maxRetries) {
          // Exponential backoff
          await new Promise(resolve => 
            setTimeout(resolve, Math.pow(2, attempt) * 1000)
          );
        }
      }
    }

    throw new Error(`Failed to load module ${path}: ${lastError.message}`);
  }

  /**
   * Preload modules
   */
  async preload(paths) {
    const pathArray = Array.isArray(paths) ? paths : [paths];
    
    return Promise.all(
      pathArray.map(path => this.import(path).catch(err => {
        console.warn(`Failed to preload ${path}:`, err);
        return null;
      }))
    );
  }

  /**
   * Prefetch modules (low priority)
   */
  prefetch(paths) {
    const pathArray = Array.isArray(paths) ? paths : [paths];
    
    if (typeof requestIdleCallback !== 'undefined') {
      requestIdleCallback(() => {
        pathArray.forEach(path => {
          this.import(path).catch(() => {});
        });
      });
    } else {
      setTimeout(() => {
        pathArray.forEach(path => {
          this.import(path).catch(() => {});
        });
      }, 0);
    }
  }

  /**
   * Check if module is loaded
   */
  isLoaded(path) {
    return this.modules.has(path);
  }

  /**
   * Check if module is loading
   */
  isLoading(path) {
    return this.loading.has(path);
  }

  /**
   * Check if module failed to load
   */
  hasFailed(path) {
    return this.failed.has(path);
  }

  /**
   * Clear cache
   */
  clearCache(path = null) {
    if (path) {
      this.modules.delete(path);
      this.failed.delete(path);
    } else {
      this.modules.clear();
      this.failed.clear();
    }
  }

  /**
   * Get statistics
   */
  getStats() {
    return {
      loaded: this.modules.size,
      loading: this.loading.size,
      failed: this.failed.size,
      modules: Array.from(this.modules.keys())
    };
  }
}

/**
 * Create a code splitter
 */
export function createCodeSplitter(options = {}) {
  return new CodeSplitter(options);
}

/**
 * Lazy load a component
 * 
 * @param {Function} loader - Function that returns import promise
 * @param {Object} [options] - Lazy loading options
 * @returns {Function} Lazy component
 */
export function lazy(loader, options = {}) {
  let modulePromise = null;
  let module = null;
  let error = null;

  return function LazyComponent(props = {}) {
    // If already loaded, return component
    if (module) {
      const Component = module.default || module;
      return Component(props);
    }

    // If error occurred, show error
    if (error) {
      if (options.errorComponent) {
        return options.errorComponent({ error, retry: () => {
          error = null;
          modulePromise = null;
          return LazyComponent(props);
        }});
      }
      return {
        div: {
          className: 'lazy-error',
          text: `Error loading component: ${error.message}`
        }
      };
    }

    // Start loading if not already
    if (!modulePromise) {
      modulePromise = loader()
        .then(mod => {
          module = mod;
          return mod;
        })
        .catch(err => {
          error = err;
          throw err;
        });
    }

    // Show loading state
    if (options.loadingComponent) {
      return options.loadingComponent(props);
    }

    return {
      div: {
        className: 'lazy-loading',
        text: options.loadingText || 'Loading...'
      }
    };
  };
}

/**
 * Split component into chunks
 */
export function splitComponent(componentPath, options = {}) {
  const splitter = new CodeSplitter(options);
  
  return lazy(
    () => splitter.import(componentPath),
    options
  );
}

/**
 * Create route-based code splitting
 */
export function createRouteSplitter(routes) {
  const splitter = new CodeSplitter();
  const routeMap = new Map();

  // Process routes
  for (const [path, config] of Object.entries(routes)) {
    if (typeof config === 'string') {
      // Simple path to component
      routeMap.set(path, {
        loader: () => splitter.import(config)
      });
    } else {
      // Full config
      routeMap.set(path, {
        loader: () => splitter.import(config.component),
        preload: config.preload || [],
        ...config
      });
    }
  }

  return {
    /**
     * Load route component
     */
    async loadRoute(path) {
      const route = routeMap.get(path);
      if (!route) {
        throw new Error(`Route not found: ${path}`);
      }

      // Preload dependencies
      if (route.preload && route.preload.length > 0) {
        splitter.prefetch(route.preload);
      }

      // Load main component
      return await route.loader();
    },

    /**
     * Preload route
     */
    preloadRoute(path) {
      const route = routeMap.get(path);
      if (route) {
        return route.loader();
      }
    },

    /**
     * Get all routes
     */
    getRoutes() {
      return Array.from(routeMap.keys());
    },

    /**
     * Get splitter instance
     */
    getSplitter() {
      return splitter;
    }
  };
}

/**
 * Bundle analyzer helper
 */
export class BundleAnalyzer {
  constructor() {
    this.chunks = new Map();
    this.loadTimes = new Map();
  }

  /**
   * Track chunk load
   */
  trackLoad(chunkName, size, loadTime) {
    this.chunks.set(chunkName, { size, loadTime });
    this.loadTimes.set(chunkName, loadTime);
  }

  /**
   * Get bundle statistics
   */
  getStats() {
    const chunks = Array.from(this.chunks.entries());
    const totalSize = chunks.reduce((sum, [, chunk]) => sum + chunk.size, 0);
    const avgLoadTime = chunks.reduce((sum, [, chunk]) => sum + chunk.loadTime, 0) / chunks.length;

    return {
      totalChunks: chunks.length,
      totalSize,
      averageLoadTime: avgLoadTime,
      chunks: chunks.map(([name, data]) => ({
        name,
        size: data.size,
        loadTime: data.loadTime,
        percentage: (data.size / totalSize * 100).toFixed(2)
      }))
    };
  }

  /**
   * Find largest chunks
   */
  getLargestChunks(limit = 10) {
    return Array.from(this.chunks.entries())
      .sort((a, b) => b[1].size - a[1].size)
      .slice(0, limit)
      .map(([name, data]) => ({ name, ...data }));
  }

  /**
   * Find slowest chunks
   */
  getSlowestChunks(limit = 10) {
    return Array.from(this.chunks.entries())
      .sort((a, b) => b[1].loadTime - a[1].loadTime)
      .slice(0, limit)
      .map(([name, data]) => ({ name, ...data }));
  }
}

export default {
  CodeSplitter,
  createCodeSplitter,
  lazy,
  splitComponent,
  createRouteSplitter,
  BundleAnalyzer
};
