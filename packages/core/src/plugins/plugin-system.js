/**
 * Coherent.js Plugin System
 * 
 * Provides a flexible plugin architecture for extending framework functionality.
 * Plugins can hook into various lifecycle events and modify behavior.
 * 
 * @module plugins/plugin-system
 */

/**
 * Plugin lifecycle hooks
 */
export const PluginHooks = {
  // Rendering lifecycle
  BEFORE_RENDER: 'beforeRender',
  AFTER_RENDER: 'afterRender',
  RENDER_ERROR: 'renderError',
  
  // Component lifecycle
  COMPONENT_CREATED: 'componentCreated',
  COMPONENT_MOUNTED: 'componentMounted',
  COMPONENT_UPDATED: 'componentUpdated',
  COMPONENT_UNMOUNTED: 'componentUnmounted',
  
  // State lifecycle
  STATE_CHANGED: 'stateChanged',
  STATE_INITIALIZED: 'stateInitialized',
  
  // Router lifecycle
  ROUTE_CHANGED: 'routeChanged',
  ROUTE_ERROR: 'routeError',
  
  // Application lifecycle
  APP_INITIALIZED: 'appInitialized',
  APP_ERROR: 'appError',
  
  // Performance hooks
  PERFORMANCE_MEASURED: 'performanceMeasured',
  
  // Custom hooks (user-defined)
  CUSTOM: 'custom'
};

/**
 * Plugin interface that all plugins must implement
 * 
 * @typedef {Object} Plugin
 * @property {string} name - Unique plugin name
 * @property {string} [version] - Plugin version
 * @property {Array<string>} [dependencies] - Plugin dependencies
 * @property {Function} install - Plugin installation function
 * @property {Function} [uninstall] - Plugin cleanup function
 * @property {Object} [options] - Plugin configuration options
 */

/**
 * Base Plugin class that plugins can extend
 */
export class BasePlugin {
  constructor(options = {}) {
    this.name = options.name || 'unnamed-plugin';
    this.version = options.version || '1.0.0';
    this.dependencies = options.dependencies || [];
    this.options = options;
    this.hooks = new Map();
    this.installed = false;
  }

  /**
   * Install the plugin
   * @param {PluginManager} manager - Plugin manager instance
   */
  install(manager) {
    if (this.installed) {
      throw new Error(`Plugin ${this.name} is already installed`);
    }
    
    this.manager = manager;
    this.installed = true;
    
    // Register hooks
    this.registerHooks(manager);
    
    // Call plugin-specific setup
    if (this.setup) {
      this.setup(manager);
    }
  }

  /**
   * Uninstall the plugin
   */
  uninstall() {
    if (!this.installed) {
      return;
    }
    
    // Call plugin-specific cleanup
    if (this.cleanup) {
      this.cleanup();
    }
    
    // Unregister all hooks
    this.hooks.clear();
    this.installed = false;
    this.manager = null;
  }

  /**
   * Register plugin hooks (override in subclass)
   * @param {PluginManager} manager - Plugin manager instance
   */
  registerHooks(manager) {
    // Override in subclass
  }

  /**
   * Add a hook handler
   * @param {string} hookName - Hook name
   * @param {Function} handler - Hook handler function
   */
  addHook(hookName, handler) {
    if (!this.hooks.has(hookName)) {
      this.hooks.set(hookName, []);
    }
    this.hooks.get(hookName).push(handler);
  }

  /**
   * Get all handlers for a hook
   * @param {string} hookName - Hook name
   * @returns {Array<Function>} Hook handlers
   */
  getHooks(hookName) {
    return this.hooks.get(hookName) || [];
  }

  /**
   * Check if plugin has a specific hook
   * @param {string} hookName - Hook name
   * @returns {boolean} True if hook exists
   */
  hasHook(hookName) {
    return this.hooks.has(hookName) && this.hooks.get(hookName).length > 0;
  }
}

/**
 * Create a simple plugin from an object
 * 
 * @param {Object} config - Plugin configuration
 * @param {string} config.name - Plugin name
 * @param {string} [config.version] - Plugin version
 * @param {Array<string>} [config.dependencies] - Plugin dependencies
 * @param {Object} [config.hooks] - Hook handlers
 * @param {Function} [config.setup] - Setup function
 * @param {Function} [config.cleanup] - Cleanup function
 * @returns {BasePlugin} Plugin instance
 * 
 * @example
 * const myPlugin = createPlugin({
 *   name: 'my-plugin',
 *   version: '1.0.0',
 *   hooks: {
 *     beforeRender: (component) => {
 *       console.log('Rendering:', component);
 *     }
 *   }
 * });
 */
