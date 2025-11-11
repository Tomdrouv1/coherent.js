/**
 * Coherent.js Web Components TypeScript Definitions
 * @module @coherent.js/web-components
 */

// ===== Web Component Integration Types =====

export interface ComponentOptions {
  shadow?: boolean;
  mode?: 'open' | 'closed';
  delegatesFocus?: boolean;
  observedAttributes?: string[];
  props?: Record<string, {
    type?: StringConstructor | NumberConstructor | BooleanConstructor | ObjectConstructor | ArrayConstructor;
    default?: any;
    required?: boolean;
    validator?: (value: any) => boolean;
  }>;
  lifecycle?: {
    connected?: () => void;
    disconnected?: () => void;
    adopted?: () => void;
    attributeChanged?: (name: string, oldValue: string | null, newValue: string | null) => void;
  };
}

export interface CoherentElementConstructor {
  new (): CoherentElement;
  prototype: CoherentElement;
}

export interface CoherentElement extends HTMLElement {
  component: any;
  options: ComponentOptions;
  render(): void;
  update(props?: Record<string, any>): void;
  hydrate(data?: any): void;
}

/**
 * Define a Coherent.js component as a custom element
 *
 * @param name - Custom element tag name (must contain a hyphen)
 * @param component - Coherent.js component object or function
 * @param options - Configuration options for the custom element
 * @returns The custom element constructor
 *
 * @example
 * ```typescript
 * const MyButton = { button: { text: 'Click me' } };
 * defineComponent('my-button', MyButton, { shadow: true });
 * ```
 */
export function defineComponent(
  name: string,
  component: any | ((props: any) => any),
  options?: ComponentOptions
): CoherentElementConstructor;

/**
 * Integration utilities for web components runtime
 */
export function integrateWithWebComponents(runtime: any): void;

/**
 * Register multiple components at once
 *
 * @example
 * ```typescript
 * registerComponents({
 *   'my-button': MyButton,
 *   'my-card': MyCard
 * });
 * ```
 */
export function registerComponents(components: Record<string, any>, options?: ComponentOptions): void;

/**
 * Check if a custom element is defined
 */
export function isComponentDefined(name: string): boolean;

/**
 * Wait for a custom element to be defined
 */
export function whenDefined(name: string): Promise<CoherentElementConstructor>;

/**
 * Upgrade an element to a custom element
 */
export function upgradeElement(element: Element): void;

/**
 * Create a Coherent.js component from a custom element
 */
export function fromCustomElement(element: HTMLElement): any;

/**
 * Helper for creating reactive properties on custom elements
 */
export interface PropertyDeclaration {
  type?: StringConstructor | NumberConstructor | BooleanConstructor | ObjectConstructor | ArrayConstructor;
  attribute?: boolean | string;
  reflect?: boolean;
  converter?: (value: string) => any;
  default?: any;
}

export function createProperty(declaration: PropertyDeclaration): PropertyDecorator;

/**
 * Decorator for defining properties on custom elements
 * @experimental
 */
export function property(declaration?: PropertyDeclaration): PropertyDecorator;

/**
 * Decorator for defining custom element tag name
 * @experimental
 */
export function customElement(tagName: string): ClassDecorator;

// ===== Event System Types =====

export interface EventOptions {
  bubbles?: boolean;
  composed?: boolean;
  cancelable?: boolean;
  detail?: any;
}

export function createEvent(type: string, options?: EventOptions): CustomEvent;
export function dispatchCustomEvent(element: Element, type: string, options?: EventOptions): boolean;

// ===== Slot Utilities Types =====

export interface SlotChangeEvent extends Event {
  target: HTMLSlotElement;
}

export function getSlotContent(element: Element, slotName?: string): Node[];
export function hasSlotContent(element: Element, slotName?: string): boolean;
export function onSlotChange(element: Element, callback: (event: SlotChangeEvent) => void, slotName?: string): () => void;

// ===== Shadow DOM Utilities Types =====

export interface ShadowRootInit {
  mode: 'open' | 'closed';
  delegatesFocus?: boolean;
  slotAssignment?: 'manual' | 'named';
}

export function createShadowRoot(element: Element, init: ShadowRootInit): ShadowRoot;
export function adoptStyles(shadowRoot: ShadowRoot, styles: string | CSSStyleSheet[]): void;
export function getShadowRoot(element: Element): ShadowRoot | null;

// ===== Template Utilities Types =====

export function createTemplate(html: string): HTMLTemplateElement;
export function cloneTemplate(template: HTMLTemplateElement): DocumentFragment;
export function renderToTemplate(component: any): HTMLTemplateElement;

// ===== Lifecycle Hooks =====

export interface LifecycleHooks {
  onConnected?: () => void;
  onDisconnected?: () => void;
  onAdopted?: () => void;
  onAttributeChanged?: (name: string, oldValue: string | null, newValue: string | null) => void;
  onPropertyChanged?: (name: string, oldValue: any, newValue: any) => void;
}

export function createLifecycleManager(hooks: LifecycleHooks): {
  connected(): void;
  disconnected(): void;
  adopted(): void;
  attributeChanged(name: string, oldValue: string | null, newValue: string | null): void;
};
