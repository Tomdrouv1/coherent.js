/**
 * Shared rendering utilities for framework integrations
 * Eliminates code duplication across Express, Fastify, Koa, Next.js integrations
 */

import { render } from '../rendering/html-renderer.js';
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
    html = render(component);
    performanceMonitor.endRender(renderId);
  } else {
    html = render(component);
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
 * Structural check for the *shape* of a Coherent.js element: a non-array
 * object with exactly one own key (the tag name).
 *
 * This is a heuristic, not a type test. It cannot tell a component from an
 * ordinary JSON payload that happens to have one key — `{ ok: true }`,
 * `{ users: [...] }`, `{ error: 'Invalid credentials' }` all return `true` —
 * and tag-name lists do not help, because `data`, `meta`, `title`, `label`,
 * `summary` and `code` are both HTML tags and common JSON keys.
 *
 * Framework integrations therefore only use it when auto-rendering has been
 * opted into explicitly (`autoRender: true`); by default they render only
 * what is handed to their explicit APIs (`res.coherent()`,
 * `reply.coherent()`, `ctx.coherent()`, the handler factories). Do not use it
 * to decide how to serialize data you do not control.
 *
 * @param {any} obj - Value to check
 * @returns {boolean} True if the value has the shape of a Coherent.js element
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
