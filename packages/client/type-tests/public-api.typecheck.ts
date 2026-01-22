/**
 * Type tests for Coherent.js Client Public API
 *
 * Tests type correctness for all exported modules:
 * - Core Hydration API (@coherent.js/client)
 * - Router API (@coherent.js/client/router)
 * - HMR Client API (@coherent.js/client/hmr)
 * - Client State Manager
 * - Event Manager
 * - Performance Monitor
 *
 * @module @coherent.js/client/type-tests/public-api
 */

import { expectTypeOf } from 'expect-type';

// ============================================================================
// Core Hydration API Imports
// ============================================================================

import {
  // Core types from core (re-exported)
  CoherentNode,
  CoherentElement,
  StrictCoherentElement,
  CoherentComponent,
  ComponentProps,
  ComponentState,
  // Hydration functions
  hydrate,
  legacyHydrate,
  hydrateAll,
  hydrateBySelector,
  autoHydrate,
  enableClientEvents,
  makeHydratable,
  registerEventHandler,
  // State serialization
  serializeState,
  deserializeState,
  extractState,
  serializeStateWithWarning,
  // Mismatch detection
  detectMismatch,
  reportMismatches,
  formatPath,
  // Event delegation
  eventDelegation,
  handlerRegistry,
  wrapEvent,
  // HMR exports
  HMRClient,
  hmrClient,
  ModuleTracker,
  moduleTracker,
  CleanupTracker,
  cleanupTracker,
  StateCapturer,
  stateCapturer,
  ErrorOverlay,
  errorOverlay,
  ConnectionIndicator,
  connectionIndicator,
  createHotContext,
} from '@coherent.js/client';

import type {
  // Hydration types
  HydrateControl,
  HydratedInstance,
  HydrationOptions,
  HydrationMismatch,
  MakeHydratableOptions,
  // State types
  SerializableState,
  // Event types
  EventHandler,
  ClickHandler,
  KeyHandler,
  FocusHandler,
  SubmitHandler,
  StateAwareHandler,
  // Component types
  ClientComponent,
  ComponentFactory,
  ComponentRegistryEntry,
  // Event delegation types
  EventDelegation,
  HandlerRegistry,
  // State manager types
  ClientStateManager,
  StateSyncOptions,
  // HMR types
  HMRUpdate,
  HMRListener,
  HMRConfig,
  HotContext,
  // Router types
  RouteConfig,
  Route,
  RouterConfig,
  RouterStats,
  Router,
  // Performance types
  PerformanceMetrics,
  PerformanceMonitor,
  // Event manager type
  EventManager,
  EventBinding,
  CustomEventData,
} from '@coherent.js/client';

import { createRouter, router } from '@coherent.js/client/router';
import type { Router as RouterFromModule, RouterConfig as RouterConfigFromModule } from '@coherent.js/client/router';

// ============================================================================
// Test: Core Type Re-exports
// ============================================================================

// Core types should be available from @coherent.js/client
declare const element: CoherentElement;
declare const strictElement: StrictCoherentElement;
declare const node: CoherentNode;
declare const component: CoherentComponent;
declare const props: ComponentProps;
declare const state: ComponentState;

expectTypeOf(element).toMatchTypeOf<CoherentElement>();
expectTypeOf(strictElement).toMatchTypeOf<StrictCoherentElement>();
expectTypeOf(node).toMatchTypeOf<CoherentNode>();
expectTypeOf(component).toMatchTypeOf<CoherentComponent>();
expectTypeOf(props).toMatchTypeOf<ComponentProps>();
expectTypeOf(state).toMatchTypeOf<ComponentState>();

// ============================================================================
// Test: Core Hydration API
// ============================================================================

declare const container: HTMLElement;
declare const MyComponent: CoherentComponent;

// hydrate() returns HydrateControl
const control = hydrate(MyComponent, container);
expectTypeOf(control).toMatchTypeOf<HydrateControl>();
expectTypeOf(control.unmount).toBeFunction();
expectTypeOf(control.rerender).toBeFunction();
expectTypeOf(control.getState).toBeFunction();
expectTypeOf(control.setState).toBeFunction();

