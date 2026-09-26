// Type definitions for Coherent.js Next.js Integration
//
// Migrated from packages/nextjs/src/coherent-nextjs.d.ts during
// Wave 2c (integrations consolidation). Declarations are aligned with the
// runtime exports of ../../src/nextjs/coherent-nextjs.js.

import { NextApiRequest, NextApiResponse } from 'next';
import { ReactNode } from 'react';
import type { CoherentNode } from '@coherent.js/core';

export interface CoherentNextHandlerOptions {
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

export interface CoherentNextComponentOptions {
  /**
   * Enable performance monitoring for rendered components
   * @default false
   */
  enablePerformanceMonitoring?: boolean;

  /**
   * React module to build elements with (`import * as React from 'react'`).
   * Defaults to importing `react` from `@coherent.js/integrations`, which
   * resolves to the app's copy through the optional peer dependency.
   */
  React?: { createElement: (...args: any[]) => any } | { default: { createElement: (...args: any[]) => any } };
}

/**
 * Second argument Next.js passes to App Router route handlers.
 * `params` is a Promise from Next.js 15 on, a plain object before.
 */
export interface CoherentAppRouteContext {
  params: Record<string, string | string[]> | Promise<Record<string, string | string[]>>;
}

export interface CoherentNextIntegration {
  createCoherentNextHandler: typeof createCoherentNextHandler;
  createCoherentAppRouterHandler: typeof createCoherentAppRouterHandler;
  createCoherentServerComponent: typeof createCoherentServerComponent;
  createCoherentClientComponent: typeof createCoherentClientComponent;
}

/**
 * Create a Next.js API route handler for Coherent.js components
 * @param componentFactory Function that returns a Coherent component
 * @param options Configuration options
 * @returns Next.js API route handler
 */
export function createCoherentNextHandler(
  componentFactory: (
    req: NextApiRequest,
    res: NextApiResponse
  ) => CoherentNode | Promise<CoherentNode>,
  options?: CoherentNextHandlerOptions
): (req: NextApiRequest, res: NextApiResponse) => Promise<void>;

/**
 * Create a Next.js App Router route handler for Coherent.js components
 * @param componentFactory Function that returns a Coherent component; it
 *   receives the route handler's `(request, context)`
 * @param options Configuration options
 * @returns Next.js App Router handler
 */
export function createCoherentAppRouterHandler<
  Context extends CoherentAppRouteContext = CoherentAppRouteContext
>(
  componentFactory: (request: Request, context: Context) => CoherentNode | Promise<CoherentNode>,
  options?: CoherentNextHandlerOptions
): (request: Request, context: Context) => Promise<Response>;

/**
 * Create a Next.js Server Component for Coherent.js
 * @param componentFactory Function that returns a Coherent component
 * @param options Configuration options
 * @returns Next.js Server Component
 */
export function createCoherentServerComponent(
  componentFactory: (props: any) => CoherentNode | Promise<CoherentNode>,
  options?: CoherentNextComponentOptions
): Promise<(props: any) => Promise<ReactNode>>;

/**
 * Create a Next.js Client Component for Coherent.js with hydration support
 * @param componentFactory Function that returns a Coherent component
 * @param options Configuration options
 * @returns Next.js Client Component
 */
export function createCoherentClientComponent(
  componentFactory: (props: any) => CoherentNode,
  options?: CoherentNextComponentOptions
): Promise<(props: any) => ReactNode>;

/**
 * Create Next.js integration with dependency checking.
 * Verifies Next.js and React are available before returning bound handlers.
 * @param options Default options applied to all returned handlers
 * @returns Object with Next.js integration utilities
 */
export function createNextIntegration(
  options?: CoherentNextHandlerOptions & CoherentNextComponentOptions
): Promise<CoherentNextIntegration>;

/**
 * Default export with all utilities
 */
declare const coherentNext: {
  createCoherentNextHandler: typeof createCoherentNextHandler;
  createCoherentAppRouterHandler: typeof createCoherentAppRouterHandler;
  createCoherentServerComponent: typeof createCoherentServerComponent;
  createCoherentClientComponent: typeof createCoherentClientComponent;
  createNextIntegration: typeof createNextIntegration;
};

export default coherentNext;
