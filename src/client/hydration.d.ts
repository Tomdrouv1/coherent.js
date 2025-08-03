// Type definitions for Coherent.js client-side hydration

export interface CoherentElement {
  [tagName: string]: {
    text?: string;
    html?: string;
    children?: CoherentNode[];
    className?: string | (() => string);
    [key: string]: any;
  };
}

export type CoherentNode = CoherentElement | string | number | boolean | null | undefined;

export interface ComponentFunction {
  (props?: Record<string, any>): CoherentNode;
}

export interface HydratedComponentInstance {
  element: HTMLElement;
  component: ComponentFunction;
  props: Record<string, any>;
  isHydrated: boolean;
  update(newProps: Record<string, any>): void;
  destroy(): void;
}

export interface HydrationOptions {
  /**
   * Whether to enable client-side event handlers
   * @default true
   */
  enableEvents?: boolean;
  
  /**
   * Whether to preserve existing DOM structure
   * @default true
   */
  preserveDOM?: boolean;
  
  /**
   * Custom error handler for hydration failures
   */
  onError?: (error: Error, element: HTMLElement) => void;
}

/**
 * Hydrate a DOM element with a Coherent component
 * @param element - The DOM element to hydrate
 * @param component - The Coherent component function
 * @param props - Component props
 * @param options - Hydration options
 * @returns Hydrated component instance or null if failed
 */
export function hydrate(
  element: HTMLElement,
  component: ComponentFunction,
  props?: Record<string, any>,
  options?: HydrationOptions
): HydratedComponentInstance | null;

/**
 * Hydrate multiple elements with their corresponding components
 * @param elements - Array of DOM elements to hydrate
 * @param components - Array of Coherent component functions
 * @param propsArray - Array of component props
 * @returns Array of hydrated component instances or null for failures
 */
export function hydrateAll(
  elements: HTMLElement[],
  components: ComponentFunction[],
  propsArray?: Record<string, any>[]
): (HydratedComponentInstance | null)[];

/**
 * Find and hydrate elements by CSS selector
 * @param selector - CSS selector to find elements
 * @param component - The Coherent component function
 * @param props - Component props
 * @returns Array of hydrated component instances or null for failures
 */
export function hydrateBySelector(
  selector: string,
  component: ComponentFunction,
  props?: Record<string, any>
): (HydratedComponentInstance | null)[];

/**
 * Enable client-side interactivity for event handlers
 * @param rootElement - Root element to enable events on (default: document)
 */
export function enableClientEvents(rootElement?: HTMLElement | Document): void;

/**
 * Create a hydratable component
 * @param component - The component function to make hydratable
 * @returns A hydratable component function
 */
export function makeHydratable(component: ComponentFunction): ComponentFunction;

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