// hydrate() with options
const controlWithOpts = hydrate(MyComponent, container, {
  initialState: { count: 0 },
  detectMismatch: true,
  strict: false,
});
expectTypeOf(controlWithOpts).toMatchTypeOf<HydrateControl>();

// enableClientEvents returns void
expectTypeOf(enableClientEvents).returns.toBeVoid();
enableClientEvents();
enableClientEvents(document);
enableClientEvents(container);

// makeHydratable returns enhanced component
const hydratable = makeHydratable(MyComponent);
expectTypeOf(hydratable).toMatchTypeOf<CoherentComponent>();
expectTypeOf(hydratable.isHydratable).toEqualTypeOf<true>();
expectTypeOf(hydratable.hydrationOptions).toMatchTypeOf<MakeHydratableOptions>();
expectTypeOf(hydratable.autoHydrate).toBeFunction();
expectTypeOf(hydratable.getHydrationData).toBeFunction();
expectTypeOf(hydratable.renderWithHydration).toBeFunction();

// registerEventHandler returns void
const handler: StateAwareHandler = (e, s, ss) => {};
registerEventHandler('my-handler', handler);
expectTypeOf(registerEventHandler).returns.toBeVoid();

// ============================================================================
// Test: State Serialization API
// ============================================================================

// serializeState accepts SerializableState, returns string
const encoded = serializeState({ count: 1, name: 'test' });
expectTypeOf(encoded).toBeString();

// deserializeState accepts string, returns SerializableState
const decoded = deserializeState(encoded);
expectTypeOf(decoded).toMatchTypeOf<SerializableState>();

// extractState accepts element, returns SerializableState | null
const extracted = extractState(container);
expectTypeOf(extracted).toMatchTypeOf<SerializableState | null>();

// serializeStateWithWarning accepts state and optional name
const warned = serializeStateWithWarning({ count: 1 });
expectTypeOf(warned).toBeString();
const warnedNamed = serializeStateWithWarning({ count: 1 }, 'Counter');
expectTypeOf(warnedNamed).toBeString();

// ============================================================================
// Test: Mismatch Detection API
// ============================================================================

// detectMismatch accepts element and vNode, returns mismatches
declare const vNode: CoherentNode;
const mismatches = detectMismatch(container, vNode);
expectTypeOf(mismatches).toMatchTypeOf<HydrationMismatch[]>();

// reportMismatches accepts mismatches and options
reportMismatches(mismatches);
reportMismatches(mismatches, { componentName: 'Test', strict: true });

// formatPath accepts path array, returns string
const path = formatPath(['div', 0, 'span', 'text']);
expectTypeOf(path).toBeString();

// ============================================================================
// Test: Event Delegation API
// ============================================================================

// eventDelegation singleton
expectTypeOf(eventDelegation).toMatchTypeOf<EventDelegation>();
expectTypeOf(eventDelegation.initialize).toBeFunction();
expectTypeOf(eventDelegation.destroy).toBeFunction();
expectTypeOf(eventDelegation.isInitialized).toBeFunction();
expectTypeOf(eventDelegation.isInitialized()).toBeBoolean();

// handlerRegistry singleton
expectTypeOf(handlerRegistry).toMatchTypeOf<HandlerRegistry>();
expectTypeOf(handlerRegistry.register).toBeFunction();
expectTypeOf(handlerRegistry.unregister).toBeFunction();
expectTypeOf(handlerRegistry.get).toBeFunction();
expectTypeOf(handlerRegistry.has).toBeFunction();
expectTypeOf(handlerRegistry.clear).toBeFunction();

// wrapEvent returns { handlerId, dataAttribute }
const wrapped = wrapEvent('click', handler);
expectTypeOf(wrapped.handlerId).toBeString();
expectTypeOf(wrapped.dataAttribute).toBeString();

// ============================================================================
// Test: Router API
// ============================================================================

// createRouter returns Router
const myRouter = createRouter();
expectTypeOf(myRouter).toMatchTypeOf<Router>();

