/**
 * Reactive State Management System for Coherent.js
 * Provides computed properties, watchers, and reactive updates
 *
 * Design:
 *
 * - Reading an Observable or Computed inside a computed getter records it as a
 *   dependency. A Computed recomputes lazily, on read, and only when a
 *   dependency actually changed (version check).
 * - A Computed that is watched, or that a watched Computed depends on, is
 *   "live": it subscribes to its dependencies so a change marks it dirty and
 *   schedules its watchers. When it stops being watched it unsubscribes, so
 *   nothing keeps a discarded computed reachable.
 * - Watchers do not run inside the setter: changes are queued and flushed in
 *   a loop once the outermost batch() ends (every write outside a batch is its
 *   own batch). A watcher that writes queues further work instead of
 *   recursing; a loop that never settles is stopped and reported.
 * - Each watcher runs in isolation: an error is reported through the
 *   `onError` option, or `globalErrorHandler`, and the other watchers still run.
 * - Reading a computed that (indirectly) reads itself throws a StateError.
 */

// Simple error handling for this module
export class StateError extends Error {
    constructor(message, options = {}) {
        super(message);
        this.name = 'StateError';
        this.type = options.type || 'state';
        this.component = options.component;
        this.context = options.context;
        this.timestamp = Date.now();
    }
}

export const globalErrorHandler = {
    handle(error, context = {}) {
        console.error('State Error:', error.message, context);
    }
};

/** Flush iterations after which a watcher loop is considered runaway. */
const MAX_FLUSH_ITERATIONS = 100;

/** The computed currently collecting dependencies. */
let activeComputed = null;
/** Nesting depth of batch(). */
let batchDepth = 0;
/** Whether the notification queue is being flushed. */
let flushing = false;
/** Observables with watchers that changed: observable -> value before the change. */
const pendingObservables = new Map();
/** Watched computeds whose dependencies changed. */
const pendingComputeds = new Set();
/** Bumped on every write, so an unobserved computed can skip validation. */
let globalVersion = 0;

function reportError(source, error, type, context = {}) {
    const onError = source?._options?.onError;
    if (typeof onError === 'function') {
        try {
            onError(error, { type, ...context });
            return;
        } catch (handlerError) {
            error = handlerError;
        }
    }
    globalErrorHandler.handle(error, { type, context });
}

function runObserver(source, observer, newValue, oldValue) {
    try {
        observer.callback(newValue, oldValue, observer.unwatch);
    } catch (error) {
        reportError(source, error, 'watcher-error', { newValue, oldValue });
    }
}

function flush() {
    flushing = true;
    let iterations = 0;

    try {
        while (pendingObservables.size > 0 || pendingComputeds.size > 0) {
            if (++iterations > MAX_FLUSH_ITERATIONS) {
                const culprits = [...pendingObservables.keys(), ...pendingComputeds];
                pendingObservables.clear();
                pendingComputeds.clear();
                reportError(
                    culprits[0],
                    new StateError(
                        `Watchers kept changing state after ${MAX_FLUSH_ITERATIONS} rounds; ` +
                        'a watcher probably writes a new value to a state it (indirectly) watches.',
                        { type: 'update-depth' }
                    ),
                    'update-depth'
                );
                return;
            }

            const observables = [...pendingObservables];
            pendingObservables.clear();
            for (const [source, oldValue] of observables) {
                const newValue = source._value;
                // Changed and changed back within one batch
                if (!source._changed(oldValue, newValue)) continue;
                for (const observer of [...source._observers]) {
                    if (source._observers.has(observer)) {
                        runObserver(source, observer, newValue, oldValue);
                    }
                }
            }

            const computeds = [...pendingComputeds];
            pendingComputeds.clear();
            for (const source of computeds) {
                if (source._observers.size === 0) continue;
                try {
                    source._refresh();
                } catch (error) {
                    reportError(source, error, 'computed-error');
                    continue;
                }
                const newValue = source._value;
                const oldValue = source._lastNotified;
                if (Object.is(newValue, oldValue)) continue;
                source._lastNotified = newValue;
                for (const observer of [...source._observers]) {
                    if (source._observers.has(observer)) {
                        runObserver(source, observer, newValue, oldValue);
                    }
                }
            }
        }
    } finally {
        flushing = false;
    }
}

function scheduleFlush() {
    if (batchDepth === 0 && !flushing) {
        flush();
    }
}

