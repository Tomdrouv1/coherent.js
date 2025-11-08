// Type definitions for Coherent.js Next.js Integration

import { NextApiRequest, NextApiResponse } from 'next';
import { ReactNode } from 'react';
import { CoherentNode } from '../coherent';

export interface CoherentNextHandlerOptions {
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
 * Create a Next.js API route handler for Coherent.js components
 * @param componentFactory Function that returns a Coherent component
 * @param options Configuration options
 * @returns Next.js API route handler
 */
export function createCoherentNextHandler(
  componentFactory: (req: NextApiRequest, res: NextApiResponse) => CoherentNode | Promise<CoherentNode>,
  options?: CoherentNextHandlerOptions
): (req: NextApiRequest, res: NextApiResponse) => void;

/**
 * Create a Next.js App Router route handler for Coherent.js components
 * @param componentFactory Function that returns a Coherent component
 * @param options Configuration options
 * @returns Next.js App Router handler
 */
export function createCoherentAppRouterHandler(
  componentFactory: (request: Request) => CoherentNode | Promise<CoherentNode>,
  options?: CoherentNextHandlerOptions
): (request: Request) => Promise<Response>;

/**
 * Create a Next.js Server Component for Coherent.js
 * @param componentFactory Function that returns a Coherent component
 * @param options Configuration options
 * @returns Next.js Server Component
 */
export function createCoherentServerComponent(
  componentFactory: (props: any) => CoherentNode | Promise<CoherentNode>,
  options?: { 
    enablePerformanceMonitoring?: boolean;
    enableStreaming?: boolean;
  }
): Promise<(props: any) => Promise<ReactNode>>;

/**
 * Create a Next.js Client Component for Coherent.js with hydration support
 * @param componentFactory Function that returns a Coherent component
 * @param options Configuration options
 * @returns Next.js Client Component
 */
export function createCoherentClientComponent(
  componentFactory: (props: any) => CoherentNode,
  options?: { 
    enablePerformanceMonitoring?: boolean;
    enableHydration?: boolean;
  }
): (props: any) => ReactNode;

/**
 * Render a Coherent component to HTML string
 * @param component Coherent component to render
 * @param options Rendering options
 * @returns Rendered HTML string
 */
export function renderComponent(
  component: CoherentNode,
  options?: CoherentNextHandlerOptions
): string;

/**
 * Default export with all utilities
 */
declare const coherentNext: {
  createCoherentNextHandler: typeof createCoherentNextHandler;
  createCoherentAppRouterHandler: typeof createCoherentAppRouterHandler;
  createCoherentServerComponent: typeof createCoherentServerComponent;
  createCoherentClientComponent: typeof createCoherentClientComponent;
  renderComponent: typeof renderComponent;
};

export default coherentNext;
