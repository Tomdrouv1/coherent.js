/**
 * CleanupTracker - Tracks and automatically cleans up module resources during HMR
 *
 * Prevents memory leaks by tracking timers, intervals, event listeners, and fetch
 * requests created by modules. When a module is disposed during HMR, all its
 * tracked resources are automatically cleaned up.
 *
 * @module @coherent.js/client/hmr/cleanup-tracker
 */

/**
 * Tracks module resources for cleanup during HMR
 */
export class CleanupTracker {
  constructor() {
    /**
     * Per-module resource tracking
     * @type {Map<string, { timers: Set<number>, intervals: Set<number>, listeners: Array, abortControllers: Set<AbortController> }>}
     */
    this.moduleResources = new Map();
  }

  /**
   * Create a tracked context for a module
   *
   * Returns an object with tracked versions of setTimeout, setInterval,
   * addEventListener, and fetch that automatically clean up on module disposal.
   *
   * @param {string} moduleId - Unique identifier for the module
   * @returns {Object} Tracked context with setTimeout, setInterval, etc.
   */
  createContext(moduleId) {
    const resources = {
      timers: new Set(),
      intervals: new Set(),
      listeners: [],
      abortControllers: new Set(),
    };

    this.moduleResources.set(moduleId, resources);

    const context = {
      /**
       * Tracked setTimeout - auto-removes from tracking on completion
       * @param {Function} callback - Function to execute
       * @param {number} delay - Delay in milliseconds
       * @param {...*} args - Additional arguments to pass to callback
       * @returns {number} Timer ID
       */
      setTimeout: (callback, delay, ...args) => {
        const id = setTimeout(
          (...a) => {
            resources.timers.delete(id);
            callback(...a);
          },
          delay,
          ...args
        );
        resources.timers.add(id);
        return id;
      },

      /**
       * Tracked setInterval - stores in intervals set until cleared
       * @param {Function} callback - Function to execute
       * @param {number} delay - Interval in milliseconds
       * @param {...*} args - Additional arguments to pass to callback
       * @returns {number} Interval ID
       */
      setInterval: (callback, delay, ...args) => {
        const id = setInterval(callback, delay, ...args);
        resources.intervals.add(id);
        return id;
      },

      /**
       * Clear a tracked timeout
       * @param {number} id - Timer ID to clear
       */
      clearTimeout: (id) => {
        resources.timers.delete(id);
        clearTimeout(id);
      },

      /**
       * Clear a tracked interval
       * @param {number} id - Interval ID to clear
       */
      clearInterval: (id) => {
        resources.intervals.delete(id);
        clearInterval(id);
      },

      /**
       * Tracked addEventListener - stores listener info for removal on cleanup
       * @param {EventTarget} target - Element or object to attach listener to
       * @param {string} event - Event type
       * @param {Function} handler - Event handler function
       * @param {Object|boolean} [options] - Listener options
       */
      addEventListener: (target, event, handler, options) => {
        target.addEventListener(event, handler, options);
        resources.listeners.push({ target, event, handler, options });
      },

      /**
       * Create a tracked AbortController
       * @returns {AbortController} Tracked AbortController
       */
      createAbortController: () => {
        const controller = new AbortController();
        resources.abortControllers.add(controller);
        return controller;
      },

      /**
       * Tracked fetch - creates AbortController automatically, cleans up on completion
       * @param {string|URL} url - URL to fetch
       * @param {Object} [options] - Fetch options
       * @returns {Promise<Response>} Fetch promise
       */
      fetch: (url, options = {}) => {
        const controller = new AbortController();
        resources.abortControllers.add(controller);

        // Merge signals if one was provided
        const mergedOptions = {
          ...options,
          signal: controller.signal,
        };

        return fetch(url, mergedOptions).finally(() => {
          resources.abortControllers.delete(controller);
        });
      },
    };

    return context;
  }

  /**
   * Cleanup all resources for a module
   *
   * Called during HMR module disposal. Clears all timers, intervals,
   * removes all event listeners, and aborts all pending fetch requests.
   *
   * @param {string} moduleId - Module identifier to clean up
   */
  cleanup(moduleId) {
    const resources = this.moduleResources.get(moduleId);
    if (!resources) return;

    // Clear all timers
    for (const id of resources.timers) {
      clearTimeout(id);
    }
    resources.timers.clear();

    // Clear all intervals
    for (const id of resources.intervals) {
      clearInterval(id);
    }
    resources.intervals.clear();

    // Remove all event listeners
    for (const { target, event, handler, options } of resources.listeners) {
      try {
        target.removeEventListener(event, handler, options);
      } catch {
        // Target may no longer exist
      }
    }
    resources.listeners.length = 0;

    // Abort all pending fetches
    for (const controller of resources.abortControllers) {
      try {
        controller.abort();
      } catch {
        // Ignore abort errors
      }
    }
    resources.abortControllers.clear();

    this.moduleResources.delete(moduleId);
  }

  /**
   * Check for potential resource leaks (for development mode)
   *
   * Logs warnings if resources weren't cleaned up before module disposal.
   * Call this before cleanup() to detect potential leaks.
   *
   * @param {string} moduleId - Module identifier to check
   */
  checkForLeaks(moduleId) {
    const resources = this.moduleResources.get(moduleId);
    if (!resources) return;

    const warnings = [];

    if (resources.timers.size > 0) {
      warnings.push(`${resources.timers.size} timer(s) not cleaned up`);
    }
    if (resources.intervals.size > 0) {
      warnings.push(`${resources.intervals.size} interval(s) not cleaned up`);
    }
    if (resources.listeners.length > 0) {
      warnings.push(`${resources.listeners.length} listener(s) not cleaned up`);
    }
    if (resources.abortControllers.size > 0) {
      warnings.push(
        `${resources.abortControllers.size} pending fetch(es) not aborted`
      );
    }

    if (warnings.length > 0) {
      console.warn(`[HMR] Potential leak in module ${moduleId}: ${warnings.join(', ')}`);
    }
  }

  /**
   * Check if a module has tracked resources
   * @param {string} moduleId - Module identifier
   * @returns {boolean} True if module has resources
   */
  hasResources(moduleId) {
    return this.moduleResources.has(moduleId);
  }

  /**
   * Get resource counts for a module (for testing/debugging)
   * @param {string} moduleId - Module identifier
   * @returns {Object|null} Resource counts or null if module not tracked
   */
  getResourceCounts(moduleId) {
    const resources = this.moduleResources.get(moduleId);
    if (!resources) return null;

    return {
      timers: resources.timers.size,
      intervals: resources.intervals.size,
      listeners: resources.listeners.length,
      abortControllers: resources.abortControllers.size,
    };
  }
}

/**
 * Singleton cleanup tracker instance
 * @type {CleanupTracker}
 */
export const cleanupTracker = new CleanupTracker();
