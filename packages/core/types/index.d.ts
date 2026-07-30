/**
 * Coherent.js Core Types
 * TypeScript definitions for the core Coherent.js framework
 *
 * @version 1.0.0-beta.1
 */

// Re-export strict element types. `export *` re-exports without binding the
// names locally, so CoherentNode below needs its own import.
export * from './elements';
import type { StrictCoherentElement } from './elements';

// ============================================================================
// Basic Types
// ============================================================================

/** Primitive values that can be rendered as HTML */
export type Primitive = string | number | boolean | null | undefined;

/** Allow objects and functions in attributes */
export type AttributeValue = Primitive | object;

/** HTML attributes object */
export interface HTMLAttributes {
  [key: string]: AttributeValue;
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

/**
 * Permissive element type - allows any tag name and any attributes.
 * For strict type checking with per-element attributes, use StrictCoherentElement.
 *
 * @example
 * ```typescript
 * // Permissive - accepts any attributes on any element
 * const element: CoherentElement = {
 *   div: { checked: true }  // No error (but incorrect HTML)
 * };
 *
 * // For strict checking, use StrictCoherentElement instead
 * import { StrictCoherentElement } from '@coherent.js/core';
 * const strictElement: StrictCoherentElement = {
 *   div: { checked: true }  // Type error! checked not valid on div
 * };
 * ```
 *
 * @see StrictCoherentElement for strict per-element attribute validation
 */
export interface CoherentElement {
  [tagName: string]: ElementProps | string | undefined;

