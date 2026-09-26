/**
 * Coherent.js Client Types
 * TypeScript definitions for @coherent.js/client: hydration, event
 * delegation, state serialization, mismatch detection and HMR.
 *
 * The router is the `@coherent.js/client/router` entry point; its types are
 * re-exported here.
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
// Events
// ============================================================================

/**
 * What a delegated handler (an `on*` prop bound by `hydrate()`) receives: the
 * native event plus the component it belongs to.
 */
export interface CoherentEvent<S = any, E extends Event = Event> {
  /** The native DOM event */
  originalEvent: E;
  /** The event type, e.g. `'click'` */
  type: string;
  /** The element whose handler runs (the one carrying the handler) */
  target: Element;
  /** Same as `target` */
  currentTarget: Element;
  /** Whether the default action was prevented */
  readonly defaultPrevented: boolean;
  /** Whether a handler stopped propagation to ancestor handlers */
  propagationStopped: boolean;
  /** Prevent the default action (all delegated types but touch/wheel/scroll) */
  preventDefault(): void;
  /** Stop ancestor handlers and native propagation */
  stopPropagation(): void;
  /** Like stopPropagation(), also for other native listeners */
  stopImmediatePropagation(): void;
  /** The hydrated component function */
  component: ((props?: any) => CoherentNode) | null;
  /** The component's state when the event fired */
  state: S | null;
  /** Merge state and re-render the component */
  setState: ((newState: Partial<S> | ((prev: S) => Partial<S>)) => void) | null;
  /** The props the component last rendered with (state included) */
  props: Record<string, any> | null;
}

