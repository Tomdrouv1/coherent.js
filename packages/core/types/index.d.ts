/**
 * Coherent.js Core Types
 * TypeScript definitions for the core Coherent.js framework
 * 
 * @version 1.1.1
 */

// ============================================================================
// Basic Types
// ============================================================================

/** Primitive values that can be rendered as HTML */
export type Primitive = string | number | boolean | null | undefined;

/** HTML attributes object */
export interface HTMLAttributes {
  [key: string]: Primitive | (() => Primitive);
  className?: string;
  class?: string;
  id?: string;
  style?: string | Record<string, string | number>;
  onClick?: string | (() => void);
  onSubmit?: string | (() => void);
  href?: string;
  src?: string;
  alt?: string;
  title?: string;
  disabled?: boolean;
  checked?: boolean;
  value?: string | number;
  placeholder?: string;
  type?: string;
  name?: string;
  method?: string;
  action?: string;
  target?: string;
  rel?: string;
  role?: string;
  'aria-label'?: string;
  'aria-describedby'?: string;
  'data-'?: string;
}

/** Element properties including children and text */
export interface ElementProps extends HTMLAttributes {
  children?: CoherentNode | CoherentNode[];
  text?: Primitive;
}

/** A Coherent.js HTML element definition */
export interface CoherentElement {
  [tagName: string]: ElementProps | string;
}

/** Valid nodes that can be rendered */
export type CoherentNode = 
  | Primitive
  | CoherentElement
  | CoherentNode[]
  | CoherentComponent
  | ContextProvider
  | (() => CoherentNode);

/** Text-only element for simple content */
export interface TextElement {
  text: Primitive;
}

// ============================================================================
// Component System
// ============================================================================

/** Props passed to a component function */
export interface ComponentProps {
  [key: string]: any;
  children?: CoherentNode | CoherentNode[];
}

/** State object for component state management */
export interface ComponentState {
  [key: string]: any;
}

/** Context object passed through component tree */
export interface ComponentContext {
  [key: string]: any;
}

/** A functional component */
export interface CoherentComponent<P extends ComponentProps = ComponentProps> {
  (props?: P, state?: ComponentState, context?: ComponentContext): CoherentNode;
  displayName?: string;
  componentName?: string;
  definition?: ComponentDefinition;
}

/** Component lifecycle hooks */
export interface ComponentLifecycleHooks {
  beforeCreate?(): void;
  created?(): void;
  beforeMount?(): void;
  mounted?(): void;
  beforeUpdate?(): void;
  updated?(): void;
  beforeDestroy?(): void;
  destroyed?(): void;
  errorCaptured?(error: Error): void;
}

/** Component methods */
export interface ComponentMethods {
  [methodName: string]: Function;
}

/** Computed properties */
export interface ComputedProperties {
  [key: string]: (this: ComponentInstance) => any;
}

/** Watchers for reactive properties */
export interface ComponentWatchers {
  [key: string]: (newValue: any, oldValue: any) => void;
}

/** Component definition object */
export interface ComponentDefinition extends ComponentLifecycleHooks {
  name?: string;
  render?: (this: ComponentInstance, props: ComponentProps, state: ComponentState) => CoherentNode;
  template?: CoherentNode | ((props: ComponentProps, state: ComponentState) => CoherentNode) | string;
  state?: ComponentState;
  methods?: ComponentMethods;
  computed?: ComputedProperties;
  watch?: ComponentWatchers;
}

/** Component class instance */
export interface ComponentInstance {
  name: string;
  props: ComponentProps;
  state: ComponentStateManager;
  children: ComponentInstance[];
  parent: ComponentInstance | null;
  rendered: CoherentNode | null;
  isMounted: boolean;
  isDestroyed: boolean;
  definition: ComponentDefinition;
  hooks: Required<ComponentLifecycleHooks>;
  methods: ComponentMethods;
  computed: ComputedProperties;
  computedCache: Map<string, any>;
  watchers: ComponentWatchers;

  render(props?: ComponentProps): CoherentNode;
  mount(): ComponentInstance;
  update(): ComponentInstance;
  destroy(): ComponentInstance;
  clone(overrides?: Partial<ComponentDefinition>): ComponentInstance;
  getMetadata(): ComponentMetadata;
  callHook(hookName: keyof ComponentLifecycleHooks, ...args: any[]): any;
  handleError(error: Error, context?: string): void;
}

