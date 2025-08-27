/**
 * Fastify integration for Coherent.js
 * Provides plugins and utilities for using Coherent.js with Fastify
 */

import { renderToString } from '../rendering/html-renderer.js';
import { performanceMonitor } from '../performance/monitor.js';

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
      let html;
      
      if (renderPerformanceMonitoring) {
        const renderId = performanceMonitor.startRender();
        html = renderToString(component);
        performanceMonitor.endRender(renderId);
      } else {
        html = renderToString(component);
      }
      
      // Apply template
      const finalHtml = renderTemplate.replace('{{content}}', html);
      
      // Set content type and send HTML
      this.header('Content-Type', 'text/html; charset=utf-8');
      this.send(finalHtml);
    } catch (error) {
      console.error('Coherent.js rendering error:', error);
      this.status(500).send({
        error: 'Internal Server Error',
        message: error.message
      });
    }
  });
  
  // Hook to automatically render Coherent.js objects
  fastify.addHook('onSend', async (request, reply, payload) => {
    // If payload is a Coherent.js object, render it
    if (reply.isCoherentObject(payload)) {
      try {
        let html;
        
        if (enablePerformanceMonitoring) {
          const renderId = performanceMonitor.startRender();
          html = renderToString(payload);
          performanceMonitor.endRender(renderId);
        } else {
          html = renderToString(payload);
        }
        
        // Apply template
        const finalHtml = template.replace('{{content}}', html);
        
        // Set content type and return HTML
        reply.header('Content-Type', 'text/html; charset=utf-8');
        return finalHtml;
      } catch (error) {
        console.error('Coherent.js rendering error:', error);
        throw error;
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
  const {
    enablePerformanceMonitoring = false,
    template = '<!DOCTYPE html>\n{{content}}'
  } = options;
  
  return async (request, reply) => {
    try {
      // Create component with request data
      const component = await Promise.resolve(
        componentFactory(request, reply)
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
      
      // Send HTML response
      reply.header('Content-Type', 'text/html; charset=utf-8');
      return finalHtml;
    } catch (error) {
      console.error('Coherent.js handler error:', error);
      throw error;
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