/**
 * Run `fn` with watcher notifications deferred until it returns; every
 * watcher then runs once, with the final value. Nested batches flush when the
 * outermost one ends. `fn` must be synchronous.
 *
 * @template T
 * @param {() => T} fn
 * @returns {T}
 */
export function batch(fn) {
    batchDepth++;
    try {
        return fn();
    } finally {
        batchDepth--;
        scheduleFlush();
    }
}

/**
 * Observable wrapper for tracking state changes
 */
export class Observable {
    constructor(value, options = {}) {
        this._value = value;
        this._version = 0;
        /** @type {Set<{callback: Function, unwatch: Function}>} */
        this._observers = new Set();
        /** Live computeds depending on this value */
        this._subscribers = new Set();
        this._options = {
            deep: options.deep !== false,
            immediate: options.immediate !== false,
            ...options
        };
    }

    get value() {
        activeComputed?._track(this);
        return this._value;
    }

    set value(newValue) {
        this._write(newValue);
    }

    /** Read without registering a dependency. */
    peek() {
        return this._value;
    }

    /**
     * Whether a write from `oldValue` to `newValue` is a change. Identical
     * primitives never are; with `deep` (the default) re-assigning the same
     * object is, since it may have been mutated in place.
     * @private
     */
    _changed(oldValue, newValue) {
        if (!Object.is(oldValue, newValue)) return true;
        return this._options.deep && newValue !== null && typeof newValue === 'object';
    }

    /** @private */
    _write(newValue) {
        const oldValue = this._value;
        if (!this._changed(oldValue, newValue)) {
            return;
        }

        this._value = newValue;
        this._version++;
        globalVersion++;

        for (const subscriber of [...this._subscribers]) {
            subscriber._markDirty();
        }
        if (this._observers.size > 0 && !pendingObservables.has(this)) {
            pendingObservables.set(this, oldValue);
        }
        scheduleFlush();
    }

    /** @private */
    _addSubscriber(computed) {
        this._subscribers.add(computed);
    }

    /** @private */
    _removeSubscriber(computed) {
        this._subscribers.delete(computed);
    }

    /** @private */
    _addObserver(observer) {
        this._observers.add(observer);
    }

    /** @private */
    _removeObserver(observer) {
        this._observers.delete(observer);
    }

    watch(callback, options = {}) {
        if (typeof callback !== 'function') {
            throw new StateError('Watch callback must be a function');
        }

        const observer = { callback, unwatch: null };
        observer.unwatch = () => this._removeObserver(observer);
        this._addObserver(observer);

        // Call immediately if requested
        if (options.immediate !== false) {
                runObserver(this, observer, this._value, undefined);
        }

        // Return unwatch function
        return observer.unwatch;
    }

    /**
     * Remove a watcher, by the callback passed to watch()
     * @param {Function} callback
     */
    unwatch(callback) {
        for (const observer of [...this._observers]) {
            if (observer.callback === callback || observer.unwatch === callback) {
                this._removeObserver(observer);
            }
        }
    }

    /** Remove every watcher. */
    unwatchAll() {
        for (const observer of [...this._observers]) {
            this._removeObserver(observer);
        }
    }
}

/**
 * Computed property implementation
 */
class Computed extends Observable {
    constructor(getter, options = {}) {
        if (typeof getter !== 'function') {
            throw new StateError('Computed getter must be a function');
        }
        super(undefined, options);
        this._getter = getter;
        /** Dependencies read by the last computation: source -> its version then */
        this._deps = new Map();
        this._dirty = true;
        this._computing = false;
        this._globalVersionSeen = -1;
        this._lastNotified = undefined;
    }

    get value() {
        this._refresh();
        activeComputed?._track(this);
        return this._value;
    }

    set value(_newValue) {
        throw new StateError('Cannot set value on computed property');
    }

    peek() {
        this._refresh();
        return this._value;
    }

    /** Watched, or a dependency of a live computed. @private */
    get _live() {
        return this._observers.size > 0 || this._subscribers.size > 0;
    }

    /** @private */
    _track(source) {
        if (!this._deps.has(source)) {
            this._deps.set(source, source._version);
        }
    }

