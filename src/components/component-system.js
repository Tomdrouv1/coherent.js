/**
 * Component System for Coherent.js
 * Provides component definition, lifecycle, composition, and state management
 */

import { deepClone, validateComponent } from '../core/object-utils.js';
import { performanceMonitor } from '../performance/monitor.js';

/**
 * Component registry for global component management
 */
const COMPONENT_REGISTRY = new Map();
const COMPONENT_INSTANCES = new WeakMap();
const COMPONENT_METADATA = new WeakMap();

/**
 * Component lifecycle hooks
 */
const LIFECYCLE_HOOKS = {
    beforeCreate: 'beforeCreate',
    created: 'created',
    beforeMount: 'beforeMount',
    mounted: 'mounted',
    beforeUpdate: 'beforeUpdate',
    updated: 'updated',
    beforeDestroy: 'beforeDestroy',
    destroyed: 'destroyed',
    errorCaptured: 'errorCaptured'
};

/**
 * Component state management
 */
class ComponentState {
    constructor(initialState = {}) {
        this.state = {...initialState};
        this.listeners = new Set();
        this.isUpdating = false;
    }

    get(key) {
        return key ? this.state[key] : {...this.state};
    }

    set(updates) {
        if (this.isUpdating) return this;

        const oldState = {...this.state};

        if (typeof updates === 'function') {
            updates = updates(oldState);
        }

        this.state = {...this.state, ...updates};

        // Notify listeners
        this.notifyListeners(oldState, this.state);

        return this;
    }

    subscribe(listener) {
        this.listeners.add(listener);
        return () => this.listeners.delete(listener);
    }

    notifyListeners(oldState, newState) {
        if (this.listeners.size === 0) return;

        this.isUpdating = true;

        this.listeners.forEach(listener => {
            try {
                listener(newState, oldState);
            } catch (error) {
                console.error('State listener error:', error);
            }
        });

        this.isUpdating = false;
    }
}

/**
 * Base Component class
 */
export class Component {
    constructor(definition = {}) {
        this.definition = definition;
        this.name = definition.name || 'AnonymousComponent';
        this.props = {};
        this.state = new ComponentState(definition.state || {});
        this.children = [];
        this.parent = null;
        this.rendered = null;
        this.isMounted = false;
        this.isDestroyed = false;

        // Lifecycle hooks
        this.hooks = {
            beforeCreate: definition.beforeCreate || (() => {
            }),
            created: definition.created || (() => {
            }),
            beforeMount: definition.beforeMount || (() => {
            }),
            mounted: definition.mounted || (() => {
            }),
            beforeUpdate: definition.beforeUpdate || (() => {
            }),
            updated: definition.updated || (() => {
            }),
            beforeDestroy: definition.beforeDestroy || (() => {
            }),
            destroyed: definition.destroyed || (() => {
            }),
            errorCaptured: definition.errorCaptured || (() => {
            })
        };

        // Methods
        this.methods = definition.methods || {};
        Object.keys(this.methods).forEach(methodName => {
            if (typeof this.methods[methodName] === 'function') {
                this[methodName] = this.methods[methodName].bind(this);
            }
        });

        // Computed properties
        this.computed = definition.computed || {};
        this.computedCache = new Map();

        // Watch properties
        this.watchers = definition.watch || {};
        this.setupWatchers();

        // Store metadata
        COMPONENT_METADATA.set(this, {
            createdAt: Date.now(),
            updateCount: 0,
            renderCount: 0
        });

        // Initialize lifecycle
        this.callHook('beforeCreate');
        this.initialize();
        this.callHook('created');
    }

    /**
     * Initialize component
     */
    initialize() {
        // Set up state subscription for re-rendering
        this.unsubscribeState = this.state.subscribe((newState, oldState) => {
            this.onStateChange(newState, oldState);
        });

        // Initialize computed properties
        this.initializeComputed();
    }

    /**
     * Set up watchers for reactive data
     */
    setupWatchers() {
        Object.keys(this.watchers).forEach(key => {
            const handler = this.watchers[key];

            // Watch state changes
            this.state.subscribe((newState, oldState) => {
                if (newState[key] !== oldState[key]) {
                    handler.call(this, newState[key], oldState[key]);
                }
            });
        });
    }

    /**
     * Initialize computed properties
     */
    initializeComputed() {
        Object.keys(this.computed).forEach(key => {
            Object.defineProperty(this, key, {
                get: () => {
                    if (!this.computedCache.has(key)) {
                        const value = this.computed[key].call(this);
                        this.computedCache.set(key, value);
                    }
                    return this.computedCache.get(key);
                },
                enumerable: true
            });
        });
    }

    /**
     * Handle state changes
     */
    onStateChange(newState, oldState) {
        if (this.isDestroyed) return;

        // Clear computed cache
        this.computedCache.clear();

        // Trigger update if mounted
        if (this.isMounted) {
            this.update();
        }
    }

    /**
     * Call lifecycle hook
     */
    callHook(hookName, ...args) {
        try {
            if (this.hooks[hookName]) {
                return this.hooks[hookName].call(this, ...args);
            }
        } catch (error) {
            this.handleError(error, `${hookName} hook`);
        }
    }

    /**
     * Handle component errors
     */
    handleError(error, context) {
        console.error(`Component Error in ${this.name} (${context}):`, error);

        // Call error hook
        this.callHook('errorCaptured', error, context);

        // Propagate to parent
        if (this.parent && this.parent.handleError) {
            this.parent.handleError(error, `${this.name} -> ${context}`);
        }
    }

    /**
     * Render the component
     */
    render(props = {}) {
        if (this.isDestroyed) {
            console.warn(`Attempting to render destroyed component: ${this.name}`);
            return null;
        }

        try {
            // Update metadata
            const metadata = COMPONENT_METADATA.get(this);
            if (metadata) {
                metadata.renderCount++;
            }

            // Set props
            this.props = {...props};

            // Call render method
            if (typeof this.definition.render === 'function') {
                this.rendered = this.definition.render.call(this, this.props, this.state.get());
            } else if (typeof this.definition.template !== 'undefined') {
                this.rendered = this.processTemplate(this.definition.template, this.props, this.state.get());
            } else {
                throw new Error(`Component ${this.name} must have either render method or template`);
            }

            // Validate rendered output
            if (this.rendered !== null) {
                validateComponent(this.rendered, this.name);
            }

            return this.rendered;

        } catch (error) {
            this.handleError(error, 'render');
            return {div: {className: 'component-error', text: `Error in ${this.name}`}};
        }
    }

    /**
     * Process template with data
     */
    processTemplate(template, props, state) {
        if (typeof template === 'function') {
            return template.call(this, props, state);
        }

        if (typeof template === 'string') {
            // Simple string interpolation
            return template.replace(/\{\{(\w+)\}\}/g, (match, key) => {
                return props[key] || state[key] || '';
            });
        }

        // Clone template object and process
        const processed = deepClone(template);
        this.interpolateObject(processed, {...props, ...state});
        return processed;
    }