// createRouter accepts options
const routerWithOpts = createRouter({
  mode: 'history',
  base: '/',
  prefetch: {
    enabled: true,
    strategy: 'hover',
    delay: 100,
    maxConcurrent: 3,
  },
  transitions: {
    enabled: true,
    default: {
      enter: 'fade-in',
      leave: 'fade-out',
      duration: 300,
    },
  },
  codeSplitting: {
    enabled: true,
    strategy: 'route',
    preload: ['/home', '/about'],
  },
  scrollBehavior: {
    enabled: true,
    behavior: 'smooth',
    position: 'top',
  },
});
expectTypeOf(routerWithOpts).toMatchTypeOf<Router>();

// Router methods - verify they exist and are callable
myRouter.addRoute;
myRouter.push;
myRouter.replace;
myRouter.back;
myRouter.forward;
myRouter.prefetchRoute;
myRouter.prefetchRoutes;
myRouter.setupPrefetchStrategy;
myRouter.getRoute;
myRouter.getRoutes;
myRouter.getCurrentRoute;
myRouter.getStats;
myRouter.clearCaches;

// Router navigation returns Promise<boolean>
expectTypeOf(myRouter.push('/about')).toMatchTypeOf<Promise<boolean>>();
expectTypeOf(myRouter.replace('/home')).toMatchTypeOf<Promise<boolean>>();

// Router getters
expectTypeOf(myRouter.getCurrentRoute()).toMatchTypeOf<Route | null>();
expectTypeOf(myRouter.getStats()).toMatchTypeOf<RouterStats>();

// router singleton
expectTypeOf(router).toMatchTypeOf<Router>();

// ============================================================================
// Test: Client State Manager Types
// ============================================================================

declare const stateManager: ClientStateManager;

// Basic operations
expectTypeOf(stateManager.get<number>('count')).toMatchTypeOf<number | undefined>();
expectTypeOf(stateManager.set<number>).toBeFunction();
expectTypeOf(stateManager.has('key')).toBeBoolean();
expectTypeOf(stateManager.delete('key')).toBeBoolean();
expectTypeOf(stateManager.clear).toBeFunction();
expectTypeOf(stateManager.keys()).toMatchTypeOf<string[]>();
expectTypeOf(stateManager.values()).toMatchTypeOf<any[]>();
expectTypeOf(stateManager.entries()).toMatchTypeOf<Array<[string, any]>>();
expectTypeOf(stateManager.size()).toBeNumber();

// Subscription
const unsubscribe = stateManager.subscribe('key', (value, oldValue) => {
  expectTypeOf(value).toBeAny();
  expectTypeOf(oldValue).toMatchTypeOf<any | undefined>();
});
expectTypeOf(unsubscribe).toMatchTypeOf<() => void>();

// Persistence
expectTypeOf(stateManager.persist).toBeFunction();
expectTypeOf(stateManager.unpersist).toBeFunction();

// Batch operations
expectTypeOf(stateManager.batch).toBeFunction();

// Serialization
expectTypeOf(stateManager.toJSON()).toMatchTypeOf<Record<string, any>>();
expectTypeOf(stateManager.fromJSON).toBeFunction();

// ============================================================================
// Test: Event Manager Types
// ============================================================================

declare const eventManager: EventManager;

// Event binding
declare const bindings: EventBinding[];
expectTypeOf(eventManager.bind).toBeFunction();
expectTypeOf(eventManager.unbind).toBeFunction();

// Event triggering
expectTypeOf(eventManager.trigger).toBeFunction();

// Event delegation
expectTypeOf(eventManager.delegate).toBeFunction();
expectTypeOf(eventManager.undelegate).toBeFunction();

// One-time event
expectTypeOf(eventManager.once).toBeFunction();

// Utility functions
declare const eventHandler: EventHandler;
expectTypeOf(eventManager.debounce(eventHandler, 100)).toMatchTypeOf<EventHandler>();
expectTypeOf(eventManager.throttle(eventHandler, 100)).toMatchTypeOf<EventHandler>();

// ============================================================================
// Test: HMR Client API
// ============================================================================

