// Type definitions for Coherent.js Remix integration.
//
// Aligned with the runtime exports of ../../src/remix/index.js.

import type { ReactElement } from 'react';
import type { CoherentNode } from '@coherent.js/core';

/** A Coherent.js component: a node, or a function of props returning one. */
export type CoherentRemixComponent<Props = any> = CoherentNode | ((props: Props) => CoherentNode);

/** The arguments Remix passes to loaders and actions. */
export interface CoherentRemixDataArgs {
  request: Request;
  params: Record<string, string | undefined>;
  context: unknown;
}

export interface CoherentRemixActionArgs extends CoherentRemixDataArgs {
  /** The submitted form fields (`Object.fromEntries(await request.formData())`). */
  data: Record<string, FormDataEntryValue>;
}

export interface CoherentRemixAdapterOptions {
  /** Enable client-side hydration. */
  hydrate?: boolean;
}

export interface CoherentRemixAdapter {
  /** Render a component (or component function) to an HTML string. */
  renderComponent<Props>(component: CoherentRemixComponent<Props>, props?: Props): string;

  /**
   * Create a loader that answers with the rendered component as `text/html`.
   * Without `getProps` the component receives `{ request, params }`.
   */
  createLoader<Props>(
    component: CoherentRemixComponent<Props>,
    getProps?: (args: CoherentRemixDataArgs) => Props | Promise<Props>
  ): (args: CoherentRemixDataArgs) => Promise<Response>;

  /**
   * Create an action that passes the submitted form to `handler` and renders
   * the component with its result, unless the handler returns a Response.
   */
  createAction<Result>(
    component: CoherentRemixComponent<Result>,
    handler: (args: CoherentRemixActionArgs) => Result | Response | Promise<Result | Response>
  ): (args: CoherentRemixDataArgs) => Promise<Response>;
}

export function createRemixAdapter(options?: CoherentRemixAdapterOptions): CoherentRemixAdapter;

export interface WithCoherentOptions {
  /**
   * Tag name of the element the markup is rendered into
   * @default 'div'
   */
  as?: string;
}

/**
 * Wrap a Coherent.js component as a React component for Remix routes. The
 * markup is rendered inside a wrapper element via `dangerouslySetInnerHTML`.
 */
export function withCoherent<Props = any>(
  Component: CoherentRemixComponent<Props>,
  options?: WithCoherentOptions
): (props: Props) => ReactElement;