    /**
     * Interpolate object with data
     */
    interpolateObject(obj, data) {
        if (typeof obj === 'string') {
            return obj.replace(/\{\{(\w+)\}\}/g, (match, key) => data[key] || '');
        }

        if (Array.isArray(obj)) {
            return obj.map(item => this.interpolateObject(item, data));
        }

        if (obj && typeof obj === 'object') {
            Object.keys(obj).forEach(key => {
                obj[key] = this.interpolateObject(obj[key], data);
            });
        }

        return obj;
    }

    /**
     * Mount the component
     */
    mount() {
        if (this.isMounted || this.isDestroyed) return this;

        this.callHook('beforeMount');
        this.isMounted = true;
        this.callHook('mounted');

        return this;
    }

    /**
     * Update the component
     */
    update() {
        if (!this.isMounted || this.isDestroyed) return this;

        const metadata = COMPONENT_METADATA.get(this);
        if (metadata) {
            metadata.updateCount++;
        }

        this.callHook('beforeUpdate');
        // Re-render will happen automatically via state subscription
        this.callHook('updated');

        return this;
    }

    /**
     * Destroy the component
     */
    destroy() {
        if (this.isDestroyed) return this;

        this.callHook('beforeDestroy');

        // Cleanup
        if (this.unsubscribeState) {
            this.unsubscribeState();
        }

        // Destroy children
        this.children.forEach(child => {
            if (child.destroy) {
                child.destroy();
            }
        });

        this.isMounted = false;
        this.isDestroyed = true;
        this.children = [];
        this.parent = null;

        this.callHook('destroyed');

        return this;
    }

    /**
     * Get component metadata
     */
    getMetadata() {
        return COMPONENT_METADATA.get(this) || {};
    }

    /**
     * Clone component with new props/state
     */
    clone(overrides = {}) {
        const newDefinition = {...this.definition, ...overrides};
        return new Component(newDefinition);
    }
}

/**
 * Create a functional component
 */
export function createComponent(definition) {
    if (typeof definition === 'function') {
        // Convert function to component definition
        definition = {
            name: definition.name || 'FunctionalComponent',
            render: definition
        };
    }

    return new Component(definition);
}

/**
 * Create a component factory
 */
export function defineComponent(definition) {
    const componentFactory = (props) => {
        const component = new Component(definition);
        return component.render(props);
    };

    // Add static properties
    componentFactory.componentName = definition.name || 'Component';
    componentFactory.definition = definition;

    return componentFactory;
}

/**
 * Register a global component
 */
export function registerComponent(name, definition) {
    if (COMPONENT_REGISTRY.has(name)) {
        console.warn(`Component ${name} is already registered. Overriding.`);
    }

    const component = typeof definition === 'function' ?
        defineComponent({name, render: definition}) :
        defineComponent(definition);

    COMPONENT_REGISTRY.set(name, component);
    return component;
}

/**
 * Get a registered component
 */
export function getComponent(name) {
    return COMPONENT_REGISTRY.get(name);
}

/**
 * Get all registered components
 */
export function getRegisteredComponents() {
    return new Map(COMPONENT_REGISTRY);
}

/**
 * Create a higher-order component
 */
export function createHOC(enhancer) {
    return (WrappedComponent) => {
        return defineComponent({
            name: `HOC(${WrappedComponent.componentName || 'Component'})`,
            render(props) {
                return enhancer(WrappedComponent, props);
            }
        });
    };
}

/**
 * Mixin functionality
 */
export function createMixin(mixin) {
    return (componentDefinition) => {
        return {
            ...mixin,
            ...componentDefinition,

            // Merge methods
            methods: {
                ...mixin.methods,
                ...componentDefinition.methods
            },

            // Merge computed
            computed: {
                ...mixin.computed,
                ...componentDefinition.computed
            },

            // Merge watchers
            watch: {
                ...mixin.watch,
                ...componentDefinition.watch
            },

            // Merge state
            state: {
                ...mixin.state,
                ...componentDefinition.state
            }
        };
    };
}

/**
 * Component composition utilities
 */
export const compose = {
    /**
     * Combine multiple components
     */
    combine: (...components) => {
        return defineComponent({
            name: 'ComposedComponent',
            render(props) {
                return components.map(comp =>
                    typeof comp === 'function' ? comp(props) : comp
                );
            }
        });
    },

    /**
     * Conditionally render components
     */
    conditional: (condition, trueComponent, falseComponent = null) => {
        return defineComponent({
            name: 'ConditionalComponent',
            render(props) {
                const shouldRender = typeof condition === 'function' ?
                    condition(props) : condition;

                if (shouldRender) {
                    return typeof trueComponent === 'function' ?
                        trueComponent(props) : trueComponent;
                } else if (falseComponent) {
                    return typeof falseComponent === 'function' ?
                        falseComponent(props) : falseComponent;
                }

                return null;
            }
        });
    },

    /**
     * Loop over data to render components
     */
    loop: (data, itemComponent, keyFn = (item, index) => index) => {
        return defineComponent({
            name: 'LoopComponent',
            render(props) {
                const items = typeof data === 'function' ? data(props) : data;

                if (!Array.isArray(items)) {
                    console.warn('Loop component expects array data');
                    return null;
                }

                return items.map((item, index) => {
                    const key = keyFn(item, index);
                    const itemProps = {...props, item, index, key};

                    return typeof itemComponent === 'function' ?
                        itemComponent(itemProps) : itemComponent;
                });
            }
        });
    }
};

/**
 * Component utilities
 */
export const componentUtils = {
    /**
     * Get component tree information
     */
    getComponentTree: (component) => {
        const tree = {
            name: component.name || 'Unknown',
            props: component.props || {},
            state: component.state ? component.state.get() : {},
            children: [],
            metadata: component.getMetadata ? component.getMetadata() : {}
        };

        if (component.children && component.children.length > 0) {
            tree.children = component.children.map(child =>
                componentUtils.getComponentTree(child)
            );
        }

        return tree;
    },

    /**
     * Find component by name in tree
     */
    findComponent: (component, name) => {
        if (component.name === name) {
            return component;
        }

        if (component.children) {
            for (const child of component.children) {
                const found = componentUtils.findComponent(child, name);
                if (found) return found;
            }
        }

        return null;
    },

    /**
     * Get component performance metrics
     */
    getPerformanceMetrics: (component) => {
        const metadata = component.getMetadata ? component.getMetadata() : {};

        return {
            renderCount: metadata.renderCount || 0,
            updateCount: metadata.updateCount || 0,
            createdAt: metadata.createdAt || Date.now(),
            age: Date.now() - (metadata.createdAt || Date.now())
        };
    },

    /**
     * Validate component definition
     */
    validateDefinition: (definition) => {
        const errors = [];

        if (!definition || typeof definition !== 'object') {
            errors.push('Definition must be an object');
            return errors;
        }

        if (!definition.render && !definition.template) {
            errors.push('Component must have either render method or template');
        }

        if (definition.render && typeof definition.render !== 'function') {
            errors.push('render must be a function');
        }

        if (definition.methods && typeof definition.methods !== 'object') {
            errors.push('methods must be an object');
        }

        if (definition.computed && typeof definition.computed !== 'object') {
            errors.push('computed must be an object');
        }

        if (definition.watch && typeof definition.watch !== 'object') {
            errors.push('watch must be an object');
        }

        return errors;
    }
};

