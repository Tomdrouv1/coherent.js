/**
 * Enhanced Express.js integration for Coherent.js
 * Provides middleware and utilities for using Coherent.js with Express
 */

import { renderToString, renderHTML } from '../../core/src/index.js';
import { performanceMonitor } from '../../core/src/performance/monitor.js';
import { importPeerDependency } from '../../core/src/utils/dependency-utils.js';

/**
 * Coherent.js Express middleware
 * Automatically renders Coherent.js components and handles errors
 * 
 * @param {Object} options - Configuration options
 * @param {boolean} options.enablePerformanceMonitoring - Enable performance monitoring
 * @param {string} options.template - HTML template with {{content}} placeholder
 * @returns {Function} Express middleware function
 */
export function coherentMiddleware(options = {}) {
  const {
    enablePerformanceMonitoring = false,
    template = '<!DOCTYPE html>\n{{content}}'
  } = options;
  
  return (req, res, next) => {
    // Store original send method
    const originalSend = res.send;
    
    // Override send method to handle Coherent.js objects
    res.send = function(data) {
      // If data is a Coherent.js object (plain object with a single key), render it
      if (isCoherentObject(data)) {
        try {
          let html;
          
          if (enablePerformanceMonitoring) {
            const renderId = performanceMonitor.startRender();
            html = renderToString(data);
            performanceMonitor.endRender(renderId);
          } else {
            html = renderToString(data);
          }
          
          // Apply template
          const finalHtml = template.replace('{{content}}', html);
          
          // Set content type and send HTML
          res.set('Content-Type', 'text/html');
          return originalSend.call(this, finalHtml);
        } catch (_error) {
          console.error('Coherent.js rendering _error:', _error);
          return next(_error);
        }
      }
      
      // For non-Coherent.js data, use original send method
      return originalSend.call(this, data);
    };
    
    next();
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
 * Create an Express route handler for Coherent.js components
 * 
 * @param {Function} componentFactory - Function that returns a Coherent.js component
 * @param {Object} options - Handler options
 * @returns {Function} Express route handler
 */
export function createCoherentHandler(componentFactory, options = {}) {
  const {
    enablePerformanceMonitoring = false,
    template = '<!DOCTYPE html>\n{{content}}'
  } = options;
  
  return async (req, res, next) => {
    try {
      // Create component with request data
      const component = await Promise.resolve(
        componentFactory(req, res, next)
      );
      
      if (!component) {
        return next(new Error('Component factory returned null/undefined'));
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
      
      // Send HTML response
      res.set('Content-Type', 'text/html');
      res.send(finalHtml);
    } catch (_error) {
      console.error('Coherent.js handler _error:', _error);
      next(_error);
    }
  };
}

/**
 * Enhanced Express engine for Coherent.js views
 * 
 * @param {string} filePath - Path to view file (not used in Coherent.js)
 * @param {Object} options - View options containing Coherent.js component
 * @param {Function} callback - Callback function
 */
export function enhancedExpressEngine(filePath, options, callback) {
  try {
    // Render Coherent.js component from options
    const html = renderHTML(options);
    callback(null, html);
  } catch (_error) {
    callback(_error);
  }
}

/**
 * Setup Coherent.js with Express app
 * 
 * @param {Object} app - Express app instance
 * @param {Object} options - Setup options
 */
export function setupCoherentExpress(app, options = {}) {
  const {
    useMiddleware = true,
    useEngine = true,
    engineName = 'coherent',
    enablePerformanceMonitoring = false
  } = options;
  
  // Register enhanced engine
  if (useEngine) {
    app.engine(engineName, enhancedExpressEngine);
    app.set('view engine', engineName);
  }
  
  // Use middleware for automatic rendering
  if (useMiddleware) {
    app.use(coherentMiddleware({ enablePerformanceMonitoring }));
  }
}

/**
 * Create Express integration with dependency checking
 * This function ensures Express is available before setting up the integration
 * 
 * @param {Object} options - Setup options
 * @returns {Promise<Function>} - Function to setup Express integration
 */
export async function createExpressIntegration(options = {}) {
  try {
    // Verify Express is available
    await importPeerDependency('express', 'Express.js');
    
    return function(app) {
      if (!app || typeof app.use !== 'function') {
        throw new Error('Invalid Express app instance provided');
      }
      
      setupCoherentExpress(app, options);
      return app;
    };
  } catch (_error) {
    throw _error;
  }
}

// Export all utilities
export default {
  coherentMiddleware,
  createCoherentHandler,
  enhancedExpressEngine,
  setupCoherentExpress,
  createExpressIntegration
};