  // Common HTML Elements
  a?: ElementProps | string;
  abbr?: ElementProps | string;
  address?: ElementProps | string;
  area?: ElementProps | string;
  article?: ElementProps | string;
  aside?: ElementProps | string;
  audio?: ElementProps | string;
  b?: ElementProps | string;
  base?: ElementProps | string;
  bdi?: ElementProps | string;
  bdo?: ElementProps | string;
  blockquote?: ElementProps | string;
  body?: ElementProps | string;
  br?: ElementProps | string;
  button?: ElementProps | string;
  canvas?: ElementProps | string;
  caption?: ElementProps | string;
  cite?: ElementProps | string;
  code?: ElementProps | string;
  col?: ElementProps | string;
  colgroup?: ElementProps | string;
  data?: ElementProps | string;
  datalist?: ElementProps | string;
  dd?: ElementProps | string;
  del?: ElementProps | string;
  details?: ElementProps | string;
  dfn?: ElementProps | string;
  dialog?: ElementProps | string;
  div?: ElementProps | string;
  dl?: ElementProps | string;
  dt?: ElementProps | string;
  em?: ElementProps | string;
  embed?: ElementProps | string;
  fieldset?: ElementProps | string;
  figcaption?: ElementProps | string;
  figure?: ElementProps | string;
  footer?: ElementProps | string;
  form?: ElementProps | string;
  h1?: ElementProps | string;
  h2?: ElementProps | string;
  h3?: ElementProps | string;
  h4?: ElementProps | string;
  h5?: ElementProps | string;
  h6?: ElementProps | string;
  head?: ElementProps | string;
  header?: ElementProps | string;
  hgroup?: ElementProps | string;
  hr?: ElementProps | string;
  html?: ElementProps | string;
  i?: ElementProps | string;
  iframe?: ElementProps | string;
  img?: ElementProps | string;
  input?: ElementProps | string;
  ins?: ElementProps | string;
  kbd?: ElementProps | string;
  label?: ElementProps | string;
  legend?: ElementProps | string;
  li?: ElementProps | string;
  link?: ElementProps | string;
  main?: ElementProps | string;
  map?: ElementProps | string;
  mark?: ElementProps | string;
  menu?: ElementProps | string;
  meta?: ElementProps | string;
  meter?: ElementProps | string;
  nav?: ElementProps | string;
  noscript?: ElementProps | string;
  object?: ElementProps | string;
  ol?: ElementProps | string;
  optgroup?: ElementProps | string;
  option?: ElementProps | string;
  output?: ElementProps | string;
  p?: ElementProps | string;
  picture?: ElementProps | string;
  pre?: ElementProps | string;
  progress?: ElementProps | string;
  q?: ElementProps | string;
  rp?: ElementProps | string;
  rt?: ElementProps | string;
  ruby?: ElementProps | string;
  s?: ElementProps | string;
  samp?: ElementProps | string;
  script?: ElementProps | string;
  section?: ElementProps | string;
  select?: ElementProps | string;
  slot?: ElementProps | string;
  small?: ElementProps | string;
  source?: ElementProps | string;
  span?: ElementProps | string;
  strong?: ElementProps | string;
  style?: ElementProps | string;
  sub?: ElementProps | string;
  summary?: ElementProps | string;
  sup?: ElementProps | string;
  table?: ElementProps | string;
  tbody?: ElementProps | string;
  td?: ElementProps | string;
  template?: ElementProps | string;
  textarea?: ElementProps | string;
  tfoot?: ElementProps | string;
  th?: ElementProps | string;
  thead?: ElementProps | string;
  time?: ElementProps | string;
  title?: ElementProps | string;
  tr?: ElementProps | string;
  track?: ElementProps | string;
  u?: ElementProps | string;
  ul?: ElementProps | string;
  var?: ElementProps | string;
  video?: ElementProps | string;
  wbr?: ElementProps | string;
}

/**
 * Valid nodes that can be rendered.
 * Accepts both permissive CoherentElement and strict StrictCoherentElement.
 */
export type CoherentNode =
  | Primitive
  | CoherentElement
  | StrictCoherentElement
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
export type WithStateProps<P extends ComponentProps, S extends ComponentState> = P & {
  state: S;
  setState: (newState: Partial<S> | ((state: S) => Partial<S>)) => void;
  stateUtils: StateUtilities<S>;
};

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
export type MemoizedFunction<T extends (...args: any[]) => any> = T & {
  cache: Map<string, any>;
  clear(): void;
  delete(key: string): boolean;
  has(key: string): boolean;
  size(): number;
  refresh(...args: Parameters<T>): ReturnType<T>;
  stats?(): { hits: number; misses: number; evictions: number };
  resetStats?(): void;
};

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

/** Render options for `render(component, options)` */
export interface RenderOptions {
  enableCache?: boolean;
  enableMonitoring?: boolean;
  minify?: boolean;
  maxDepth?: number;
  cacheSize?: number;
  cacheTTL?: number;
  scoped?: boolean;
  encapsulate?: boolean;
}

/** Render a Coherent node to an HTML string */
export function render(component: CoherentNode, options?: RenderOptions): string;

export interface RenderUtilityOptions {
  enablePerformanceMonitoring?: boolean;
  template?: string;
}

export function renderWithMonitoring(component: CoherentNode, options?: RenderUtilityOptions): string;
export function renderWithTemplate(component: CoherentNode, options?: RenderUtilityOptions): string;
export function renderComponentFactory(
  componentFactory: (...args: any[]) => CoherentNode | Promise<CoherentNode>,
  factoryArgs: any[],
  options?: RenderUtilityOptions
): Promise<string>;
export function isCoherentComponent(obj: unknown): boolean;
export function createErrorResponse(
  error: Error,
  context?: string
): {
  error: string;
  message: string;
  context: string;
  timestamp: string;
};

export function isPeerDependencyAvailable(packageName: string): boolean;
export function importPeerDependency(packageName: string, integrationName: string): Promise<any>;
export function createLazyIntegration(
  packageName: string,
  integrationName: string,
  createIntegration: (module: any) => (...args: any[]) => any
): (...args: any[]) => Promise<any>;
export function checkPeerDependencies(
  dependencies: Array<{ package: string; integration: string }>
): Record<string, boolean>;

export function hasChildren(component: unknown): boolean;
export function normalizeChildren(children: unknown): unknown[];

/** Higher-order component for state management */
export const withState: WithStateHOC;

/** Memoization function */
export function memo<T extends (...args: any[]) => any>(
  fn: T,
  options?: MemoOptions
): MemoizedFunction<T>;

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

// ============================================================================
// Component System Classes and Functions
// ============================================================================

/** Stateful component class backing createComponent() */
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

/**
 * Create a component.
 *
 * The result is callable -- `render(Counter({ count: 2 }))` -- and also carries
 * the full Component instance API (`render`, `mount`, `state`, ...).
 */
export function createComponent<P extends ComponentProps = ComponentProps>(
  definition: ComponentDefinition | CoherentComponent
): CoherentComponent<P> & ComponentInstance;

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
export function createHOC<P extends ComponentProps = ComponentProps>(
  enhancer: (component: CoherentComponent<P>, props: P) => CoherentNode
): (component: CoherentComponent<P>) => CoherentComponent<P>;

/**
 * Options for memoComponent().
 *
 * Distinct from MemoOptions: memoComponent compares props and state rather
 * than raw memo arguments.
 */
export interface MemoComponentOptions<P extends ComponentProps = ComponentProps> {
  propsEqual?: (a: P, b: P) => boolean;
  stateEqual?: (a: ComponentState, b: ComponentState) => boolean;
  name?: string;
}

/** Memoize a component */
export function memoComponent<P extends ComponentProps = ComponentProps>(
  component: CoherentComponent<P>,
  options?: MemoComponentOptions<P>
): MemoizedFunction<CoherentComponent<P>>;

// ============================================================================
// State Management Functions
// ============================================================================

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

/** VDOM patch operation */
export interface VDOMPatch {
  type: string;
  path: (string | number)[];
  value?: any;
  oldValue?: any;
  props?: Record<string, any>;
}

// ============================================================================
// CSS Management (Additional)
// ============================================================================

// ============================================================================
// Performance Monitoring (Additional)
// ============================================================================

/** Global performance monitor instance */
/** Performance monitor surface, as implemented by performance/monitor.js */
export interface PerformanceMonitor {
  startRender(componentName?: string): string;
  endRender(renderId: string): number;
  recordMetric(name: string, value: number, tags?: Record<string, any>): void;
  addMetric(name: string, value: number, tags?: Record<string, any>): void;
  measure<T>(name: string, fn: () => T): T;
  measureAsync<T>(name: string, fn: () => Promise<T>): Promise<T>;
  addAlertRule(rule: Record<string, any>): void;
  generateReport(): Record<string, any>;
  getStats(): Record<string, any>;
  reset(): void;
  start(): void;
  stop(): void;
}

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

/** Shared cache manager instance */
export const cacheManager: CacheManager;

/** Create a cache manager */
export function createCacheManager(options?: CacheManagerOptions): CacheManager;

// ============================================================================
// Bundle Optimization (Additional)
// ============================================================================

// ============================================================================
// Component Cache (Additional)
// ============================================================================

/** Options for {@link ComponentCache} */
export interface ComponentCacheOptions {
  /** Entries retained before least-used eviction; defaults to `1000` */
  maxSize?: number;
  /** Entry lifetime in ms; defaults to `300000` */
  defaultTTL?: number;
  /** Expiry sweep interval in ms, or `0` to disable; defaults to `60000` */
  cleanupInterval?: number;
  /** Track hits, misses and evictions; defaults to `true` */
  enableStats?: boolean;
  [option: string]: unknown;
}

/** Per-entry overrides for {@link ComponentCache.set} */
export interface ComponentCacheEntryOptions {
  /** Keys that invalidate this entry */
  dependencies?: string[];
  /** Lifetime in ms; defaults to the cache's `defaultTTL` */
  ttl?: number;
  /** Exempt from expiry */
  persistent?: boolean;
}

export interface ComponentCacheStats {
  size: number;
  maxSize: number;
  hits: number;
  misses: number;
  /** Percentage, as a fixed-2 string, or `0` before any request */
  hitRate: string | number;
  evictions: number;
  cleanups: number;
  invalidations: number;
  dependencies: number;
  /** Rough estimate in KB */
  memoryUsage: number;
}

/**
 * Caches rendered components with TTL, least-used eviction and
 * dependency-based invalidation.
 *
 * `cache` is the backing Map, not a method — write through `set()`.
 */
export class ComponentCache {
  constructor(options?: ComponentCacheOptions);