/**
 * Performance monitoring for components
 */
if (performanceMonitor) {
    const originalRender = Component.prototype.render;

    Component.prototype.render = function(...args) {
        const start = performance.now();
        const result = originalRender.apply(this, args);
        const duration = performance.now() - start;

        performanceMonitor.recordRender('component', duration, {
            name: this.name,
            propsSize: JSON.stringify(this.props || {}).length,
            hasState: Object.keys(this.state?.get() || {}).length > 0
        });

        return result;
    };
}

/**
 * Development helpers
 */
export const dev = {
    /**
     * Get all component instances
     */
    getAllComponents: () => {
        return Array.from(COMPONENT_REGISTRY.entries()).map(([name, factory]) => ({
            name,
            factory,
            definition: factory.definition
        }));
    },

    /**
     * Clear component registry
     */
    clearRegistry: () => {
        COMPONENT_REGISTRY.clear();
    },

    /**
     * Get component registry stats
     */
    getRegistryStats: () => ({
        totalComponents: COMPONENT_REGISTRY.size,
        components: Array.from(COMPONENT_REGISTRY.keys())
    })
};

/**
 * Create lazy-evaluated properties and components
 * Defers computation until actually needed, with optional caching
 */
export function lazy(factory, options = {}) {
    const {
        cache = true,           // Cache the result after first evaluation
        timeout = null,         // Optional timeout for evaluation
        fallback = null,        // Fallback value if evaluation fails
        onError = null,         // Error handler
        dependencies = []       // Dependencies that invalidate cache
    } = options;

    let cached = false;
    let cachedValue = null;
    let isEvaluating = false;
    let lastDependencyHash = null;

    const lazyWrapper = {
        // Mark as lazy for identification
        __isLazy: true,
        __factory: factory,
        __options: options,

        // Evaluation method
        evaluate(...args) {
            // Prevent recursive evaluation
            if (isEvaluating) {
                console.warn('Lazy evaluation cycle detected, returning fallback');
                return fallback;
            }

            // Check dependency changes
            if (cache && dependencies.length > 0) {
                const currentHash = hashDependencies(dependencies);
                if (lastDependencyHash !== null && lastDependencyHash !== currentHash) {
                    cached = false;
                    cachedValue = null;
                }
                lastDependencyHash = currentHash;
            }

            // Return cached value if available
            if (cache && cached) {
                return cachedValue;
            }

            isEvaluating = true;

            try {
                let result;

                // Handle timeout
                if (timeout) {
                    result = evaluateWithTimeout(factory, timeout, args, fallback);
                } else {
                    result = typeof factory === 'function' ? factory(...args) : factory;
                }

                // Handle promises
                if (result && typeof result.then === 'function') {
                    return result.catch(error => {
                        if (onError) onError(error);
                        return fallback;
                    });
                }

                // Cache successful result
                if (cache) {
                    cached = true;
                    cachedValue = result;
                }

                return result;

            } catch (error) {
                if (onError) {
                    onError(error);
                } else {
                    console.error('Lazy evaluation error:', error);
                }
                return fallback;
            } finally {
                isEvaluating = false;
            }
        },

        // Force re-evaluation
        invalidate() {
            cached = false;
            cachedValue = null;
            lastDependencyHash = null;
            return this;
        },

        // Check if evaluated
        isEvaluated() {
            return cached;
        },

        // Get cached value without evaluation
        getCachedValue() {
            return cachedValue;
        },

        // Transform the lazy value
        map(transform) {
            return lazy((...args) => {
                const value = this.evaluate(...args);
                return transform(value);
            }, {...options, cache: false}); // Don't double-cache
        },

        // Chain lazy evaluations
        flatMap(transform) {
            return lazy((...args) => {
                const value = this.evaluate(...args);
                const transformed = transform(value);

                if (isLazy(transformed)) {
                    return transformed.evaluate(...args);
                }

                return transformed;
            }, {...options, cache: false});
        },

        // Convert to string for debugging
        toString() {
            return `[Lazy${cached ? ' (cached)' : ''}]`;
        },

        // JSON serialization
        toJSON() {
            return this.evaluate();
        }
    };

    return lazyWrapper;
}

/**
 * Check if value is lazy
 */
export function isLazy(value) {
    return value && typeof value === 'object' && value.__isLazy === true;
}

/**
 * Evaluate lazy values recursively in an object
 */
export function evaluateLazy(obj, ...args) {
    if (isLazy(obj)) {
        return obj.evaluate(...args);
    }

    if (Array.isArray(obj)) {
        return obj.map(item => evaluateLazy(item, ...args));
    }

    if (obj && typeof obj === 'object') {
        const result = {};

        for (const [key, value] of Object.entries(obj)) {
            result[key] = evaluateLazy(value, ...args);
        }

        return result;
    }

    return obj;
}

/**
 * Create lazy component
 */
export function lazyComponent(componentFactory, options = {}) {
    return lazy(componentFactory, {
        cache: true,
        fallback: {div: {text: 'Loading component...'}},
        ...options
    });
}

/**
 * Create lazy import for dynamic imports
 */
export function lazyImport(importPromise, options = {}) {
    return lazy(async () => {
        const module = await importPromise;
        return module.default || module;
    }, {
        cache: true,
        fallback: {div: {text: 'Loading...'}},
        ...options
    });
}

/**
 * Create lazy computed property
 */
export function lazyComputed(computeFn, dependencies = [], options = {}) {
    return lazy(computeFn, {
        cache: true,
        dependencies,
        ...options
    });
}

/**
 * Batch evaluate multiple lazy values
 */
export function batchEvaluate(lazyValues, ...args) {
    const results = {};
    const promises = [];

    Object.entries(lazyValues).forEach(([key, lazyValue]) => {
        if (isLazy(lazyValue)) {
            const result = lazyValue.evaluate(...args);

            if (result && typeof result.then === 'function') {
                promises.push(
                    result.then(value => ({key, value}))
                        .catch(error => ({key, error}))
                );
            } else {
                results[key] = result;
            }
        } else {
            results[key] = lazyValue;
        }
    });

    if (promises.length === 0) {
        return results;
    }

    return Promise.all(promises).then(asyncResults => {
        asyncResults.forEach(({key, value, error}) => {
            if (error) {
                console.error(`Batch evaluation error for ${key}:`, error);
                results[key] = null;
            } else {
                results[key] = value;
            }
        });

        return results;
    });
}

/**
 * Helper function to hash dependencies
 */
function hashDependencies(dependencies) {
    return dependencies.map(dep => {
        if (typeof dep === 'function') {
            return dep.toString();
        }
        return JSON.stringify(dep);
    }).join('|');
}

/**
 * Helper function to evaluate with timeout
 */