    /** Bring the cached value up to date. @private */
    _refresh() {
        if (this._computing) {
            throw new StateError('Circular dependency between computed properties', {
                type: 'computed-cycle',
                context: { getter: this._getter.name || 'anonymous' }
            });
        }
        if (!this._dirty) {
            // A live computed is marked dirty by its dependencies
            if (this._live || this._globalVersionSeen === globalVersion) return;
            if (!this._dependenciesChanged()) {
                this._globalVersionSeen = globalVersion;
                return;
            }
        }
        this._recompute();
    }

    /** @private */
    _dependenciesChanged() {
        for (const [source, version] of this._deps) {
            if (source instanceof Computed) {
                source._refresh();
            }
            if (source._version !== version) return true;
        }
        return false;
    }

    /** @private */
    _recompute() {
        const previousDeps = this._deps;
        const previousActive = activeComputed;
        this._deps = new Map();
        this._computing = true;
        activeComputed = this;

        let newValue;
        try {
            newValue = this._getter();
        } catch (error) {
            // Stay dirty so the next read retries
            this._deps = previousDeps;
            this._dirty = true;
            throw error;
        } finally {
            this._computing = false;
            activeComputed = previousActive;
        }

        if (this._live) {
            for (const source of previousDeps.keys()) {
                if (!this._deps.has(source)) source._removeSubscriber(this);
            }
            for (const source of this._deps.keys()) {
                if (!previousDeps.has(source)) source._addSubscriber(this);
            }
        }

        this._dirty = false;
        this._globalVersionSeen = globalVersion;
        if (!Object.is(newValue, this._value)) {
            this._value = newValue;
            this._version++;
        }
    }

    /** A dependency changed. @private */
    _markDirty() {
        if (this._dirty) return;
        this._dirty = true;
        if (this._observers.size > 0) {
            pendingComputeds.add(this);
        }
        for (const subscriber of [...this._subscribers]) {
            subscriber._markDirty();
        }
    }

    /** Subscribe to dependencies. @private */
    _goLive() {
        this._refresh();
        for (const source of this._deps.keys()) {
            source._addSubscriber(this);
        }
    }

    /** Unsubscribe from dependencies. @private */
    _goLazy() {
        for (const source of this._deps.keys()) {
            source._removeSubscriber(this);
        }
    }

    /** @private */
    _addSubscriber(computed) {
        const wasLive = this._live;
        this._subscribers.add(computed);
        if (!wasLive) this._goLive();
    }

    /** @private */
    _removeSubscriber(computed) {
        this._subscribers.delete(computed);
        if (!this._live) this._goLazy();
    }

    /** @private */
    _addObserver(observer) {
        const hadObservers = this._observers.size > 0;
        const wasLive = this._live;
        this._observers.add(observer);
        try {
            if (wasLive) {
                this._refresh();
            } else {
                this._goLive();
            }
        } catch (error) {
            this._observers.delete(observer);
            throw error;
        }
        if (!hadObservers) {
            // Baseline for the next notification's oldValue
            this._lastNotified = this._value;
        }
    }

    /** @private */
    _removeObserver(observer) {
        if (!this._observers.delete(observer)) return;
        if (!this._live) this._goLazy();
    }
}

/** Placeholder observables for keys read before they exist or after delete(). */
const ABSENT = Symbol('absent');

function isPath(key) {
    return typeof key === 'string' && key.includes('.');
}

function readPath(value, segments) {
    let current = value;
    for (const segment of segments) {
        if (current === null || current === undefined) return undefined;
        current = current[segment];
    }
    return current;
}

/** A copy of `target` with `segments` set to `value`, creating objects as needed. */
function writePath(target, segments, value) {
    const [head, ...rest] = segments;
    const base = target !== null && typeof target === 'object'
        ? (Array.isArray(target) ? [...target] : { ...target })
        : {};
    const next = rest.length === 0 ? value : writePath(base[head], rest, value);
    Object.defineProperty(base, head, { value: next, enumerable: true, writable: true, configurable: true });
    return base;
}

/** A copy of `target` without the property at `segments`. */
function deletePath(target, segments) {
    if (target === null || typeof target !== 'object') return target;
    const [head, ...rest] = segments;
    if (!Object.prototype.hasOwnProperty.call(target, head)) return target;
    const base = Array.isArray(target) ? [...target] : { ...target };
    if (rest.length === 0) {
        delete base[head];
    } else {
        base[head] = deletePath(base[head], rest);
    }
    return base;
}

/**
 * Reactive state container with advanced features
 *
 * Keys may be dot paths into object values: `set('user.name', 'Ada')` writes
 * a copy of `user` with the new name (notifying watchers of `user` and of
 * `user.name`), and `get`/`has`/`watch`/`delete` accept paths too.
 */
