/**
 * Koa.js integration for Coherent.js
 * Provides middleware and utilities for using Coherent.js with Koa
 */

import { importPeerDependency } from '../../core/src/utils/dependency-utils.js';
import { 
  renderWithTemplate, 
  renderComponentFactory,
  isCoherentComponent 
} from '../../core/src/utils/render-utils.js';

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
    if (isCoherentComponent(ctx.body)) {
      try {
        // Use shared rendering utility
        const finalHtml = renderWithTemplate(ctx.body, { enablePerformanceMonitoring, template });
        
        // Set content type and body
        ctx.type = 'text/html';
        ctx.body = finalHtml;
      } catch (_error) {
        console.error('Coherent.js rendering _error:', _error);
        throw _error;
      }
    }
  };
}

/**
 * Create a Koa route handler for Coherent.js components
 * 
 * @param {Function} componentFactory - Function that returns a Coherent.js component
 * @param {Object} options - Handler options
 * @returns {Function} Koa route handler
 */
export function createCoherentKoaHandler(componentFactory, options = {}) {
  return async (ctx, next) => {
    try {
      // Use shared rendering utility
      const finalHtml = await renderComponentFactory(
        componentFactory,
        [ctx, next],
        options
      );
      
      // Set response
      ctx.type = 'text/html';
      ctx.body = finalHtml;
    } catch (_error) {
      console.error('Coherent.js handler _error:', _error);
      throw _error;
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
  } catch (_error) {
    throw _error;
  }
}

// Export all utilities
export default {
  coherentKoaMiddleware,
  createCoherentKoaHandler,
  setupCoherentKoa,
  createKoaIntegration
};
