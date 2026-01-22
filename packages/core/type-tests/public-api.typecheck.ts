/**
 * Type Tests for Coherent.js Public API
 *
 * These tests validate all exported functions from @coherent.js/core including:
 * - Rendering functions
 * - Utility functions
 * - Component registration
 * - State management
 * - Virtual DOM
 * - Caching and performance
 *
 * Run with: pnpm --filter @coherent.js/core run typecheck
 */

import { expectTypeOf } from 'vitest';
import {
  // Rendering
  render,
  renderWithMonitoring,
  renderWithTemplate,
  renderComponentFactory,

  // Utilities
  escapeHtml,
  isVoidElement,
  formatAttributes,
  validateComponent,
  isCoherentObject,
  deepClone,
  hasChildren,
  normalizeChildren,

  // Component registration
  registerComponent,
  getComponent,
  getRegisteredComponents,
  createHOC,
  defineComponent,
  createComponent,

  // State management
  createState,
  globalStateManager,
  provideContext,
  useContext,
  createContextProvider,
  restoreContext,
  clearAllContexts,

  // Virtual DOM
  createVNode,
  objectToVNode,
  diff,
  patch,

  // Performance
  performanceMonitor,
  cacheManager,
  createCacheManager,

  // Lazy/Memo
  memo,
  lazy,
  isLazy,

  // Other utilities
  isCoherentComponent,
  createErrorResponse,
  isPeerDependencyAvailable,
  importPeerDependency,
  createLazyIntegration,
  checkPeerDependencies,
} from '@coherent.js/core';

import type {
  CoherentNode,
  CoherentElement,
  StrictCoherentElement,
  RenderOptions,
  HTMLAttributes,
  StateContainer,
  GlobalStateManager,
  VNode,
  VDOMPatch,
  CacheManager,
  CacheManagerOptions,
  CoherentComponent,
  ComponentProps,
  ContextProvider,
} from '@coherent.js/core';

// ============================================================================
// Rendering Functions
// ============================================================================

// render returns string
expectTypeOf(render).returns.toBeString();
expectTypeOf(render).parameter(0).toMatchTypeOf<CoherentNode>();

// render accepts options
const options: RenderOptions = {
  enableCache: true,
  minify: false,
  maxDepth: 100,
  cacheSize: 1000,
  cacheTTL: 60000,
  enableMonitoring: true,
  scoped: false,
  encapsulate: false,
};
expectTypeOf(render).toBeCallableWith({ div: { text: 'test' } }, options);

// render with strict element
const strictElement: StrictCoherentElement = { div: { text: 'strict' } };
expectTypeOf(render).toBeCallableWith(strictElement);

// render with permissive element
const permissiveElement: CoherentElement = { div: { anyProp: 'value' } };
expectTypeOf(render).toBeCallableWith(permissiveElement);

// render with array
expectTypeOf(render).toBeCallableWith([{ div: {} }, { span: {} }]);

// render with null/undefined
expectTypeOf(render).toBeCallableWith(null);
expectTypeOf(render).toBeCallableWith(undefined);

// render with string/number
expectTypeOf(render).toBeCallableWith('text');
expectTypeOf(render).toBeCallableWith(42);

// renderWithMonitoring returns string
expectTypeOf(renderWithMonitoring).returns.toBeString();
expectTypeOf(renderWithMonitoring).parameter(0).toMatchTypeOf<CoherentNode>();
expectTypeOf(renderWithMonitoring).toBeCallableWith({ div: {} }, { enablePerformanceMonitoring: true });

// renderWithTemplate returns string
expectTypeOf(renderWithTemplate).returns.toBeString();
expectTypeOf(renderWithTemplate).parameter(0).toMatchTypeOf<CoherentNode>();
expectTypeOf(renderWithTemplate).toBeCallableWith({ div: {} }, { template: '<html>{{content}}</html>' });

