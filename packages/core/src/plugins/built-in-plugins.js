/**
 * Built-in Coherent.js Plugins
 * 
 * Collection of official plugins that demonstrate plugin capabilities
 * and provide common functionality.
 * 
 * @module plugins/built-in-plugins
 */

import { createPlugin, PluginHooks } from './plugin-system.js';

/**
 * Performance Monitoring Plugin
 * Tracks rendering performance and logs slow renders
 */
export function createPerformancePlugin(options = {}) {
  const {
    threshold = 16, // 16ms = 60fps
    logSlowRenders = true,
    collectMetrics = true
  } = options;
  
  const metrics = {
    renders: 0,
    totalTime: 0,
    slowRenders: 0,
    averageTime: 0
  };
  
  return createPlugin({
    name: 'performance-monitor',
    version: '1.0.0',
    
    hooks: {
      [PluginHooks.BEFORE_RENDER]: (component, context) => {
        if (collectMetrics) {
          context.data.startTime = performance.now();
        }
        return component;
      },
      
      [PluginHooks.AFTER_RENDER]: (result, context) => {
        if (collectMetrics && context.data.startTime) {
          const duration = performance.now() - context.data.startTime;
          
          metrics.renders++;
          metrics.totalTime += duration;
          metrics.averageTime = metrics.totalTime / metrics.renders;
          
          if (duration > threshold) {
            metrics.slowRenders++;
            
            if (logSlowRenders) {
              console.warn(
                `Slow render detected: ${duration.toFixed(2)}ms (threshold: ${threshold}ms)`
              );
            }
          }
        }
        
        return result;
      }
    },
    
    setup(manager) {
      // Add method to get metrics
      this.getMetrics = () => ({ ...metrics });
      
      // Add method to reset metrics
      this.resetMetrics = () => {
        metrics.renders = 0;
        metrics.totalTime = 0;
        metrics.slowRenders = 0;
        metrics.averageTime = 0;
      };
    }
  });
}

/**
 * Development Logger Plugin
 * Logs component lifecycle events for debugging
 */
export function createDevLoggerPlugin(options = {}) {
  const {
    logRenders = true,
    logStateChanges = true,
    logErrors = true,
    prefix = '[Coherent]'
  } = options;
  
  return createPlugin({
    name: 'dev-logger',
    version: '1.0.0',
    
    hooks: {
      [PluginHooks.BEFORE_RENDER]: (component) => {
        if (logRenders) {
          console.log(`${prefix} Rendering component:`, component);
        }
        return component;
      },
      
      [PluginHooks.STATE_CHANGED]: (state, context) => {
        if (logStateChanges) {
          console.log(`${prefix} State changed:`, state);
        }
        return state;
      },
      
      [PluginHooks.RENDER_ERROR]: (error) => {
        if (logErrors) {
          console.error(`${prefix} Render error:`, error);
        }
        return error;
      }
    }
  });
}

/**
 * Analytics Plugin
 * Tracks component renders and user interactions
 */
export function createAnalyticsPlugin(options = {}) {
  const {
    trackRenders = true,
    trackErrors = true,
    onEvent = null
  } = options;
  
  const events = [];
  
  function trackEvent(eventType, data) {
    const event = {
      type: eventType,
      timestamp: Date.now(),
      data
    };
    
    events.push(event);
    
    if (onEvent) {
      onEvent(event);
    }
  }
  
  return createPlugin({
    name: 'analytics',
    version: '1.0.0',
    
    hooks: {
      [PluginHooks.AFTER_RENDER]: (result, context) => {
        if (trackRenders) {
          trackEvent('render', {
            duration: context.data.duration,
            component: context.data.component
          });
        }
        return result;
      },
      
      [PluginHooks.RENDER_ERROR]: (error) => {
        if (trackErrors) {
          trackEvent('error', {
            message: error.message,
            stack: error.stack
          });
        }
        return error;
      }
    },
    
    setup() {
      this.getEvents = () => [...events];
      this.clearEvents = () => { events.length = 0; };
    }
  });
}

/**
 * Cache Plugin
 * Caches rendered components for better performance
 */