  options: ComponentCacheOptions;
  /** Backing store, keyed by cache key */
  cache: Map<string, unknown>;
  /** Dependency key to the cache keys that depend on it */
  dependencies: Map<string, Set<string>>;

  /** Derive a stable key from a component and its props */
  generateKey(
    component: unknown,
    props?: Record<string, unknown>,
    context?: Record<string, unknown>
  ): string;

  /**
   * Read an entry, recording a hit or miss. Returns a deep clone, or `null`
   * when absent or expired. Any `dependencies` passed are added to the entry.
   */
  get(key: string, dependencies?: string[]): CoherentNode | null;

  /** Store an entry, evicting the least-used one when the cache is full */
  set(key: string, component: CoherentNode, options?: ComponentCacheEntryOptions): boolean;

  /** Whether a live, unexpired entry exists */
  has(key: string): boolean;

  /** Drop every entry depending on `dependency`; returns how many */
  invalidate(dependency: string): number;

  /** Drop every entry depending on any of `dependencies`; returns how many */
  invalidateMultiple(dependencies: string[]): number;

  /** Drop every entry */
  clear(): void;

  /** Drop expired entries; returns how many */
  cleanup(): number;

  getStats(): ComponentCacheStats;

  /** Rough memory estimate in KB */
  estimateMemoryUsage(): number;

