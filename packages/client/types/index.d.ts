/**
 * Coherent.js Client Types
 * TypeScript definitions for client-side functionality
 *
 * @version 1.0.0-beta.1
 */

// Import core types for component integration
import type {
  CoherentNode,
  CoherentElement,
  StrictCoherentElement,
  CoherentChild,
  CoherentComponent,
  ComponentProps,
  ComponentState,
} from '@coherent.js/core';

// Re-export core types for convenience
export type {
  CoherentNode,
  CoherentElement,
  StrictCoherentElement,
  CoherentChild,
  CoherentComponent,
  ComponentProps,
  ComponentState,
};

// ============================================================================
// DOM and Browser Types
// ============================================================================

/** HTML element with Coherent.js data attributes */
export interface CoherentHTMLElement extends HTMLElement {
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
  __coherentInstance?: HydratedInstance;
}

// ============================================================================
// Event Handler Types - Specific DOM Events
// ============================================================================

/**
 * Generic event handler type.
 * The handler receives the DOM event, the element, and optional custom data.
 */
export type EventHandler<E extends Event = Event> = (
  event: E,
  element: HTMLElement,
  data?: any
) => void | Promise<void>;

/** Click event handler (MouseEvent) */
export type ClickHandler = EventHandler<MouseEvent>;

/** Double-click event handler (MouseEvent) */
export type DblClickHandler = EventHandler<MouseEvent>;

/** Keyboard event handler (KeyboardEvent) */
export type KeyHandler = EventHandler<KeyboardEvent>;

/** Focus event handler (FocusEvent) */
export type FocusHandler = EventHandler<FocusEvent>;

/** Form submit event handler (SubmitEvent) */
export type SubmitHandler = EventHandler<SubmitEvent>;

/** Input change event handler (Event) */
export type ChangeHandler = EventHandler<Event>;

/** Input event handler (InputEvent) */
export type InputHandler = EventHandler<InputEvent>;

/** Mouse event handler (MouseEvent) */
export type MouseHandler = EventHandler<MouseEvent>;

/** Drag event handler (DragEvent) */
export type DragHandler = EventHandler<DragEvent>;

/** Touch event handler (TouchEvent) */
export type TouchHandler = EventHandler<TouchEvent>;

/** Wheel event handler (WheelEvent) */
export type WheelHandler = EventHandler<WheelEvent>;

/**
 * State-aware event handler used in components.
 * Receives event, current state, and setState function.
 */
export type StateAwareHandler<S = any, E extends Event = Event> = (
  event: E,
  state: S,
  setState: (newState: Partial<S> | ((prev: S) => Partial<S>)) => void
) => void | Promise<void>;

// ============================================================================
// Serializable State Types
// ============================================================================

/** Primitive values that can be serialized to JSON */
export type SerializablePrimitive = string | number | boolean | null;

/**
 * State that can be serialized/deserialized for hydration.
 * Only JSON-safe values are allowed.
 */
export interface SerializableState {
  [key: string]:
    | SerializablePrimitive
    | SerializablePrimitive[]
    | SerializableState
    | SerializableState[]
    | undefined;
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
  /** Enable mismatch detection (dev mode default: true) */
  detectMismatch?: boolean;
  /** Throw on mismatch instead of warning */
  strict?: boolean;
  /** Custom mismatch handler */
  onMismatch?: (mismatches: HydrationMismatch[]) => void;
  /** Additional props to pass to component */
  props?: Record<string, any>;
}

/** State transformation functions */
export interface StateTransforms {
  [key: string]: (value: any) => any;
}

/** State validation functions */
export interface StateValidators {
  [key: string]: (value: any) => boolean;
}

/** Hydration mismatch information */
export interface HydrationMismatch {
  path: string;
  type: 'text' | 'attribute' | 'tag' | 'children' | 'missing' | 'extra';
  expected: any;
  actual: any;
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

/**
 * Hydrated component instance returned by hydrate().
 * Provides control methods for state management and lifecycle.
 */
export interface HydratedInstance {
  /** The DOM element being hydrated */
  element: HTMLElement;
  /** The component function */
  component: CoherentComponent;
  /** Current props */
  props: Record<string, any>;
  /** Current state */
  state: SerializableState;
  /** Whether hydration is complete */
  isHydrated: boolean;