// HMR client singleton
expectTypeOf(hmrClient).toMatchTypeOf<HMRClient>();
expectTypeOf(hmrClient.isConnected).toBeBoolean();
expectTypeOf(hmrClient.connect).toBeFunction();
expectTypeOf(hmrClient.disconnect).toBeFunction();
expectTypeOf(hmrClient.onUpdate).toBeFunction();
expectTypeOf(hmrClient.onError).toBeFunction();
expectTypeOf(hmrClient.onReconnect).toBeFunction();
expectTypeOf(hmrClient.updateComponent).toBeFunction();
expectTypeOf(hmrClient.updateStyle).toBeFunction();
expectTypeOf(hmrClient.reloadPage).toBeFunction();

// HMRClient constructor
const customClient = new HMRClient({
  enabled: true,
  websocketUrl: 'ws://localhost:3000/__hmr',
  reconnectInterval: 1000,
  maxReconnectAttempts: 10,
  debug: true,
  overlay: true,
  indicator: true,
});
expectTypeOf(customClient).toMatchTypeOf<HMRClient>();

// HMR listeners return unsubscribe function
const unsubUpdate = hmrClient.onUpdate((update) => {
  expectTypeOf(update).toMatchTypeOf<HMRUpdate>();
  expectTypeOf(update.type).toMatchTypeOf<'component' | 'style' | 'script' | 'template' | 'full-reload'>();
  expectTypeOf(update.id).toBeString();
  expectTypeOf(update.path).toBeString();
  expectTypeOf(update.timestamp).toBeNumber();
});
expectTypeOf(unsubUpdate).toMatchTypeOf<() => void>();

const unsubError = hmrClient.onError((error) => {
  expectTypeOf(error).toMatchTypeOf<Error>();
});
expectTypeOf(unsubError).toMatchTypeOf<() => void>();

// ============================================================================
// Test: Module Tracker API
// ============================================================================

expectTypeOf(moduleTracker).toMatchTypeOf<ModuleTracker>();
expectTypeOf(moduleTracker.track).toBeFunction();
expectTypeOf(moduleTracker.isBoundary).toBeFunction();
expectTypeOf(moduleTracker.getContext).toBeFunction();
expectTypeOf(moduleTracker.clear).toBeFunction();

expectTypeOf(moduleTracker.isBoundary('module.js')).toBeBoolean();
expectTypeOf(moduleTracker.getContext('module.js')).toMatchTypeOf<HotContext | undefined>();

// ModuleTracker constructor
const customTracker = new ModuleTracker();
expectTypeOf(customTracker).toMatchTypeOf<ModuleTracker>();

// ============================================================================
// Test: Cleanup Tracker API
// ============================================================================

expectTypeOf(cleanupTracker).toMatchTypeOf<CleanupTracker>();
expectTypeOf(cleanupTracker.trackTimer).toBeFunction();
expectTypeOf(cleanupTracker.trackListener).toBeFunction();
expectTypeOf(cleanupTracker.trackFetch).toBeFunction();
expectTypeOf(cleanupTracker.cleanup).toBeFunction();
expectTypeOf(cleanupTracker.clearAll).toBeFunction();

// CleanupTracker constructor
const customCleaner = new CleanupTracker();
expectTypeOf(customCleaner).toMatchTypeOf<CleanupTracker>();

// Tracking resources
cleanupTracker.trackTimer('module.js', 123);
cleanupTracker.trackListener('module.js', document, 'click', () => {});
cleanupTracker.trackFetch('module.js', new AbortController());
cleanupTracker.cleanup('module.js');

// ============================================================================
// Test: State Capturer API
// ============================================================================

expectTypeOf(stateCapturer).toMatchTypeOf<StateCapturer>();
expectTypeOf(stateCapturer.capture).toBeFunction();
expectTypeOf(stateCapturer.restore).toBeFunction();

// StateCapturer constructor
const customCapturer = new StateCapturer();
expectTypeOf(customCapturer).toMatchTypeOf<StateCapturer>();

// Capture returns state object
const capturedState = stateCapturer.capture();
expectTypeOf(capturedState).toMatchTypeOf<Record<string, any>>();

// Restore accepts state object
stateCapturer.restore(capturedState);

// ============================================================================
// Test: Error Overlay API
// ============================================================================

