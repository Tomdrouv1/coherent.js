/**
 * Coherent.js State Management TypeScript Definitions
 * @module @coherent.js/state
 */

// ============================================================================
// Reactive State
// ============================================================================

/** Called with the new and previous value; `unwatch` stops further calls. */
export type Watcher<T = unknown> = (
  newValue: T,
  oldValue: T | undefined,
  unwatch: () => void
) => void;

export interface ObservableOptions {
  /** Notify even when the new value is `===` the old one; defaults to `true` */
  deep?: boolean;
  /** Invoke watchers on subscribe; defaults to `true` */
  immediate?: boolean;
  [option: string]: unknown;
}

/**
 * A single reactive value.
 *
 * Read and write through the `value` accessor — assigning notifies watchers
 * and invalidates any computed that read it.
 *
 * ```ts
 * const count = observable(0);
 * count.watch(next => console.log(next));
 * count.value = 1;
 * ```
 */
export class Observable<T = unknown> {
  constructor(value: T, options?: ObservableOptions);

  /** The current value; assigning notifies watchers */
  get value(): T;
  set value(newValue: T);

  /** Subscribe to changes; returns an unwatch function */
  watch(callback: Watcher<T>, options?: { immediate?: boolean }): () => void;

  /** Remove one observer */
  unwatch(observer: (newValue: T, oldValue: T | undefined) => void): void;

  /** Remove every observer and computed dependent */
  unwatchAll(): void;
}

/** Raised by the reactive primitives. */
export class StateError extends Error {
  constructor(message: string, options?: Record<string, unknown>);
}

/** Sink for errors thrown inside watchers and computed getters. */
export const globalErrorHandler: {
  handle(error: unknown, context?: Record<string, unknown>): void;
};

export interface ReactiveStateOptions extends ObservableOptions {
  /** Run registered middleware on `set()` */
  enableMiddleware?: boolean;
  /** Record mutations so `undo()` and `getHistory()` work */
  enableHistory?: boolean;
  /** Cap on retained history entries */
  maxHistorySize?: number;
}

/** What `set` middleware may return to alter or veto a write. */
export interface MiddlewareResult {
  cancelled?: boolean;
  value?: unknown;
}

/** Payload handed to a `subscribe()` listener. */
export interface StateChange<T = unknown> {
  key: string;
  newValue: T;
  oldValue: T | undefined;
  state: Record<string, unknown>;
}

/** One recorded mutation. */
export interface HistoryEntry {
  action: 'set' | 'delete' | 'clear' | 'batch';
  key: string | null;
  oldValue: unknown;
  newValue: unknown;
  timestamp?: number;
}

/**
 * A keyed collection of observables, with computed properties, watchers,
 * middleware and optional undo history.
 *
 * ```ts
 * const state = createReactiveState({ count: 0 });
 * state.computed('doubled', () => state.get('count') * 2);
 * state.watch('count', next => console.log(next));
 * state.set('count', 1);
 * ```
 */
export class ReactiveState {
  constructor(initialState?: Record<string, unknown>, options?: ReactiveStateOptions);

  /** Current value of a key, or `undefined` */
  get<T = unknown>(key: string): T | undefined;

  /** Write a key; `false` when middleware cancelled the write */
  set(key: string, value: unknown, options?: ReactiveStateOptions): boolean;

  /** Whether the key exists */
  has(key: string): boolean;

  /** Drop a key and its watchers; `false` when it was absent */
  delete(key: string): boolean;

  /** Drop every key */
  clear(): void;

  /** Define a computed property derived from other keys */
  computed(key: string, getter: () => unknown, options?: ObservableOptions): void;

  /** Current value of a computed property, or `undefined` */
  getComputed<T = unknown>(key: string): T | undefined;

  /**
   * Watch one key, or a getter expression. Returns an unwatch function, and
   * throws {@link StateError} for a key that does not exist.
   */
  watch<T = unknown>(
    key: string | (() => T),
    callback: Watcher<T>,
    options?: { immediate?: boolean }
  ): () => void;

  /** Apply several writes with history suppressed until the batch ends */
  batch<T>(updates: ((state: this) => T) | Record<string, unknown>): T | undefined;

  /** Subscribe to one or more keys; returns an unsubscribe function */
  subscribe(
    keys: string | string[],
    callback: (change: StateChange) => void,
    options?: { immediate?: boolean }
  ): () => void;

  /** Register middleware consulted on every `set()` */
  use(middleware: (action: string, context: Record<string, unknown>) => MiddlewareResult | void): void;

  /** Most recent mutations, newest first */
  getHistory(limit?: number): HistoryEntry[];

  /** Revert the most recent mutation; `false` when history is empty */
  undo(): boolean;