  /** Most-accessed entries, hottest first */
  getHotComponents(limit?: number): Array<{
    key: string;
    accessCount: number;
    component: CoherentNode;
    dependencies: string[];
  }>;

  /** Tuning suggestions derived from the current stats */
  getRecommendations(): Array<{
    type: string;
    message: string;
    priority: 'HIGH' | 'MEDIUM' | 'LOW';
  }>;

  /** Stop the cleanup timer and drop every entry */
  destroy(): void;
}

/** Create component cache */
export function createComponentCache(options?: ComponentCacheOptions): ComponentCache;

// ============================================================================
// HTML Utilities
// ============================================================================

/** Escape HTML special characters in text */
export function escapeHtml(text: string): string;

/** Check whether a tag is a void element */
export function isVoidElement(tagName: string): boolean;

/** Serialize props into an HTML attribute string */
export function formatAttributes(props: Record<string, any>): string;

/** Mark content as trusted so it is emitted without escaping */
export function dangerouslySetInnerContent(content: string): TrustedContent;

/** Content marked trusted by dangerouslySetInnerContent() */
export interface TrustedContent {
  __html: string;
  __trusted: true;
}

/** Detect content marked by dangerouslySetInnerContent() */
export function isTrustedContent(value: unknown): value is TrustedContent;

// ============================================================================
// Utility Types and Constants
// ============================================================================

/** Framework version */
export const VERSION: string;

/** Composition utilities */
export const compose: ComposeUtils;

/** Default export with all core functionality */
declare const coherent: {
  render: typeof render;
  withState: typeof withState;
  memo: typeof memo;
  validateComponent: typeof validateComponent;
  isCoherentObject: typeof isCoherentObject;
  deepClone: typeof deepClone;
  escapeHtml: typeof escapeHtml;
  VERSION: typeof VERSION;
};

export default coherent;

// ============================================================================
// Object Factory
// ============================================================================

/**
 * Build a single-element node.
 *
 * @throws when `tag` is not a known HTML element.
 */
export function createElement(tag: string, props?: Record<string, unknown>): CoherentNode;

/** Build a text node from any value. */
export function createTextNode(text: unknown): CoherentNode;

/**
 * Shorthand element factories: `h.div({ text: 'hi' })` is
 * `createElement('div', { text: 'hi' })`.
 */
export const h: Record<string, (props?: Record<string, unknown>) => CoherentNode>;

// ============================================================================
// HTML Nesting Validation
// ============================================================================

/** Children the HTML spec forbids, keyed by parent tag. */
export const FORBIDDEN_CHILDREN: Record<string, Set<string>>;

/** Raised by {@link validateNesting} when `throwOnError` is set. */
export class HTMLNestingError extends Error {
  constructor(message: string, context?: { parent?: string; child?: string; path?: string });
  parent?: string;
  child?: string;
  path?: string;
}

/**
 * Check one parent/child pair against {@link FORBIDDEN_CHILDREN}.
 *
 * Returns `true` when the nesting is legal. Otherwise warns (outside
 * production) and returns `false`, or throws {@link HTMLNestingError} when
 * `throwOnError` is set. Browsers silently reparent invalid nesting, which
 * shows up later as a hydration mismatch.
 */
export function validateNesting(
  parentTag: string,
  childTag: string,
  path?: string,
  options?: { warn?: boolean; throwOnError?: boolean }
): boolean;

// ============================================================================
// Component Lifecycle
// ============================================================================

/** Lifecycle phase names. */
export const LIFECYCLE_PHASES: {
  readonly BEFORE_CREATE: 'beforeCreate';
  readonly CREATED: 'created';
  readonly BEFORE_MOUNT: 'beforeMount';
  readonly MOUNTED: 'mounted';
  readonly BEFORE_UPDATE: 'beforeUpdate';
  readonly UPDATED: 'updated';
  readonly BEFORE_UNMOUNT: 'beforeUnmount';
  readonly UNMOUNTED: 'unmounted';
  readonly ERROR: '_error';
};

/** One of the {@link LIFECYCLE_PHASES} values. */
export type LifecyclePhase =
  | 'beforeCreate'
  | 'created'
  | 'beforeMount'
  | 'mounted'
  | 'beforeUpdate'
  | 'updated'
  | 'beforeUnmount'
  | 'unmounted'
  | '_error';

/**
 * Tracks one component's phase, hooks, state and cleanup.
 *
 * Timers, listeners and subscriptions registered through the instance are
 * released on unmount, so prefer them over the globals.
 */
export class ComponentLifecycle {
  constructor(component: unknown, options?: Record<string, unknown>);

