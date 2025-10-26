/**
 * Fastify integration for Coherent.js
 * Provides plugins and utilities for using Coherent.js with Fastify
 */

import { 
  renderWithTemplate, 
  renderComponentFactory,
  isCoherentComponent 
} from '../../core/src/utils/render-utils.js';

/**
 * Fastify plugin for Coherent.js
 * Automatically renders Coherent.js components and handles errors
 * 
 * @param {Object} fastify - Fastify instance
 * @param {Object} options - Plugin options
 * @param {boolean} options.enablePerformanceMonitoring - Enable performance monitoring
 * @param {string} options.template - HTML template with {{content}} placeholder
 * @param {Function} done - Callback to signal plugin registration completion
 */
export function coherentFastify(fastify, options, done) {
  const {
    enablePerformanceMonitoring = false,
    template = '<!DOCTYPE html>\n{{content}}'
  } = options;
  
  // Add decorator to check if an object is a Coherent.js component
  fastify.decorateReply('isCoherentObject', (obj) => {
    if (!obj || typeof obj !== 'object' || Array.isArray(obj)) {
      return false;
    }
    
    const keys = Object.keys(obj);
    return keys.length === 1;
  });
  
  // Add decorator for rendering Coherent.js components
  fastify.decorateReply('coherent', function(component, renderOptions = {}) {
    const {
      enablePerformanceMonitoring: renderPerformanceMonitoring = enablePerformanceMonitoring,
      template: renderTemplate = template
    } = renderOptions;
    
    try {
      // Use shared rendering utility
      const finalHtml = renderWithTemplate(component, {
        enablePerformanceMonitoring: renderPerformanceMonitoring,
        template: renderTemplate
      });
      
      // Set content type and send HTML
      this.header('Content-Type', 'text/html; charset=utf-8');
      this.send(finalHtml);
    } catch (_error) {
      console.error('Coherent.js rendering _error:', _error);
      this.status(500).send({
        _error: 'Internal Server Error',
        message: _error.message
      });
    }
  });
  
  // Hook to automatically render Coherent.js objects
  fastify.addHook('onSend', async (request, reply, payload) => {
    // If payload is a Coherent.js object, render it
    if (reply.isCoherentObject(payload)) {
      try {
        // Use shared rendering utility
        const finalHtml = renderWithTemplate(payload, { enablePerformanceMonitoring, template });
        
        // Set content type and return HTML
        reply.header('Content-Type', 'text/html; charset=utf-8');
        return finalHtml;
      } catch (_error) {
        console.error('Coherent.js rendering _error:', _error);
        throw _error;
      }
    }
    
    // For non-Coherent.js data, return as-is
    return payload;
  });
  
  done();
}

/**
 * Create a Fastify route handler for Coherent.js components
 * 
 * @param {Function} componentFactory - Function that returns a Coherent.js component
 * @param {Object} options - Handler options
 * @returns {Function} Fastify route handler
 */
export function createCoherentFastifyHandler(componentFactory, options = {}) {
  return async (request, reply) => {
    try {
      // Use shared rendering utility
      const finalHtml = await renderComponentFactory(
        componentFactory,
        [request, reply],
        options
      );
      
      // Send HTML response
      reply.header('Content-Type', 'text/html; charset=utf-8');
      return finalHtml;
    } catch (_error) {
      console.error('Coherent.js handler _error:', _error);
      throw _error;
    }
  };
}

/**
 * Setup Coherent.js with Fastify instance
 * 
 * @param {Object} fastify - Fastify instance
 * @param {Object} options - Setup options
 */
export function setupCoherentFastify(fastify, options = {}) {
  fastify.register(coherentFastify, options);
}

// Export plugin as default for Fastify's plugin system
export default coherentFastify;