export function createPlugin(config) {
  const plugin = new BasePlugin(config);
  
  // Override registerHooks to add configured hooks
  plugin.registerHooks = function(manager) {
    if (config.hooks) {
      Object.entries(config.hooks).forEach(([hookName, handler]) => {
        manager.addHook(hookName, handler);
        this.addHook(hookName, handler);
      });
    }
  };
  
  // Add custom setup/cleanup if provided
  if (config.setup) {
    plugin.setup = config.setup;
  }
  
  if (config.cleanup) {
    plugin.cleanup = config.cleanup;
  }
  
  return plugin;
}

/**
 * Validate plugin structure
 * 
 * @param {*} plugin - Plugin to validate
 * @throws {Error} If plugin is invalid
 */
export function validatePlugin(plugin) {
  if (!plugin || typeof plugin !== 'object') {
    throw new Error('Plugin must be an object');
  }
  
  if (!plugin.name || typeof plugin.name !== 'string') {
    throw new Error('Plugin must have a name property (string)');
  }
  
  if (!plugin.install || typeof plugin.install !== 'function') {
    throw new Error('Plugin must have an install method');
  }
  
  if (plugin.dependencies && !Array.isArray(plugin.dependencies)) {
    throw new Error('Plugin dependencies must be an array');
  }
}

/**
 * Check if plugin dependencies are satisfied
 * 
 * @param {Plugin} plugin - Plugin to check
 * @param {Array<Plugin>} installedPlugins - Currently installed plugins
 * @returns {Object} Result with satisfied flag and missing dependencies
 */
export function checkDependencies(plugin, installedPlugins) {
  if (!plugin.dependencies || plugin.dependencies.length === 0) {
    return { satisfied: true, missing: [] };
  }
  
  const installedNames = new Set(installedPlugins.map(p => p.name));
  const missing = plugin.dependencies.filter(dep => !installedNames.has(dep));
  
  return {
    satisfied: missing.length === 0,
    missing
  };
}

/**
 * Sort plugins by dependencies (topological sort)
 * 
 * @param {Array<Plugin>} plugins - Plugins to sort
 * @returns {Array<Plugin>} Sorted plugins
 * @throws {Error} If circular dependencies detected
 */
export function sortPluginsByDependencies(plugins) {
  const sorted = [];
  const visited = new Set();
  const visiting = new Set();
  
  function visit(plugin) {
    if (visited.has(plugin.name)) {
      return;
    }
    
    if (visiting.has(plugin.name)) {
      throw new Error(`Circular dependency detected: ${plugin.name}`);
    }
    
    visiting.add(plugin.name);
    
    // Visit dependencies first
    if (plugin.dependencies) {
      plugin.dependencies.forEach(depName => {
        const dep = plugins.find(p => p.name === depName);
        if (dep) {
          visit(dep);
        }
      });
    }
    
    visiting.delete(plugin.name);
    visited.add(plugin.name);
    sorted.push(plugin);
  }
  
  plugins.forEach(plugin => visit(plugin));
  
  return sorted;
}

/**
 * Plugin execution context
 * Provides utilities and state to plugin hooks
 */
export class PluginContext {
  constructor(manager, hookName, data = {}) {
    this.manager = manager;
    this.hookName = hookName;
    this.data = data;
    this.stopped = false;
  }

  /**
   * Stop hook execution chain
   */
  stop() {
    this.stopped = true;
  }

  /**
   * Check if execution should stop
   * @returns {boolean} True if stopped
   */
  isStopped() {
    return this.stopped;
  }

  /**
   * Get plugin by name
   * @param {string} name - Plugin name
   * @returns {Plugin|null} Plugin instance or null
   */
  getPlugin(name) {
    return this.manager.getPlugin(name);
  }

  /**
   * Get all installed plugins
   * @returns {Array<Plugin>} Installed plugins
   */
  getPlugins() {
    return this.manager.getPlugins();
  }
}

/**
 * Export plugin utilities
 */
export default {
  BasePlugin,
  createPlugin,
  validatePlugin,
  checkDependencies,
  sortPluginsByDependencies,
  PluginHooks,
  PluginContext
};