// renderComponentFactory returns Promise<string>
expectTypeOf(renderComponentFactory).returns.resolves.toBeString();
expectTypeOf(renderComponentFactory).toBeCallableWith(
  () => ({ div: { text: 'hello' } }),
  [],
  { enablePerformanceMonitoring: false }
);

// ============================================================================
// Utility Functions
// ============================================================================

// escapeHtml
expectTypeOf(escapeHtml).parameter(0).toBeString();
expectTypeOf(escapeHtml).returns.toBeString();
expectTypeOf(escapeHtml('<script>')).toBeString();

// isVoidElement
expectTypeOf(isVoidElement).parameter(0).toBeString();
expectTypeOf(isVoidElement).returns.toBeBoolean();
expectTypeOf(isVoidElement('img')).toBeBoolean();
expectTypeOf(isVoidElement('div')).toBeBoolean();

// formatAttributes
expectTypeOf(formatAttributes).parameter(0).toMatchTypeOf<HTMLAttributes>();
expectTypeOf(formatAttributes).returns.toBeString();
expectTypeOf(formatAttributes({ class: 'test', id: 'my-id' })).toBeString();

// validateComponent
expectTypeOf(validateComponent).returns.toBeBoolean();
expectTypeOf(validateComponent({ div: { text: 'test' } })).toBeBoolean();
expectTypeOf(validateComponent({ div: {} }, 'TestComponent')).toBeBoolean();

// isCoherentObject (type guard)
expectTypeOf(isCoherentObject).returns.toBeBoolean();
const unknownObj: unknown = { div: {} };
if (isCoherentObject(unknownObj)) {
  expectTypeOf(unknownObj).toMatchTypeOf<CoherentElement>();
}

// isCoherentComponent
expectTypeOf(isCoherentComponent).returns.toBeBoolean();
expectTypeOf(isCoherentComponent(() => ({ div: {} }))).toBeBoolean();

// deepClone preserves type
const original = { a: 1, b: 'two', c: { nested: true } };
const cloned = deepClone(original);
expectTypeOf(cloned).toEqualTypeOf<typeof original>();
expectTypeOf(cloned.a).toBeNumber();
expectTypeOf(cloned.b).toBeString();
expectTypeOf(cloned.c.nested).toBeBoolean();

// deepClone with arrays
const arrOriginal = [1, 2, 3];
const arrCloned = deepClone(arrOriginal);
expectTypeOf(arrCloned).toEqualTypeOf<number[]>();

// hasChildren
expectTypeOf(hasChildren).returns.toBeBoolean();
expectTypeOf(hasChildren({ div: { children: [] } })).toBeBoolean();

// normalizeChildren returns array
expectTypeOf(normalizeChildren).returns.toMatchTypeOf<unknown[]>();
expectTypeOf(normalizeChildren([{ div: {} }])).toMatchTypeOf<unknown[]>();
expectTypeOf(normalizeChildren({ span: {} })).toMatchTypeOf<unknown[]>();
expectTypeOf(normalizeChildren(null)).toMatchTypeOf<unknown[]>();

// ============================================================================
// Error Handling Utilities
// ============================================================================

// createErrorResponse
const errorResponse = createErrorResponse(new Error('Test error'), 'render');
expectTypeOf(errorResponse.error).toBeString();
expectTypeOf(errorResponse.message).toBeString();
expectTypeOf(errorResponse.context).toBeString();
expectTypeOf(errorResponse.timestamp).toBeString();

// ============================================================================
// Peer Dependency Utilities
// ============================================================================

// isPeerDependencyAvailable
expectTypeOf(isPeerDependencyAvailable).parameter(0).toBeString();
expectTypeOf(isPeerDependencyAvailable).returns.toBeBoolean();

// importPeerDependency
expectTypeOf(importPeerDependency).parameter(0).toBeString();
expectTypeOf(importPeerDependency).parameter(1).toBeString();
expectTypeOf(importPeerDependency).returns.resolves.toMatchTypeOf<unknown>();

