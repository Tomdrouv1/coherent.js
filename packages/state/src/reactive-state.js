/**
 * Reactive State Management System for Coherent.js
 * Provides computed properties, watchers, and reactive updates
 */

import { globalErrorHandler, StateError } from '@coherent.js/core/src/utils/_error-handler.js';

/**
 * Observable wrapper for tracking state changes
 */
export class Observable {
    constructor(value, options = {}) {
        this._value = value;
        this._observers = new Set();
        this._computedDependents = new Set();
        this._options = {
            deep: options.deep !== false,
            immediate: options.immediate !== false,
            ...options
        };
    }

    get value() {
        // Track dependency for computed properties
        if (Observable._currentComputed) {
            this._computedDependents.add(Observable._currentComputed);
        }
        return this._value;
    }

    set value(newValue) {
        if (this._value === newValue && !this._options.deep) {
            return;
        }

        const oldValue = this._value;
        this._value = newValue;

        // Notify observers
        this._observers.forEach(observer => {
            try {
                observer(newValue, oldValue);
            } catch (_error) {
                globalErrorHandler.handle(_error, {
                    type: 'watcher-_error',
                    context: { newValue, oldValue }
                });
            }
        });

        // Update computed dependents
        this._computedDependents.forEach(computed => {
            computed._invalidate();
        });
    }

    watch(callback, options = {}) {
        if (typeof callback !== 'function') {
            throw new StateError('Watch callback must be a function');
        }

        const observer = (newValue, oldValue) => {
            callback(newValue, oldValue, () => this.unwatch(observer));
        };

        this._observers.add(observer);

        // Call immediately if requested
        if (options.immediate !== false) {
            observer(this._value, undefined);
        }

        // Return unwatch function
        return () => this.unwatch(observer);
    }

    unwatch(observer) {
        this._observers.delete(observer);
    }

    unwatchAll() {
        this._observers.clear();
        this._computedDependents.clear();
    }
}

/**
 * Computed property implementation
 */
class Computed extends Observable {
    constructor(getter, options = {}) {
        super(undefined, options);
        this._getter = getter;
        this._cached = false;
        this._dirty = true;

        if (typeof getter !== 'function') {
            throw new StateError('Computed getter must be a function');
        }
    }

    get value() {
        if (this._dirty || !this._cached) {
            this._compute();
        }
        return this._value;
    }

    set value(newValue) {
        throw new StateError('Cannot set value on computed property');
    }

    _compute() {
        const prevComputed = Observable._currentComputed;
        Observable._currentComputed = this;

        try {
            const newValue = this._getter();

            if (newValue !== this._value) {
                const oldValue = this._value;
                this._value = newValue;

                // Notify observers
                this._observers.forEach(observer => {
                    observer(newValue, oldValue);
                });
            }

            this._cached = true;
            this._dirty = false;
        } catch (_error) {
            globalErrorHandler.handle(_error, {
                type: 'computed-_error',
                context: { getter: this._getter.toString() }
            });
        } finally {
            Observable._currentComputed = prevComputed;
        }
    }

    _invalidate() {
        this._dirty = true;
        this._computedDependents.forEach(computed => {
            computed._invalidate();
        });
    }
}

// Static property for tracking current computed
Observable._currentComputed = null;

/**
 * Reactive state container with advanced features
 */
export class ReactiveState {
    constructor(initialState = {}, options = {}) {
        this._state = new Map();
        this._computed = new Map();
        this._watchers = new Map();
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

    /**
     * Get reactive state value
     */
    get(key) {
        const observable = this._state.get(key);
        return observable ? observable.value : undefined;
    }

    /**
     * Set reactive state value
     */
    set(key, value, options = {}) {
        const config = { ...this._options, ...options };

        // Run middleware
        if (config.enableMiddleware) {
            const middlewareResult = this._runMiddleware('set', { key, value, oldValue: this.get(key) });
            if (middlewareResult.cancelled) {
                return false;
            }
            value = middlewareResult.value !== undefined ? middlewareResult.value : value;
        }

        // Get or create observable
        let observable = this._state.get(key);
        if (!observable) {
            observable = new Observable(value, config);
            this._state.set(key, observable);
        } else {
            // Record history
            if (config.enableHistory) {
                this._addToHistory('set', key, observable.value, value);
            }

            observable.value = value;
        }

        return true;
    }

    /**
     * Check if state has a key
     */
    has(key) {
        return this._state.has(key);
    }

    /**
     * Delete state key
     */
    delete(key) {
        const observable = this._state.get(key);
        if (observable) {
            // Record history
            if (this._options.enableHistory) {
                this._addToHistory('delete', key, observable.value, undefined);
            }

            observable.unwatchAll();
            this._state.delete(key);
            return true;
        }
        return false;
    }

    /**
     * Clear all state
     */
    clear() {
        // Record history
        if (this._options.enableHistory) {
            this._addToHistory('clear', null, this.toObject(), {});
        }

        // Cleanup observables
        for (const observable of this._state.values()) {
            observable.unwatchAll();
        }

        this._state.clear();
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
     * Watch state changes
     */
    watch(key, callback, options = {}) {
        if (typeof key === 'function') {
            // Watch computed expression
            return this._watchComputed(key, callback, options);
        }

        const observable = this._state.get(key);
        if (!observable) {
            throw new StateError(`Cannot watch undefined state key: ${key}`);
        }

        const unwatch = observable.watch(callback, options);

        // Store watcher for cleanup
        if (!this._watchers.has(key)) {
            this._watchers.set(key, new Set());
        }
        this._watchers.get(key).add(unwatch);

        return unwatch;
    }

    /**
     * Watch computed expression
     */
    _watchComputed(expression, callback, options = {}) {
        const computed = new Computed(expression, options);
        const unwatch = computed.watch(callback, options);

        return unwatch;
    }

    /**
     * Batch state updates
     */
    batch(updates) {
        if (typeof updates === 'function') {
            // Batch function updates
            const oldEnableHistory = this._options.enableHistory;
            this._options.enableHistory = false;

            try {
                const result = updates(this);

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
            } catch (_error) {
                globalErrorHandler.handle(_error, {
                    type: 'middleware-_error',
                    context: { action, middleware: middleware.toString() }
                });
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
        const result = {};
        for (const [key, observable] of this._state.entries()) {
            result[key] = observable.value;
        }
        return result;
    }

    /**
     * Convert computed properties to object
     */
    getComputedValues() {
        const result = {};
        for (const [key, computed] of this._computed.entries()) {
            result[key] = computed.value;
        }
        return result;
    }

    /**
     * Get state statistics
     */
    getStats() {
        return {
            stateKeys: this._state.size,
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