expectTypeOf(errorOverlay).toMatchTypeOf<ErrorOverlay>();
expectTypeOf(errorOverlay.show).toBeFunction();
expectTypeOf(errorOverlay.hide).toBeFunction();
expectTypeOf(errorOverlay.isVisible).toBeFunction();

// ErrorOverlay constructor
const customOverlay = new ErrorOverlay();
expectTypeOf(customOverlay).toMatchTypeOf<ErrorOverlay>();

// isVisible returns boolean
expectTypeOf(errorOverlay.isVisible()).toBeBoolean();

// show accepts error object
errorOverlay.show({
  message: 'Error occurred',
  file: 'module.js',
  line: 42,
  column: 10,
  frame: '  const x = undefined.y;',
});

// ============================================================================
// Test: Connection Indicator API
// ============================================================================

expectTypeOf(connectionIndicator).toMatchTypeOf<ConnectionIndicator>();
expectTypeOf(connectionIndicator.show).toBeFunction();
expectTypeOf(connectionIndicator.hide).toBeFunction();
expectTypeOf(connectionIndicator.setStatus).toBeFunction();

// ConnectionIndicator constructor
const customIndicator = new ConnectionIndicator();
expectTypeOf(customIndicator).toMatchTypeOf<ConnectionIndicator>();

// show accepts status
connectionIndicator.show('connected');
connectionIndicator.show('disconnected');
connectionIndicator.show('connecting');
connectionIndicator.show('error');

// setStatus accepts status
connectionIndicator.setStatus('connected');

// ============================================================================
// Test: Hot Context API
// ============================================================================

// createHotContext returns HotContext
const hot = createHotContext('/src/component.js');
expectTypeOf(hot).toMatchTypeOf<HotContext>();

// Hot context methods
expectTypeOf(hot.accept).toBeFunction();
expectTypeOf(hot.dispose).toBeFunction();
expectTypeOf(hot.prune).toBeFunction();
expectTypeOf(hot.invalidate).toBeFunction();
expectTypeOf(hot.decline).toBeFunction();
expectTypeOf(hot.data).toMatchTypeOf<Record<string, any>>();

// Accept variations
hot.accept();
hot.accept('./dep.js');
hot.accept(['./dep1.js', './dep2.js']);
hot.accept('./dep.js', (modules) => {
  expectTypeOf(modules).toMatchTypeOf<any[]>();
});

// Dispose callback
hot.dispose((data) => {
  expectTypeOf(data).toMatchTypeOf<any>();
});

// Data persistence
hot.data.count = 0;
hot.data.savedState = { value: 'test' };

// ============================================================================
// Test: Performance Monitor Types
// ============================================================================

declare const perfMonitor: PerformanceMonitor;

expectTypeOf(perfMonitor.start).toBeFunction();
expectTypeOf(perfMonitor.end).toBeFunction();
expectTypeOf(perfMonitor.measure).toBeFunction();
expectTypeOf(perfMonitor.measureAsync).toBeFunction();
expectTypeOf(perfMonitor.getMetrics).toBeFunction();
expectTypeOf(perfMonitor.reset).toBeFunction();
expectTypeOf(perfMonitor.report).toBeFunction();

// start/end pattern
perfMonitor.start('render');
const duration = perfMonitor.end('render');
expectTypeOf(duration).toBeNumber();

// measure with sync function
const result = perfMonitor.measure('compute', () => {
  return 42;
});
expectTypeOf(result).toMatchTypeOf<number>();

// measureAsync with async function
const asyncResult = perfMonitor.measureAsync('fetch', async () => {
  return 'data';
});
expectTypeOf(asyncResult).toMatchTypeOf<Promise<string>>();

// getMetrics returns PerformanceMetrics
const metrics = perfMonitor.getMetrics();
expectTypeOf(metrics).toMatchTypeOf<PerformanceMetrics>();
expectTypeOf(metrics.hydrationTime).toBeNumber();
expectTypeOf(metrics.componentCount).toBeNumber();
expectTypeOf(metrics.eventBindings).toBeNumber();
expectTypeOf(metrics.stateUpdates).toBeNumber();

