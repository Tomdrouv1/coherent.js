// Type definitions for Coherent.js SvelteKit integration.
//
// Aligned with the runtime exports of ../../src/sveltekit/index.js.

import type { Handle } from '@sveltejs/kit';
import type { CoherentNode } from '@coherent.js/core';

/** A Coherent.js component: a node, or a function of props returning one. */
export type CoherentSvelteKitComponent<Props = any> = CoherentNode | ((props: Props) => CoherentNode);

export interface CoherentSvelteKitLoadEvent {
  params: Record<string, string>;
  url: URL;
  fetch: typeof fetch;
}

export interface CoherentSvelteKitAdapter {
  name: string;

  /** Render a component (or component function) to an HTML string. */
  renderComponent<Props>(component: CoherentSvelteKitComponent<Props>, props?: Props): string;

  /**
   * Create a server `load` function returning the rendered HTML and the props.
   * Without `getProps` the component receives `{ params }`.
   */
  createLoad<Props>(
    component: CoherentSvelteKitComponent<Props>,
    getProps?: (event: CoherentSvelteKitLoadEvent) => Props | Promise<Props>
  ): (event: CoherentSvelteKitLoadEvent) => Promise<{ html: string; props: Props }>;

  /** Create a form action that passes the submitted fields to `handler`. */
  createAction<Result>(
    handler: (args: { data: Record<string, FormDataEntryValue>; params: Record<string, string> }) => Result
  ): (event: { request: Request; params: Record<string, string> }) => Promise<Awaited<Result>>;
}

export function createSvelteKitAdapter(options?: Record<string, unknown>): CoherentSvelteKitAdapter;

export interface CoherentPreprocessorOptions {
  /**
   * Tag whose content (a JS expression, usually an object literal) is
   * rendered with Coherent.js
   * @default 'coherent'
   */
  tag?: string;
}

/**
 * Svelte markup preprocessor: replaces `<coherent>{...}</coherent>` blocks
 * with `{@html ...}` of the rendered component and imports the renderer from
 * `@coherent.js/core` into the component.
 */
export function createPreprocessor(options?: CoherentPreprocessorOptions): {
  name: string;
  markup(input: { content: string; filename?: string }): { code: string; map: null };
};

/** What {@link createHandle} puts on `event.locals.coherent`. */
export interface CoherentLocals {
  render<Props>(component: CoherentSvelteKitComponent<Props>, props?: Props): string;
}

/**
 * SvelteKit `handle` hook that sets `event.locals.coherent` (see
 * {@link CoherentLocals}; add it to `App.Locals` in your `app.d.ts`).
 */
export function createHandle(options?: Record<string, unknown>): Handle;
