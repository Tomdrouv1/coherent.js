/**
 * Shared rendering utilities for framework integrations
 * Eliminates code duplication across Express, Fastify, Koa, Next.js integrations
 */

import { renderToString } from '../rendering/html-renderer.js';
import { performanceMonitor } from '../performance/monitor.js';

/**
 * Render a component with optional performance monitoring
 * This is the canonical rendering function used by all framework integrations
 * 
 * @param {Object} component - Coherent.js component to render
 * @param {Object} options - Rendering options
 * @param {boolean} options.enablePerformanceMonitoring - Enable performance tracking
 * @param {string} options.template - HTML template with {{content}} placeholder
 * @returns {string} Rendered HTML
 */
export function renderWithMonitoring(component, options = {}) {
  const {
    enablePerformanceMonitoring = false
  } = options;

  let html;

  if (enablePerformanceMonitoring) {
    const renderId = performanceMonitor.startRender();
    html = renderToString(component);
    performanceMonitor.endRender(renderId);
  } else {
    html = renderToString(component);
  }

  return html;
}

/**
 * Render a component and apply an HTML template
 * 
 * @param {Object} component - Coherent.js component to render
 * @param {Object} options - Rendering options
 * @param {boolean} options.enablePerformanceMonitoring - Enable performance tracking
 * @param {string} options.template - HTML template with {{content}} placeholder
 * @returns {string} Final HTML with template applied
 */
export function renderWithTemplate(component, options = {}) {
  const {
    template = '<!DOCTYPE html>\n{{content}}'
  } = options;

  const html = renderWithMonitoring(component, options);
  return template.replace('{{content}}', html);
}

/**
 * Create a component factory handler for framework integrations
 * Handles component creation, rendering, and error handling
 * 
 * @param {Function} componentFactory - Function that creates a component
 * @param {Object} factoryArgs - Arguments to pass to the component factory
 * @param {Object} options - Rendering options
 * @returns {Promise<string>} Rendered HTML
 * @throws {Error} If component factory returns null/undefined or rendering fails
 */
export async function renderComponentFactory(componentFactory, factoryArgs, options = {}) {
  // Create component with provided arguments
  const component = await Promise.resolve(
    componentFactory(...factoryArgs)
  );

  if (!component) {
    throw new Error('Component factory returned null/undefined');
  }

  // Render with template
  return renderWithTemplate(component, options);
}

/**
 * Check if an object is a Coherent.js component
 * A Coherent.js component is a plain object with a single key representing an HTML tag
 * 
 * @param {any} obj - Object to check
 * @returns {boolean} True if object is a Coherent.js component
 */
export function isCoherentComponent(obj) {
  if (!obj || typeof obj !== 'object' || Array.isArray(obj)) {
    return false;
  }

  const keys = Object.keys(obj);
  return keys.length === 1;
}

/**
 * Create a standardized error response for framework integrations
 * 
 * @param {Error} error - The error that occurred
 * @param {string} context - Context where the error occurred
 * @returns {Object} Error response object
 */
export function createErrorResponse(error, context = 'rendering') {
  return {
    error: 'Internal Server Error',
    message: error.message,
    context,
    timestamp: new Date().toISOString()
  };
}
