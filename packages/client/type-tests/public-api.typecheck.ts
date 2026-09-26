/**
 * Type tests for Coherent.js Client Public API
 *
 * Tests type correctness for every exported module:
 * - Core Hydration API (@coherent.js/client)
 * - Router API (@coherent.js/client/router)
 * - HMR Client API (@coherent.js/client and @coherent.js/client/hmr)
 *
 * Only what exists at runtime is declared; scripts/check-type-surface.mjs
 * checks the value exports and class methods against the built package.
 *
 * @module @coherent.js/client/type-tests/public-api
 */

import { expectTypeOf } from 'expect-type';

// ============================================================================
// Core Hydration API Imports
// ============================================================================

import {
  // Hydration functions
  hydrate,
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
  EventDelegation,
  HandlerRegistry,
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
  // Core types (re-exported)
  CoherentNode,
  CoherentElement,
  StrictCoherentElement,
  CoherentComponent,
  ComponentProps,
  ComponentState,
  // Hydration types
  HydrateControl,
  HydrationMismatch,
  // State types
  SerializableState,
  // Event types
  CoherentEvent,
  StateAwareHandler,
  // HMR types
  HotContext,
  HMRModuleContext,
  // Router types
  RouteConfig,
  Route,
  RouterStats,
  Router,
} from '@coherent.js/client';

import { createRouter, router } from '@coherent.js/client/router';
import type { Router as RouterFromModule } from '@coherent.js/client/router';

import * as hmrEntry from '@coherent.js/client/hmr';

// ============================================================================
// Test: Core Type Re-exports
// ============================================================================

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

const control = hydrate(component, container);
expectTypeOf(control).toMatchTypeOf<HydrateControl>();
expectTypeOf(control.getState()).toMatchTypeOf<SerializableState>();

// State serialization
expectTypeOf(serializeState({ count: 1 })).toEqualTypeOf<string | null>();
expectTypeOf(deserializeState('e30=')).toEqualTypeOf<SerializableState | null>();
expectTypeOf(extractState(container)).toEqualTypeOf<SerializableState | null>();
expectTypeOf(serializeStateWithWarning({ count: 1 }, 'Counter')).toEqualTypeOf<string | null>();

// Mismatch detection
expectTypeOf(detectMismatch(container, node)).toEqualTypeOf<HydrationMismatch[]>();
reportMismatches([], { componentName: 'Test', strict: true });
expectTypeOf(formatPath(['children[0]', '@class'])).toBeString();

// ============================================================================
// Test: Event Delegation API
// ============================================================================

expectTypeOf(eventDelegation).toMatchTypeOf<EventDelegation>();
expectTypeOf(new EventDelegation(new HandlerRegistry())).toMatchTypeOf<EventDelegation>();
eventDelegation.initialize(document);
eventDelegation.listen('dblclick');
expectTypeOf(eventDelegation.isInitialized()).toBeBoolean();

expectTypeOf(handlerRegistry).toMatchTypeOf<HandlerRegistry>();
const handler: StateAwareHandler<{ count: number }> = (event) => {
  event.setState?.({ count: 1 });
};
handlerRegistry.register('id', handler, { getState: () => ({}), setState: () => {} });
expectTypeOf(handlerRegistry.size).toBeNumber();
expectTypeOf(handlerRegistry.getByComponent(null)).toEqualTypeOf<string[]>();

// wrapEvent(nativeEvent, target, componentRef) -> CoherentEvent
declare const nativeEvent: KeyboardEvent;
const wrapped = wrapEvent(nativeEvent, container);
expectTypeOf(wrapped).toEqualTypeOf<CoherentEvent<any, KeyboardEvent>>();
expectTypeOf(wrapped.propagationStopped).toBeBoolean();

// @ts-expect-error wrapEvent takes a native event, not (eventType, handler)
wrapEvent('click', handler);

// ============================================================================
// Test: Router API
// ============================================================================

const myRouter = createRouter();
expectTypeOf(myRouter).toEqualTypeOf<Router>();

const routerWithOpts = createRouter({
  mode: 'history',
  base: '/app',
  prefetch: { enabled: true, strategy: 'hover', delay: 100, maxConcurrent: 3 },
  transitions: { enabled: true, default: { enter: 'fade-in', leave: 'fade-out', duration: 300 } },
  codeSplitting: { enabled: true, strategy: 'route', preload: ['/home'] },
  scrollBehavior: { enabled: true, behavior: 'smooth', position: 'top' },
});
expectTypeOf(routerWithOpts).toMatchTypeOf<Router>();