// createLazyIntegration
expectTypeOf(createLazyIntegration).returns.toBeFunction();
const lazyIntegration = createLazyIntegration('test-pkg', 'TestIntegration', (mod) => () => mod);
expectTypeOf(lazyIntegration).returns.resolves.toMatchTypeOf<unknown>();

// checkPeerDependencies
const depCheck = checkPeerDependencies([
  { package: 'express', integration: 'express-adapter' },
  { package: 'fastify', integration: 'fastify-adapter' },
]);
expectTypeOf(depCheck).toMatchTypeOf<Record<string, boolean>>();

// ============================================================================
// Component Registration
// ============================================================================

// registerComponent
expectTypeOf(registerComponent).toBeFunction();
const registeredComponent = registerComponent('TestComponent', {
  render() {
    return { div: { text: 'Test' } };
  },
});
expectTypeOf(registeredComponent).toMatchTypeOf<CoherentComponent>();

// getComponent returns component or undefined
expectTypeOf(getComponent).returns.toMatchTypeOf<CoherentComponent | undefined>();
const retrievedComponent = getComponent('TestComponent');
expectTypeOf(retrievedComponent).toMatchTypeOf<CoherentComponent<ComponentProps> | undefined>();

// getRegisteredComponents returns Map
expectTypeOf(getRegisteredComponents).returns.toMatchTypeOf<Map<string, CoherentComponent>>();
const allComponents = getRegisteredComponents();
expectTypeOf(allComponents).toMatchTypeOf<Map<string, CoherentComponent>>();

// createHOC returns a function that wraps components
expectTypeOf(createHOC).returns.toBeFunction();
const withLogging = createHOC((WrappedComponent, props) => ({
  div: {
    children: [WrappedComponent(props)],
  },
}));
expectTypeOf(withLogging).toBeFunction();

// defineComponent
const DefinedTestComponent = defineComponent({
  name: 'DefinedTest',
  render(props) {
    return { div: { text: 'Defined' } };
  },
});
expectTypeOf(DefinedTestComponent).toMatchTypeOf<CoherentComponent>();

// createComponent
const componentInstance = createComponent({
  name: 'Instance',
  render() {
    return { div: { text: 'Instance' } };
  },
});
expectTypeOf(componentInstance.render).toBeFunction();
expectTypeOf(componentInstance.name).toBeString();

// ============================================================================
// State Management
// ============================================================================

// createState returns StateContainer
expectTypeOf(createState).returns.toMatchTypeOf<StateContainer>();
expectTypeOf(createState()).toMatchTypeOf<StateContainer>();
expectTypeOf(createState({ count: 0 })).toMatchTypeOf<StateContainer>();

const state = createState({ count: 0, name: 'test' });
expectTypeOf(state.get).toBeFunction();
expectTypeOf(state.set).toBeFunction();
expectTypeOf(state.has).toBeFunction();
expectTypeOf(state.delete).toBeFunction();
expectTypeOf(state.clear).returns.toMatchTypeOf<StateContainer>();
expectTypeOf(state.toObject).returns.toMatchTypeOf<Record<string, unknown>>();
expectTypeOf(state._internal).toMatchTypeOf<Map<string, unknown>>();

// Method chaining
expectTypeOf(state.set('key', 'value')).toMatchTypeOf<StateContainer>();
expectTypeOf(state.clear()).toMatchTypeOf<StateContainer>();

// globalStateManager
expectTypeOf(globalStateManager).toMatchTypeOf<GlobalStateManager>();
expectTypeOf(globalStateManager.set).toBeFunction();
expectTypeOf(globalStateManager.get).toBeFunction();
expectTypeOf(globalStateManager.has).toBeFunction();
expectTypeOf(globalStateManager.clear).toBeFunction();
expectTypeOf(globalStateManager.createRequestState).returns.toMatchTypeOf<StateContainer>();

const requestState = globalStateManager.createRequestState();
expectTypeOf(requestState).toMatchTypeOf<StateContainer>();