  component: unknown;
  id: string;
  options: Record<string, unknown>;
  phase: LifecyclePhase | null;
  hooks: Map<string, Array<(...args: never[]) => unknown>>;
  state: Map<string, unknown>;
  props: Record<string, unknown>;
  context: Record<string, unknown>;
  isMounted: boolean;
  isDestroyed: boolean;
  children: Set<ComponentLifecycle>;
  parent: ComponentLifecycle | null;

  /** Register a callback for a phase */
  hook(phase: LifecyclePhase, callback: (...args: never[]) => unknown): this;

  addChild(child: ComponentLifecycle): void;
  removeChild(child: ComponentLifecycle): void;

  /** Add a listener released on unmount */
  addEventListener(
    element: unknown,
    event: string,
    listener: (event: unknown) => void,
    options?: Record<string, unknown>
  ): void;

  /** Register an unsubscribe called on unmount */
  addSubscription(unsubscribe: () => void): void;

  /** `setTimeout` cleared on unmount */
  setTimeout(callback: () => void, delay: number): unknown;
  /** `setInterval` cleared on unmount */
  setInterval(callback: () => void, interval: number): unknown;

  /** Counts of hooks, children, timers and subscriptions */
  getStats(): Record<string, unknown>;
}

/**
 * Component-scoped event emitter used by the lifecycle system. Reachable
 * through {@link eventSystem}; the class itself is not exported.
 */
declare class ComponentEventSystem {
  constructor();
  emit(eventName: string, data?: unknown, target?: unknown): unknown;
  on(eventName: string, handler: (event: unknown) => void, componentId?: string | null): () => void;
  off(eventName: string, handler: (event: unknown) => void, componentId?: string | null): void;
  once(eventName: string, handler: (event: unknown) => void, componentId?: string | null): () => void;
  /** Release every handler for a component */
  cleanup(componentId: string): void;
  getStats(): Record<string, unknown>;
}

/** Process-wide {@link ComponentEventSystem}. */
export const eventSystem: ComponentEventSystem;

/**
 * Build a hook registrar per lifecycle phase. Each registers against the
 * instance currently being created, and is a no-op outside that window.
 */
export function createLifecycleHooks(): Record<LifecyclePhase, (callback: (...args: never[]) => unknown) => void>;

/** Shared {@link createLifecycleHooks} result. */
export const useHooks: Record<LifecyclePhase, (callback: (...args: never[]) => unknown) => void>;

/** Helpers for reaching lifecycle instances from a component. */
export const lifecycleUtils: {
  /** The instance attached to a component, if any */
  getLifecycle(component: unknown): ComponentLifecycle | undefined;
  /** Wrap a component with a lifecycle and expose its mount hooks */
  createWithLifecycle(
    component: unknown,
    options?: Record<string, unknown>
  ): {
    component: unknown;
    lifecycle: ComponentLifecycle;
    mount: (...args: never[]) => unknown;
    unmount: (...args: never[]) => unknown;
    update: (...args: never[]) => unknown;
  };
  /** Every live instance */
  getAllInstances(): ComponentLifecycle[];
  findById(id: string): ComponentLifecycle | undefined;
  /** Emit through {@link eventSystem}, targeting a component */
  emit(component: unknown, eventName: string, data?: unknown): unknown;
  /** Listen for a component's events; returns an unsubscribe function */
  listen(component: unknown, eventName: string, handler: (event: unknown) => void): () => void;
};

/** Wrap a component so a {@link ComponentLifecycle} is created around renders. */
export function withLifecycle(
  component: CoherentComponent | CoherentNode,
  options?: Record<string, unknown>
): (props?: Record<string, unknown>) => CoherentNode;

// ============================================================================
// Error Boundaries
// ============================================================================

export interface ErrorBoundaryOptions {
  /** Rendered instead of the children when a render throws */
  fallback?: CoherentNode | ((error: Error, reset: () => void) => CoherentNode);
  /** Notified when a render throws */
  onError?: (error: Error, errorInfo: Record<string, unknown>) => void;
  /** Clear the error when any of these values change */
  resetKeys?: unknown[];
  [option: string]: unknown;
}

/** Wrap children so a render error shows a fallback instead of propagating. */
export function createErrorBoundary(options?: ErrorBoundaryOptions): CoherentComponent;

/** Build a fallback node for an error boundary. */
export function createErrorFallback(options?: Record<string, unknown>): CoherentNode;

/** Wrap components in an error boundary. */
export function withErrorBoundary(
  options: ErrorBoundaryOptions,
  components: CoherentComponent | CoherentComponent[]
): CoherentComponent;

/** An error boundary that also catches rejections from async children. */
export function createAsyncErrorBoundary(options?: ErrorBoundaryOptions): CoherentComponent;

export interface GlobalErrorHandlerOptions {
  /** Cap on retained errors */
  maxErrors?: number;
  /** Notified for every captured error */
  onError?: (error: Error, context: Record<string, unknown>) => void;
  [option: string]: unknown;
}

/** Collects errors that escaped every boundary. */
export class GlobalErrorHandler {
  constructor(options?: GlobalErrorHandlerOptions);