// ============================================================================
// Test: Event Handler Types
// ============================================================================

// Generic EventHandler
const genericHandler: EventHandler = (event, element, data) => {
  expectTypeOf(event).toMatchTypeOf<Event>();
  expectTypeOf(element).toMatchTypeOf<HTMLElement>();
};

// Specific event handlers
const clickHandler: ClickHandler = (event, element) => {
  expectTypeOf(event).toMatchTypeOf<MouseEvent>();
  event.clientX; // MouseEvent specific
};

const keyHandler: KeyHandler = (event, element) => {
  expectTypeOf(event).toMatchTypeOf<KeyboardEvent>();
  event.key; // KeyboardEvent specific
};

const focusHandler: FocusHandler = (event, element) => {
  expectTypeOf(event).toMatchTypeOf<FocusEvent>();
  event.relatedTarget; // FocusEvent specific
};

const submitHandler: SubmitHandler = (event, element) => {
  expectTypeOf(event).toMatchTypeOf<SubmitEvent>();
  event.submitter; // SubmitEvent specific
};

// StateAwareHandler with generics
const stateHandler: StateAwareHandler<{ count: number }, MouseEvent> = (event, state, setState) => {
  expectTypeOf(event).toMatchTypeOf<MouseEvent>();
  expectTypeOf(state).toMatchTypeOf<{ count: number }>();
  setState({ count: state.count + 1 });
  setState((prev) => ({ count: prev.count + 1 }));
};

// ============================================================================
// Test: Component Types
// ============================================================================

// ClientComponent interface
declare const clientComp: ClientComponent;
expectTypeOf(clientComp.element).toMatchTypeOf<HTMLElement>();
expectTypeOf(clientComp.state).toMatchTypeOf<SerializableState>();
expectTypeOf(clientComp.isHydrated).toBeBoolean();
expectTypeOf(clientComp.id).toBeString();
expectTypeOf(clientComp.setState).toBeFunction();
expectTypeOf(clientComp.getState).toBeFunction();
expectTypeOf(clientComp.render).toBeFunction();
expectTypeOf(clientComp.destroy).toBeFunction();
expectTypeOf(clientComp.serialize).toBeFunction();

// ComponentFactory type
const factory: ComponentFactory = (element, initialState) => {
  expectTypeOf(element).toMatchTypeOf<HTMLElement>();
  expectTypeOf(initialState).toMatchTypeOf<SerializableState | undefined>();
  return clientComp;
};

// ComponentRegistryEntry type
const entry: ComponentRegistryEntry = {
  name: 'Counter',
  factory: factory,
  selector: '.counter',
  autoHydrate: true,
};
expectTypeOf(entry.name).toBeString();
expectTypeOf(entry.factory).toMatchTypeOf<ComponentFactory>();

// ============================================================================
// Test: Legacy Assert-based Type Checks (backward compatibility)
// ============================================================================

// These use the older Assert pattern for backward compatibility
type Assert<T extends true> = T;
type IsEqual<A, B> = (<T>() => T extends A ? 1 : 2) extends (<T>() => T extends B ? 1 : 2)
  ? true
  : false;

// hydrate returns HydrateControl (not null anymore - clean API)
type _hydrate_returns_object = Assert<IsEqual<ReturnType<typeof hydrate> extends object ? true : false, true>>;

// enableClientEvents returns void
type _enableClientEvents_returns_void = Assert<IsEqual<ReturnType<typeof enableClientEvents>, void>>;

// makeHydratable returns function with additional properties
type _makeHydratable_returns_function = Assert<IsEqual<ReturnType<typeof makeHydratable> extends Function ? true : false, true>>;

// registerEventHandler returns void
type _registerEventHandler_returns_void = Assert<IsEqual<ReturnType<typeof registerEventHandler>, void>>;

// createRouter returns Router
type _createRouter_returns_router = Assert<IsEqual<ReturnType<typeof createRouter>, RouterFromModule>>;

// Export types to ensure they're used
export type {
  _hydrate_returns_object,
  _enableClientEvents_returns_void,
  _makeHydratable_returns_function,
  _registerEventHandler_returns_void,
  _createRouter_returns_router,
};