  /** Update props and re-render */
  update(newProps?: Record<string, any>): HydratedInstance;
  /** Re-render with current state */
  rerender(): void;
  /** Destroy the instance and clean up */
  destroy(): void;
  /** Set state and trigger re-render */
  setState(newState: Partial<SerializableState> | ((prev: SerializableState) => Partial<SerializableState>)): void;
}

/**
 * Control object returned by the clean hydrate() API.
 */
export interface HydrateControl {
  /** Unmount the component and clean up event handlers */
  unmount(): void;
  /** Re-render with optional new props */
  rerender(newProps?: Record<string, any>): void;
  /** Get current state */
  getState(): SerializableState;
  /** Set state and trigger re-render */
  setState(newState: Partial<SerializableState> | ((prev: SerializableState) => Partial<SerializableState>)): void;
}

export interface MakeHydratableOptions {
  componentName?: string;
  initialState?: SerializableState;
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
// Event Delegation Types (Plan 02-01)
// ============================================================================

/** Event delegation instance interface */
export interface EventDelegation {
  /** Initialize event delegation on document (idempotent) */
  initialize(): void;
  /** Destroy delegation and remove all listeners */
  destroy(): void;
  /** Check if delegation is initialized */
  isInitialized(): boolean;
}

/** Handler registry interface */
export interface HandlerRegistry {
  /** Register a handler by ID */
  register(
    id: string,
    handler: StateAwareHandler,
    componentRef?: { getState: () => any; setState: (state: any) => void }
  ): void;
  /** Unregister a handler by ID */
  unregister(id: string): boolean;
  /** Get a handler by ID */
  get(id: string): { handler: StateAwareHandler; componentRef?: any } | undefined;
  /** Check if handler exists */
  has(id: string): boolean;
  /** Clear all handlers */
  clear(): void;
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
  type: 'component' | 'style' | 'script' | 'template' | 'full-reload';
  id: string;
  path: string;
  content?: string;
  timestamp: number;
  /** File that changed (for error display) */
  file?: string;
  /** Line number for error */
  line?: number;
  /** Column number for error */
  column?: number;
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
  /** Show error overlay */
  overlay?: boolean;
  /** Show connection indicator */
  indicator?: boolean;
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

/** Hot context API for modules (Vite-compatible) */
export interface HotContext {
  /** Accept self updates */
  accept(): void;
  /** Accept updates from dependencies */
  accept(deps: string | string[], callback?: (modules: any[]) => void): void;
  /** Dispose callback for cleanup */
  dispose(callback: (data: any) => void): void;
  /** Prune callback when module is removed */
  prune(callback: () => void): void;
  /** Invalidate to trigger parent update */
  invalidate(): void;
  /** Decline to fall back to full reload */
  decline(): void;
  /** Data persisted across HMR updates */
  data: Record<string, any>;
}

/** Module tracker for HMR boundary detection */
export interface ModuleTracker {
  /** Track a module with its hot context */
  track(moduleId: string, context: HotContext): void;
  /** Check if module is a boundary */
  isBoundary(moduleId: string): boolean;
  /** Get hot context for module */
  getContext(moduleId: string): HotContext | undefined;
  /** Clear tracked modules */
  clear(): void;
}

/** Cleanup tracker for resource management during HMR */
export interface CleanupTracker {
  /** Track a timer for cleanup */
  trackTimer(moduleId: string, timerId: number): void;
  /** Track an event listener for cleanup */
  trackListener(moduleId: string, element: EventTarget, event: string, handler: EventListener): void;
  /** Track a fetch request for cleanup */
  trackFetch(moduleId: string, controller: AbortController): void;
  /** Clean up all resources for a module */
  cleanup(moduleId: string): void;
  /** Clear all tracked resources */
  clearAll(): void;
}

/** State capturer for preserving form state during HMR */
export interface StateCapturer {
  /** Capture current input values and scroll positions */
  capture(): Record<string, any>;
  /** Restore captured state */
  restore(state: Record<string, any>): void;
}

/** Error overlay for displaying HMR errors */
export interface ErrorOverlay {
  /** Show error overlay */
  show(error: { message: string; file?: string; line?: number; column?: number; frame?: string }): void;
  /** Hide error overlay */
  hide(): void;
  /** Check if overlay is visible */
  isVisible(): boolean;
}

/** Connection indicator for WebSocket status */
export interface ConnectionIndicator {
  /** Show indicator with status */
  show(status: 'connected' | 'disconnected' | 'connecting' | 'error'): void;
  /** Hide indicator */
  hide(): void;
  /** Update status */
  setStatus(status: 'connected' | 'disconnected' | 'connecting' | 'error'): void;
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
// Router Types
// ============================================================================

/** Route configuration */
export interface RouteConfig {
  /** Route path pattern */
  path: string;
  /** Component to render (can be async for code splitting) */
  component: CoherentComponent | (() => Promise<CoherentComponent>);
  /** Route metadata */
  meta?: Record<string, any>;
  /** Before enter guard */
  beforeEnter?: (to: Route, from: Route | null) => boolean | Promise<boolean>;
  /** Before leave guard */
  beforeLeave?: (to: Route, from: Route) => boolean | Promise<boolean>;
  /** Prefetch priority */
  priority?: number;
  /** Custom transition for this route */
  transition?: RouteTransition;
}

/** Current route state */
export interface Route {
  path: string;
  component?: CoherentComponent;
  meta?: Record<string, any>;
  hash?: string;
  query?: Record<string, string>;
}

/** Route transition configuration */
export interface RouteTransition {
  enter: string;
  leave: string;
  duration: number;
}

/** Scroll behavior configuration */
export interface ScrollBehaviorConfig {
  enabled?: boolean;
  behavior?: ScrollBehavior;
  position?: 'top' | 'saved';
  delay?: number;
  savePosition?: boolean;
  custom?: (to: Route, from: Route | null, savedPosition: { x: number; y: number } | null) => { x: number; y: number } | { el: Element };
}

/** Router configuration */
export interface RouterConfig {
  mode?: 'history' | 'hash';
  base?: string;
  prefetch?: {
    enabled?: boolean;
    strategy?: 'hover' | 'visible' | 'idle';
    delay?: number;
    maxConcurrent?: number;
    priority?: {
      critical?: number;
      high?: number;
      normal?: number;
      low?: number;
    };
  };
  transitions?: {
    enabled?: boolean;
    default?: RouteTransition;
    routes?: Record<string, RouteTransition>;
    onStart?: (from: string | null, to: string) => void;
    onComplete?: (from: string | null, to: string) => void;
  };
  codeSplitting?: {
    enabled?: boolean;
    strategy?: 'route';
    chunkNaming?: string;
    preload?: string[];
    onLoad?: (path: string, component: any, loadTime: number) => void;
  };
  scrollBehavior?: ScrollBehaviorConfig;
}

/** Router statistics */
export interface RouterStats {
  navigations: number;
  prefetches: number;
  transitionsCompleted: number;
  chunksLoaded: number;
  scrollRestores: number;
  routesRegistered: number;
  prefetchQueueSize: number;
  activePrefetches: number;
  loadedChunks: number;
  savedPositions: number;
  historyLength: number;
}

/** Router instance */
export interface Router {
  addRoute(path: string, config: RouteConfig): void;
  push(path: string, options?: Partial<Route>): Promise<boolean>;
  replace(path: string, options?: Partial<Route>): Promise<boolean>;
  back(): void;
  forward(): void;
  prefetchRoute(path: string, priority?: number): Promise<void>;
  prefetchRoutes(paths: string[], priority?: number): void;
  setupPrefetchStrategy(element: HTMLElement, path: string): void;
  getRoute(path: string): RouteConfig | undefined;
  getRoutes(): RouteConfig[];
  getCurrentRoute(): Route | null;
  getStats(): RouterStats;
  clearCaches(): void;
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
declare function extractInitialState(
  element: HTMLElement,
  options?: Pick<HydrationOptions, 'initialState' | 'transforms' | 'validators'>
): SerializableState | null;

/**
 * Hydrate a server-rendered component (clean API).
 * Returns a control object with unmount, rerender, getState, and setState.
 */
export function hydrate(
  component: CoherentComponent,
  container: HTMLElement,
  options?: HydrationOptions
): HydrateControl;

/**
 * Hydrate a single element (legacy API).
 * @deprecated Use the clean hydrate() API instead.
 */
export function legacyHydrate(
  element: HTMLElement,
  component: CoherentComponent,
  props?: Record<string, any>,
  options?: { initialState?: SerializableState }
): HydratedInstance | null;

/** Hydrate multiple elements */
export function hydrateAll(
  elements: HTMLElement[],
  components: CoherentComponent[],
  propsArray?: Array<Record<string, any>>
): Array<HydratedInstance | null>;

export function hydrateBySelector(
  selector: string,
  component: CoherentComponent,
  props?: Record<string, any>
): Array<HydratedInstance | null>;

export function enableClientEvents(rootElement?: Document | HTMLElement): void;

export function makeHydratable<T extends CoherentComponent>(
  component: T,
  options?: MakeHydratableOptions
): T & {
  isHydratable: true;
  hydrationOptions: MakeHydratableOptions;
  autoHydrate(componentRegistry?: Record<string, any>): void;
  getHydrationData(props?: Record<string, any>, state?: SerializableState | null): {
    componentName: string;
    props: Record<string, any>;
    initialState?: SerializableState;
    hydrationAttributes: Record<string, string | null>;
  };
  renderWithHydration(props?: Record<string, any>): CoherentNode;
};

/** Auto-hydrate elements on DOM ready */
export function autoHydrate(componentRegistry?: Record<string, CoherentComponent>): void;

export function registerEventHandler<S = any, E extends Event = Event>(
  id: string,
  handler: StateAwareHandler<S, E>
): void;

/** Register a component for auto-hydration */
declare function registerComponent(
  name: string,
  factory: ComponentFactory,
  options?: Partial<ComponentRegistryEntry>
): void;

/** Unregister a component */
declare function unregisterComponent(name: string): boolean;

/** Get registered component */
declare function getComponent(name: string): ComponentRegistryEntry | undefined;

/** Get all registered components */
declare function getAllComponents(): ComponentRegistryEntry[];

/** Create a client component */
declare function createClientComponent(
  element: HTMLElement,
  initialState?: SerializableState
): ClientComponent;

/** Wait for DOM to be ready */
declare function ready(callback: ReadyCallback): Promise<void>;

/** DOM query utilities */
declare function $(selector: Selector): HTMLElement[];
declare function $$(selector: string): HTMLElement | null;

/** Event utilities */
declare function on(
  element: HTMLElement | string,
  event: string,
  handler: EventHandler,
  options?: EventListenerOptions | boolean
): void;

declare function off(
  element: HTMLElement | string,
  event?: string,
  handler?: EventHandler
): void;

declare function trigger(
  element: HTMLElement,
  event: string,
  data?: CustomEventData
): boolean;

declare function delegate(
  container: HTMLElement,
  selector: string,
  event: string,
  handler: EventHandler
): void;

/** Animation utilities */
declare function requestAnimationFrame(callback: AnimationCallback): number;
declare function cancelAnimationFrame(id: number): void;

/** Debounce and throttle utilities */
declare function debounce<T extends (...args: any[]) => any>(
  func: T,
  delay: number
): (...args: Parameters<T>) => void;

declare function throttle<T extends (...args: any[]) => any>(
  func: T,
  limit: number
): (...args: Parameters<T>) => void;

/** State management utilities */
declare function createStateManager(): ClientStateManager;
declare function syncState(options: StateSyncOptions): void;

/** Performance utilities */
declare function createPerformanceMonitor(): PerformanceMonitor;

/** HMR utilities */
declare function createHMRClient(config?: Partial<HMRConfig>): HMRClient;
declare function enableHMR(config?: Partial<HMRConfig>): Promise<void>;
export function createHotContext(moduleId: string): HotContext;

/** Intersection observer utilities */
declare function observeVisibility(
  elements: HTMLElement | HTMLElement[],
  callback: (entries: ExtendedIntersectionObserverEntry[]) => void,
  options?: IntersectionObserverInit
): IntersectionObserver;

/** Lazy loading utilities */
declare function lazyLoad(
  elements: HTMLElement | HTMLElement[],
  options?: {
    threshold?: number;
    rootMargin?: string;
    attribute?: string;
    placeholder?: string;
  }
): IntersectionObserver;

// ============================================================================
// State Serialization Functions (Plan 02-02)
// ============================================================================

/** Serialize state to base64-encoded JSON */
export function serializeState(state: SerializableState): string;

/** Deserialize state from base64-encoded JSON */
export function deserializeState(encoded: string): SerializableState;

/** Extract state from DOM element's data-state attribute */
export function extractState(element: HTMLElement): SerializableState | null;

/** Serialize state with size warning (10KB threshold) */
export function serializeStateWithWarning(state: SerializableState, componentName?: string): string;

// ============================================================================
// Mismatch Detection Functions (Plan 02-03)
// ============================================================================

/** Detect mismatches between DOM and virtual DOM */
export function detectMismatch(element: HTMLElement, vNode: CoherentNode): HydrationMismatch[];

/** Report mismatches with warnings or errors */
export function reportMismatches(
  mismatches: HydrationMismatch[],
  options?: { componentName?: string; strict?: boolean }
): void;

/** Format path for mismatch reporting */
export function formatPath(path: (string | number)[]): string;

// ============================================================================
// Event Delegation Exports (Plan 02-01)
// ============================================================================

/** Event delegation singleton */
export const eventDelegation: EventDelegation;

/** Handler registry singleton */
export const handlerRegistry: HandlerRegistry;

/** Wrap an event handler for use with event delegation */
export function wrapEvent<S = any, E extends Event = Event>(
  eventType: string,
  handler: StateAwareHandler<S, E>,
  handlerId?: string
): { handlerId: string; dataAttribute: string };

// ============================================================================
// HMR Exports (Phase 4)
// ============================================================================

export const HMRClient: new (config?: Partial<HMRConfig>) => HMRClient;
export const hmrClient: HMRClient;
export const ModuleTracker: new () => ModuleTracker;
export const moduleTracker: ModuleTracker;
export const CleanupTracker: new () => CleanupTracker;
export const cleanupTracker: CleanupTracker;
export const StateCapturer: new () => StateCapturer;
export const stateCapturer: StateCapturer;
export const ErrorOverlay: new () => ErrorOverlay;
export const errorOverlay: ErrorOverlay;
export const ConnectionIndicator: new () => ConnectionIndicator;
export const connectionIndicator: ConnectionIndicator;

// ============================================================================
// Global Constants
// ============================================================================

/** Default hydration selector */
declare const DEFAULT_HYDRATION_SELECTOR: string;

/** Component registry */
declare const componentRegistry: Map<string, ComponentRegistryEntry>;

/** Global state manager instance */
declare const globalStateManager: ClientStateManager;

/** Global event manager instance */
declare const globalEventManager: EventManager;

/** Global performance monitor instance */
declare const globalPerformanceMonitor: PerformanceMonitor;

// ============================================================================
// Default Export
// ============================================================================

declare const coherentClient: {
  // Hydration
  extractInitialState: typeof extractInitialState;
  hydrate: typeof hydrate;
  legacyHydrate: typeof legacyHydrate;
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
  createHotContext: typeof createHotContext;

  // Intersection Observer
  observeVisibility: typeof observeVisibility;
  lazyLoad: typeof lazyLoad;

  // Constants
  DEFAULT_HYDRATION_SELECTOR: typeof DEFAULT_HYDRATION_SELECTOR;
  componentRegistry: typeof componentRegistry;
  globalEventManager: typeof globalEventManager;
};

declare const _unused: typeof coherentClient;
