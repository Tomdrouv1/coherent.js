// Type definitions for Coherent.js Fastify Integration

import { FastifyInstance, FastifyReply, FastifyRequest } from 'fastify';
import { CoherentNode } from '../coherent';

export interface CoherentFastifyOptions {
  /**
   * Enable performance monitoring for rendered components
   * @default false
   */
  enablePerformanceMonitoring?: boolean;
  
  /**
   * HTML template to wrap rendered components
   * @default '<!DOCTYPE html><html><body>{{content}}</body></html>'
   */
  template?: string;
  
  /**
   * Enable server-side rendering
   * @default true
   */
  enableSSR?: boolean;
  
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
   * @default '<!DOCTYPE html><html><body>{{content}}</body></html>'
   */
  template?: string;
  
  /**
   * Enable streaming rendering for large components
   * @default false
   */
  enableStreaming?: boolean;
}

/**
 * Fastify plugin for Coherent.js
 * Adds Coherent.js rendering capabilities to Fastify
 * @param fastify Fastify instance
 * @param options Configuration options
 * @param done Callback to signal plugin registration completion
 */
export function coherentFastify(
  fastify: FastifyInstance,
  options: CoherentFastifyOptions,
  done: () => void
): void;

/**
 * Create a Fastify route handler for Coherent.js components
 * @param componentFactory Function that returns a Coherent component
 * @param options Configuration options
 * @returns Fastify route handler
 */
export function createCoherentFastifyHandler(
  componentFactory: (request: FastifyRequest, reply: FastifyReply) => CoherentNode | Promise<CoherentNode>,
  options?: CoherentFastifyHandlerOptions
): (request: FastifyRequest, reply: FastifyReply) => Promise<any>;

/**
 * Setup Coherent.js with Fastify instance
 * Configures plugin, static files, and reply extensions
 * @param fastify Fastify instance
 * @param options Configuration options
 */
export function setupCoherentFastify(
  fastify: FastifyInstance,
  options?: CoherentFastifyOptions
): void;

/**
 * Render a Coherent component to HTML string
 * @param component Coherent component to render
 * @param options Rendering options
 * @returns Rendered HTML string
 */
export function renderComponent(
  component: CoherentNode,
  options?: CoherentFastifyHandlerOptions
): string;

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
     * Render and send a Coherent component as HTML response
     * @param component Coherent component to render
     * @param options Rendering options
     */
    coherent(component: CoherentNode, options?: CoherentFastifyHandlerOptions): void;
  }
}

/**
 * Default export as Fastify plugin
 */
export default coherentFastify;
