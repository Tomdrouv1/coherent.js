/**
 * ModuleTracker - Tracks module graph and HMR boundaries
 *
 * Provides a Vite-compatible hot context API for modules to declare
 * how they should be handled during HMR updates. Tracks accept/dispose
 * handlers and persistent data that survives updates.
 *
 * @module @coherent.js/client/hmr/module-tracker
 */

/**
 * Tracks module HMR registrations and provides hot context API
 */
export class ModuleTracker {
  constructor() {
    /**
     * Module registrations map
     * @type {Map<string, { accept: Function|null, acceptDeps: { deps: string[], callback: Function }|null, dispose: Function|null, prune: Function|null, data: Object }>}
     */
    this.modules = new Map();

    /**
     * WebSocket reference for invalidation messages
     * @type {WebSocket|null}
     */
    this.socket = null;
  }

  /**
   * Set WebSocket reference for invalidation messages
   * @param {WebSocket|null} socket - WebSocket connection
   */
  setSocket(socket) {
    this.socket = socket;
  }

  /**
   * Create a hot context for a module (Vite-compatible API)
   *
   * Returns an object with:
   * - data: Persistent object that survives HMR updates
   * - accept(callback): Register self-update handler
   * - acceptDeps(deps, callback): Register dependency update handler
   * - dispose(callback): Register cleanup handler called before replacement
   * - prune(callback): Register handler for when module is removed
   * - invalidate(message): Signal that module cannot hot-update
   *
   * @param {string} moduleId - Unique identifier for the module
   * @returns {Object} Hot context object
   */
  createHotContext(moduleId) {
    // Get or create module data, preserving existing data object
    let moduleData = this.modules.get(moduleId);
    if (!moduleData) {
      moduleData = {
        accept: null,
        acceptDeps: null,
        dispose: null,
        prune: null,
        data: {},
      };
      this.modules.set(moduleId, moduleData);
    }

    const tracker = this;

    return {
      /**
       * Persistent data object that survives HMR updates.
       * Use this to preserve state across module replacements.
       */
      get data() {
        return moduleData.data;
      },

      /**
       * Accept self updates.
       * Called when this module is updated and can handle its own replacement.
       *
       * @param {Function} [callback] - Optional callback receiving the new module
       */
      accept(callback) {
        moduleData.accept = callback || (() => {});
      },

      /**
       * Accept dependency updates.
       * Called when one of the specified dependencies is updated.
       *
       * @param {string|string[]} deps - Dependency module ID(s)
       * @param {Function} callback - Callback receiving updated dependencies
       */
      acceptDeps(deps, callback) {
        const depsArray = Array.isArray(deps) ? deps : [deps];
        moduleData.acceptDeps = { deps: depsArray, callback };
      },

      /**
       * Register disposal callback.
       * Called before the module is replaced, receives the data object
       * to allow saving state for the next version.
       *
       * @param {Function} callback - Cleanup handler, receives data object
       */
      dispose(callback) {
        moduleData.dispose = callback;
      },

      /**
       * Register prune callback.
       * Called when the module is completely removed from the module graph.
       *
       * @param {Function} callback - Prune handler
       */
      prune(callback) {
        moduleData.prune = callback;
      },

      /**
       * Invalidate this module.
       * Signals that the module cannot be hot-updated and should propagate
       * the update to its importers.
       *
       * @param {string} [message] - Optional message explaining why
       */
      invalidate(message) {
        if (tracker.socket?.readyState === WebSocket.OPEN) {
          tracker.socket.send(JSON.stringify({
            type: 'invalidate',
            moduleId,
            message,
          }));
        }
        // Log for debugging
        console.log(`[HMR] Module ${moduleId} invalidated${message ? `: ${message}` : ''}`);
      },
    };
  }

  /**
   * Check if a module can be hot-updated
   *
   * Returns true if the module has registered an accept handler.
   *
   * @param {string} moduleId - Module identifier
   * @returns {boolean} True if module accepts HMR updates
   */
  canHotUpdate(moduleId) {
    const moduleData = this.modules.get(moduleId);
    return !!(moduleData?.accept || moduleData?.acceptDeps);
  }