/** Component metadata for debugging/profiling */
export interface ComponentMetadata {
  createdAt: number;
  updateCount: number;
  renderCount: number;
}

/** Component state manager with reactive updates */
export interface ComponentStateManager {
  get(): ComponentState;
  get<K extends keyof ComponentState>(key: K): ComponentState[K];
  set(updates: Partial<ComponentState> | ((state: ComponentState) => Partial<ComponentState>)): ComponentStateManager;
  subscribe(listener: StateListener): () => void;
  notifyListeners(oldState: ComponentState, newState: ComponentState): void;
}

/** State change listener */
export type StateListener = (newState: ComponentState, oldState: ComponentState) => void;

// ============================================================================
// State Management
// ============================================================================

/** State container for request/render cycles */
export interface StateContainer {
  get<K extends string>(key: K): any;
  set<K extends string>(key: K, value: any): StateContainer;
  has<K extends string>(key: K): boolean;
  delete<K extends string>(key: K): boolean;
  clear(): StateContainer;
  toObject(): Record<string, any>;
  _internal: Map<string, any>;
}

/** Global state manager */
export interface GlobalStateManager {
  set<K extends string>(key: K, value: any): void;
  get<K extends string>(key: K): any;
  has<K extends string>(key: K): boolean;
  clear(): void;
  createRequestState(): StateContainer;
}

/** Context provider function */
export interface ContextProvider {
  (renderFunction?: (children: CoherentNode) => CoherentNode): CoherentNode;
}

/** State utilities for withState HOC */
export interface StateUtilities<S extends ComponentState = ComponentState> {
  setState(newState: Partial<S> | ((state: S) => Partial<S>)): void;
  getState(): S;
  resetState(): void;
  updateState(updater: Partial<S> | ((state: S) => Partial<S>)): void;
  batchUpdate(updates: Array<Partial<S> | ((container: any) => void)>): void;
}

/** Enhanced props with state for withState HOC */
export interface WithStateProps<P extends ComponentProps, S extends ComponentState> extends P {
  state: S;
  setState: (newState: Partial<S> | ((state: S) => Partial<S>)) => void;
  stateUtils: StateUtilities<S>;
}

// ============================================================================
// Higher-Order Components (HOCs)
// ============================================================================

/** HOC that adds state to a component */
export interface WithStateHOC {
  <P extends ComponentProps, S extends ComponentState>(
    initialStateOrComponent: S | CoherentComponent<P>, 
    maybeInitialState?: S
  ): CoherentComponent<WithStateProps<P, S>>;
  <S extends ComponentState>(initialState: S): <P extends ComponentProps>(
    component: CoherentComponent<P>
  ) => CoherentComponent<WithStateProps<P, S>>;
}

/** Memoization options */
export interface MemoOptions {
  strategy?: 'lru' | 'ttl' | 'weak' | 'simple';
  maxSize?: number;
  ttl?: number;
  keyFn?: (...args: any[]) => string;
  keySerializer?: (value: any) => string;
  compareFn?: (a: any, b: any) => boolean;
  shallow?: boolean;
  onHit?: (key: string, value: any, args: any[]) => void;
  onMiss?: (key: string, args: any[]) => void;
  onEvict?: (key: string, value: any) => void;
  stats?: boolean;
  debug?: boolean;
}

/** Memoized function with utilities */
export interface MemoizedFunction<T extends (...args: any[]) => any> extends T {
  cache: Map<string, any>;
  clear(): void;
  delete(key: string): boolean;
  has(key: string): boolean;
  size(): number;
  refresh(...args: Parameters<T>): ReturnType<T>;
  stats?(): { hits: number; misses: number; evictions: number };
  resetStats?(): void;
}

/** Props transformation function */
export type PropsTransform<P, T> = (props: P, state?: ComponentState, context?: ComponentContext) => T | Promise<T>;

/** WithProps HOC options */
export interface WithPropsOptions<P, T> {
  merge?: boolean;
  override?: boolean;
  validate?: (props: any) => boolean;
  memoize?: boolean;
  memoOptions?: MemoOptions;
  onError?: (error: Error, props: P) => void;
  fallbackProps?: Partial<T>;
  displayName?: string;
  debug?: boolean;
  onPropsChange?: (finalProps: any, original: P, transformed: T) => void;
  shouldUpdate?: (finalProps: any, original: P, state: ComponentState) => boolean;
}