function evaluateWithTimeout(factory, timeout, args, fallback) {
    return new Promise((resolve, reject) => {
        const timer = setTimeout(() => {
            reject(new Error(`Lazy evaluation timeout after ${timeout}ms`));
        }, timeout);

        try {
            const result = factory(...args);

            if (result && typeof result.then === 'function') {
                result
                    .then(value => {
                        clearTimeout(timer);
                        resolve(value);
                    })
                    .catch(error => {
                        clearTimeout(timer);
                        reject(error);
                    });
            } else {
                clearTimeout(timer);
                resolve(result);
            }
        } catch (error) {
            clearTimeout(timer);
            reject(error);
        }
    }).catch(() => fallback);
}

/**
 * Lazy evaluation utilities
 */
export const lazyUtils = {
    /**
     * Create a lazy chain of transformations
     */
    chain: (...transformations) => {
        return lazy((initialValue) => {
            return transformations.reduce((value, transform) => {
                if (isLazy(value)) {
                    value = value.evaluate();
                }
                return transform(value);
            }, initialValue);
        });
    },

    /**
     * Create conditional lazy evaluation
     */
    conditional: (condition, trueFactory, falseFactory) => {
        return lazy((...args) => {
            const shouldEvaluateTrue = typeof condition === 'function' ?
                condition(...args) : condition;

            const factory = shouldEvaluateTrue ? trueFactory : falseFactory;
            return typeof factory === 'function' ? factory(...args) : factory;
        });
    },

    /**
     * Memoize a function with lazy evaluation
     */
    memoize: (fn, keyFn = (...args) => JSON.stringify(args)) => {
        const cache = new Map();

        return lazy((...args) => {
            const key = keyFn(...args);

            if (cache.has(key)) {
                return cache.get(key);
            }

            const result = fn(...args);
            cache.set(key, result);
            return result;
        }, {cache: false}); // Handle caching internally
    },

    /**
     * Create lazy value from async function
     */
    async: (asyncFn, options = {}) => {
        return lazy(asyncFn, {
            cache: true,
            fallback: options.loading || {div: {text: 'Loading...'}},
            onError: options.onError,
            ...options
        });
    },

    /**
     * Create lazy array with lazy items
     */
    array: (items = []) => {
        return lazy(() => items.map(item =>
            isLazy(item) ? item.evaluate() : item
        ));
    },

    /**
     * Create lazy object with lazy properties
     */
    object: (obj = {}) => {
        return lazy(() => {
            const result = {};

            for (const [key, value] of Object.entries(obj)) {
                result[key] = isLazy(value) ? value.evaluate() : value;
            }

            return result;
        });
    }
};

/**
 * Memoization utilities for caching function results and component renders
 */

/**
 * Enhanced memoization with multiple caching strategies
 */
export function memo(fn, options = {}) {
    const {
        // Caching strategy
        strategy = 'lru',           // 'lru', 'ttl', 'weak', 'simple'
        maxSize = 100,              // Maximum cache entries
        ttl = null,                 // Time to live in milliseconds

        // Key generation
        keyFn = null,               // Custom key function
        keySerializer = JSON.stringify,  // Default serialization

        // Comparison
        compareFn = null,           // Custom equality comparison
        shallow = false,            // Shallow comparison for objects

        // Lifecycle hooks
        onHit = null,               // Called on cache hit
        onMiss = null,              // Called on cache miss
        onEvict = null,             // Called when item evicted

        // Performance
        stats = false,              // Track hit/miss statistics

        // Development
        debug = false               // Debug logging
    } = options;

    // Choose cache implementation based on strategy
    let cache;
    const stats_data = stats ? {hits: 0, misses: 0, evictions: 0} : null;

    switch (strategy) {
        case 'lru':
            cache = new LRUCache(maxSize, {onEvict: onEvict});
            break;
        case 'ttl':
            cache = new TTLCache(ttl, {onEvict: onEvict});
            break;
        case 'weak':
            cache = new WeakMap();
            break;
        default:
            cache = new Map();
    }

    // Generate cache key
    const generateKey = keyFn || ((...args) => {
        if (args.length === 0) return '__empty__';
        if (args.length === 1) return keySerializer(args[0]);
        return keySerializer(args);
    });

    // Compare values for equality
    const isEqual = compareFn || ((a, b) => {
        if (shallow && typeof a === 'object' && typeof b === 'object') {
            return shallowEqual(a, b);
        }
        return keySerializer(a) === keySerializer(b);
    });

    const memoizedFn = (...args) => {
        const key = generateKey(...args);

        // Check cache hit
        if (cache.has(key)) {
            const cached = cache.get(key);

            // For TTL cache or custom validation
            if (cached && (!cached.expires || Date.now() < cached.expires)) {
                if (debug) console.log(`Memo cache hit for key: ${key}`);
                if (onHit) onHit(key, cached.value, args);
                if (stats_data) stats_data.hits++;

                return cached.value || cached;
            } else {
                // Expired entry
                cache.delete(key);
            }
        }

        // Cache miss - compute result
        if (debug) console.log(`Memo cache miss for key: ${key}`);
        if (onMiss) onMiss(key, args);
        if (stats_data) stats_data.misses++;

        const result = fn(...args);

        // Store in cache
        const cacheEntry = ttl ?
            {value: result, expires: Date.now() + ttl} :
            result;

        cache.set(key, cacheEntry);

        return result;
    };

    // Attach utility methods
    memoizedFn.cache = cache;
    memoizedFn.clear = () => cache.clear();
    memoizedFn.delete = (key) => cache.delete(key);
    memoizedFn.has = (key) => cache.has(key);
    memoizedFn.size = () => cache.size;

    if (stats_data) {
        memoizedFn.stats = () => ({...stats_data});
        memoizedFn.resetStats = () => {
            stats_data.hits = 0;
            stats_data.misses = 0;
            stats_data.evictions = 0;
        };
    }

    // Force recomputation for specific args
    memoizedFn.refresh = (...args) => {
        const key = generateKey(...args);
        cache.delete(key);
        return memoizedFn(...args);
    };

    return memoizedFn;
}

/**
 * Component-specific memoization
 */
export function memoComponent(component, options = {}) {
    const {
        propsEqual = shallowEqual,
        stateEqual = shallowEqual,
        name = component.name || 'AnonymousComponent'
    } = options;

    return memo((props = {}, state = {}, context = {}) => {
        return typeof component === 'function' ?
            component(props, state, context) :
            component;
    }, {
        keyFn: (props, state, context) => {
            // Create key based on props and state
            return `${name}:${JSON.stringify(props)}:${JSON.stringify(state)}`;
        },
        compareFn: (a, b) => {
            // Custom comparison for component args
            return propsEqual(a.props, b.props) &&
                stateEqual(a.state, b.state);
        },
        ...options
    });
}

/**
 * Async memoization with promise caching
 */
export function memoAsync(asyncFn, options = {}) {
    const promiseCache = new Map();

    const memoized = memo((...args) => {
        const key = options.keyFn ?
            options.keyFn(...args) :
            JSON.stringify(args);

        // Check if promise is already running
        if (promiseCache.has(key)) {
            return promiseCache.get(key);
        }

        // Start new async operation
        const promise = asyncFn(...args).catch(error => {
            // Remove failed promise from cache
            promiseCache.delete(key);
            throw error;
        });

        promiseCache.set(key, promise);

        // Clean up resolved promise
        promise.finally(() => {
            setTimeout(() => promiseCache.delete(key), 0);
        });

        return promise;
    }, options);

    // Clear both caches
    const originalClear = memoized.clear;
    memoized.clear = () => {
        originalClear();
        promiseCache.clear();
    };

    return memoized;
}