  /** Record an error with context */
  captureError(error: Error, context?: Record<string, unknown>): void;
  /** Retained errors */
  getErrors(): Array<{ error: Error; context: Record<string, unknown>; timestamp: number }>;
  clearErrors(): void;
  /** Counts by type and recency */
  getStats(): Record<string, unknown>;
  enable(): void;
  disable(): void;
}

/** Create a {@link GlobalErrorHandler}. */
export function createGlobalErrorHandler(options?: GlobalErrorHandlerOptions): GlobalErrorHandler;

// ============================================================================
// Event Bus
// ============================================================================

/** Called when a subscribed event fires. */
export type EventListener = (data: unknown, event: string) => unknown;

export interface EventListenerOptions {
  /** Higher runs first when `enablePriority` is set */
  priority?: number;
  /** Skip the listener when this returns false */
  condition?: (data: unknown) => boolean;
  [option: string]: unknown;
}

export interface EventBusOptions {
  /** Log every emit; defaults to `false` */
  debug?: boolean;
  /** Track emit timings; defaults to `true` */
  performance?: boolean;
  /** Listeners per event before warning; defaults to `100` */
  maxListeners?: number;
  /** Allow `a:*` patterns; defaults to `true` */
  enableWildcards?: boolean;
  /** Allow async listeners; defaults to `true` */
  enableAsync?: boolean;
  /** Wildcard segment separator; defaults to `':'` */
  wildcardSeparator?: string;
  /** Honor listener priority; defaults to `true` */
  enablePriority?: boolean;
  defaultPriority?: number;
  errorHandler?: ((error: Error, event: string, data: unknown) => void) | null;
  filters?: {
    /** Only these events pass; `null` allows all */
    allowList?: string[] | null;
    blockList?: string[];
  };
  throttle?: {
    enabled?: boolean;
    defaultDelay?: number;
    events?: Record<string, number>;
  };
  batching?: {
    enabled?: boolean;
    maxBatchSize?: number;
    flushInterval?: number;
  };
  [option: string]: unknown;
}

export interface EventBusStats {
  eventsEmitted: number;
  listenersExecuted: number;
  errorsOccurred: number;
  averageEmitTime: number;
  throttledEvents: number;
  filteredEvents: number;
}

/**
 * Pub/sub bus with wildcards, priorities, middleware, throttling and
 * batching, plus a named-action registry for DOM handlers.
 */
export class EventBus {
  constructor(options?: EventBusOptions);

