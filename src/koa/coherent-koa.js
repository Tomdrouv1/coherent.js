/**
 * Koa.js integration for Coherent.js
 * Provides middleware and utilities for using Coherent.js with Koa
 */

import { renderToString } from '../rendering/html-renderer.js';
import { performanceMonitor } from '../performance/monitor.js';
import { importPeerDependency } from '../utils/dependency-utils.js';

/**
 * Coherent.js Koa middleware
 * Automatically renders Coherent.js components and handles errors
 * 
 * @param {Object} options - Configuration options
 * @param {boolean} options.enablePerformanceMonitoring - Enable performance monitoring
 * @param {string} options.template - HTML template with {{content}} placeholder
 * @returns {Function} Koa middleware function
 */
export function coherentKoaMiddleware(options = {}) {
  const {
    enablePerformanceMonitoring = false,
    template = '<!DOCTYPE html>\n{{content}}'
  } = options;
  
  return async (ctx, next) => {
    await next();
    
    // If response body is a Coherent.js object, render it
    if (isCoherentObject(ctx.body)) {
      try {
        let html;
        
        if (enablePerformanceMonitoring) {
          const renderId = performanceMonitor.startRender();
          html = renderToString(ctx.body);
          performanceMonitor.endRender(renderId);
        } else {
          html = renderToString(ctx.body);
        }
        
        // Apply template
        const finalHtml = template.replace('{{content}}', html);
        
        // Set content type and body
        ctx.type = 'text/html';
        ctx.body = finalHtml;
      } catch (error) {
        console.error('Coherent.js rendering error:', error);
        throw error;
      }
    }
  };
}

/**
 * Check if an object is a Coherent.js component object
 * A Coherent.js component is a plain object with a single key
 * 
 * @param {any} obj - Object to check
 * @returns {boolean} True if object is a Coherent.js component
 */
function isCoherentObject(obj) {
  if (!obj || typeof obj !== 'object' || Array.isArray(obj)) {
    return false;
  }
  
  const keys = Object.keys(obj);
  return keys.length === 1;
}

/**
 * Create a Koa route handler for Coherent.js components
 * 
 * @param {Function} componentFactory - Function that returns a Coherent.js component
 * @param {Object} options - Handler options
 * @returns {Function} Koa route handler
 */
export function createCoherentKoaHandler(componentFactory, options = {}) {
  const {
    enablePerformanceMonitoring = false,
    template = '<!DOCTYPE html>\n{{content}}'
  } = options;
  
  return async (ctx, next) => {
    try {
      // Create component with context data
      const component = await Promise.resolve(
        componentFactory(ctx, next)
      );
      
      if (!component) {
        throw new Error('Component factory returned null/undefined');
      }
      
      // Render component
      let html;
      if (enablePerformanceMonitoring) {
        const renderId = performanceMonitor.startRender();
        html = renderToString(component);
        performanceMonitor.endRender(renderId);
      } else {
        html = renderToString(component);
      }
      
      // Apply template
      const finalHtml = template.replace('{{content}}', html);
      
      // Set response
      ctx.type = 'text/html';
      ctx.body = finalHtml;
    } catch (error) {
      console.error('Coherent.js handler error:', error);
      throw error;
    }
  };
}

/**
 * Setup Coherent.js with Koa app
 * 
 * @param {Object} app - Koa app instance
 * @param {Object} options - Setup options
 */
export function setupCoherentKoa(app, options = {}) {
  const {
    useMiddleware = true,
    enablePerformanceMonitoring = false
  } = options;
  
  // Use middleware for automatic rendering
  if (useMiddleware) {
    app.use(coherentKoaMiddleware({ enablePerformanceMonitoring }));
  }
}

/**
 * Create Koa integration with dependency checking
 * This function ensures Koa is available before setting up the integration
 * 
 * @param {Object} options - Setup options
 * @returns {Promise<Function>} - Function to setup Koa integration
 */
export async function createKoaIntegration(options = {}) {
  try {
    // Verify Koa is available
    await importPeerDependency('koa', 'Koa.js');
    
    return function(app) {
      if (!app || typeof app.use !== 'function') {
        throw new Error('Invalid Koa app instance provided');
      }
      
      setupCoherentKoa(app, options);
      return app;
    };
  } catch (error) {
    throw error;
  }
}

// Export all utilities
export default {
  coherentKoaMiddleware,
  createCoherentKoaHandler,
  setupCoherentKoa,
  createKoaIntegration
};