/**
 * LRU Cache implementation
 */
class LRUCache {
    constructor(maxSize = 100, options = {}) {
        this.maxSize = maxSize;
        this.cache = new Map();
        this.onEvict = options.onEvict;
    }

    get(key) {
        if (this.cache.has(key)) {
            // Move to end (most recently used)
            const value = this.cache.get(key);
            this.cache.delete(key);
            this.cache.set(key, value);
            return value;
        }
        return undefined;
    }

    set(key, value) {
        if (this.cache.has(key)) {
            // Update existing
            this.cache.delete(key);
        } else if (this.cache.size >= this.maxSize) {
            // Evict least recently used (first entry)
            const firstKey = this.cache.keys().next().value;
            const evicted = this.cache.get(firstKey);
            this.cache.delete(firstKey);

            if (this.onEvict) {
                this.onEvict(firstKey, evicted);
            }
        }

        this.cache.set(key, value);
    }

    has(key) {
        return this.cache.has(key);
    }

    delete(key) {
        return this.cache.delete(key);
    }

    clear() {
        this.cache.clear();
    }

    get size() {
        return this.cache.size;
    }
}

/**
 * TTL Cache implementation
 */
class TTLCache {
    constructor(ttl, options = {}) {
        this.ttl = ttl;
        this.cache = new Map();
        this.timers = new Map();
        this.onEvict = options.onEvict;
    }

    get(key) {
        if (this.cache.has(key)) {
            const entry = this.cache.get(key);

            if (Date.now() < entry.expires) {
                return entry.value;
            } else {
                // Expired
                this.delete(key);
            }
        }
        return undefined;
    }

    set(key, value) {
        // Clear existing timer
        if (this.timers.has(key)) {
            clearTimeout(this.timers.get(key));
        }

        const expires = Date.now() + this.ttl;
        this.cache.set(key, {value, expires});

        // Set expiration timer
        const timer = setTimeout(() => {
            this.delete(key);
        }, this.ttl);

        this.timers.set(key, timer);
    }

    has(key) {
        if (this.cache.has(key)) {
            const entry = this.cache.get(key);
            return Date.now() < entry.expires;
        }
        return false;
    }

    delete(key) {
        const had = this.cache.has(key);

        if (had) {
            const entry = this.cache.get(key);
            this.cache.delete(key);

            if (this.timers.has(key)) {
                clearTimeout(this.timers.get(key));
                this.timers.delete(key);
            }

            if (this.onEvict) {
                this.onEvict(key, entry.value);
            }
        }

        return had;
    }

    clear() {
        // Clear all timers
        this.timers.forEach(timer => clearTimeout(timer));
        this.timers.clear();
        this.cache.clear();
    }

    get size() {
        return this.cache.size;
    }
}

/**
 * Shallow equality check for objects
 */
function shallowEqual(a, b) {
    if (a === b) return true;
    if (!a || !b) return false;
    if (typeof a !== typeof b) return false;

    if (Array.isArray(a) && Array.isArray(b)) {
        if (a.length !== b.length) return false;
        return a.every((item, index) => item === b[index]);
    }

    if (typeof a === 'object') {
        const keysA = Object.keys(a);
        const keysB = Object.keys(b);

        if (keysA.length !== keysB.length) return false;

        return keysA.every(key => a[key] === b[key]);
    }

    return false;
}

/**
 * Memoization utilities
 */
export const memoUtils = {
    /**
     * Create a memo with automatic dependency tracking
     */
    auto: (fn, dependencies = []) => {
        let lastDeps = null;
        let cached = null;
        let hasCached = false;

        return (...args) => {
            const currentDeps = dependencies.map(dep =>
                typeof dep === 'function' ? dep() : dep
            );

            if (!hasCached || !shallowEqual(lastDeps, currentDeps)) {
                cached = fn(...args);
                lastDeps = currentDeps;
                hasCached = true;
            }

            return cached;
        };
    },

    /**
     * Memo with size-based eviction
     */
    sized: (fn, maxSize = 50) => memo(fn, {strategy: 'lru', maxSize}),

    /**
     * Memo with time-based eviction
     */
    timed: (fn, ttl = 5000) => memo(fn, {strategy: 'ttl', ttl}),

    /**
     * Weak memo (garbage collected with keys)
     */
    weak: (fn) => memo(fn, {strategy: 'weak'}),

    /**
     * Create multiple memoized variants
     */
    variants: (fn, configs) => {
        const variants = {};

        Object.entries(configs).forEach(([name, config]) => {
            variants[name] = memo(fn, config);
        });

        return variants;
    },

    /**
     * Conditional memoization
     */
    conditional: (fn, shouldMemo = () => true) => {
        const memoized = memo(fn);

        return (...args) => {
            if (shouldMemo(...args)) {
                return memoized(...args);
            }
            return fn(...args);
        };
    },

    /**
     * Memo with custom storage
     */
    custom: (fn, storage) => {
        return (...args) => {
            const key = JSON.stringify(args);

            if (storage.has(key)) {
                return storage.get(key);
            }

            const result = fn(...args);
            storage.set(key, result);
            return result;
        };
    }
};

/**
 * Higher-order function utilities for component composition and prop manipulation
 */

/**
 * Enhanced withProps utility for component prop transformation and injection
 */
export function withProps(propsTransform, options = {}) {
    const {
        // Transformation options
        merge = true,               // Merge with existing props vs replace
        override = false,           // Allow overriding existing props
        validate = null,            // Validation function for props

        // Caching and performance
        memoize = false,            // Memoize the transformation
        memoOptions = {},           // Memoization options

        // Error handling
        onError = null,             // Error handler for transformation
        fallbackProps = {},         // Fallback props on error

        // Development
        displayName = null,         // Component name for debugging
        debug = false,              // Debug logging

        // Lifecycle
        onPropsChange = null,       // Called when props change
        shouldUpdate = null         // Custom update logic
    } = options;

    return function withPropsHOC(WrappedComponent) {
        // Create the enhanced component
        function WithPropsComponent(originalProps = {}, state = {}, context = {}) {
            try {
                // Transform props
                let transformedProps;

                if (typeof propsTransform === 'function') {
                    transformedProps = propsTransform(originalProps, state, context);
                } else if (typeof propsTransform === 'object') {
                    transformedProps = propsTransform;
                } else {
                    transformedProps = {};
                }

                // Handle async transformations
                if (transformedProps && typeof transformedProps.then === 'function') {
                    return transformedProps.then(resolved => {
                        return processProps(resolved, originalProps, WrappedComponent, state, context);
                    }).catch(error => {
                        if (onError) onError(error, originalProps);
                        return processProps(fallbackProps, originalProps, WrappedComponent, state, context);
                    });
                }

                return processProps(transformedProps, originalProps, WrappedComponent, state, context);

            } catch (error) {
                if (debug) console.error('withProps error:', error);
                if (onError) onError(error, originalProps);

                // Use fallback props
                return processProps(fallbackProps, originalProps, WrappedComponent, state, context);
            }
        }

        // Process and merge props
        function processProps(transformed, original, component, state, context) {
            let finalProps;

            if (merge) {
                if (override) {
                    finalProps = {...original, ...transformed};
                } else {
                    // Don't override existing props
                    finalProps = {...transformed, ...original};
                }
            } else {
                finalProps = transformed;
            }

            // Validate final props
            if (validate && !validate(finalProps)) {
                if (debug) console.warn('Props validation failed:', finalProps);
                finalProps = {...finalProps, ...fallbackProps};
            }

            // Check if should update
            if (shouldUpdate && !shouldUpdate(finalProps, original, state)) {
                return null; // Skip update
            }

            // Notify props change
            if (onPropsChange) {
                onPropsChange(finalProps, original, transformed);
            }

            if (debug) {
                console.log('withProps transformation:', {
                    original,
                    transformed,
                    final: finalProps
                });
            }

            // Render wrapped component
            return typeof component === 'function' ?
                component(finalProps, state, context) :
                component;
        }

        // Set display name for debugging
        WithPropsComponent.displayName = displayName ||
            `withProps(${WrappedComponent.displayName || WrappedComponent.name || 'Component'})`;

        // Add metadata
        WithPropsComponent.__isHOC = true;
        WithPropsComponent.__wrappedComponent = WrappedComponent;
        WithPropsComponent.__transform = propsTransform;

        // Apply memoization if requested
        if (memoize) {
            return memo(WithPropsComponent, {
                keyFn: (props, state, context) => JSON.stringify({props, state}),
                ...memoOptions
            });
        }

        return WithPropsComponent;
    };
}

