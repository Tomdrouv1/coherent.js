/**
 * Coherent.js Client Types
 * TypeScript definitions for client-side functionality
 * 
 * @version 1.1.1
 */

// ============================================================================
// DOM and Browser Types
// ============================================================================

/** HTML element with Coherent.js data attributes */
export interface CoherentElement extends HTMLElement {
  'data-coherent-state'?: string;
  'data-coherent-component'?: string;
  'data-coherent-id'?: string;
  'data-action'?: string;
  'data-event'?: string;
  'data-count'?: string;
  'data-step'?: string;
  'data-active'?: string;
  'data-loading'?: string;
  'data-disabled'?: string;
  'data-selected'?: string;
  'data-expanded'?: string;
  'data-visible'?: string;
}

/** Event handler function type */
export type EventHandler = (event: Event, element: HTMLElement, data?: any) => void | Promise<void>;

/** Component state that can be serialized/deserialized */
export interface SerializableState {
  [key: string]: string | number | boolean | null | undefined | SerializableState | SerializableState[];
}

// ============================================================================
// Hydration Types
// ============================================================================

/** Hydration options */
export interface HydrationOptions {
  initialState?: SerializableState;
  autoHydrate?: boolean;
  selector?: string;
  preserveState?: boolean;
  enableEvents?: boolean;
  debugMode?: boolean;
  timeout?: number;
  onError?: (error: Error, element?: HTMLElement) => void;
  onSuccess?: (element: HTMLElement, state: SerializableState) => void;
  transforms?: StateTransforms;
  validators?: StateValidators;
}

/** State transformation functions */
export interface StateTransforms {
  [key: string]: (value: any) => any;
}

/** State validation functions */
export interface StateValidators {
  [key: string]: (value: any) => boolean;
}

/** Component hydration result */
export interface HydrationResult {
  success: boolean;
  element: HTMLElement;
  state: SerializableState;
  component?: ClientComponent;
  error?: Error;
  duration?: number;
}

/** Batch hydration result */
export interface BatchHydrationResult {
  total: number;
  successful: number;
  failed: number;
  results: HydrationResult[];
  errors: Array<{ element: HTMLElement; error: Error }>;
  duration: number;
}

// ============================================================================
// Client Component Types
// ============================================================================

/** Client-side component interface */
export interface ClientComponent {
  readonly element: HTMLElement;
  readonly state: SerializableState;
  readonly isHydrated: boolean;
  readonly id: string;
  
  setState(newState: Partial<SerializableState>): void;
  updateState(updater: (state: SerializableState) => Partial<SerializableState>): void;
  getState(): SerializableState;
  resetState(): void;
  
  render(): void;
  destroy(): void;
  refresh(): void;
  
  addEventListener(event: string, handler: EventHandler): void;
  removeEventListener(event: string, handler: EventHandler): void;
  trigger(event: string, data?: any): void;
  
  serialize(): string;
  toJSON(): SerializableState;
}

/** Component factory function */
export type ComponentFactory = (element: HTMLElement, initialState?: SerializableState) => ClientComponent;

/** Component registry entry */
export interface ComponentRegistryEntry {
  name: string;
  factory: ComponentFactory;
  selector?: string;
  autoHydrate?: boolean;
}

// ============================================================================
// Event System Types
// ============================================================================

/** Event binding configuration */
export interface EventBinding {
  event: string;
  selector?: string;
  handler: EventHandler;
  options?: EventListenerOptions | boolean;
  delegate?: boolean;
  once?: boolean;
}

/** Event manager interface */
export interface EventManager {
  bind(element: HTMLElement, bindings: EventBinding[]): void;
  unbind(element: HTMLElement, event?: string): void;
  trigger(element: HTMLElement, event: string, data?: any): void;
  delegate(container: HTMLElement, selector: string, event: string, handler: EventHandler): void;
  undelegate(container: HTMLElement, selector?: string, event?: string): void;
  once(element: HTMLElement, event: string, handler: EventHandler): void;
  debounce(handler: EventHandler, delay: number): EventHandler;
  throttle(handler: EventHandler, limit: number): EventHandler;
}

/** Custom event data */
export interface CustomEventData {
  detail: any;
  bubbles?: boolean;
  cancelable?: boolean;
  composed?: boolean;
}

// ============================================================================
// State Management Types
// ============================================================================

