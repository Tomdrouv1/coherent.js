/**
 * Coherent.js State Management TypeScript Definitions
 * @module @coherent.js/state
 */

import type { CoherentNode, ComponentState } from '@coherent.js/core';

// ============================================================================
// Core Store Types
// ============================================================================

/**
 * Typed state store with subscribe and update capabilities
 * @template T - The shape of the state object
 */
export interface Store<T extends Record<string, unknown> = Record<string, unknown>> {
  /**
   * Get the current state
   */
  getState(): T;

  /**
   * Update state with partial object or updater function
   */
  setState(partial: Partial<T> | ((state: T) => Partial<T>)): void;

  /**
   * Subscribe to state changes
   * @returns Unsubscribe function
   */
  subscribe(listener: (state: T, prevState: T) => void): () => void;

  /**
   * Destroy the store and clean up subscriptions
   */
  destroy(): void;
}

/**
 * Store creation options
 * @template T - The shape of the state object
 */
export interface StoreOptions<T extends Record<string, unknown> = Record<string, unknown>> {
  /** Initial state */
  initialState: T;
  /** Persistence configuration */
  persist?: {
    /** Storage key */
    key: string;
    /** Storage adapter (localStorage, sessionStorage, or custom) */
    storage?: Storage;
    /** Custom serialization */
    serialize?: (state: T) => string;
    /** Custom deserialization */
    deserialize?: (value: string) => T;
    /** Debounce persistence writes (ms) */
    debounce?: number;
  };
  /** Enable devtools integration */
  devtools?: boolean;
  /** Store name for debugging */
  name?: string;
  /** Middleware functions */
  middleware?: Array<StoreMiddleware<T>>;
}

/**
 * Store middleware function
 */
export type StoreMiddleware<T> = (
  state: T,
  action: string,
  payload?: unknown
) => T | void;

/**
 * Create a typed state store
 */
export function createStore<T extends Record<string, unknown>>(
  options: StoreOptions<T>
): Store<T>;

// ============================================================================
// Selector Types
// ============================================================================

/**
 * Create a derived selector from store state
 * @template T - Store state type
 * @template R - Return type of selector
 */
export function createSelector<T extends Record<string, unknown>, R>(
  store: Store<T>,
  selector: (state: T) => R
): () => R;

/**
 * Create a memoized selector with dependencies
 */
export function createMemoizedSelector<T extends Record<string, unknown>, D extends unknown[], R>(
  store: Store<T>,
  dependencies: (...args: D) => unknown[],
  selector: (state: T, ...deps: D) => R
): (...args: D) => R;

// ============================================================================
// Action Types
// ============================================================================

/**
 * Action type helper for type-safe actions
 * @template T - Store state type
 * @template P - Payload type (void for no payload)
 */
export type Action<T, P = void> = P extends void
  ? () => Partial<T>
  : (payload: P) => Partial<T>;

/**
 * Create typed action creators
 */
export function createActions<
  T extends Record<string, unknown>,
  A extends Record<string, Action<T, unknown>>
>(
  store: Store<T>,
  actions: A
): {
  [K in keyof A]: A[K] extends Action<T, infer P>
    ? P extends void
      ? () => void
      : (payload: P) => void
    : never;
};

// ============================================================================
// Reactive State Types
// ============================================================================

/**
 * Observer callback type
 */
export interface Observer<T = unknown> {
  (value: T, oldValue: T): void;
}

/**
 * Observable value wrapper
 */
export class Observable<T = unknown> {
  constructor(initialValue: T);

  /** Get current value */
  get(): T;

  /** Set new value */
  set(value: T): void;

  /** Subscribe to changes */
  subscribe(observer: Observer<T>): () => void;

  /** Unsubscribe observer */
  unsubscribe(observer: Observer<T>): void;

  /** Notify all observers */
  notify(): void;
}

/**
 * Reactive state options
 */
export interface ReactiveStateOptions<T = unknown> {
  /** Initial state value */
  initialValue: T;
  /** Computed properties */
  computed?: Record<string, (state: T) => unknown>;
  /** Property watchers */
  watchers?: Record<string, Observer<unknown>>;
  /** Middleware functions */
  middleware?: Array<(state: T, action: string, payload?: unknown) => T | void>;
}

/**
 * Reactive state class with computed properties and watchers
 */
export class ReactiveState<T extends Record<string, unknown> = Record<string, unknown>> {
  constructor(options: ReactiveStateOptions<T>);

  /** Get a property value */
  get<K extends keyof T>(key: K): T[K];

  /** Set a property value */
  set<K extends keyof T>(key: K, value: T[K]): void;

  /** Update multiple properties */
  update(partial: Partial<T>): void;

  /** Subscribe to all changes */
  subscribe(observer: Observer<T>): () => void;

  /** Watch a specific property */
  watch<K extends keyof T>(key: K, observer: Observer<T[K]>): () => void;

  /** Get full state */
  getState(): T;

  /** Reset to initial state */
  reset(): void;
}

/**
 * Create a reactive state instance
 */
export function createReactiveState<T extends Record<string, unknown> = Record<string, unknown>>(
  options: ReactiveStateOptions<T>
): ReactiveState<T>;

/**
 * Create a simple observable value
 */
export function observable<T = unknown>(initialValue: T): Observable<T>;

/**
 * Create a computed observable
 */
export function computed<T = unknown>(
  fn: () => T,
  dependencies: Observable<unknown>[]
): Observable<T>;

/**
 * State utility functions
 */