/**
 * Specialized withProps variants
 */
export const withPropsUtils = {
    /**
     * Add static props to component
     */
    static: (staticProps) => withProps(() => staticProps),

    /**
     * Transform props based on conditions
     */
    conditional: (condition, trueProps, falseProps = {}) =>
        withProps((props, state, context) => {
            const shouldApply = typeof condition === 'function' ?
                condition(props, state, context) :
                condition;

            return shouldApply ? trueProps : falseProps;
        }),

    /**
     * Map specific props to new names/values
     */
    map: (mapping) => withProps((props) => {
        const result = {};

        Object.entries(mapping).forEach(([newKey, mapper]) => {
            if (typeof mapper === 'string') {
                // Simple property rename
                result[newKey] = props[mapper];
            } else if (typeof mapper === 'function') {
                // Transform function
                result[newKey] = mapper(props);
            } else {
                // Static value
                result[newKey] = mapper;
            }
        });

        return result;
    }),

    /**
     * Pick only specific props
     */
    pick: (keys) => withProps((props) => {
        const result = {};
        keys.forEach(key => {
            if (props.hasOwnProperty(key)) {
                result[key] = props[key];
            }
        });
        return result;
    }),

    /**
     * Omit specific props
     */
    omit: (keys) => withProps((props) => {
        const result = {...props};
        keys.forEach(key => delete result[key]);
        return result;
    }),

    /**
     * Default values for missing props
     */
    defaults: (defaultProps) => withProps((props) => ({
        ...defaultProps,
        ...props
    }), {merge: false}),

    /**
     * Transform props with validation
     */
    validated: (transform, validator) => withProps(transform, {
        validate: validator,
        onError: (error) => console.warn('Prop validation failed:', error)
    }),

    /**
     * Async prop transformation
     */
    async: (asyncTransform, loadingProps = {}) => withProps(async (props, state, context) => {
        try {
            return await asyncTransform(props, state, context);
        } catch (error) {
            console.error('Async prop transform failed:', error);
            return loadingProps;
        }
    }, {
        fallbackProps: loadingProps
    }),

    /**
     * Computed props based on other props
     */
    computed: (computedProps) => withProps((props) => {
        const computed = {};

        Object.entries(computedProps).forEach(([key, compute]) => {
            computed[key] = typeof compute === 'function' ?
                compute(props) :
                compute;
        });

        return computed;
    }),

    /**
     * Props with context injection
     */
    withContext: (contextKeys) => withProps((props, state, context) => {
        const contextProps = {};

        contextKeys.forEach(key => {
            if (context && context[key] !== undefined) {
                contextProps[key] = context[key];
            }
        });

        return contextProps;
    }),

    /**
     * Props with state injection
     */
    withState: (stateMapping) => withProps((props, state) => {
        if (typeof stateMapping === 'function') {
            return stateMapping(state, props);
        }

        const stateProps = {};
        Object.entries(stateMapping).forEach(([propKey, stateKey]) => {
            stateProps[propKey] = state[stateKey];
        });

        return stateProps;
    }),

    /**
     * Memoized prop transformation
     */
    memoized: (transform, memoOptions = {}) => withProps(transform, {
        memoize: true,
        memoOptions: {
            maxSize: 50,
            ...memoOptions
        }
    }),

    /**
     * Props with performance measurement
     */
    timed: (transform, name = 'PropTransform') => withProps((props, state, context) => {
        const start = performance.now();
        const result = transform(props, state, context);
        const end = performance.now();

        if (end - start > 1) { // Log if > 1ms
            console.log(`${name} took ${(end - start).toFixed(2)}ms`);
        }

        return result;
    }),

    /**
     * Chain multiple prop transformations
     */
    chain: (...transforms) => withProps((props, state, context) => {
        return transforms.reduce((acc, transform) => {
            if (typeof transform === 'function') {
                return {...acc, ...transform(acc, state, context)};
            }
            return {...acc, ...transform};
        }, props);
    })
};

/**
 * Create a reusable prop transformer
 */
export function createPropTransformer(config) {
    const {
        transforms = [],
        validators = [],
        defaults = {},
        options = {}
    } = config;

    return withProps((props, state, context) => {
        let result = {...defaults, ...props};

        // Apply transforms in sequence
        for (const transform of transforms) {
            if (typeof transform === 'function') {
                result = {...result, ...transform(result, state, context)};
            } else {
                result = {...result, ...transform};
            }
        }

        // Run validators
        for (const validator of validators) {
            if (!validator(result)) {
                throw new Error('Prop validation failed');
            }
        }

        return result;
    }, options);
}

/**
 * Props debugging utility
 */
export function withPropsDebug(component, debugOptions = {}) {
    const {
        logProps = true,
        logChanges = true,
        breakOnError = false
    } = debugOptions;

    return withProps((props, state, context) => {
        if (logProps) {
            console.group(`Props Debug: ${component.name || 'Component'}`);
            console.log('Props:', props);
            console.log('State:', state);
            console.log('Context:', context);
            console.groupEnd();
        }

        return props;
    }, {
        debug: true,
        onError: breakOnError ? (error) => {
            debugger
        } : undefined,
        onPropsChange: logChanges ? (finalProps, original) => {
            console.log('Props changed:', {from: original, to: finalProps});
        } : undefined
    })(component);
}

/**
 * State management utilities for component state injection and management
 */

/**
 * Enhanced withState utility for component state management and injection
 */