/** A delegated event handler. */
export type EventHandler<E extends Event = Event, S = any> = (
  event: CoherentEvent<S, E>
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

/** A delegated handler typed by the component's state. */
export type StateAwareHandler<S = any, E extends Event = Event> = (
  event: CoherentEvent<S, E>
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

/** Options for {@link hydrate} */
export interface HydrationOptions {
  /** State to hydrate with; defaults to the container's `data-state` */
  initialState?: SerializableState;
  /**
   * Compare the server DOM with the component's output. Defaults to on when
   * `strict` or `onMismatch` is given or `process.env.NODE_ENV` is
   * `'development'`, off otherwise.
   */
  detectMismatch?: boolean;
  /** Throw on mismatch instead of warning */
  strict?: boolean;
  /** Receive mismatches instead of the console warning */
  onMismatch?: (mismatches: HydrationMismatch[]) => void;
  /** Additional props to pass to component */
  props?: Record<string, any>;
}

/** One difference between the server DOM and the component's output */
export interface HydrationMismatch {
  /** Position in the virtual tree, e.g. `children[1].@class` */
  path: string;
  type:
    | 'text'
    | 'tagName'
    | 'attribute'
    | 'children_count'
    | 'missing_dom_child'
    | 'extra_dom_child';
  expected: any;
  actual: any;
  /** CSS-like path of the DOM element, for debugging */
  domPath: string;
}

/**
 * Control object returned by the clean hydrate() API.
 */
export interface HydrateControl {
  /** Unmount the component and clean up event handlers; terminal */
  unmount(): void;
  /** Re-render with optional new props */
  rerender(newProps?: Record<string, any>): void;
  /** Get current state */
  getState(): SerializableState;
  /** Set state and trigger re-render */
  setState(newState: Partial<SerializableState> | ((prev: SerializableState) => Partial<SerializableState>)): void;
}

// ============================================================================
// Event Delegation Types
// ============================================================================

/** The component a delegated handler belongs to */
export interface HandlerComponentRef {
  component?: (props?: any) => CoherentNode;
  state?: any;
  props?: Record<string, any>;
  getState?: () => any;
  setState?: (state: any) => void;
  [key: string]: any;
}

/** A registered handler and the component it belongs to */
export interface RegisteredHandler {
  handler: StateAwareHandler<any, any>;
  componentRef: HandlerComponentRef | null;
}

/**
 * Routes document-level events to handlers registered by id.
 *
 * Listeners are non-passive, so handlers can call `preventDefault()`, except
 * for scroll-blocking types (touchstart, touchmove, wheel, scroll). Handlers
 * run from the target's nearest `data-coherent-{type}` element outwards, like
 * bubbling, until one stops propagation. Focus and blur are captured, since
 * they do not bubble natively; other non-bubbling events (mouseenter, load,
 * ...) only reach a handler on the target itself.
 */
export class EventDelegation {
  constructor(registry?: HandlerRegistry);

  registry: HandlerRegistry;
  initialized: boolean;
  root: Document | Element | null;
  /** Event types delegated from the root */
  eventTypes: string[];

  /** Attach listeners to `root`; idempotent, and a no-op without a document */
  initialize(root?: Document | Element | null): void;

  /**
   * Delegate `eventType` too. hydrate() calls this for every event type a
   * component handles, so any DOM event works, not only the defaults.
   */
  listen(eventType: string): void;

  /** Dispatch one delegated event to its registered handlers */
  handleEvent(event: Event, eventType: string): void;

  /** Remove every listener attached by `initialize()` and `listen()` */
  destroy(): void;

  isInitialized(): boolean;
}

/** Stores delegated event handlers by id. */
export class HandlerRegistry {
  constructor();

  handlers: Map<string, RegisteredHandler>;

  /** Register a handler, optionally bound to a component */
  register(
    handlerId: string,
    handler: StateAwareHandler<any, any>,
    componentRef?: HandlerComponentRef | null
  ): void;

  /** Remove a handler; `false` when the id was not registered */
  unregister(handlerId: string): boolean;

  get(handlerId: string): RegisteredHandler | undefined;
  has(handlerId: string): boolean;
  clear(): void;

  /** Ids of every handler registered against one component */
  getByComponent(componentRef: HandlerComponentRef | null): string[];

  /** How many handlers are registered */
  get size(): number;
}

// ============================================================================
// Hot Module Replacement Types
// ============================================================================

/** Hot context API for a module (see {@link createHotContext}) */
export interface HotContext {
  /** Data persisted across HMR updates of this module */
  readonly data: Record<string, any>;
  /** Accept self updates; without it an update reloads the page */
  accept(callback?: (newModule: any) => void): void;
  /** Accept updates of dependencies */
  acceptDeps(deps: string | string[], callback: (modules: Record<string, any>) => void): void;
  /** Cleanup before the module is replaced; receives `data` */
  dispose(callback: (data: Record<string, any>) => void): void;
  /** Called when the module is removed from the module graph */
  prune(callback: () => void): void;
  /** Ask the dev server to propagate the update to importers */
  invalidate(message?: string): void;
}

/** Tracked timers, listeners and fetches of one module */
export interface HMRModuleContext {
  setTimeout(callback: (...args: any[]) => void, delay?: number, ...args: any[]): ReturnType<typeof setTimeout>;
  setInterval(callback: (...args: any[]) => void, delay?: number, ...args: any[]): ReturnType<typeof setInterval>;
  clearTimeout(id: ReturnType<typeof setTimeout>): void;
  clearInterval(id: ReturnType<typeof setInterval>): void;
  addEventListener(
    target: EventTarget,
    event: string,
    handler: EventListenerOrEventListenerObject,
    options?: AddEventListenerOptions | boolean
  ): void;
  createAbortController(): AbortController;
  /** fetch() aborted on module disposal and by the caller's own `signal` */
  fetch(url: string | URL, options?: RequestInit): Promise<Response>;
}

/** An error shown by the overlay */
export interface HMRErrorDetails {
  message: string;
  file?: string;
  line?: number;
  column?: number;
  frame?: string;
  stack?: string;
}

/** WebSocket client that applies dev-server updates */
export class HMRClient {
  constructor();

  socket: WebSocket | null;
  connected: boolean;
  reconnectAttempts: number;
  maxReconnectAttempts: number;
  reconnectDelay: number;
  hadDisconnect: boolean;
  reconnectTimeout: ReturnType<typeof setTimeout> | null;
  initialized: boolean;

  /** Connect once per page (no-op without `window`) */
  initialize(): void;
  /** Open the WebSocket, reconnecting with backoff when it closes */
  connect(): void;
  /** Close the socket without reconnecting */
  disconnect(): void;
  isConnected(): boolean;
  scheduleReconnect(): void;
  handleMessage(event: MessageEvent): void;
  /** Re-import a changed module; reloads the page when it does not accept updates */
  handleUpdate(data: { filePath?: string; webPath?: string; updateType?: string }): Promise<void>;
  /** Import an updated module (overridable) */
  importModule(url: string): Promise<any>;
  /** Reload the page */
  reload(): void;
  handleUpdateError(error: Error, filePath: string): void;
  showError(error: HMRErrorDetails): void;
  hideError(): void;
}

/** Hot contexts and update handlers by module id */
export class ModuleTracker {
  constructor();

  modules: Map<string, any>;
  socket: WebSocket | null;

  setSocket(socket: WebSocket | null): void;
  createHotContext(moduleId: string): HotContext;
  canHotUpdate(moduleId: string): boolean;
  isHmrBoundary(moduleId: string, moduleExports?: Record<string, any>): boolean;
  extractComponentName(moduleId: string): string | null;
  executeDispose(moduleId: string): Record<string, any> | null;
  executeAccept(moduleId: string, newModule?: any): boolean;
  executeAcceptDeps(moduleId: string, updatedDeps: Record<string, any>): boolean;
  executePrune(moduleId: string): void;
  hasModule(moduleId: string): boolean;
  getModuleData(moduleId: string): Record<string, any> | null;
  clear(): void;
}

/** Tracks module resources so HMR can release them */
export class CleanupTracker {
  constructor();

  moduleResources: Map<string, any>;

  createContext(moduleId: string): HMRModuleContext;
  cleanup(moduleId: string): void;
  checkForLeaks(moduleId: string): void;
  hasResources(moduleId: string): boolean;
  getResourceCounts(moduleId: string): {
    timers: number;
    intervals: number;
    listeners: number;
    abortControllers: number;
  } | null;
}

/** Preserves form input and scroll state across HMR updates */
export class StateCapturer {
  constructor();

  capturedInputs: Map<string, any>;
  scrollPositions: Map<string, { top: number; left: number }>;
  layoutSnapshot: Record<string, any> | null;

  getInputKey(input: HTMLInputElement | HTMLTextAreaElement | HTMLSelectElement): string;
  getElementPath(element: Element): string;
  captureFormState(): Map<string, any>;
  restoreFormState(): void;
  findInputsByKey(key: string): HTMLElement[];
  captureScrollPositions(): Map<string, { top: number; left: number }>;
  getScrollableKey(element: Element): string;
  captureLayout(): void;
  layoutChangedSignificantly(): boolean;
  findElementByKey(key: string): HTMLElement | null;
  restoreScrollPositions(): void;
  captureAll(): void;
  restoreAll(): void;
  clear(): void;
}

/** Full-screen overlay for HMR errors */
export class ErrorOverlay {
  constructor();

  overlay: { host: HTMLElement; shadow: ShadowRoot } | null;
  editor: string;

  createOverlay(): { host: HTMLElement; shadow: ShadowRoot };
  show(error: HMRErrorDetails): void;
  hide(): void;
  openInEditor(file: string, line?: number): void;
  setEditor(editor: string): void;
}

/** Small dot showing the HMR connection status */
export class ConnectionIndicator {
  constructor();

  indicator: HTMLElement | null;

  create(): void;
  update(status: 'connected' | 'disconnected' | 'reconnecting' | 'error'): void;
  destroy(): void;
}

// ============================================================================
// Router Types (the router itself is the @coherent.js/client/router entry)
// ============================================================================

export type {
  RouteConfig,
  Route,
  RouteTransition,
  ScrollBehaviorConfig,
  RouterConfig,
  RouterStats,
  Router,
} from './router.js';

// ============================================================================
// Hydration
// ============================================================================

/**
 * Hydrate a server-rendered component (clean API).
 * Returns a control object with unmount, rerender, getState, and setState.
 * Hydrating a container again replaces its previous hydration.
 */
export function hydrate(
  component: CoherentComponent | ((props: any) => CoherentNode),
  container: HTMLElement,
  options?: HydrationOptions
): HydrateControl;

// ============================================================================
// State Serialization
// ============================================================================

/** Serialize state to base64-encoded JSON; `null` when nothing is serializable */
export function serializeState(state: SerializableState): string | null;

/** Deserialize state from base64-encoded JSON; `null` when invalid */
export function deserializeState(encoded: string | null | undefined): SerializableState | null;

/** Extract state from DOM element's data-state attribute */
export function extractState(element: HTMLElement): SerializableState | null;

/** Serialize state with size warning (10KB threshold) */
export function serializeStateWithWarning(state: SerializableState, componentName?: string): string | null;

// ============================================================================
// Mismatch Detection
// ============================================================================

/**
 * Detect mismatches between DOM and virtual DOM. An array `vNode` is compared
 * with the element's children.
 */
export function detectMismatch(element: HTMLElement, vNode: CoherentNode): HydrationMismatch[];

/** Report mismatches with warnings, or throw with `strict` */
export function reportMismatches(
  mismatches: HydrationMismatch[],
  options?: { componentName?: string; strict?: boolean }
): void;

/** Format path for mismatch reporting */
export function formatPath(path: (string | number)[] | null | undefined): string;

// ============================================================================
// Event Delegation
// ============================================================================

/** Event delegation singleton */
export const eventDelegation: EventDelegation;

/** Handler registry singleton */
export const handlerRegistry: HandlerRegistry;

/**
 * Wrap a native event for a delegated handler: `target` is the element the
 * handler is registered on, `componentRef` supplies state/setState/props.
 */
export function wrapEvent<S = any, E extends Event = Event>(
  originalEvent: E,
  target: Element,
  componentRef?: HandlerComponentRef | null
): CoherentEvent<S, E>;

// ============================================================================
// HMR
// ============================================================================

export const hmrClient: HMRClient;
export const moduleTracker: ModuleTracker;
export const cleanupTracker: CleanupTracker;
export const stateCapturer: StateCapturer;
export const errorOverlay: ErrorOverlay;
export const connectionIndicator: ConnectionIndicator;

/** Hot context for a module: `createHotContext(import.meta.url)` */
export function createHotContext(moduleId: string): HotContext;
