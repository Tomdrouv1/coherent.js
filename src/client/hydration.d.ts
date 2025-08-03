// Type definitions for Coherent.js client-side hydration

export interface HydratedComponentInstance {
  element: HTMLElement;
  component: Function;
  props: Record<string, any>;
  isHydrated: boolean;
  update(newProps: Record<string, any>): void;
  destroy(): void;
}

export interface HydrationOptions {
  // Future options for hydration behavior
}

/**
 * Hydrate a DOM element with a Coherent component
 */
export function hydrate(
  element: HTMLElement,
  component: Function,
  props?: Record<string, any>,
  options?: HydrationOptions
): HydratedComponentInstance | null;

/**
 * Hydrate multiple elements with their corresponding components
 */
export function hydrateAll(
  elements: HTMLElement[],
  components: Function[],
  propsArray?: Record<string, any>[]
): (HydratedComponentInstance | null)[];

/**
 * Find and hydrate elements by CSS selector
 */
export function hydrateBySelector(
  selector: string,
  component: Function,
  props?: Record<string, any>
): (HydratedComponentInstance | null)[];

/**
 * Enable client-side interactivity for event handlers
 */
export function enableClientEvents(rootElement?: HTMLElement | Document): void;

/**
 * Create a hydratable component
 */
export function makeHydratable(component: Function): Function;

/**
 * Default export with all hydration utilities
 */
declare const hydration: {
  hydrate: typeof hydrate;
  hydrateAll: typeof hydrateAll;
  hydrateBySelector: typeof hydrateBySelector;
  enableClientEvents: typeof enableClientEvents;
  makeHydratable: typeof makeHydratable;
};

export default hydration;