const userRoute: RouteConfig = {
  component: () => Promise.resolve(component),
  beforeEnter: (to) => to.params?.id !== 'forbidden',
};
myRouter.addRoute('/users/:id', userRoute);

expectTypeOf(myRouter.push('/about')).toEqualTypeOf<Promise<boolean>>();
expectTypeOf(myRouter.replace('/home')).toEqualTypeOf<Promise<boolean>>();
expectTypeOf(myRouter.start()).toEqualTypeOf<Promise<boolean>>();
expectTypeOf(myRouter.start({ interceptLinks: false })).toEqualTypeOf<Promise<boolean>>();
myRouter.stop();
myRouter.back();
myRouter.forward();

expectTypeOf(myRouter.getCurrentRoute()).toEqualTypeOf<Route | null>();
expectTypeOf<Route['params']>().toEqualTypeOf<Record<string, string> | undefined>();
expectTypeOf(myRouter.getStats()).toEqualTypeOf<RouterStats>();
expectTypeOf(router).toEqualTypeOf<RouterFromModule>();

// ============================================================================
// Test: HMR Client API
// ============================================================================

expectTypeOf(hmrClient).toEqualTypeOf<HMRClient>();
expectTypeOf(new HMRClient()).toEqualTypeOf<HMRClient>();
hmrClient.initialize();
hmrClient.connect();
hmrClient.disconnect();
expectTypeOf(hmrClient.isConnected()).toBeBoolean();
expectTypeOf(hmrClient.handleUpdate({ webPath: '/a.js' })).toEqualTypeOf<Promise<void>>();
hmrClient.reload();

expectTypeOf(moduleTracker).toEqualTypeOf<ModuleTracker>();
expectTypeOf(new ModuleTracker().canHotUpdate('/a.js')).toBeBoolean();

const hot = createHotContext('/src/component.js');
expectTypeOf(hot).toEqualTypeOf<HotContext>();
hot.accept();
hot.accept((newModule) => newModule);
hot.acceptDeps(['./dep.js'], (modules) => modules);
hot.dispose((data) => {
  data.count = 1;
});
hot.prune(() => {});
hot.invalidate('reason');
expectTypeOf(hot.data).toEqualTypeOf<Record<string, any>>();

expectTypeOf(cleanupTracker).toEqualTypeOf<CleanupTracker>();
const moduleContext = new CleanupTracker().createContext('/a.js');
expectTypeOf(moduleContext).toEqualTypeOf<HMRModuleContext>();
expectTypeOf(moduleContext.fetch('/api', { signal: new AbortController().signal })).toEqualTypeOf<Promise<Response>>();

expectTypeOf(stateCapturer).toEqualTypeOf<StateCapturer>();
new StateCapturer().captureAll();
stateCapturer.restoreAll();

expectTypeOf(errorOverlay).toEqualTypeOf<ErrorOverlay>();
new ErrorOverlay().show({ message: 'Error occurred', file: 'module.js', line: 42 });
errorOverlay.hide();

expectTypeOf(connectionIndicator).toEqualTypeOf<ConnectionIndicator>();
new ConnectionIndicator().update('reconnecting');

// Phantom APIs that never existed at runtime are not declared
// @ts-expect-error hmrClient has no onUpdate()
hmrClient.onUpdate;
// @ts-expect-error cleanupTracker has no trackTimer()
cleanupTracker.trackTimer;

// ============================================================================
// Test: @coherent.js/client/hmr entry point
// ============================================================================

expectTypeOf(hmrEntry.hmrClient).toEqualTypeOf<HMRClient>();
expectTypeOf(hmrEntry.createHotContext).toEqualTypeOf<typeof createHotContext>();
expectTypeOf(hmrEntry.escapeHtml('<b>')).toBeString();
expectTypeOf(hmrEntry.formatCodeFrame('const a = 1;', 1)).toBeString();

// ============================================================================
// Test: Legacy Assert-based Type Checks
// ============================================================================

type Assert<T extends true> = T;
type IsEqual<A, B> = (<T>() => T extends A ? 1 : 2) extends (<T>() => T extends B ? 1 : 2)
  ? true
  : false;

type _hydrate_returns_object = Assert<IsEqual<ReturnType<typeof hydrate> extends object ? true : false, true>>;
type _createRouter_returns_router = Assert<IsEqual<ReturnType<typeof createRouter>, RouterFromModule>>;

export type {
  _hydrate_returns_object,
  _createRouter_returns_router,
};