/** WithProps HOC */
export interface WithPropsHOC {
  <P extends ComponentProps, T>(
    propsTransform: PropsTransform<P, T> | T,
    options?: WithPropsOptions<P, T>
  ): <C extends CoherentComponent<P & T>>(component: C) => CoherentComponent<P>;
}

// ============================================================================
// Lazy Loading
// ============================================================================

/** Lazy evaluation options */
export interface LazyOptions {
  cache?: boolean;
  timeout?: number;
  fallback?: any;
  onError?: (error: Error) => void;
  dependencies?: any[];
}

/** Lazy wrapper interface */
export interface LazyWrapper<T> {
  __isLazy: true;
  __factory: (...args: any[]) => T;
  __options: LazyOptions;
  
  evaluate(...args: any[]): T;
  invalidate(): LazyWrapper<T>;
  isEvaluated(): boolean;
  getCachedValue(): T | null;
  map<U>(transform: (value: T) => U): LazyWrapper<U>;
  flatMap<U>(transform: (value: T) => LazyWrapper<U> | U): LazyWrapper<U>;
  toString(): string;
  toJSON(): T;
}

// ============================================================================
// Composition Utilities
// ============================================================================

/** Component composition utilities */
export interface ComposeUtils {
  combine(...components: CoherentComponent[]): CoherentComponent;
  conditional<P extends ComponentProps>(
    condition: boolean | ((props: P) => boolean),
    trueComponent: CoherentComponent<P>,
    falseComponent?: CoherentComponent<P> | null
  ): CoherentComponent<P>;
  loop<T, P extends ComponentProps>(
    data: T[] | ((props: P) => T[]),
    itemComponent: CoherentComponent<P & { item: T; index: number; key: any }>,
    keyFn?: (item: T, index: number) => any
  ): CoherentComponent<P>;
}

/** Component utilities */
export interface ComponentUtils {
  getComponentTree(component: ComponentInstance): ComponentTree;
  findComponent(component: ComponentInstance, name: string): ComponentInstance | null;
  getPerformanceMetrics(component: ComponentInstance): PerformanceMetrics;
  validateDefinition(definition: ComponentDefinition): string[];
}

/** Component tree structure */
export interface ComponentTree {
  name: string;
  props: ComponentProps;
  state: ComponentState;
  children: ComponentTree[];
  metadata: ComponentMetadata;
}

/** Performance metrics */
export interface PerformanceMetrics {
  renderCount: number;
  updateCount: number;
  createdAt: number;
  age: number;
}

// ============================================================================
// Core Functions
// ============================================================================

/** Render a Coherent node to HTML string */
export function renderToString(obj: CoherentNode): string;

/** Alias for renderToString */
export function renderHTML(obj: CoherentNode): string;

/** Synchronous version of renderHTML */
export function renderHTMLSync(obj: CoherentNode): string;

/** Escape HTML characters in text */
export function escapeHtml(text: string): string;

/** Check if tag is a void element */
export function isVoidElement(tagName: string): boolean;

/** Format HTML attributes */
export function formatAttributes(attrs: HTMLAttributes): string;

/** Higher-order component for state management */
export const withState: WithStateHOC;

/** Memoization function */
export function memo<T extends (...args: any[]) => any>(
  fn: T,
  options?: MemoOptions
): MemoizedFunction<T>;

/** Component memoization */
export function memoComponent<P extends ComponentProps>(
  component: CoherentComponent<P>,
  options?: { propsEqual?: (a: P, b: P) => boolean; name?: string }
): CoherentComponent<P>;

/** Higher-order component for props transformation */
export const withProps: WithPropsHOC;

/** Validate component structure */
export function validateComponent(obj: any, name?: string): boolean;

/** Check if object is a Coherent object */
export function isCoherentObject(obj: any): obj is CoherentElement;

/** Deep clone utility */
export function deepClone<T>(obj: T): T;

/** Create lazy evaluation wrapper */
export function lazy<T>(factory: (...args: any[]) => T, options?: LazyOptions): LazyWrapper<T>;

/** Check if value is lazy */
export function isLazy<T>(value: any): value is LazyWrapper<T>;

/** Evaluate lazy values recursively */
export function evaluateLazy<T>(obj: T, ...args: any[]): T;