  options: EventBusOptions;
  listeners: Map<string, unknown[]>;
  actionHandlers: Map<string, (...args: never[]) => unknown>;
  middleware: Array<(event: string, data: unknown, next: () => void) => void>;

  /** Add middleware run before listeners */
  use(middleware: (event: string, data: unknown, next: () => void) => void): this;

  /** Emit, honoring batching and throttling */
  emit(event: string, data?: unknown): Promise<unknown>;

  /** Emit immediately, ignoring batching and throttling */
  emitSync(event: string, data?: unknown): void;

  /** Subscribe; returns the listener id for {@link EventBus.off} */
  on(event: string, listener: EventListener, options?: EventListenerOptions): string;

  /** Subscribe for one emit */
  once(event: string, listener: EventListener, options?: EventListenerOptions): string;

  /** Unsubscribe by listener id; `false` when not found */
  off(event: string, listenerId: string): boolean;

  /** Drop every listener for an event, or for all events */
  removeAllListeners(event?: string): void;

  /** Listeners matching an event, wildcards included */
  getEventListeners(event: string): unknown[];

  /** Register a named action for DOM handlers */
  registerAction(action: string, handler: (...args: never[]) => unknown): void;
  /** Register several named actions */
  registerActions(actions: Record<string, (...args: never[]) => unknown>): void;
  getRegisteredActions(): string[];
  /** Invoke a registered action */
  handleAction(action: string, element?: unknown, event?: unknown, data?: unknown): unknown;

  getStats(): EventBusStats;
  resetStats(): void;

  /** Drop every listener, action and timer */
  destroy(): void;
}

/** Create an {@link EventBus}. */
export function createEventBus(options?: EventBusOptions): EventBus;

/** Process-wide {@link EventBus} backing the module-level helpers. */
export const globalEventBus: EventBus;

/** {@link EventBus.emit} on {@link globalEventBus}. */
export const emit: EventBus['emit'];
/** {@link EventBus.emitSync} on {@link globalEventBus}. */
export const emitSync: EventBus['emitSync'];
/** {@link EventBus.on} on {@link globalEventBus}. */
export const on: EventBus['on'];
/** {@link EventBus.once} on {@link globalEventBus}. */
export const once: EventBus['once'];
/** {@link EventBus.off} on {@link globalEventBus}. */
export const off: EventBus['off'];
/** {@link EventBus.registerAction} on {@link globalEventBus}. */
export const registerAction: EventBus['registerAction'];
/** {@link EventBus.handleAction} on {@link globalEventBus}. */
export const handleAction: EventBus['handleAction'];

// ============================================================================
// Event System Integration
// ============================================================================

/** Wire a component to an event bus. */
export function withEventBus(
  options?: Record<string, unknown>
): (component: CoherentComponent) => CoherentComponent;

/** Give a component state that updates in response to bus events. */
export function withEventState(
  initialState?: Record<string, unknown>,
  options?: Record<string, unknown>
): (component: CoherentComponent) => CoherentComponent;

/** Factories for the common data-action handler shapes. */
export const createActionHandlers: Record<string, (...args: never[]) => unknown>;

/** Factories for the common DOM event handler shapes. */
export const createEventHandlers: Record<string, (...args: never[]) => unknown>;

/** Wrap a component so its declared events are wired to the bus. */
export function createEventComponent(
  component: CoherentComponent,
  options?: Record<string, unknown>
): CoherentComponent;

/**
 * Bridges DOM events to an {@link EventBus} through delegated listeners.
 *
 * Browser-only: constructing it outside a document is inert.
 */
export class DOMEventIntegration {
  constructor(eventBus?: EventBus, options?: Record<string, unknown>);