export const stateUtils: {
  /** Batch multiple state updates */
  batch<T>(fn: () => T): T;
  /** Run updates in a transaction */
  transaction<T>(fn: () => T): T;
  /** Freeze state (make immutable) */
  freeze<T>(state: T): Readonly<T>;
  /** Deep clone state */
  clone<T>(state: T): T;
};

// ============================================================================
// SSR-Compatible State Manager
// ============================================================================

/**
 * State manager options
 */
export interface StateManagerOptions<T = unknown> {
  /** Initial state */
  initialState?: T;
  /** Enable persistence */
  persist?: boolean;
  /** Persistence key */
  key?: string;
  /** Middleware functions */
  middleware?: Array<(state: T, action: string) => T | void>;
}

/**
 * Simple state interface
 */
export interface State<T = unknown> {
  /** Get current state */
  get(): T;
  /** Set new state */
  set(value: T): void;
  /** Update with partial */
  update(partial: Partial<T>): void;
  /** Subscribe to changes */
  subscribe(listener: (state: T) => void): () => void;
  /** Reset to initial state */
  reset(): void;
}

/**
 * Create a simple state container
 */
export function createState<T = unknown>(
  initialState: T,
  options?: StateManagerOptions<T>
): State<T>;

/**
 * Global state manager for SSR
 */
export const globalStateManager: {
  /** Get state by key */
  getState<T = unknown>(key: string): T | undefined;
  /** Set state by key */
  setState<T = unknown>(key: string, value: T): void;
  /** Subscribe to state key */
  subscribe<T = unknown>(key: string, listener: (state: T) => void): () => void;
  /** Clear state (optionally by key) */
  clear(key?: string): void;
};

// ============================================================================
// Context API
// ============================================================================

/**
 * Context value wrapper
 */
export interface ContextValue<T = unknown> {
  value: T;
  subscribers: Set<(value: T) => void>;
}

/**
 * Provide a context value
 */
export function provideContext<T = unknown>(key: string, value: T): void;

/**
 * Create a context provider
 */
export function createContextProvider<T = unknown>(
  key: string,
  value: T
): { key: string; value: T };

/**
 * Use/consume a context value
 */
export function useContext<T = unknown>(key: string, defaultValue?: T): T;

/**
 * Restore context from saved state
 */
export function restoreContext(contexts: Record<string, unknown>): void;

/**
 * Clear all context stacks
 */
export function clearAllContexts(): void;

// ============================================================================
// Persistent State
// ============================================================================

/**
 * Persistence adapter interface
 */
export interface PersistenceAdapter {
  /** Get item from storage */
  getItem(key: string): Promise<string | null> | string | null;
  /** Set item in storage */
  setItem(key: string, value: string): Promise<void> | void;
  /** Remove item from storage */
  removeItem(key: string): Promise<void> | void;
}

/**
 * Persistent state options
 */
export interface PersistentStateOptions<T = unknown> extends StateManagerOptions<T> {
  /** Required: storage key */
  key: string;
  /** Storage adapter */
  storage?: PersistenceAdapter;
  /** Custom serialization */
  serialize?: (state: T) => string;
  /** Custom deserialization */
  deserialize?: (data: string) => T;
  /** Debounce writes (ms) */
  debounce?: number;
}

/**
 * Create a persistent state
 */
export function createPersistentState<T = unknown>(
  options: PersistentStateOptions<T>
): State<T>;

/**
 * Wrap state with localStorage persistence
 */
export function withLocalStorage<T = unknown>(state: State<T>, key: string): State<T>;

/**
 * Wrap state with sessionStorage persistence
 */
export function withSessionStorage<T = unknown>(state: State<T>, key: string): State<T>;

/**
 * Wrap state with IndexedDB persistence
 */
export function withIndexedDB<T = unknown>(
  state: State<T>,
  key: string,
  dbName?: string
): Promise<State<T>>;

// ============================================================================
// Validated State
// ============================================================================

/**
 * Validation rule function
 */
export interface ValidationRule<T = unknown> {
  (value: T): boolean | string;
}

/**
 * Validated state options
 */
export interface ValidatedStateOptions<T extends Record<string, unknown> = Record<string, unknown>>
  extends StateManagerOptions<T> {
  /** Validation rules by property */
  validators: { [K in keyof T]?: ValidationRule<T[K]>[] };
  /** Validate on every change */
  validateOnChange?: boolean;
  /** Throw on validation failure */
  strict?: boolean;
}

/**
 * Validated state interface
 */
export interface ValidatedState<T extends Record<string, unknown> = Record<string, unknown>>
  extends State<T> {
  /** Validate current state */
  validate(): { valid: boolean; errors: { [K in keyof T]?: string[] } };
  /** Check if state is valid */
  isValid(): boolean;
  /** Get validation errors */
  getErrors(): { [K in keyof T]?: string[] };
}

/**
 * Create a validated state
 */
export function createValidatedState<T extends Record<string, unknown> = Record<string, unknown>>(
  options: ValidatedStateOptions<T>
): ValidatedState<T>;

/**
 * Built-in validators
 */
export const validators: {
  /** Required value */
  required(message?: string): ValidationRule;
  /** Minimum length */
  minLength(length: number, message?: string): ValidationRule;
  /** Maximum length */
  maxLength(length: number, message?: string): ValidationRule;
  /** Minimum value */
  min(value: number, message?: string): ValidationRule;
  /** Maximum value */
  max(value: number, message?: string): ValidationRule;
  /** Pattern matching */
  pattern(regex: RegExp, message?: string): ValidationRule;
  /** Email format */
  email(message?: string): ValidationRule;
  /** URL format */
  url(message?: string): ValidationRule;
  /** Custom validator */
  custom(fn: (value: unknown) => boolean | string): ValidationRule;
};