/** Create lazy component */
export function lazyComponent<P extends ComponentProps>(
  componentFactory: () => CoherentComponent<P>,
  options?: LazyOptions
): LazyWrapper<CoherentComponent<P>>;

// ============================================================================
// Component System Classes and Functions
// ============================================================================

/** Component class constructor */
export class Component implements ComponentInstance {
  constructor(definition?: ComponentDefinition);
  
  name: string;
  props: ComponentProps;
  state: ComponentStateManager;
  children: ComponentInstance[];
  parent: ComponentInstance | null;
  rendered: CoherentNode | null;
  isMounted: boolean;
  isDestroyed: boolean;
  definition: ComponentDefinition;
  hooks: Required<ComponentLifecycleHooks>;
  methods: ComponentMethods;
  computed: ComputedProperties;
  computedCache: Map<string, any>;
  watchers: ComponentWatchers;

  render(props?: ComponentProps): CoherentNode;
  mount(): ComponentInstance;
  update(): ComponentInstance;
  destroy(): ComponentInstance;
  clone(overrides?: Partial<ComponentDefinition>): ComponentInstance;
  getMetadata(): ComponentMetadata;
  callHook(hookName: keyof ComponentLifecycleHooks, ...args: any[]): any;
  handleError(error: Error, context?: string): void;
}

/** Create a component instance */
export function createComponent(definition: ComponentDefinition | CoherentComponent): Component;

/** Define a component factory */
export function defineComponent<P extends ComponentProps>(
  definition: ComponentDefinition
): CoherentComponent<P>;

/** Register a global component */
export function registerComponent<P extends ComponentProps>(
  name: string,
  definition: ComponentDefinition | CoherentComponent<P>
): CoherentComponent<P>;

/** Get a registered component */
export function getComponent<P extends ComponentProps>(name: string): CoherentComponent<P> | undefined;

/** Get all registered components */
export function getRegisteredComponents(): Map<string, CoherentComponent>;

/** Create a higher-order component */
export function createHOC<P extends ComponentProps, E extends ComponentProps>(
  enhancer: (WrappedComponent: CoherentComponent<P>, props: E) => CoherentNode
): (WrappedComponent: CoherentComponent<P>) => CoherentComponent<E>;

// ============================================================================
// State Management Functions
// ============================================================================

/** Create a state container */
export function createState(initialState?: Record<string, any>): StateContainer;

/** Global state manager instance */
export const globalStateManager: GlobalStateManager;

/** Provide context to children */
export function provideContext<T>(key: string, value: T): void;

/** Create a context provider component */
export function createContextProvider<T>(
  key: string,
  value: T,
  children: CoherentNode
): ContextProvider;

/** Restore context to previous value */
export function restoreContext(key: string): void;

/** Clear all context stacks */
export function clearAllContexts(): void;

/** Use context value */
export function useContext<T>(key: string): T | undefined;

// ============================================================================
// Virtual DOM Types (Additional)
// ============================================================================

/** Virtual DOM node */
export interface VNode {
  type: string | Function;
  props: Record<string, any>;
  children: VNode[];
  key?: string | number;
}

/** VDOM operation types */
export const VDOM_OPERATIONS: {
  CREATE: string;
  REMOVE: string;
  REPLACE: string;
  UPDATE: string;
};

/** VDOM patch operation */
export interface VDOMPatch {
  type: string;
  path: (string | number)[];
  value?: any;
  oldValue?: any;
  props?: Record<string, any>;
}

/** Create a virtual node */
export function createVNode(type: string | Function, props?: Record<string, any>, children?: VNode[]): VNode;

/** Convert object to virtual node */
export function objectToVNode(component: CoherentNode, depth?: number): VNode;

/** Diff two virtual nodes */
export function diff(oldVNode: VNode, newVNode: VNode, patches?: VDOMPatch[], path?: (string | number)[]): VDOMPatch[];

/** Apply patches to DOM element */
export function patch(element: HTMLElement, patches: VDOMPatch[]): void;

/** VDOM differ class */
export class VDOMDiffer {
  diff(oldVNode: VNode, newVNode: VNode): VDOMPatch[];
  patch(element: HTMLElement, patches: VDOMPatch[]): void;
}

// ============================================================================
// Advanced Rendering Functions (Additional)
// ============================================================================