// Context functions
expectTypeOf(provideContext).toBeFunction();
provideContext('theme', { dark: true });

expectTypeOf(useContext).returns.toMatchTypeOf<unknown>();
const themeContext = useContext<{ dark: boolean }>('theme');
expectTypeOf(themeContext).toMatchTypeOf<{ dark: boolean } | undefined>();

expectTypeOf(createContextProvider).returns.toMatchTypeOf<ContextProvider>();
const provider = createContextProvider('theme', { dark: false }, { div: {} });
expectTypeOf(provider).toMatchTypeOf<ContextProvider>();

expectTypeOf(restoreContext).toBeFunction();
restoreContext('theme');

expectTypeOf(clearAllContexts).toBeFunction();
clearAllContexts();

// ============================================================================
// Virtual DOM
// ============================================================================

// createVNode returns VNode
expectTypeOf(createVNode).returns.toMatchTypeOf<VNode>();
const vnode = createVNode('div', { className: 'test' }, []);
expectTypeOf(vnode.type).toMatchTypeOf<string | Function>();
expectTypeOf(vnode.props).toMatchTypeOf<Record<string, unknown>>();
expectTypeOf(vnode.children).toMatchTypeOf<VNode[]>();
expectTypeOf(vnode.key).toMatchTypeOf<string | number | undefined>();

// objectToVNode converts CoherentNode to VNode
expectTypeOf(objectToVNode).parameter(0).toMatchTypeOf<CoherentNode>();
expectTypeOf(objectToVNode).returns.toMatchTypeOf<VNode>();
const convertedVNode = objectToVNode({ div: { text: 'hello' } });
expectTypeOf(convertedVNode).toMatchTypeOf<VNode>();

// objectToVNode with depth parameter
expectTypeOf(objectToVNode).toBeCallableWith({ div: {} }, 10);

// diff returns patches
expectTypeOf(diff).returns.toMatchTypeOf<VDOMPatch[]>();
const oldVNode = createVNode('div', {}, []);
const newVNode = createVNode('div', { className: 'updated' }, []);
const patches = diff(oldVNode, newVNode);
expectTypeOf(patches).toMatchTypeOf<VDOMPatch[]>();

// VDOMPatch structure
expectTypeOf(patches[0]?.type).toMatchTypeOf<string | undefined>();
expectTypeOf(patches[0]?.path).toMatchTypeOf<(string | number)[] | undefined>();

// patch applies to HTMLElement
declare const element: HTMLElement;
expectTypeOf(patch).parameter(0).toMatchTypeOf<HTMLElement>();
expectTypeOf(patch).parameter(1).toMatchTypeOf<VDOMPatch[]>();
patch(element, patches);

// ============================================================================
// Caching
// ============================================================================

// cacheManager instance
expectTypeOf(cacheManager).toMatchTypeOf<CacheManager>();
expectTypeOf(cacheManager.get).toBeFunction();
expectTypeOf(cacheManager.set).toBeFunction();
expectTypeOf(cacheManager.has).toBeFunction();
expectTypeOf(cacheManager.delete).toBeFunction();
expectTypeOf(cacheManager.clear).toBeFunction();
expectTypeOf(cacheManager.size).returns.toBeNumber();
expectTypeOf(cacheManager.prune).toBeFunction();

// cacheManager method returns
expectTypeOf(cacheManager.get('key')).toMatchTypeOf<unknown>();
expectTypeOf(cacheManager.has('key')).toBeBoolean();
expectTypeOf(cacheManager.delete('key')).toBeBoolean();

// createCacheManager with options
const cacheOptions: CacheManagerOptions = {
  maxSize: 100,
  ttl: 60000,
  strategy: 'lru',
};
expectTypeOf(createCacheManager).toBeCallableWith(cacheOptions);
expectTypeOf(createCacheManager).returns.toMatchTypeOf<CacheManager>();

const customCache = createCacheManager({ maxSize: 50 });
expectTypeOf(customCache).toMatchTypeOf<CacheManager>();