export function createCachePlugin(options = {}) {
  const {
    maxSize = 100,
    ttl = 60000, // 1 minute
    enabled = true
  } = options;
  
  const cache = new Map();
  
  function getCacheKey(component) {
    return JSON.stringify(component);
  }
  
  function cleanExpired() {
    const now = Date.now();
    for (const [key, entry] of cache.entries()) {
      if (now - entry.timestamp > ttl) {
        cache.delete(key);
      }
    }
  }
  
  return createPlugin({
    name: 'cache',
    version: '1.0.0',
    
    hooks: {
      [PluginHooks.BEFORE_RENDER]: (component, context) => {
        if (!enabled) return component;
        
        const key = getCacheKey(component);
        const cached = cache.get(key);
        
        if (cached && Date.now() - cached.timestamp < ttl) {
          context.data.cached = true;
          context.data.cachedResult = cached.result;
          context.stop(); // Skip rendering
        }
        
        return component;
      },
      
      [PluginHooks.AFTER_RENDER]: (result, context) => {
        if (!enabled || context.data.cached) return result;
        
        const key = getCacheKey(context.data.component);
        
        // Clean expired entries if cache is full
        if (cache.size >= maxSize) {
          cleanExpired();
          
          // If still full, remove oldest entry
          if (cache.size >= maxSize) {
            const firstKey = cache.keys().next().value;
            cache.delete(firstKey);
          }
        }
        
        cache.set(key, {
          result,
          timestamp: Date.now()
        });
        
        return result;
      }
    },
    
    setup() {
      this.clear = () => cache.clear();
      this.getSize = () => cache.size;
      this.getStats = () => ({
        size: cache.size,
        maxSize,
        ttl
      });
    }
  });
}

/**
 * Error Recovery Plugin
 * Provides fallback rendering when errors occur
 */
export function createErrorRecoveryPlugin(options = {}) {
  const {
    fallbackComponent = { div: { text: 'An error occurred' } },
    onError = null,
    retryCount = 0
  } = options;
  
  return createPlugin({
    name: 'error-recovery',
    version: '1.0.0',
    
    hooks: {
      [PluginHooks.RENDER_ERROR]: (error, context) => {
        if (onError) {
          onError(error, context);
        }
        
        // Provide fallback
        context.data.fallback = fallbackComponent;
        
        // Retry if configured
        if (retryCount > 0 && (!context.data.retries || context.data.retries < retryCount)) {
          context.data.retries = (context.data.retries || 0) + 1;
          context.data.shouldRetry = true;
        }
        
        return error;
      }
    }
  });
}

/**
 * Validation Plugin
 * Validates component structure before rendering
 */
export function createValidationPlugin(options = {}) {
  const {
    strict = false,
    throwOnError = false
  } = options;
  
  function validateComponent(component) {
    if (!component || typeof component !== 'object') {
      return { valid: false, error: 'Component must be an object' };
    }
    
    if (strict) {
      // Strict validation rules
      const keys = Object.keys(component);
      if (keys.length === 0) {
        return { valid: false, error: 'Component cannot be empty' };
      }
    }
    
    return { valid: true };
  }
  
  return createPlugin({
    name: 'validation',
    version: '1.0.0',
    
    hooks: {
      [PluginHooks.BEFORE_RENDER]: (component, context) => {
        const validation = validateComponent(component);
        
        if (!validation.valid) {
          const error = new Error(`Component validation failed: ${validation.error}`);
          
          if (throwOnError) {
            throw error;
          } else {
            console.warn('[Validation Plugin]', error.message);
          }
        }
        
        return component;
      }
    }
  });
}

/**
 * Hydration Helper Plugin
 * Adds hydration markers to components
 */
export function createHydrationPlugin(options = {}) {
  const {
    addMarkers = true,
    markerPrefix = 'coh'
  } = options;
  
  let componentId = 0;
  
  return createPlugin({
    name: 'hydration-helper',
    version: '1.0.0',
    
    hooks: {
      [PluginHooks.BEFORE_RENDER]: (component, context) => {
        if (addMarkers && component && typeof component === 'object') {
          const id = `${markerPrefix}-${componentId++}`;
          context.data.hydrationId = id;
          
          // Add marker to component
          if (!component['data-hydration-id']) {
            component['data-hydration-id'] = id;
          }
        }
        
        return component;
      }
    },
    
    setup() {
      this.resetCounter = () => { componentId = 0; };
    }
  });
}

/**
 * Export all built-in plugins
 */
export default {
  createPerformancePlugin,
  createDevLoggerPlugin,
  createAnalyticsPlugin,
  createCachePlugin,
  createErrorRecoveryPlugin,
  createValidationPlugin,
  createHydrationPlugin
};
