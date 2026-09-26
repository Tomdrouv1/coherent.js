// Type definitions for Coherent.js Astro integration.
//
// Aligned with the runtime exports of ../../src/astro/index.js.

import type { AstroIntegration } from 'astro';
import type { CoherentNode, RenderOptions } from '@coherent.js/core';

export interface CoherentAstroOptions {
  /** Pre-bundle `@coherent.js/client` for client-side hydration. */
  hydrate?: boolean;
  /** Custom hydration script path. */
  hydrateScript?: string;
}

/** A Coherent.js component: a node, or a function of props returning one. */
export type CoherentAstroComponent<Props = Record<string, unknown>> =
  | CoherentNode
  | ((props: Props) => CoherentNode);

/** The SSR renderer Astro loads from the integration's server entrypoint. */
export interface CoherentAstroRenderer {
  name: string;
  check(Component: unknown, props?: Record<string, unknown>): boolean;
  renderToStaticMarkup(Component: unknown, props?: Record<string, unknown>): { html: string };
}

/**
 * Astro integration that registers the Coherent.js renderer
 * (`@coherent.js/integrations/astro/server`).
 */
export function createAstroIntegration(options?: CoherentAstroOptions): AstroIntegration;

/** Render a Coherent.js component (or component function) to an HTML string. */
export function renderComponent<Props = Record<string, unknown>>(
  Component: CoherentAstroComponent<Props>,
  props?: Props,
  renderOptions?: RenderOptions
): string;

/** Create an Astro SSR renderer for Coherent.js components. */
export function createRenderer(options?: RenderOptions): CoherentAstroRenderer;