  /** Attach delegated listeners */
  initialize(root?: unknown): void;
  /** Detach every listener */
  destroy(): void;
}

/** Process-wide {@link DOMEventIntegration} bound to {@link globalEventBus}. */
export const globalDOMIntegration: DOMEventIntegration;

/** Initialize {@link globalDOMIntegration}. */
export function initializeDOMIntegration(options?: Record<string, unknown>): DOMEventIntegration;

// ============================================================================
// State Management
// ============================================================================

export interface StateManagerConfig {
  initialState?: Record<string, unknown>;
  /** Reducers combined into a root reducer, keyed by state slice */
  reducers?: Record<string, (state: unknown, action: unknown) => unknown>;
  actions?: Record<string, (...args: never[]) => unknown>;
  middleware?: Array<(...args: never[]) => unknown>;
  /** Applied to the config before the manager is built */
  plugins?: Array<(config: Record<string, unknown>) => Record<string, unknown>>;
}

/** Build a reducer-based state manager from slice reducers and actions. */
export function createStateManager(config: StateManagerConfig): Record<string, unknown>;

/** Presets over `withState` for the common state shapes. */
export const withStateUtils: {
  /** Component-local state */
  local(initialState: Record<string, unknown>): ReturnType<typeof withState>;
  /** State mirrored to localStorage under `key` */
  persistent(initialState: Record<string, unknown>, key: string): ReturnType<typeof withState>;
  /** State driven by a reducer */
  reducer(
    initialState: Record<string, unknown>,
    reducer: (state: unknown, action: unknown) => unknown,
    actions?: Record<string, (...args: never[]) => unknown>
  ): ReturnType<typeof withState>;
  [preset: string]: (...args: never[]) => unknown;
};

// ============================================================================
// Composition and Utilities
// ============================================================================

/** Higher-order component factories. */
export const hoc: {
  /** Merge extra props into a component */
  withProps(additionalProps: Record<string, unknown>): (component: CoherentComponent) => CoherentComponent;
  /** Render only when `condition` holds */
  withCondition(condition: (props: Record<string, unknown>) => boolean): (component: CoherentComponent) => CoherentComponent;
  /** Show a placeholder while `props.loading` is set */
  withLoading(loadingComponent: CoherentNode): (component: CoherentComponent) => CoherentComponent;
  /** Show a fallback when `props.error` is set */
  withError(errorComponent: CoherentNode): (component: CoherentComponent) => CoherentComponent;
  /** Cache renders by a derived key */
  withMemo(getMemoKey: (props: Record<string, unknown>) => string): (component: CoherentComponent) => CoherentComponent;
};

/** Functional helpers. */
export const fp: {
  /** Curried map: `fp.map(fn)(array)` */
  map<T, R>(fn: (value: T, index: number, array: T[]) => R): (array: T[]) => R[];
};

/** Cache a component's renders, keyed by `keyGenerator`. */
export function memoize<C extends CoherentComponent>(
  component: C,
  keyGenerator?: (props: Record<string, unknown>) => string,
  options?: ComponentCacheEntryOptions
): C;

/** Mark a component as an interactive island for client-side hydration. */
export function Island(componentFn: CoherentComponent): CoherentComponent;

/** Shadow DOM helpers; browser-only. */
export const shadowDOM: {
  isShadowDOMSupported(): boolean;
  createShadowComponent(
    element: unknown,
    componentDef: CoherentNode,
    options?: Record<string, unknown>
  ): unknown;
  renderWithBestEncapsulation(componentDef: CoherentNode, containerElement?: unknown): unknown;
};