/** Client state manager */
export interface ClientStateManager {
  get<T = any>(key: string): T | undefined;
  set<T = any>(key: string, value: T): void;
  has(key: string): boolean;
  delete(key: string): boolean;
  clear(): void;
  keys(): string[];
  values(): any[];
  entries(): Array<[string, any]>;
  size(): number;
  
  subscribe(key: string, callback: (value: any, oldValue?: any) => void): () => void;
  unsubscribe(key: string, callback?: Function): void;
  
  persist(key: string, storage?: Storage): void;
  unpersist(key: string): void;
  
  batch(fn: () => void): void;
  
  toJSON(): Record<string, any>;
  fromJSON(data: Record<string, any>): void;
}

/** State synchronization options */
export interface StateSyncOptions {
  key: string;
  storage?: Storage;
  serializer?: {
    stringify: (value: any) => string;
    parse: (value: string) => any;
  };
  debounce?: number;
  validate?: (value: any) => boolean;
  transform?: (value: any) => any;
}

// ============================================================================
// Hot Module Replacement Types
// ============================================================================

/** HMR update information */
export interface HMRUpdate {
  type: 'component' | 'style' | 'script' | 'template';
  id: string;
  path: string;
  content?: string;
  timestamp: number;
}

/** HMR event listener */
export type HMRListener = (update: HMRUpdate) => void | Promise<void>;

/** HMR configuration */
export interface HMRConfig {
  enabled: boolean;
  websocketUrl?: string;
  reconnectInterval?: number;
  maxReconnectAttempts?: number;
  debug?: boolean;
  onUpdate?: HMRListener;
  onError?: (error: Error) => void;
  onReconnect?: () => void;
}

/** HMR client interface */
export interface HMRClient {
  readonly isConnected: boolean;
  readonly config: HMRConfig;
  
  connect(): Promise<void>;
  disconnect(): void;
  
  onUpdate(listener: HMRListener): () => void;
  onError(listener: (error: Error) => void): () => void;
  onReconnect(listener: () => void): () => void;
  
  updateComponent(id: string, factory: ComponentFactory): void;
  updateStyle(id: string, css: string): void;
  reloadPage(): void;
}

// ============================================================================
// Performance Types
// ============================================================================

/** Performance metrics */
export interface PerformanceMetrics {
  hydrationTime: number;
  componentCount: number;
  eventBindings: number;
  memoryUsage?: number;
  renderTime?: number;
  stateUpdates: number;
}

/** Performance monitor interface */
export interface PerformanceMonitor {
  start(label: string): void;
  end(label: string): number;
  measure(label: string, fn: () => any): any;
  measureAsync(label: string, fn: () => Promise<any>): Promise<any>;
  getMetrics(): PerformanceMetrics;
  reset(): void;
  report(): void;
}

// ============================================================================
// Utility Types
// ============================================================================

/** DOM ready state */
export type ReadyState = 'loading' | 'interactive' | 'complete';

/** DOM ready callback */
export type ReadyCallback = () => void | Promise<void>;

/** Selector types */
export type Selector = string | HTMLElement | NodeList | HTMLElement[];

/** Animation frame callback */
export type AnimationCallback = (timestamp: number) => void;

/** Intersection observer entry with extended data */
export interface ExtendedIntersectionObserverEntry extends IntersectionObserverEntry {
  element: HTMLElement;
  isVisible: boolean;
  percentage: number;
}

// ============================================================================
// Main Functions
// ============================================================================

/** Extract initial state from DOM element */
export function extractInitialState(
  element: HTMLElement, 
  options?: Pick<HydrationOptions, 'initialState' | 'transforms' | 'validators'>
): SerializableState | null;

/** Hydrate a single element */
export function hydrateElement(
  element: HTMLElement, 
  component?: ComponentFactory,
  options?: HydrationOptions
): Promise<HydrationResult>;

/** Hydrate multiple elements */
export function hydrateAll(
  selector?: string,
  options?: HydrationOptions
): Promise<BatchHydrationResult>;

/** Auto-hydrate elements on DOM ready */
export function autoHydrate(options?: HydrationOptions): Promise<void>;

/** Register a component for auto-hydration */
export function registerComponent(
  name: string,
  factory: ComponentFactory,
  options?: Partial<ComponentRegistryEntry>
): void;

/** Unregister a component */
export function unregisterComponent(name: string): boolean;

/** Get registered component */
export function getComponent(name: string): ComponentRegistryEntry | undefined;

/** Get all registered components */
export function getAllComponents(): ComponentRegistryEntry[];

