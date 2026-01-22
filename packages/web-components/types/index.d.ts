/**
 * Coherent.js Web Components TypeScript Definitions
 * @module @coherent.js/web-components
 */

import type { CoherentNode, CoherentComponent, ComponentState, ComponentProps } from '@coherent.js/core';

// ============================================================================
// Web Component Configuration
// ============================================================================

/**
 * Property type constructors
 */
export type PropertyType =
  | StringConstructor
  | NumberConstructor
  | BooleanConstructor
  | ObjectConstructor
  | ArrayConstructor;

/**
 * Property definition for web components
 */
export interface PropertyDefinition {
  /** Property type */
  type?: PropertyType;
  /** Default value */
  default?: unknown;
  /** Whether property is required */
  required?: boolean;
  /** Custom validator */
  validator?: (value: unknown) => boolean;
}

/**
 * Component options for web component registration
 */
export interface ComponentOptions {
  /** Use shadow DOM */
  shadow?: boolean;
  /** Shadow root mode */
  mode?: 'open' | 'closed';
  /** Delegates focus to shadow root */
  delegatesFocus?: boolean;
  /** Attributes to observe */
  observedAttributes?: string[];
  /** Property definitions */
  props?: Record<string, PropertyDefinition>;
  /** Lifecycle hooks */
  lifecycle?: {
    connected?: () => void;
    disconnected?: () => void;
    adopted?: () => void;
    attributeChanged?: (name: string, oldValue: string | null, newValue: string | null) => void;
  };
}

/**
 * Web component configuration
 */
export interface WebComponentConfig {
  /** Custom element tag name (must contain hyphen) */
  tagName: string;
  /** Coherent.js component */
  component: CoherentComponent;
  /** Attributes to observe */
  observedAttributes?: string[];
  /** Use shadow DOM */
  shadow?: boolean | ShadowRootInit;
  /** Styles to apply */
  styles?: string | string[];
  /** Adopted style sheets */
  adoptedStyleSheets?: CSSStyleSheet[];
}

// ============================================================================
// Coherent Web Component
// ============================================================================

/**
 * Coherent element constructor
 */
export interface CoherentElementConstructor {
  new (): CoherentElement;
  prototype: CoherentElement;
}

/**
 * Coherent web component element interface
 */
export interface CoherentElement extends HTMLElement {
  /** The wrapped component */
  component: CoherentComponent;
  /** Component options */
  options: ComponentOptions;

  /** Render the component */
  render(): void;

  /** Update with new props */
  update(props?: Record<string, unknown>): void;

  /** Hydrate with server data */
  hydrate(data?: unknown): void;
}

/**
 * Extended coherent web component interface
 */
export interface CoherentWebComponent extends HTMLElement {
  /** Component instance reference */
  readonly componentInstance: unknown;
  /** Current props */
  props: Record<string, unknown>;
  /** Current state */
  state: ComponentState;

  /** Called when element is added to DOM */
  connectedCallback(): void;
  /** Called when element is removed from DOM */
  disconnectedCallback(): void;
  /** Called when an observed attribute changes */
  attributeChangedCallback(name: string, oldValue: string | null, newValue: string | null): void;
  /** Called when element is moved to a new document */
  adoptedCallback(): void;

  /** Update component state */
  setState(updates: Partial<ComponentState>): void;
  /** Force a re-render */
  forceUpdate(): void;
}

// ============================================================================
// Registration Functions
// ============================================================================

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
  component: CoherentComponent | CoherentNode,
  options?: ComponentOptions
): CoherentElementConstructor;

/**
 * Define a web component with full configuration
 */
export function defineWebComponent(config: WebComponentConfig): typeof CoherentWebComponent;

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
export function registerComponents(
  components: Record<string, CoherentComponent | CoherentNode>,
  options?: ComponentOptions
): void;

/**
 * Register web components with full configuration
 */
export function registerWebComponents(
  components: Record<string, WebComponentConfig>
): void;

/**
 * Create a custom element class from a component
 */