// CacheManagerOptions strategy types
const fifoCache: CacheManagerOptions = { strategy: 'fifo' };
const lfuCache: CacheManagerOptions = { strategy: 'lfu' };
expectTypeOf(fifoCache.strategy).toMatchTypeOf<'lru' | 'fifo' | 'lfu' | undefined>();
expectTypeOf(lfuCache.strategy).toMatchTypeOf<'lru' | 'fifo' | 'lfu' | undefined>();

// ============================================================================
// Performance Monitoring
// ============================================================================

expectTypeOf(performanceMonitor.startRender).returns.toBeString();
expectTypeOf(performanceMonitor.endRender).returns.toBeNumber();
expectTypeOf(performanceMonitor.recordRender).toBeFunction();
expectTypeOf(performanceMonitor.getMetrics).returns.toMatchTypeOf<Record<string, unknown>>();
expectTypeOf(performanceMonitor.clearMetrics).toBeFunction();
expectTypeOf(performanceMonitor.enableMonitoring).toBeFunction();
expectTypeOf(performanceMonitor.disableMonitoring).toBeFunction();
expectTypeOf(performanceMonitor.isEnabled).returns.toBeBoolean();

// Performance workflow
const renderId = performanceMonitor.startRender('test-component');
expectTypeOf(renderId).toBeString();
const duration = performanceMonitor.endRender(renderId);
expectTypeOf(duration).toBeNumber();
const metrics = performanceMonitor.getMetrics();
expectTypeOf(metrics).toMatchTypeOf<Record<string, unknown>>();

// ============================================================================
// Lazy and Memo Functions (Additional to components.typecheck.ts)
// ============================================================================

// memo preserves function signature
const add = (a: number, b: number): number => a + b;
const memoizedAdd = memo(add);
expectTypeOf(memoizedAdd).toBeCallableWith(1, 2);
expectTypeOf(memoizedAdd).returns.toBeNumber();

// lazy creates wrapper
const lazyData = lazy(() => ({ loaded: true }));
expectTypeOf(lazyData.evaluate).returns.toMatchTypeOf<{ loaded: boolean }>();
expectTypeOf(isLazy(lazyData)).toBeBoolean();

// ============================================================================
// Type Compatibility Tests
// ============================================================================

// StrictCoherentElement is compatible with render
const strictDiv: StrictCoherentElement = { div: { text: 'strict', className: 'test' } };
const renderedStrict = render(strictDiv);
expectTypeOf(renderedStrict).toBeString();

// Permissive CoherentElement is compatible with render
const permissiveDiv: CoherentElement = { div: { customAttr: 'value' } };
const renderedPermissive = render(permissiveDiv);
expectTypeOf(renderedPermissive).toBeString();

// Both types can be used with all render functions
expectTypeOf(renderWithMonitoring(strictDiv)).toBeString();
expectTypeOf(renderWithMonitoring(permissiveDiv)).toBeString();

// Component function returning StrictCoherentElement
const StrictComponent: CoherentComponent = () => ({ div: { text: 'strict' } } as StrictCoherentElement);
expectTypeOf(render(StrictComponent())).toBeString();

// Suppress unused variable warnings
void options;
void strictElement;
void permissiveElement;
void unknownObj;
void original;
void cloned;
void arrOriginal;
void arrCloned;
void errorResponse;
void lazyIntegration;
void depCheck;
void registeredComponent;
void retrievedComponent;
void allComponents;
void withLogging;
void DefinedTestComponent;
void componentInstance;
void state;
void requestState;
void themeContext;
void provider;
void vnode;
void convertedVNode;
void oldVNode;
void newVNode;
void patches;
void cacheOptions;
void customCache;
void fifoCache;
void lfuCache;
void renderId;
void duration;
void metrics;
void memoizedAdd;
void lazyData;
void strictDiv;
void renderedStrict;
void permissiveDiv;
void renderedPermissive;
void StrictComponent;
