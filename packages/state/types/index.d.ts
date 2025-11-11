/**
 * Coherent.js State Management TypeScript Definitions
 * @module @coherent.js/state
 */

// ===== Reactive State Types =====

export interface Observer<T = any> {
  (value: T, oldValue: T): void;
}

export class Observable<T = any> {
  constructor(initialValue: T);
  get(): T;
  set(value: T): void;
  subscribe(observer: Observer<T>): () => void;
  unsubscribe(observer: Observer<T>): void;
  notify(): void;
}

export interface ReactiveStateOptions<T = any> {
  initialValue: T;
  computed?: Record<string, (state: T) => any>;
  watchers?: Record<string, Observer<any>>;
  middleware?: Array<(state: T, action: string, payload?: any) => T | void>;
}

export class ReactiveState<T = any> {
  constructor(options: ReactiveStateOptions<T>);
  get<K extends keyof T>(key: K): T[K];
  set<K extends keyof T>(key: K, value: T[K]): void;
  update(partial: Partial<T>): void;
  subscribe(observer: Observer<T>): () => void;
  watch<K extends keyof T>(key: K, observer: Observer<T[K]>): () => void;
  getState(): T;
  reset(): void;
}

export function createReactiveState<T = any>(options: ReactiveStateOptions<T>): ReactiveState<T>;
export function observable<T = any>(initialValue: T): Observable<T>;
export function computed<T = any>(fn: () => T, dependencies: Observable<any>[]): Observable<T>;

export const stateUtils: {
  batch<T>(fn: () => T): T;
  transaction<T>(fn: () => T): T;
  freeze<T>(state: T): Readonly<T>;
  clone<T>(state: T): T;
};

// ===== SSR-Compatible State Manager Types =====

export interface StateManagerOptions<T = any> {
  initialState?: T;
  persist?: boolean;
  key?: string;
  middleware?: Array<(state: T, action: string) => T | void>;
}

export interface State<T = any> {
  get(): T;
  set(value: T): void;
  update(partial: Partial<T>): void;
  subscribe(listener: (state: T) => void): () => void;
  reset(): void;
}

export function createState<T = any>(initialState: T, options?: StateManagerOptions<T>): State<T>;

export const globalStateManager: {
  getState<T = any>(key: string): T | undefined;
  setState<T = any>(key: string, value: T): void;
  subscribe<T = any>(key: string, listener: (state: T) => void): () => void;
  clear(key?: string): void;
};

// ===== Context API Types =====

export interface ContextValue<T = any> {
  value: T;
  subscribers: Set<(value: T) => void>;
}

export function provideContext<T = any>(key: string, value: T): void;
export function createContextProvider<T = any>(key: string, value: T): { key: string; value: T };
export function useContext<T = any>(key: string, defaultValue?: T): T;
export function restoreContext(contexts: Record<string, any>): void;
export function clearAllContexts(): void;

// ===== Persistent State Types =====

export interface PersistenceAdapter {
  getItem(key: string): Promise<string | null> | string | null;
  setItem(key: string, value: string): Promise<void> | void;
  removeItem(key: string): Promise<void> | void;
}

export interface PersistentStateOptions<T = any> extends StateManagerOptions<T> {
  key: string;
  storage?: PersistenceAdapter;
  serialize?: (state: T) => string;
  deserialize?: (data: string) => T;
  debounce?: number;
}

export function createPersistentState<T = any>(options: PersistentStateOptions<T>): State<T>;
export function withLocalStorage<T = any>(state: State<T>, key: string): State<T>;
export function withSessionStorage<T = any>(state: State<T>, key: string): State<T>;
export function withIndexedDB<T = any>(state: State<T>, key: string, dbName?: string): Promise<State<T>>;

// ===== Validated State Types =====

export interface ValidationRule<T = any> {
  (value: T): boolean | string;
}

export interface ValidatedStateOptions<T = any> extends StateManagerOptions<T> {
  validators: Record<keyof T, ValidationRule<T[keyof T]>[]>;
  validateOnChange?: boolean;
  strict?: boolean;
}

export interface ValidatedState<T = any> extends State<T> {
  validate(): { valid: boolean; errors: Record<keyof T, string[]> };
  isValid(): boolean;
  getErrors(): Record<keyof T, string[]>;
}

export function createValidatedState<T = any>(options: ValidatedStateOptions<T>): ValidatedState<T>;

export const validators: {
  required(message?: string): ValidationRule;
  minLength(length: number, message?: string): ValidationRule;
  maxLength(length: number, message?: string): ValidationRule;
  min(value: number, message?: string): ValidationRule;
  max(value: number, message?: string): ValidationRule;
  pattern(regex: RegExp, message?: string): ValidationRule;
  email(message?: string): ValidationRule;
  url(message?: string): ValidationRule;
  custom(fn: (value: any) => boolean | string): ValidationRule;
};
