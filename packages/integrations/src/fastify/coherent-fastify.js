/**
 * Fastify integration for Coherent.js
 * Provides plugins and utilities for using Coherent.js with Fastify.
 *
 * The plugin must be wrapped with fastify-plugin (fp). Without fp, every
 * `fastify.register(...)` boundary creates a fresh encapsulated context,
 * and the `preSerialization` hook + `isCoherentObject` decorator only
 * apply to routes registered INSIDE that context. The user's root-level
 * routes would never see them, and responses would JSON-serialize the
 * raw component object instead of rendering it.
 */

import fp from 'fastify-plugin';
import {
  renderWithTemplate,
  renderComponentFactory
} from '@coherent.js/core';

/**
 * Fastify plugin implementation. Not exported directly — use the fp-wrapped
 * `coherentFastify` (or its alias `setupCoherent`) instead.
 *
 * @param {Object} fastify - Fastify instance
 * @param {Object} options - Plugin options
 * @param {boolean} [options.enablePerformanceMonitoring] - Enable performance monitoring
 * @param {string} [options.template] - HTML template with {{content}} placeholder
 * @param {Function} done - Callback to signal plugin registration completion
 */
function coherentFastifyImpl(fastify, options = {}, done) {
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

  // Add decorator for explicit rendering: reply.coherent(component, opts?)
  fastify.decorateReply('coherent', function(component, renderOptions = {}) {
    const {
      enablePerformanceMonitoring: renderPerformanceMonitoring = enablePerformanceMonitoring,
      template: renderTemplate = template
    } = renderOptions;

    try {
      const finalHtml = renderWithTemplate(component, {
        enablePerformanceMonitoring: renderPerformanceMonitoring,
        template: renderTemplate
      });
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

  // Auto-render: if a handler returns a Coherent.js component object,
  // intercept before serialization and replace the payload with HTML.
  //
  // - `onSend` runs after JSON serialization (payload is already a string),
  //   so the component object would never be detected there.
  // - `preSerialization` runs before serialization. We render to HTML and
  //   install an identity serializer for this reply, so Fastify doesn't
  //   JSON-stringify the HTML string we just produced.
  fastify.addHook('preSerialization', async (request, reply, payload) => {
    if (reply.isCoherentObject?.(payload)) {
      const finalHtml = renderWithTemplate(payload, { enablePerformanceMonitoring, template });
      reply.header('Content-Type', 'text/html; charset=utf-8');
      reply.serializer((p) => p);
      return finalHtml;
    }
    return payload;
  });

  done();
}

/**
 * Fastify plugin for Coherent.js — wrapped with fastify-plugin so decorators
 * and hooks apply to the parent (root) context. Register at the top of your
 * app, then define routes that return Coherent.js component objects:
 *
 *   await fastify.register(coherentFastify, { template: APP_HTML_TEMPLATE });
 *   fastify.get('/', async () => HomePage({}));
 */
export const coherentFastify = fp(coherentFastifyImpl, {
  name: 'coherent-fastify',
  fastify: '>=4.0.0'
});

/**
 * Alias for `coherentFastify`. Preserved for backward compatibility with
 * scaffolds and examples that use `setupCoherent`. Behaves identically:
 * `await fastify.register(setupCoherent, options)`.
 */
export const setupCoherent = coherentFastify;

/**
 * Create a Fastify route handler for Coherent.js components.
 *
 * @param {Function} componentFactory - Function that returns a Coherent.js component
 * @param {Object} options - Handler options
 * @returns {Function} Fastify route handler
 */
export function createHandler(componentFactory, options = {}) {
  return async (request, reply) => {
    try {
      const finalHtml = await renderComponentFactory(
        componentFactory,
        [request, reply],
        options
      );
      reply.header('Content-Type', 'text/html; charset=utf-8');
      return finalHtml;
    } catch (_error) {
      console.error('Coherent.js handler _error:', _error);
      throw _error;
    }
  };
}

// Default export = the plugin, for `fastify.register(import('@coherent.js/integrations/fastify'))`.
export default coherentFastify;