  /** Snapshot every key as a plain object */
  toObject(): Record<string, unknown>;

  /** Snapshot every computed property as a plain object */
  getComputedValues(): Record<string, unknown>;

  /** Counts of keys, computeds, watchers, history entries and middleware */
  getStats(): {
    stateKeys: number;
    computedKeys: number;
    watcherKeys: number;
    historyLength: number;
    middlewareCount: number;
  };

  /** Release every watcher and drop all state */
  destroy(): void;
}

/** Create a {@link ReactiveState}. */
export function createReactiveState(
  initialState?: Record<string, unknown>,
  options?: ReactiveStateOptions
): ReactiveState;

/** Create an {@link Observable}. */
export function observable<T = unknown>(value: T, options?: ObservableOptions): Observable<T>;

/**
 * Create a read-only observable derived from other observables. Dependencies
 * are tracked automatically; assigning to `value` throws {@link StateError}.
 */
export function computed<T = unknown>(
  getter: () => T,
  options?: ObservableOptions
): Observable<T>;

/** An observable with a `toggle()` helper. */
export type ToggleObservable = Observable<boolean> & { toggle(): void };

/** An observable with counter helpers. */
export type CounterObservable = Observable<number> & {
  increment(by?: number): void;
  decrement(by?: number): void;
  reset(): void;
};

/** An observable with immutable array helpers. */
export type ArrayObservable<T = unknown> = Observable<T[]> & {
  push(...items: T[]): void;
  pop(): T | undefined;
  filter(predicate: (item: T, index: number, array: T[]) => boolean): void;
  clear(): void;
};

/** Observable factories for common shapes. */
export const stateUtils: {
  /** A boolean observable that can flip itself */
  toggle(initialValue?: boolean): ToggleObservable;
  /** A numeric observable with increment/decrement/reset */
  counter(initialValue?: number): CounterObservable;
  /** An array observable whose helpers replace rather than mutate */
  array<T = unknown>(initialArray?: T[]): ArrayObservable<T>;
  /** A deeply reactive state container, not an observable */
  object(initialObject?: Record<string, unknown>): ReactiveState;
};

// ============================================================================
// SSR State Manager
// ============================================================================

/** A per-render key/value store. */
export interface StateContainer {
  get<T = unknown>(key: string): T | undefined;
  /** Chainable */
  set(key: string, value: unknown): StateContainer;
  has(key: string): boolean;
  /** `false` when the key was absent */
  delete(key: string): boolean;
  /** Chainable */
  clear(): StateContainer;
  /** Snapshot as a plain object */
  toObject(): Record<string, unknown>;
}

/**
 * Create a state container scoped to one request or render.
 */
export function createState(initialState?: Record<string, unknown>): StateContainer;

/**
 * Process-wide store shared across renders. Prefer
 * {@link StateContainer | request state} for anything request-specific.
 */
export const globalStateManager: {
  set(key: string, value: unknown): void;
  get<T = unknown>(key: string): T | undefined;
  has(key: string): boolean;
  clear(): void;
  /** A fresh container isolated from the global store */
  createRequestState(): StateContainer;
};

// ============================================================================
// Context API
// ============================================================================

/**
 * Push a context value, remembering the previous one so
 * {@link restoreContext} can unwind it.
 */
export function provideContext(key: string, value: unknown): void;

/**
 * Wrap children in a context. The returned function provides the context,
 * renders, then restores the previous value.
 */
export function createContextProvider<C = unknown, R = unknown>(
  key: string,
  value: unknown,
  children: C
): (renderFunction?: (children: C) => R) => R | C;

/** Pop one context value, restoring what {@link provideContext} replaced. */
export function restoreContext(key: string): void;

/**
 * Unwind every tracked context to the value it held before its first
 * `provideContext()`. Call between renders so one request's contexts do not
 * leak into the next.
 */
export function clearAllContexts(): void;

/** Read the current context value, or `undefined`. */
export function useContext<T = unknown>(key: string): T | undefined;

// ============================================================================
// Persistent State
// ============================================================================

/** Where persistent state is written. */
export type StorageKind = 'localStorage' | 'sessionStorage' | 'indexedDB' | 'memory';

/** Storage backend contract. */
export interface PersistenceAdapter {
  get(key: string): Promise<string | null> | string | null;
  set(key: string, value: string): Promise<boolean> | boolean;
  remove(key: string): Promise<boolean> | boolean;
  clear(): Promise<boolean> | boolean;
}