export function createCustomElement(
  component: CoherentComponent,
  options?: Partial<WebComponentConfig>
): typeof CoherentWebComponent;

/**
 * Integration utilities for web components runtime
 */
export function integrateWithWebComponents(runtime: unknown): void;

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
export function fromCustomElement(element: HTMLElement): CoherentNode;

// ============================================================================
// Property Decorators
// ============================================================================

/**
 * Property declaration for decorators
 */
export interface PropertyDeclaration {
  /** Property type */
  type?: PropertyType;
  /** Sync with attribute */
  attribute?: boolean | string;
  /** Reflect to attribute */
  reflect?: boolean;
  /** Custom converter from attribute string */
  converter?: (value: string) => unknown;
  /** Default value */
  default?: unknown;
}

/**
 * Create a property definition
 */
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

// ============================================================================
// Event System
// ============================================================================

/**
 * Custom event options
 */
export interface EventOptions {
  /** Whether event bubbles */
  bubbles?: boolean;
  /** Whether event is composed (crosses shadow boundary) */
  composed?: boolean;
  /** Whether event is cancelable */
  cancelable?: boolean;
  /** Event detail data */
  detail?: unknown;
}

/**
 * Create a custom event
 */
export function createEvent(type: string, options?: EventOptions): CustomEvent;

/**
 * Dispatch a custom event on an element
 */
export function dispatchCustomEvent(
  element: Element,
  type: string,
  options?: EventOptions
): boolean;

// ============================================================================
// Slot Utilities
// ============================================================================

/**
 * Slot change event interface
 */
export interface SlotChangeEvent extends Event {
  target: HTMLSlotElement;
}

/**
 * Get slotted content
 */
export function getSlotContent(element: Element, slotName?: string): Node[];

/**
 * Check if slot has content
 */
export function hasSlotContent(element: Element, slotName?: string): boolean;

/**
 * Listen for slot changes
 */
export function onSlotChange(
  element: Element,
  callback: (event: SlotChangeEvent) => void,
  slotName?: string
): () => void;

// ============================================================================
// Shadow DOM Utilities
// ============================================================================

/**
 * Shadow root initialization options
 */
export interface ShadowRootInit {
  /** Shadow mode */
  mode: 'open' | 'closed';
  /** Delegates focus */
  delegatesFocus?: boolean;
  /** Slot assignment mode */
  slotAssignment?: 'manual' | 'named';
}

/**
 * Create a shadow root
 */
export function createShadowRoot(element: Element, init: ShadowRootInit): ShadowRoot;

/**
 * Adopt styles into a shadow root
 */
export function adoptStyles(shadowRoot: ShadowRoot, styles: string | CSSStyleSheet[]): void;

/**
 * Get an element's shadow root
 */
export function getShadowRoot(element: Element): ShadowRoot | null;

// ============================================================================
// Template Utilities
// ============================================================================

/**
 * Create a template element from HTML
 */
export function createTemplate(html: string): HTMLTemplateElement;

/**
 * Clone a template's content
 */
export function cloneTemplate(template: HTMLTemplateElement): DocumentFragment;

/**
 * Render a component to a template
 */
export function renderToTemplate(component: CoherentNode): HTMLTemplateElement;

// ============================================================================
// Lifecycle Hooks
// ============================================================================

/**
 * Lifecycle hook definitions
 */
export interface LifecycleHooks {
  /** Called when element is added to DOM */
  onConnected?: () => void;
  /** Called when element is removed from DOM */
  onDisconnected?: () => void;
  /** Called when element is moved to new document */
  onAdopted?: () => void;
  /** Called when observed attribute changes */
  onAttributeChanged?: (name: string, oldValue: string | null, newValue: string | null) => void;
  /** Called when a property changes */
  onPropertyChanged?: (name: string, oldValue: unknown, newValue: unknown) => void;
}

/**
 * Create a lifecycle manager
 */
export function createLifecycleManager(hooks: LifecycleHooks): {
  connected(): void;
  disconnected(): void;
  adopted(): void;
  attributeChanged(name: string, oldValue: string | null, newValue: string | null): void;
};