export class ReactiveState {
    constructor(initialState = {}, options = {}) {
        /** @type {Map<string, Observable>} */
        this._state = new Map();
        this._computed = new Map();
        this._watchers = new Map();
        this._expressionWatchers = new Set();
        this._middleware = [];
        this._history = [];
        this._options = {
            enableHistory: options.enableHistory !== false,
            maxHistorySize: options.maxHistorySize || 50,
            enableMiddleware: options.enableMiddleware !== false,
            deep: options.deep !== false,
            ...options
        };

        // Initialize state
        Object.entries(initialState).forEach(([key, value]) => {
            this.set(key, value);
        });
    }

    /** Observable for a key, created as an absent placeholder if needed. @private */
    _observable(key) {
        let observable = this._state.get(key);
        if (!observable) {
            observable = new Observable(ABSENT, this._options);
            this._state.set(key, observable);
        }
        return observable;
    }

    /** Whether a key is stored under its full name. @private */
    _hasOwnKey(key) {
        const observable = this._state.get(key);
        return Boolean(observable) && observable._value !== ABSENT;
    }

    /** [rootKey, pathSegments] for a dot path, or null for a plain key. @private */
    _splitPath(key) {
        if (!isPath(key)) return null;
        const [root, ...segments] = key.split('.');
        return [root, segments];
    }

    /**
     * Get reactive state value
     */
    get(key) {
        const path = this._splitPath(key);
        if (path) {
            return readPath(this.get(path[0]), path[1]);
        }
        // Reading a missing key inside a computed still records the
        // dependency, so the computed updates once the key is set.
        const observable = activeComputed ? this._observable(key) : this._state.get(key);
        if (!observable) return undefined;
        const value = observable.value;
        return value === ABSENT ? undefined : value;
    }

    /**
     * Set reactive state value
     */
    set(key, value, options = {}) {
        const config = { ...this._options, ...options };
        const oldValue = this.get(key);

        // Run middleware
        if (config.enableMiddleware) {
            const middlewareResult = this._runMiddleware('set', { key, value, oldValue });
            if (middlewareResult.cancelled) {
                return false;
            }
            value = middlewareResult.value !== undefined ? middlewareResult.value : value;
        }

        const path = this._splitPath(key);
        if (path) {
            const [root, segments] = path;
            if (config.enableHistory) {
                this._addToHistory('set', key, oldValue, value);
            }
            this._writeKey(root, writePath(this.get(root), segments, value));
            return true;
        }

        // Record history
        if (config.enableHistory && this._hasOwnKey(key)) {
            this._addToHistory('set', key, oldValue, value);
        }

        this._writeKey(key, value);
        return true;
    }

    /** @private */
    _writeKey(key, value) {
        this._observable(key)._write(value);
    }

    /**
     * Check if state has a key
     */
    has(key) {
        const path = this._splitPath(key);
        if (path) {
            const parent = readPath(this.get(path[0]), path[1].slice(0, -1));
            return parent !== null && typeof parent === 'object' &&
                Object.prototype.hasOwnProperty.call(parent, path[1][path[1].length - 1]);
        }
        return this._hasOwnKey(key);
    }

    /**
     * Delete state key. Its watchers are removed; computed properties that
     * read it update.
     */
    delete(key) {
        const path = this._splitPath(key);
        if (path) {
            if (!this.has(key)) return false;
            if (this._options.enableHistory) {
                this._addToHistory('delete', key, this.get(key), undefined);
            }
            this._writeKey(path[0], deletePath(this.get(path[0]), path[1]));
            return true;
        }

        if (!this._hasOwnKey(key)) {
            return false;
        }

        const observable = this._state.get(key);

        // Record history
        if (this._options.enableHistory) {
            this._addToHistory('delete', key, observable._value, undefined);
        }

        observable.unwatchAll();
        this._releaseKeyWatchers(key);
        observable._write(ABSENT);
        return true;
    }

    /** @private */
    _releaseKeyWatchers(key) {
        const unwatchers = this._watchers.get(key);
        if (unwatchers) {
            for (const unwatch of unwatchers) unwatch();
            this._watchers.delete(key);
        }
    }