export function withState(initialState = {}, options = {}) {
    const {
        // State options
        persistent = false,         // Persist state across component unmounts
        storageKey = null,          // Key for persistent storage
        storage = typeof localStorage !== 'undefined' ? localStorage : {
            // Fallback storage for Node.js environments
            _data: new Map(),
            setItem(key, value) { this._data.set(key, value); },
            getItem(key) { return this._data.get(key) || null; },
            removeItem(key) { this._data.delete(key); },
            clear() { this._data.clear(); }
        },     // Storage mechanism

        // State transformation
        stateTransform = null,      // Transform state before injection
        propName = 'state',         // Prop name for state injection
        actionsName = 'actions',    // Prop name for action injection

        // Reducers and actions
        reducer = null,             // State reducer function
        actions = {},               // Action creators
        middleware = [],            // State middleware

        // Performance
        memoizeState = false,       // Memoize state transformations
        shallow = false,            // Shallow state comparison

        // Development
        devTools = false,           // Connect to dev tools
        debug = false,              // Debug logging
        displayName = null,         // Component name for debugging

        // Lifecycle hooks
        onStateChange = null,       // Called when state changes
        onMount = null,             // Called when component mounts
        onUnmount = null,           // Called when component unmounts

        // Validation
        validator = null,           // State validator function

        // Async state
        supportAsync = false        // Support async state updates
    } = options;

    return function withStateHOC(WrappedComponent) {
        // Create state container
        const stateContainer = createStateContainer(initialState, {
            persistent,
            storageKey: storageKey || `${getComponentName(WrappedComponent)}_state`,
            storage,
            reducer,
            middleware,
            validator,
            onStateChange,
            debug
        });

        function WithStateComponent(props = {}, globalState = {}, context = {}) {
            // Initialize component state if not exists
            if (!stateContainer.initialized) {
                stateContainer.initialize();

                if (onMount) {
                    onMount(stateContainer.getState(), props, context);
                }
            }

            // Get current state
            const currentState = stateContainer.getState();

            // Transform state if needed
            let transformedState = currentState;
            if (stateTransform) {
                transformedState = stateTransform(currentState, props, context);
            }

            // Create actions bound to this state container
            const boundActions = createBoundActions(actions, stateContainer, {
                props,
                context,
                supportAsync,
                debug
            });

            // Create state management utilities
            const stateUtils = {
                // Basic state operations
                setState: stateContainer.setState.bind(stateContainer),
                getState: stateContainer.getState.bind(stateContainer),
                resetState: () => stateContainer.setState(initialState),

                // Advanced operations
                updateState: (updater) => {
                    const current = stateContainer.getState();
                    const next = typeof updater === 'function' ? updater(current) : updater;
                    stateContainer.setState(next);
                },

                // Batch updates
                batchUpdate: (updates) => {
                    stateContainer.batch(() => {
                        updates.forEach(update => {
                            if (typeof update === 'function') {
                                update(stateContainer);
                            } else {
                                stateContainer.setState(update);
                            }
                        });
                    });
                },

                // Computed state
                computed: (computeFn) => {
                    return memoizeState ?
                        memo(computeFn)(transformedState) :
                        computeFn(transformedState);
                },

                // State subscription
                subscribe: stateContainer.subscribe.bind(stateContainer),
                unsubscribe: stateContainer.unsubscribe.bind(stateContainer),

                // Async state operations
                ...(supportAsync && {
                    setStateAsync: async (stateOrPromise) => {
                        const resolved = await Promise.resolve(stateOrPromise);
                        stateContainer.setState(resolved);
                    },

                    updateStateAsync: async (asyncUpdater) => {
                        const current = stateContainer.getState();
                        const next = await Promise.resolve(asyncUpdater(current));
                        stateContainer.setState(next);
                    }
                })
            };

            // Prepare enhanced props
            const enhancedProps = {
                ...props,
                [propName]: transformedState,
                [actionsName]: boundActions,
                stateUtils
            };

            if (debug) {
                console.log('withState render:', {
                    component: getComponentName(WrappedComponent),
                    state: transformedState,
                    props: enhancedProps
                });
            }

            // Render wrapped component
            return typeof WrappedComponent === 'function' ?
                WrappedComponent(enhancedProps, globalState, context) :
                WrappedComponent;
        }

        // Set display name
        WithStateComponent.displayName = displayName ||
            `withState(${getComponentName(WrappedComponent)})`;

        // Add metadata
        WithStateComponent.__isHOC = true;
        WithStateComponent.__hasState = true;
        WithStateComponent.__stateContainer = stateContainer;
        WithStateComponent.__wrappedComponent = WrappedComponent;

        // Cleanup on unmount
        WithStateComponent.cleanup = () => {
            if (onUnmount) {
                onUnmount(stateContainer.getState());
            }

            if (!persistent) {
                stateContainer.destroy();
            }
        };

        return WithStateComponent;
    };
}

/**
 * Create a centralized state container
 */
function createStateContainer(initialState, options) {
    const {
        persistent,
        storageKey,
        storage,
        reducer,
        middleware,
        validator,
        onStateChange,
        debug
    } = options;

    let state = deepClone(initialState);
    let listeners = new Set();
    const middlewareStack = [...middleware];
    let initialized = false;

    const container = {
        initialized: false,

        initialize() {
            // Load persisted state
            if (persistent && storageKey) {
                try {
                    const saved = storage.getItem(storageKey);
                    if (saved) {
                        const parsed = JSON.parse(saved);
                        state = {...state, ...parsed};
                    }
                } catch (error) {
                    if (debug) console.warn('Failed to load persisted state:', error);
                }
            }

            this.initialized = true;
            initialized = true;
        },

        getState() {
            return deepClone(state);
        },

        setState(newState) {
            const prevState = state;

            // Apply reducer if provided
            if (reducer) {
                state = reducer(state, {type: 'SET_STATE', payload: newState});
            } else {
                state = typeof newState === 'function' ?
                    newState(state) :
                    {...state, ...newState};
            }

            // Validate state
            if (validator && !validator(state)) {
                if (debug) console.warn('State validation failed, reverting:', state);
                state = prevState;
                return false;
            }

            // Apply middleware
            state = middlewareStack.reduce((acc, middleware) =>
                middleware(acc, prevState) || acc, state
            );

            // Persist state
            if (persistent && storageKey) {
                try {
                    storage.setItem(storageKey, JSON.stringify(state));
                } catch (error) {
                    if (debug) console.warn('Failed to persist state:', error);
                }
            }

            // Notify listeners
            if (state !== prevState) {
                listeners.forEach(listener => {
                    try {
                        listener(state, prevState);
                    } catch (error) {
                        if (debug) console.error('State listener error:', error);
                    }
                });

                if (onStateChange) {
                    onStateChange(state, prevState);
                }
            }

            return true;
        },

        subscribe(listener) {
            listeners.add(listener);
            return () => listeners.delete(listener);
        },

        unsubscribe(listener) {
            return listeners.delete(listener);
        },

        batch(batchFn) {
            const originalListeners = listeners;
            listeners = new Set(); // Temporarily disable listeners

            try {
                batchFn();
            } finally {
                listeners = originalListeners;
                // Notify once after batch
                listeners.forEach(listener => listener(state));
            }
        },

        destroy() {
            listeners.clear();
            if (persistent && storageKey) {
                try {
                    storage.removeItem(storageKey);
                } catch (error) {
                    if (debug) console.warn('Failed to remove persisted state:', error);
                }
            }
        }
    };

    return container;
}