export interface PersistentStateOptions {
  /** Backend; defaults to `'localStorage'` */
  storage?: StorageKind;
  /** Storage key; defaults to `'coherent-state'` */
  key?: string;
  /** Coalesce writes; defaults to `true` */
  debounce?: boolean;
  /** Debounce window in ms; defaults to `300` */
  debounceDelay?: number;
  serialize?: (state: Record<string, unknown>) => string;
  deserialize?: (data: string) => Record<string, unknown>;
  /** Persist only these keys */
  include?: string[] | null;
  /** Persist everything except these keys */
  exclude?: string[] | null;
  /** Obfuscate the payload with `encryptionKey` */
  encrypt?: boolean;
  encryptionKey?: string | null;
  onSave?: ((state: Record<string, unknown>) => void) | null;
  onLoad?: ((state: Record<string, unknown>) => void) | null;
  onError?: ((error: unknown) => void) | null;
  /** Tag stored payloads with `version` and run `migrate` on mismatch */
  versioning?: boolean;
  version?: string;
  migrate?: ((state: Record<string, unknown>, from: string) => Record<string, unknown>) | null;
  /** Discard stored state older than this many ms */
  ttl?: number | null;
  /** Mirror updates to other tabs over BroadcastChannel */
  crossTab?: boolean;
}

/** A state container backed by storage. */
export interface PersistentState {
  /** One key, or a copy of the whole state */
  getState<T = unknown>(key: string): T | undefined;
  getState(): Record<string, unknown>;
  /** Merge updates, persisting unless `persist` is `false` */
  setState(
    updates:
      | Record<string, unknown>
      | ((state: Record<string, unknown>) => Record<string, unknown>),
    persist?: boolean
  ): void;
  /** Restore the initial values */
  resetState(persist?: boolean): void;
  /** Subscribe to changes; returns an unsubscribe function */
  subscribe(
    listener: (state: Record<string, unknown>, oldState: Record<string, unknown>) => void
  ): () => void;
  /** Force an immediate write */
  persist(): Promise<void>;
  /** Reload from storage; `false` when nothing was stored */
  restore(): Promise<boolean>;
  /** Remove the stored payload */
  clearStorage(): Promise<void>;
  load(): Promise<Record<string, unknown> | null>;
  save(): Promise<void>;
  readonly adapter: PersistenceAdapter;
}

/**
 * Create a state container that persists to storage. Unless the backend is
 * `'memory'`, stored state is restored on creation.
 */
export function createPersistentState(
  initialState?: Record<string, unknown>,
  options?: PersistentStateOptions
): PersistentState;

/** {@link createPersistentState} backed by localStorage. */
export function withLocalStorage(
  initialState?: Record<string, unknown>,
  key?: string,
  options?: PersistentStateOptions
): PersistentState;

/** {@link createPersistentState} backed by sessionStorage. */
export function withSessionStorage(
  initialState?: Record<string, unknown>,
  key?: string,
  options?: PersistentStateOptions
): PersistentState;

/** {@link createPersistentState} backed by IndexedDB. */
export function withIndexedDB(
  initialState?: Record<string, unknown>,
  key?: string,
  options?: PersistentStateOptions
): PersistentState;

// ============================================================================
// Validated State
// ============================================================================

/** JSON-Schema-style constraints. */
export interface StateSchema {
  type?: 'string' | 'number' | 'integer' | 'boolean' | 'array' | 'object' | 'null';
  properties?: Record<string, StateSchema>;
  required?: string[];
  enum?: unknown[];
  minLength?: number;
  maxLength?: number;
  pattern?: string;
  format?: 'email' | 'url' | 'uuid' | 'date' | 'date-time' | (string & {});
  minimum?: number;
  maximum?: number;
  exclusiveMinimum?: number;
  exclusiveMaximum?: number;
  multipleOf?: number;
  items?: StateSchema;
  minItems?: number;
  maxItems?: number;
  uniqueItems?: boolean;
  /** Custom check run after the built-in constraints */
  validate?: (value: unknown) => boolean | string;
  [keyword: string]: unknown;
}

/** One validation failure. */
export interface ValidationError {
  path: string;
  message: string;
  [detail: string]: unknown;
}

export interface ValidationResult {
  valid: boolean;
  errors: ValidationError[];
  /** The value after coercion, when `coerce` is set */
  value?: unknown;
}

/** Returns `true` when valid, or a message describing the failure. */
export type Validator<T = unknown> = (value: T) => boolean | string;

export interface ValidatedStateOptions {
  /** Schema applied to the whole state, and per key via `properties` */
  schema?: StateSchema | null;
  /** Extra per-key validators */
  validators?: Record<string, Validator | Validator[]>;
  /** Reject writes that fail validation */
  strict?: boolean;
  /** Convert values to the declared type where possible */
  coerce?: boolean;
  onError?: ((errors: ValidationError[]) => void) | null;
  /** Validate on write; defaults to `true` */
  validateOnSet?: boolean;
  /** Validate on read; defaults to `false` */
  validateOnGet?: boolean;
  required?: string[];
  /** Permit keys the schema does not mention; defaults to `true` */
  allowUnknown?: boolean;
}