  /**
   * Check if a module is an HMR boundary
   *
   * A module is considered a boundary if:
   * - It has an accept handler registered
   * - It exports __hmrBoundary = true
   * - It is associated with a data-coherent-component element
   *
   * @param {string} moduleId - Module identifier
   * @param {Object} [moduleExports] - Optional module exports to check for __hmrBoundary
   * @returns {boolean} True if module is an HMR boundary
   */
  isHmrBoundary(moduleId, moduleExports) {
    // Check for accept handler
    if (this.canHotUpdate(moduleId)) {
      return true;
    }

    // Check for explicit __hmrBoundary export
    if (moduleExports?.__hmrBoundary === true) {
      return true;
    }

    // Check for coherent component presence (by convention)
    // Extract component name from module path
    const componentName = this.extractComponentName(moduleId);
    if (componentName && typeof document !== 'undefined') {
      const hasComponent = document.querySelector(
        `[data-coherent-component="${componentName}"]`
      );
      if (hasComponent) {
        return true;
      }
    }

    return false;
  }

  /**
   * Extract a potential component name from module path
   *
   * @param {string} moduleId - Module path
   * @returns {string|null} Component name or null
   * @private
   */
  extractComponentName(moduleId) {
    // Extract filename without extension
    const match = moduleId.match(/\/([^/]+?)(?:\.[^.]+)?$/);
    if (match) {
      return match[1];
    }
    return null;
  }

  /**
   * Execute dispose callback for a module
   *
   * Calls the registered dispose handler with the data object,
   * allowing the module to save state for the next version.
   *
   * @param {string} moduleId - Module identifier
   * @returns {Object|null} The data object (for passing to next version)
   */
  executeDispose(moduleId) {
    const moduleData = this.modules.get(moduleId);
    if (!moduleData) {
      return null;
    }

    // Call dispose handler with data object
    if (typeof moduleData.dispose === 'function') {
      try {
        moduleData.dispose(moduleData.data);
      } catch (err) {
        console.error(`[HMR] Error in dispose handler for ${moduleId}:`, err);
      }
    }

    return moduleData.data;
  }

  /**
   * Execute accept callback for a module
   *
   * Calls the registered accept handler with the new module.
   *
   * @param {string} moduleId - Module identifier
   * @param {Object} [newModule] - The newly imported module
   * @returns {boolean} True if accept handler was called
   */
  executeAccept(moduleId, newModule) {
    const moduleData = this.modules.get(moduleId);
    if (!moduleData?.accept) {
      return false;
    }

    try {
      moduleData.accept(newModule);
      return true;
    } catch (err) {
      console.error(`[HMR] Error in accept handler for ${moduleId}:`, err);
      return false;
    }
  }

  /**
   * Execute acceptDeps callback for a module
   *
   * Calls the registered acceptDeps handler with the updated dependencies.
   *
   * @param {string} moduleId - Module identifier
   * @param {Object} updatedDeps - Map of dependency moduleId -> new module
   * @returns {boolean} True if acceptDeps handler was called
   */
  executeAcceptDeps(moduleId, updatedDeps) {
    const moduleData = this.modules.get(moduleId);
    if (!moduleData?.acceptDeps) {
      return false;
    }

    try {
      const { deps, callback } = moduleData.acceptDeps;
      // Build array of updated modules in same order as deps
      const modules = deps.map((dep) => updatedDeps[dep]);
      callback(modules);
      return true;
    } catch (err) {
      console.error(`[HMR] Error in acceptDeps handler for ${moduleId}:`, err);
      return false;
    }
  }

  /**
   * Execute prune callback for a module
   *
   * Called when a module is removed from the module graph.
   *
   * @param {string} moduleId - Module identifier
   */
  executePrune(moduleId) {
    const moduleData = this.modules.get(moduleId);
    if (!moduleData?.prune) {
      return;
    }

    try {
      moduleData.prune();
    } catch (err) {
      console.error(`[HMR] Error in prune handler for ${moduleId}:`, err);
    }

    // Remove module from tracking
    this.modules.delete(moduleId);
  }

  /**
   * Check if module is registered
   *
   * @param {string} moduleId - Module identifier
   * @returns {boolean} True if module is registered
   */
  hasModule(moduleId) {
    return this.modules.has(moduleId);
  }

  /**
   * Get module data (for testing/debugging)
   *
   * @param {string} moduleId - Module identifier
   * @returns {Object|null} Module data or null
   */
  getModuleData(moduleId) {
    return this.modules.get(moduleId) || null;
  }

  /**
   * Clear all module registrations (for testing)
   */
  clear() {
    this.modules.clear();
  }
}

/**
 * Singleton module tracker instance
 * @type {ModuleTracker}
 */
export const moduleTracker = new ModuleTracker();

/**
 * Convenience function to create a hot context for a module
 *
 * @param {string} moduleId - Module identifier
 * @returns {Object} Hot context object
 */
export function createHotContext(moduleId) {
  return moduleTracker.createHotContext(moduleId);
}