/**
 * Create bound action creators
 */
function createBoundActions(actions, stateContainer, options) {
    const {props, context, supportAsync, debug} = options;
    const boundActions = {};

    Object.entries(actions).forEach(([actionName, actionCreator]) => {
        boundActions[actionName] = (...args) => {
            try {
                const result = actionCreator(
                    stateContainer.getState(),
                    stateContainer.setState.bind(stateContainer),
                    {props, context, args}
                );

                // Handle async actions
                if (supportAsync && result && typeof result.then === 'function') {
                    return result.catch(error => {
                        if (debug) console.error(`Async action ${actionName} failed:`, error);
                        throw error;
                    });
                }

                return result;
            } catch (error) {
                if (debug) console.error(`Action ${actionName} failed:`, error);
                throw error;
            }
        };
    });

    return boundActions;
}

/**
 * Specialized withState variants
 */
export const withStateUtils = {
    /**
     * Simple local state
     */
    local: (initialState) => withState(initialState),

    /**
     * Persistent state with localStorage
     */
    persistent: (initialState, key) => withState(initialState, {
        persistent: true,
        storageKey: key
    }),

    /**
     * State with reducer pattern
     */
    reducer: (initialState, reducer, actions = {}) => withState(initialState, {
        reducer,
        actions
    }),

    /**
     * Async state management
     */
    async: (initialState, asyncActions = {}) => withState(initialState, {
        supportAsync: true,
        actions: asyncActions
    }),

    /**
     * State with validation
     */
    validated: (initialState, validator) => withState(initialState, {
        validator,
        debug: true
    }),

    /**
     * Shared state across components
     */
    shared: (initialState, sharedKey) => {
        const sharedStates = withStateUtils._shared || (withStateUtils._shared = new Map());

        if (!sharedStates.has(sharedKey)) {
            sharedStates.set(sharedKey, createStateContainer(initialState, {}));
        }

        return (WrappedComponent) => {
            const sharedContainer = sharedStates.get(sharedKey);

            function SharedStateComponent(props, globalState, context) {
                const currentState = sharedContainer.getState();

                const enhancedProps = {
                    ...props,
                    state: currentState,
                    setState: sharedContainer.setState.bind(sharedContainer),
                    subscribe: sharedContainer.subscribe.bind(sharedContainer)
                };

                return typeof WrappedComponent === 'function' ?
                    WrappedComponent(enhancedProps, globalState, context) :
                    WrappedComponent;
            }

            SharedStateComponent.displayName = `withSharedState(${getComponentName(WrappedComponent)})`;
            return SharedStateComponent;
        };
    },

    /**
     * State with form utilities
     */
    form: (initialFormState) => withState(initialFormState, {
        actions: {
            updateField: (state, setState, {args: [field, value]}) => {
                setState({[field]: value});
            },

            updateMultiple: (state, setState, {args: [updates]}) => {
                setState(updates);
            },

            resetForm: (state, setState) => {
                setState(initialFormState);
            },

            validateForm: (state, setState, {args: [validator]}) => {
                const errors = validator(state);
                setState({_errors: errors});
                return Object.keys(errors).length === 0;
            }
        }
    }),

    /**
     * State with loading/error handling
     */
    withLoading: async (initialState) => withState({
        ...initialState,
        _loading: false,
        _error: null
    }, {
        supportAsync: true,
        actions: {
            setLoading: (state, setState, {args: [loading]}) => {
                setState({_loading: loading});
            },

            setError: (state, setState, {args: [error]}) => {
                setState({_error: error, _loading: false});
            },

            clearError: (state, setState) => {
                setState({_error: null});
            },

            asyncAction: async (state, setState, {args: [asyncFn]}) => {
                setState({_loading: true, _error: null});
                try {
                    const result = await asyncFn(state);
                    setState({_loading: false});
                    return result;
                } catch (error) {
                    setState({_loading: false, _error: error});
                    throw error;
                }
            }
        }
    }),

    /**
     * State with undo/redo functionality
     */
    withHistory: (initialState, maxHistory = 10) => {
        const historyState = {
            present: initialState,
            past: [],
            future: []
        };

        return withState(historyState, {
            actions: {
                undo: (state, setState) => {
                    if (state.past.length === 0) return;

                    const previous = state.past[state.past.length - 1];
                    const newPast = state.past.slice(0, state.past.length - 1);

                    setState({
                        past: newPast,
                        present: previous,
                        future: [state.present, ...state.future]
                    });
                },

                redo: (state, setState) => {
                    if (state.future.length === 0) return;

                    const next = state.future[0];
                    const newFuture = state.future.slice(1);

                    setState({
                        past: [...state.past, state.present],
                        present: next,
                        future: newFuture
                    });
                },

                updatePresent: (state, setState, {args: [newPresent]}) => {
                    setState({
                        past: [...state.past, state.present].slice(-maxHistory),
                        present: newPresent,
                        future: []
                    });
                },

                canUndo: (state) => state.past.length > 0,
                canRedo: (state) => state.future.length > 0
            }
        });
    },

    /**
     * Computed state properties
     */
    computed: (initialState, computedProps) => withState(initialState, {
        stateTransform: (state) => {
            const computed = {};
            Object.entries(computedProps).forEach(([key, computeFn]) => {
                computed[key] = computeFn(state);
            });
            return {...state, ...computed};
        },
        memoizeState: true
    })
};

/**
 * Create a compound state manager
 */
export function createStateManager(config) {
    const {
        initialState = {},
        reducers = {},
        actions = {},
        middleware = [],
        plugins = []
    } = config;

    // Combine reducers
    const rootReducer = (state, action) => {
        let nextState = state;

        Object.entries(reducers).forEach(([key, reducer]) => {
            nextState = {
                ...nextState,
                [key]: reducer(nextState[key], action)
            };
        });

        return nextState;
    };

    // Apply plugins
    const enhancedConfig = plugins.reduce(
        (acc, plugin) => plugin(acc),
        {initialState, reducer: rootReducer, actions, middleware}
    );

    return withState(enhancedConfig.initialState, {
        reducer: enhancedConfig.reducer,
        actions: enhancedConfig.actions,
        middleware: enhancedConfig.middleware
    });
}

// Utility to get component name
function getComponentName(component) {
    return component.displayName ||
        component.name ||
        component.constructor?.name ||
        'Component';
}

export default {
    Component,
    createComponent,
    defineComponent,
    registerComponent,
    getComponent,
    getRegisteredComponents,
    createHOC,
    createMixin,
    compose,
    componentUtils,
    dev,
    lazy,
    lazyUtils,
    evaluateLazy,
    evaluateWithTimeout,
    batchEvaluate,
    hashDependencies,
    memo,
    memoUtils,
    withProps,
    withPropsUtils,
    withPropsDebug,
    withState,
    createStateManager,
    getComponentName,
    withStateUtils
};