/** Render options */
export interface RenderOptions {
  cache?: boolean;
  pretty?: boolean;
  minify?: boolean;
  streaming?: boolean;
  chunkSize?: number;
}

/** Render component to string */
export function render(component: CoherentNode, options?: RenderOptions): string;

/** Render multiple components in batch */
export function renderBatch(components: CoherentNode[], options?: RenderOptions): string[];

/** Render to chunks generator */
export function renderToChunks(component: CoherentNode, options?: RenderOptions): Generator<string, void, unknown>;

/** Render to stream async generator */
export function renderToStream(component: CoherentNode, options?: RenderOptions): AsyncGenerator<string, void, unknown>;

/** Get rendering cache */
export function getCache(): Map<string, any>;

/** Reset rendering cache */
export function resetCache(): void;

/** Get rendering statistics */
export function getRenderingStats(): {
  totalRenders: number;
  cacheHits: number;
  cacheMisses: number;
  averageRenderTime: number;
};

/** Precompile component for faster rendering */
export function precompileComponent(component: CoherentNode, options?: RenderOptions): any;

/** Render with timing information */
export function renderWithTiming(component: CoherentNode, options?: RenderOptions): {
  html: string;
  time: number;
  metrics: Record<string, any>;
};

// ============================================================================
// CSS Management (Additional)
// ============================================================================

/** CSS manager for component styles */
export class CSSManager {
  addStyles(componentId: string, styles: string | Record<string, any>): void;
  removeStyles(componentId: string): void;
  getStyles(componentId?: string): string;
  getAllStyles(): string;
  clearStyles(): void;
  hasStyles(componentId: string): boolean;
}

// ============================================================================
// Performance Monitoring (Additional)
// ============================================================================

/** Performance monitor class */
export class PerformanceMonitor {
  startRender(id?: string): string;
  endRender(id: string): number;
  recordRender(type: string, duration: number, metadata?: any): void;
  getMetrics(): Record<string, any>;
  clearMetrics(): void;
  enableMonitoring(): void;
  disableMonitoring(): void;
  isEnabled(): boolean;
}

/** Global performance monitor instance */
export const performanceMonitor: PerformanceMonitor;

// ============================================================================
// Cache Management (Additional)
// ============================================================================

/** Cache manager options */
export interface CacheManagerOptions {
  maxSize?: number;
  ttl?: number;
  strategy?: 'lru' | 'fifo' | 'lfu';
}

/** Cache manager interface */
export interface CacheManager {
  get(key: string): any;
  set(key: string, value: any, ttl?: number): void;
  has(key: string): boolean;
  delete(key: string): boolean;
  clear(): void;
  size(): number;
  prune(): void;
}

/** Create cache manager */
export function createCacheManager(options?: CacheManagerOptions): CacheManager;

/** Global cache manager instance */
export const cacheManager: CacheManager;

// ============================================================================
// Bundle Optimization (Additional)
// ============================================================================

/** Bundle optimizer class */
export class BundleOptimizer {
  analyze(bundle: any): any;
  optimize(bundle: any): any;
  splitChunks(bundle: any): any[];
  treeshake(bundle: any): any;
}

/** Global bundle optimizer instance */
export const bundleOptimizer: BundleOptimizer;

// ============================================================================
// Component Cache (Additional)
// ============================================================================

/** Component cache class */
export class ComponentCache {
  cache(key: string, component: CoherentNode): void;
  get(key: string): CoherentNode | undefined;
  invalidate(key: string): void;
  invalidateAll(): void;
}

/** Create component cache */
export function createComponentCache(options?: CacheManagerOptions): ComponentCache;

// ============================================================================
// Utility Types and Constants
// ============================================================================

/** Framework version */
export const VERSION: string;

/** Composition utilities */
export const compose: ComposeUtils;

/** Component utilities */
export const componentUtils: ComponentUtils;

/** Default export with all core functionality */
declare const coherent: {
  renderToString: typeof renderToString;
  renderHTML: typeof renderHTML;
  renderHTMLSync: typeof renderHTMLSync;
  withState: typeof withState;
  memo: typeof memo;
  validateComponent: typeof validateComponent;
  isCoherentObject: typeof isCoherentObject;
  deepClone: typeof deepClone;
  escapeHtml: typeof escapeHtml;
  VERSION: typeof VERSION;
};

export default coherent;