/** Create a client component */
export function createClientComponent(
  element: HTMLElement,
  initialState?: SerializableState
): ClientComponent;

/** Wait for DOM to be ready */
export function ready(callback: ReadyCallback): Promise<void>;

/** DOM query utilities */
export function $(selector: Selector): HTMLElement[];
export function $$(selector: string): HTMLElement | null;

/** Event utilities */
export function on(
  element: HTMLElement | string,
  event: string,
  handler: EventHandler,
  options?: EventListenerOptions | boolean
): void;

export function off(
  element: HTMLElement | string,
  event?: string,
  handler?: EventHandler
): void;

export function trigger(
  element: HTMLElement,
  event: string,
  data?: CustomEventData
): boolean;

export function delegate(
  container: HTMLElement,
  selector: string,
  event: string,
  handler: EventHandler
): void;

/** Animation utilities */
export function requestAnimationFrame(callback: AnimationCallback): number;
export function cancelAnimationFrame(id: number): void;

/** Debounce and throttle utilities */
export function debounce<T extends (...args: any[]) => any>(
  func: T,
  delay: number
): (...args: Parameters<T>) => void;

export function throttle<T extends (...args: any[]) => any>(
  func: T,
  limit: number
): (...args: Parameters<T>) => void;

/** State management utilities */
export function createStateManager(): ClientStateManager;
export function syncState(options: StateSyncOptions): void;

/** Performance utilities */
export function createPerformanceMonitor(): PerformanceMonitor;

/** HMR utilities */
export function createHMRClient(config?: Partial<HMRConfig>): HMRClient;
export function enableHMR(config?: Partial<HMRConfig>): Promise<void>;

/** Intersection observer utilities */
export function observeVisibility(
  elements: HTMLElement | HTMLElement[],
  callback: (entries: ExtendedIntersectionObserverEntry[]) => void,
  options?: IntersectionObserverInit
): IntersectionObserver;

/** Lazy loading utilities */
export function lazyLoad(
  elements: HTMLElement | HTMLElement[],
  options?: {
    threshold?: number;
    rootMargin?: string;
    attribute?: string;
    placeholder?: string;
  }
): IntersectionObserver;

// ============================================================================
// Global Constants
// ============================================================================

/** Default hydration selector */
export const DEFAULT_HYDRATION_SELECTOR: string;

/** Component registry */
export const componentRegistry: Map<string, ComponentRegistryEntry>;

/** Global state manager instance */
export const globalStateManager: ClientStateManager;

/** Global event manager instance */
export const globalEventManager: EventManager;

/** Global performance monitor instance */
export const globalPerformanceMonitor: PerformanceMonitor;

// ============================================================================
// Default Export
// ============================================================================

declare const coherentClient: {
  // Hydration
  extractInitialState: typeof extractInitialState;
  hydrateElement: typeof hydrateElement;
  hydrateAll: typeof hydrateAll;
  autoHydrate: typeof autoHydrate;
  
  // Component registration
  registerComponent: typeof registerComponent;
  unregisterComponent: typeof unregisterComponent;
  getComponent: typeof getComponent;
  getAllComponents: typeof getAllComponents;
  createClientComponent: typeof createClientComponent;
  
  // DOM utilities
  ready: typeof ready;
  $: typeof $;
  $$: typeof $$;
  
  // Event utilities
  on: typeof on;
  off: typeof off;
  trigger: typeof trigger;
  delegate: typeof delegate;
  
  // Animation utilities
  requestAnimationFrame: typeof requestAnimationFrame;
  cancelAnimationFrame: typeof cancelAnimationFrame;
  
  // Utility functions
  debounce: typeof debounce;
  throttle: typeof throttle;
  
  // State management
  createStateManager: typeof createStateManager;
  syncState: typeof syncState;
  globalStateManager: typeof globalStateManager;
  
  // Performance
  createPerformanceMonitor: typeof createPerformanceMonitor;
  globalPerformanceMonitor: typeof globalPerformanceMonitor;
  
  // HMR
  createHMRClient: typeof createHMRClient;
  enableHMR: typeof enableHMR;
  
  // Intersection Observer
  observeVisibility: typeof observeVisibility;
  lazyLoad: typeof lazyLoad;
  
  // Constants
  DEFAULT_HYDRATION_SELECTOR: typeof DEFAULT_HYDRATION_SELECTOR;
  componentRegistry: typeof componentRegistry;
  globalEventManager: typeof globalEventManager;
};

export default coherentClient;