    /**
     * Clear all state
     */
    clear() {
        // Record history
        if (this._options.enableHistory) {
            this._addToHistory('clear', null, this.toObject(), {});
        }

        batch(() => {
            for (const [key, observable] of this._state) {
                observable.unwatchAll();
                this._releaseKeyWatchers(key);
                observable._write(ABSENT);
            }
        });

        this._computed.clear();
        this._watchers.clear();
    }

    /**
     * Create computed property
     */
    computed(key, getter, options = {}) {
        if (typeof getter !== 'function') {
            throw new StateError(`Computed property '${key}' getter must be a function`);
        }

        const computed = new Computed(getter, { ...this._options, ...options });
        this._computed.set(key, computed);

        return computed;
    }

    /**
     * Get computed property value
     */
    getComputed(key) {
        const computed = this._computed.get(key);
        return computed ? computed.value : undefined;
    }

    /**
     * Watch state changes: a key, a dot path into a key, or a getter
     * expression (re-evaluated whenever what it reads changes).
     */
    watch(key, callback, options = {}) {
        if (typeof key === 'function') {
            // Watch computed expression
            return this._watchComputed(key, callback, options);
        }

        const path = this._splitPath(key);
        if (path) {
            if (!this._hasOwnKey(path[0])) {
                throw new StateError(`Cannot watch undefined state key: ${path[0]}`);
            }
            const computed = new Computed(() => this.get(key), { ...this._options, ...options });
            return this._track(key, computed.watch(callback, options));
        }

        if (!this._hasOwnKey(key)) {
            throw new StateError(`Cannot watch undefined state key: ${key}`);
        }

        return this._track(key, this._state.get(key).watch(callback, options));
    }

    /** Remember an unwatch function for cleanup. @private */
    _track(key, unwatch) {
        if (!this._watchers.has(key)) {
            this._watchers.set(key, new Set());
        }
        const unwatchers = this._watchers.get(key);
        const release = () => {
            unwatch();
            unwatchers.delete(release);
        };
        unwatchers.add(release);
        return release;
    }

    /**
     * Watch computed expression
     */
    _watchComputed(expression, callback, options = {}) {
        const computed = new Computed(expression, { ...this._options, ...options });
        const unwatch = computed.watch(callback, options);
        const release = () => {
            unwatch();
            this._expressionWatchers.delete(release);
        };
        this._expressionWatchers.add(release);
        return release;
    }

    /**
     * Batch state updates: watchers run once, after every update, with the
     * final values.
     */
    batch(updates) {
        if (typeof updates === 'function') {
            // Batch function updates
            const oldEnableHistory = this._options.enableHistory;
            this._options.enableHistory = false;

            try {
                const result = batch(() => updates(this));

                // Record batch in history
                if (oldEnableHistory) {
                    this._addToHistory('batch', null, null, this.toObject());
                }

                return result;
            } finally {
                this._options.enableHistory = oldEnableHistory;
            }
        } else if (typeof updates === 'object') {
            // Batch object updates
            return this.batch(() => {
                Object.entries(updates).forEach(([key, value]) => {
                    this.set(key, value);
                });
            });
        }
    }

    /**
     * Subscribe to multiple state changes
     */
    subscribe(keys, callback, options = {}) {
        if (!Array.isArray(keys)) {
            keys = [keys];
        }

        const unwatchers = keys.map(key => {
            return this.watch(key, (newValue, oldValue) => {
                callback({
                    key,
                    newValue,
                    oldValue,
                    state: this.toObject()
                });
            }, options);
        });

        // Return unsubscribe function
        return () => {
            unwatchers.forEach(unwatch => unwatch());
        };
    }

    /**
     * Add middleware for state changes
     */
    use(middleware) {
        if (typeof middleware !== 'function') {
            throw new StateError('Middleware must be a function');
        }
        this._middleware.push(middleware);
    }

    /**
     * Run middleware chain
     */
    _runMiddleware(action, context) {
        let result = { ...context, cancelled: false };

        for (const middleware of this._middleware) {
            try {
                const middlewareResult = middleware(action, result);
                if (middlewareResult) {
                    result = { ...result, ...middlewareResult };
                    if (result.cancelled) {
                        break;
                    }
                }
            } catch (error) {
                reportError(this, error, 'middleware-error', { action });
            }
        }

        return result;
    }

