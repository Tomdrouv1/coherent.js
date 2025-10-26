/**
 * Coherent.js Plugin Manager
 * 
 * Manages plugin lifecycle, hook execution, and plugin dependencies.
 * 
 * @module plugins/plugin-manager
 */

import {
  validatePlugin,
  checkDependencies,
  sortPluginsByDependencies,
  PluginContext
} from './plugin-system.js';

/**
 * Plugin Manager
 * Central system for managing plugins and executing hooks
 */
export class PluginManager {
  constructor(options = {}) {
    this.options = options;
    this.plugins = new Map();
    this.hooks = new Map();
    this.pluginOrder = [];
    this.enabled = options.enabled !== false;
    this.debug = options.debug || false;
  }

  /**
   * Register a plugin
   * 
   * @param {Plugin} plugin - Plugin to register
   * @throws {Error} If plugin is invalid or dependencies not satisfied
   */
  use(plugin) {
    // Validate plugin
    validatePlugin(plugin);
    
    // Check if already registered
    if (this.plugins.has(plugin.name)) {
      if (this.debug) {
        console.warn(`Plugin ${plugin.name} is already registered`);
      }
      return this;
    }
    
    // Check dependencies
    const depCheck = checkDependencies(plugin, Array.from(this.plugins.values()));
    if (!depCheck.satisfied) {
      throw new Error(
        `Plugin ${plugin.name} has unsatisfied dependencies: ${depCheck.missing.join(', ')}`
      );
    }
    
    // Install plugin
    try {
      plugin.install(this);
      this.plugins.set(plugin.name, plugin);
      
      // Update plugin order
      this.updatePluginOrder();
      
      if (this.debug) {
        console.log(`Plugin ${plugin.name} installed successfully`);
      }
    } catch (error) {
      throw new Error(`Failed to install plugin ${plugin.name}: ${error.message}`);
    }
    
    return this;
  }

  /**
   * Unregister a plugin
   * 
   * @param {string} pluginName - Name of plugin to unregister
   */
  unuse(pluginName) {
    const plugin = this.plugins.get(pluginName);
    
    if (!plugin) {
      if (this.debug) {
        console.warn(`Plugin ${pluginName} is not registered`);
      }
      return this;
    }
    
    // Check if other plugins depend on this one
    const dependents = Array.from(this.plugins.values())
      .filter(p => p.dependencies && p.dependencies.includes(pluginName));
    
    if (dependents.length > 0) {
      throw new Error(
        `Cannot uninstall plugin ${pluginName}: required by ${dependents.map(p => p.name).join(', ')}`
      );
    }
    
    // Uninstall plugin
    try {
      if (plugin.uninstall) {
        plugin.uninstall();
      }
      
      this.plugins.delete(pluginName);
      
      // Remove plugin hooks
      this.hooks.forEach((handlers, hookName) => {
        this.hooks.set(
          hookName,
          handlers.filter(h => h.plugin !== pluginName)
        );
      });
      
      // Update plugin order
      this.updatePluginOrder();
      
      if (this.debug) {
        console.log(`Plugin ${pluginName} uninstalled successfully`);
      }
    } catch (error) {
      throw new Error(`Failed to uninstall plugin ${pluginName}: ${error.message}`);
    }
    
    return this;
  }

  /**
   * Add a hook handler
   * 
   * @param {string} hookName - Hook name
   * @param {Function} handler - Hook handler function
   * @param {Object} [options] - Hook options
   * @param {string} [options.plugin] - Plugin name
   * @param {number} [options.priority] - Execution priority (higher = earlier)
   */
  addHook(hookName, handler, options = {}) {
    if (typeof handler !== 'function') {
      throw new Error('Hook handler must be a function');
    }
    
    if (!this.hooks.has(hookName)) {
      this.hooks.set(hookName, []);
    }
    
    const hookHandler = {
      handler,
      plugin: options.plugin || 'unknown',
      priority: options.priority || 0,
      once: options.once || false,
      executed: false
    };
    
    this.hooks.get(hookName).push(hookHandler);
    
    // Sort by priority (higher priority first)
    this.hooks.get(hookName).sort((a, b) => b.priority - a.priority);
    
    if (this.debug) {
      console.log(`Hook ${hookName} registered for plugin ${hookHandler.plugin}`);
    }
  }

  /**
   * Remove a hook handler
   * 
   * @param {string} hookName - Hook name
   * @param {Function} handler - Hook handler function to remove
   */
  removeHook(hookName, handler) {
    if (!this.hooks.has(hookName)) {
      return;
    }
    
    const handlers = this.hooks.get(hookName);
    const filtered = handlers.filter(h => h.handler !== handler);
    
    if (filtered.length === 0) {
      this.hooks.delete(hookName);
    } else {
      this.hooks.set(hookName, filtered);
    }
  }