/** A state container that validates writes. */
export interface ValidatedState {
  getState<T = unknown>(key: string): T | undefined;
  getState(): Record<string, unknown>;
  setState(
    updates:
      | Record<string, unknown>
      | ((state: Record<string, unknown>) => Record<string, unknown>)
  ): void;
  /** Subscribe to changes; returns an unsubscribe function */
  subscribe(
    listener: (state: Record<string, unknown>, oldState: Record<string, unknown>) => void
  ): () => void;
  /** Current errors, keyed by path */
  getErrors(): Record<string, ValidationError[]>;
  isValid(): boolean;
  /** Validate one key */
  validateField(key: string, value: unknown): ValidationResult;
  /** Validate the whole state */
  validate(): ValidationResult;
}

/** Create a {@link ValidatedState}. */
export function createValidatedState(
  initialState?: Record<string, unknown>,
  options?: ValidatedStateOptions
): ValidatedState;

/** Ready-made validators, some of them parameterized factories. */
export const validators: {
  email: Validator<unknown>;
  url: Validator<unknown>;
  required: Validator<unknown>;
  range(min: number, max: number): Validator<unknown>;
  length(min: number, max: number): Validator<unknown>;
  pattern(pattern: RegExp | string): Validator<unknown>;
};

// ============================================================================
// State Patterns
// ============================================================================

/** Form values, errors and submission flags in one container. */
export class FormState<T extends Record<string, unknown> = Record<string, unknown>> {
  constructor(initialValues?: T, options?: ReactiveStateOptions);

  setValue<K extends keyof T & string>(field: K, value: T[K]): void;
  getValue<K extends keyof T & string>(field: K): T[K];
  setError(field: keyof T & string, error: string | null): void;
  /** Register a check run whenever the field changes */
  addValidator(field: keyof T & string, validator: Validator): void;
  /** Run every validator; `true` when all pass */
  validateAll(): boolean;
  /** Restore the initial values and drop errors */
  reset(): void;

  watchValues(callback: Watcher<T>): () => void;
  watchErrors(callback: Watcher<Record<string, string>>): () => void;
  watchSubmitting(callback: Watcher<boolean>): () => void;
}

export interface ListStateOptions extends ReactiveStateOptions {
  /** Items per page; defaults to `10` */
  pageSize?: number;
}

/** A list with filtering, sorting and pagination. */
export class ListState<T = unknown> {
  constructor(initialItems?: T[], options?: ListStateOptions);

  addItem(item: T): void;
  /** Remove by index, or by the first item matching a predicate */
  removeItem(indexOrPredicate: number | ((item: T) => boolean)): void;
  updateItem(indexOrPredicate: number | ((item: T) => boolean), updates: Partial<T>): void;
  filter(filters: Record<string, unknown>): void;
  sort(sortBy: string, order?: 'asc' | 'desc'): void;
  setPage(page: number): void;

  watchItems(callback: Watcher<T[]>): () => void;
  watchLoading(callback: Watcher<boolean>): () => void;
}

/** A modal whose `open()` resolves with whatever `close()` is passed. */
export class ModalState<D = unknown, R = unknown> {
  constructor(initialState?: Record<string, unknown>);

  /** Open with data; resolves once closed */
  open(data?: D): Promise<R | null>;
  /** Close, resolving the pending `open()` */
  close(result?: R | null): void;
  setLoading(loading: boolean): void;
  setError(error: unknown): void;

  watchOpen(callback: Watcher<boolean>): () => void;
  watchData(callback: Watcher<D | null>): () => void;
}

/** Client-side route, params and history. */
export class RouterState {
  constructor(initialRoute?: string, options?: ReactiveStateOptions);

  addRoute(path: string, handler: unknown): void;
  navigate(path: string, params?: Record<string, unknown>, query?: Record<string, unknown>): void;
  back(): void;
  forward(): void;

  watchRoute(callback: Watcher<string>): () => void;
  watchParams(callback: Watcher<Record<string, unknown>>): () => void;
}

/** Create a {@link FormState}. */
export function createFormState<T extends Record<string, unknown> = Record<string, unknown>>(
  initialValues?: T,
  options?: ReactiveStateOptions
): FormState<T>;

/** Create a {@link ListState}. */
export function createListState<T = unknown>(
  initialItems?: T[],
  options?: ListStateOptions
): ListState<T>;

/** Create a {@link ModalState}. */
export function createModalState<D = unknown, R = unknown>(
  initialState?: Record<string, unknown>
): ModalState<D, R>;

/** Create a {@link RouterState}. */
export function createRouterState(
  initialRoute?: string,
  options?: ReactiveStateOptions
): RouterState;