    /**
     * Add action to history
     */
    _addToHistory(action, key, oldValue, newValue) {
        if (!this._options.enableHistory) return;

        this._history.unshift({
            action,
            key,
            oldValue,
            newValue,
            timestamp: Date.now()
        });

        // Limit history size
        if (this._history.length > this._options.maxHistorySize) {
            this._history = this._history.slice(0, this._options.maxHistorySize);
        }
    }

    /**
     * Get state history
     */
    getHistory(limit = 10) {
        return this._history.slice(0, limit);
    }

    /**
     * Undo last action
     */
    undo() {
        const lastAction = this._history.shift();
        if (!lastAction) return false;

        const { action, key, oldValue } = lastAction;

        // Temporarily disable history
        const oldEnableHistory = this._options.enableHistory;
        this._options.enableHistory = false;

        try {
            switch (action) {
                case 'set':
                    if (oldValue === undefined) {
                        this.delete(key);
                    } else {
                        this.set(key, oldValue);
                    }
                    break;
                case 'delete':
                    this.set(key, oldValue);
                    break;
                case 'clear':
                    this.clear();
                    Object.entries(oldValue || {}).forEach(([k, v]) => {
                        this.set(k, v);
                    });
                    break;
            }
            return true;
        } finally {
            this._options.enableHistory = oldEnableHistory;
        }
    }

    /**
     * Convert state to plain object
     */
    toObject() {
        // Object.fromEntries defines own properties, so a "__proto__" key
        // stays a key instead of replacing the result's prototype.
        return Object.fromEntries(
            [...this._state]
                .filter(([, observable]) => observable._value !== ABSENT)
                .map(([key, observable]) => [key, observable._value])
        );
    }

    /**
     * Convert computed properties to object
     */
    getComputedValues() {
        return Object.fromEntries(
            [...this._computed].map(([key, computed]) => [key, computed.value])
        );
    }

    /**
     * Get state statistics
     */
    getStats() {
        let stateKeys = 0;
        for (const observable of this._state.values()) {
            if (observable._value !== ABSENT) stateKeys++;
        }
        return {
            stateKeys,
            computedKeys: this._computed.size,
            watcherKeys: this._watchers.size,
            historyLength: this._history.length,
            middlewareCount: this._middleware.length
        };
    }

    /**
     * Cleanup and destroy
     */
    destroy() {
        // Clear all watchers
        for (const key of [...this._watchers.keys()]) {
            this._releaseKeyWatchers(key);
        }
        for (const release of [...this._expressionWatchers]) {
            release();
        }
        for (const observable of this._state.values()) {
            observable.unwatchAll();
        }
        for (const computed of this._computed.values()) {
            computed.unwatchAll();
        }

        // Clear collections
        this._state.clear();
        this._computed.clear();
        this._watchers.clear();
        this._middleware.length = 0;
        this._history.length = 0;
    }
}

/**
 * Create reactive state store
 */
export function createReactiveState(initialState, options = {}) {
    return new ReactiveState(initialState, options);
}

/**
 * Create observable value
 */
export function observable(value, options = {}) {
    return new Observable(value, options);
}

/**
 * Create computed property
 */
export function computed(getter, options = {}) {
    return new Computed(getter, options);
}

/**
 * Utility functions for common state patterns
 */
export const stateUtils = {
    /**
     * Create a toggle state
     */
    toggle(initialValue = false) {
        const obs = observable(initialValue);
        obs.toggle = () => {
            obs.value = !obs.value;
        };
        return obs;
    },

    /**
     * Create a counter state
     */
    counter(initialValue = 0) {
        const obs = observable(initialValue);
        obs.increment = (by = 1) => {
            obs.value += by;
        };
        obs.decrement = (by = 1) => {
            obs.value -= by;
        };
        obs.reset = () => {
            obs.value = initialValue;
        };
        return obs;
    },

    /**
     * Create an array state with utilities
     */
    array(initialArray = []) {
        const obs = observable([...initialArray]);
        obs.push = (...items) => {
            obs.value = [...obs.value, ...items];
        };
        obs.pop = () => {
            const newArray = [...obs.value];
            const result = newArray.pop();
            obs.value = newArray;
            return result;
        };
        obs.filter = (predicate) => {
            obs.value = obs.value.filter(predicate);
        };
        obs.clear = () => {
            obs.value = [];
        };
        return obs;
    },

    /**
     * Create object state with deep reactivity
     */
    object(initialObject = {}) {
        const state = createReactiveState(initialObject, { deep: true });
        return state;
    }
};

export default ReactiveState;
