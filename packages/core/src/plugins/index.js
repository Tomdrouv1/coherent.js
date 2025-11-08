/**
 * Coherent.js Plugin System
 * 
 * @module plugins
 */

export {
  BasePlugin,
  createPlugin,
  validatePlugin,
  checkDependencies,
  sortPluginsByDependencies,
  PluginHooks,
  PluginContext
} from './plugin-system.js';

export {
  PluginManager,
  createPluginManager
} from './plugin-manager.js';

export {
  createPerformancePlugin,
  createDevLoggerPlugin,
  createAnalyticsPlugin,
  createCachePlugin,
  createErrorRecoveryPlugin,
  createValidationPlugin,
  createHydrationPlugin
} from './built-in-plugins.js';

// Default export
export { createPluginManager as default } from './plugin-manager.js';
