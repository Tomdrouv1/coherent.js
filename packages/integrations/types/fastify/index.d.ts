// Type definitions for Coherent.js Fastify Integration
//
// Migrated from packages/fastify/src/coherent-fastify.d.ts during
// Wave 2c (integrations consolidation). Declarations are aligned with the
// runtime exports of ../../src/fastify/coherent-fastify.js.

import type { FastifyPluginCallback, FastifyReply, FastifyRequest } from 'fastify';
import type { CoherentNode } from '@coherent.js/core';

export interface CoherentFastifyOptions {
  /**
   * Enable performance monitoring for rendered components
   * @default false
   */
  enablePerformanceMonitoring?: boolean;

  /**
   * HTML template to wrap rendered components
   * @default '<!DOCTYPE html>\n{{content}}'
   */
  template?: string;

  /**
   * Enable server-side rendering
   * @default true
   */
  enableSSR?: boolean;

  /**
   * Also render component-shaped objects returned from route handlers.
   *
   * Detection is a heuristic: every single-key object qualifies, so JSON
   * payloads such as `{ ok: true }` or `{ error: '...' }` would be rendered
   * as HTML, even with a JSON response schema. Use `reply.coherent(component)`
   * instead unless the app never returns single-key JSON objects.
   * @default false
   */
  autoRender?: boolean;

  /**
   * Static file directory for client-side assets
   * @default 'public'
   */
  staticDir?: string;
}

export interface CoherentFastifyHandlerOptions {
  /**
   * Enable performance monitoring for rendered components
   * @default false
   */
  enablePerformanceMonitoring?: boolean;

  /**
   * HTML template to wrap rendered components
   * @default '<!DOCTYPE html>\n{{content}}'
   */
  template?: string;

  /**
   * Enable streaming rendering for large components
   * @default false
   */
  enableStreaming?: boolean;
}

/**
 * Fastify plugin for Coherent.js (wrapped with fastify-plugin, so its
 * decorators apply to the registering scope). Adds `reply.coherent()` and,
 * with `autoRender`, rendering of returned components.
 *
 * Register it; do not call it:
 *
 * ```ts
 * await fastify.register(coherentFastify, { template });
 * ```
 */
export const coherentFastify: FastifyPluginCallback<CoherentFastifyOptions>;

/**
 * Create a Fastify route handler for Coherent.js components
 * @param componentFactory Function that returns a Coherent component
 * @param options Configuration options
 * @returns Fastify route handler
 */
export function createHandler(
  componentFactory: (
    request: FastifyRequest,
    reply: FastifyReply
  ) => CoherentNode | Promise<CoherentNode>,
  options?: CoherentFastifyHandlerOptions
): (request: FastifyRequest, reply: FastifyReply) => Promise<any>;

/**
 * Alias of {@link coherentFastify}. It is a Fastify plugin: register it with
 * `await fastify.register(setupCoherent, options)` rather than calling it.
 */
export const setupCoherent: FastifyPluginCallback<CoherentFastifyOptions>;

/**
 * Fastify reply extensions
 */
declare module 'fastify' {
  interface FastifyReply {
    /**
     * Check if an object is a valid Coherent component
     * @param obj Object to check
     * @returns True if object is a valid Coherent component
     */
    isCoherentObject(obj: any): boolean;

    /**
     * Render and send a Coherent component as HTML response. A rendering
     * error is sent through Fastify's error handling (`setErrorHandler`).
     * Returns the reply, so `return reply.coherent(page)` works in async
     * handlers.
     * @param component Coherent component to render
     * @param options Rendering options
     */
    coherent(
      component: CoherentNode,
      options?: CoherentFastifyHandlerOptions
    ): FastifyReply;
  }
}

/**
 * Default export as Fastify plugin
 */
export default coherentFastify;