  /**
   * Execute a hook
   * 
   * @param {string} hookName - Hook name
   * @param {*} data - Data to pass to hook handlers
   * @returns {Promise<*>} Modified data after all hooks
   */
  async callHook(hookName, data) {
    if (!this.enabled) {
      return data;
    }
    
    const handlers = this.hooks.get(hookName);
    
    if (!handlers || handlers.length === 0) {
      return data;
    }
    
    const context = new PluginContext(this, hookName, { data });
    let result = data;
    
    for (const hookHandler of handlers) {
      // Skip if already executed and marked as once
      if (hookHandler.once && hookHandler.executed) {
        continue;
      }
      
      // Stop if context is stopped
      if (context.isStopped()) {
        break;
      }
      
      try {
        const hookResult = await hookHandler.handler(result, context);
        
        // Update result if handler returns a value
        if (hookResult !== undefined) {
          result = hookResult;
        }
        
        // Mark as executed
        hookHandler.executed = true;
        
        if (this.debug) {
          console.log(`Hook ${hookName} executed by plugin ${hookHandler.plugin}`);
        }
      } catch (error) {
        console.error(`Error in hook ${hookName} (plugin ${hookHandler.plugin}):`, error);
        
        // Call error hook
        await this.callHook('hookError', {
          hookName,
          plugin: hookHandler.plugin,
          error
        });
        
        // Rethrow if not handled
        if (!this.options.silentErrors) {
          throw error;
        }
      }
    }
    
    return result;
  }

  /**
   * Execute a hook synchronously
   * 
   * @param {string} hookName - Hook name
   * @param {*} data - Data to pass to hook handlers
   * @returns {*} Modified data after all hooks
   */
  callHookSync(hookName, data) {
    if (!this.enabled) {
      return data;
    }
    
    const handlers = this.hooks.get(hookName);
    
    if (!handlers || handlers.length === 0) {
      return data;
    }
    
    const context = new PluginContext(this, hookName, { data });
    let result = data;
    
    for (const hookHandler of handlers) {
      if (hookHandler.once && hookHandler.executed) {
        continue;
      }
      
      if (context.isStopped()) {
        break;
      }
      
      try {
        const hookResult = hookHandler.handler(result, context);
        
        if (hookResult !== undefined) {
          result = hookResult;
        }
        
        hookHandler.executed = true;
      } catch (error) {
        console.error(`Error in hook ${hookName} (plugin ${hookHandler.plugin}):`, error);
        
        if (!this.options.silentErrors) {
          throw error;
        }
      }
    }
    
    return result;
  }

  /**
   * Get a plugin by name
   * 
   * @param {string} name - Plugin name
   * @returns {Plugin|null} Plugin instance or null
   */
  getPlugin(name) {
    return this.plugins.get(name) || null;
  }

  /**
   * Get all installed plugins
   * 
   * @returns {Array<Plugin>} Array of plugins
   */
  getPlugins() {
    return Array.from(this.plugins.values());
  }

  /**
   * Check if a plugin is installed
   * 
   * @param {string} name - Plugin name
   * @returns {boolean} True if installed
   */
  hasPlugin(name) {
    return this.plugins.has(name);
  }

  /**
   * Get all registered hooks
   * 
   * @returns {Array<string>} Array of hook names
   */
  getHooks() {
    return Array.from(this.hooks.keys());
  }

  /**
   * Check if a hook has handlers
   * 
   * @param {string} hookName - Hook name
   * @returns {boolean} True if hook has handlers
   */
  hasHook(hookName) {
    const handlers = this.hooks.get(hookName);
    return handlers && handlers.length > 0;
  }

  /**
   * Enable plugin system
   */
  enable() {
    this.enabled = true;
  }

  /**
   * Disable plugin system
   */
  disable() {
    this.enabled = false;
  }

  /**
   * Clear all plugins and hooks
   */
  clear() {
    // Uninstall all plugins
    Array.from(this.plugins.keys()).forEach(name => {
      try {
        this.unuse(name);
      } catch (error) {
        console.error(`Error uninstalling plugin ${name}:`, error);
      }
    });
    
    this.plugins.clear();
    this.hooks.clear();
    this.pluginOrder = [];
  }

  /**
   * Update plugin execution order based on dependencies
   * @private
   */
  updatePluginOrder() {
    try {
      const plugins = Array.from(this.plugins.values());
      this.pluginOrder = sortPluginsByDependencies(plugins).map(p => p.name);
    } catch (error) {
      console.error('Error updating plugin order:', error);
    }
  }

  /**
   * Get plugin statistics
   * 
   * @returns {Object} Statistics object
   */
  getStats() {
    return {
      pluginCount: this.plugins.size,
      hookCount: this.hooks.size,
      enabled: this.enabled,
      plugins: Array.from(this.plugins.values()).map(p => ({
        name: p.name,
        version: p.version,
        dependencies: p.dependencies || []
      })),
      hooks: Array.from(this.hooks.entries()).map(([name, handlers]) => ({
        name,
        handlerCount: handlers.length
      }))
    };
  }
}

/**
 * Create a plugin manager instance
 * 
 * @param {Object} [options] - Manager options
 * @param {boolean} [options.enabled=true] - Enable plugin system
 * @param {boolean} [options.debug=false] - Enable debug logging
 * @param {boolean} [options.silentErrors=false] - Suppress hook errors
 * @returns {PluginManager} Plugin manager instance
 */
export function createPluginManager(options = {}) {
  return new PluginManager(options);
}

export default PluginManager;
