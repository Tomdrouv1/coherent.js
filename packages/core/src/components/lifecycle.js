/**
 * Component Lifecycle System for Coherent.js
 * Provides hooks and events for component lifecycle management
 */

import { globalErrorHandler } from '../utils/_error-handler.js';
import { ReactiveState } from '../state/reactive-state.js';

/**
 * Lifecycle phases
 */
export const LIFECYCLE_PHASES = {
    BEFORE_CREATE: 'beforeCreate',
    CREATED: 'created',
    BEFORE_MOUNT: 'beforeMount',
    MOUNTED: 'mounted',
    BEFORE_UPDATE: 'beforeUpdate',
    UPDATED: 'updated',
    BEFORE_UNMOUNT: 'beforeUnmount',
    UNMOUNTED: 'unmounted',
    ERROR: '_error'
};

/**
 * Component instance tracker
 */
const componentInstances = new WeakMap();
const componentRegistry = new Map();

/**
 * Component lifecycle manager
 */
export class ComponentLifecycle {
    constructor(component, options = {}) {
        this.component = component;
        this.id = this.generateId();
        this.options = options;
        this.phase = null;
        this.hooks = new Map();
        this.state = new ReactiveState();
        this.props = {};
        this.context = {};
        this.isMounted = false;
        this.isDestroyed = false;
        this.children = new Set();
        this.parent = null;
        this.eventHandlers = new Map();
        this.timers = new Set();
        this.subscriptions = new Set();

        // Register instance
        componentInstances.set(component, this);
        componentRegistry.set(this.id, this);

        // Initialize lifecycle
        this.executeHook(LIFECYCLE_PHASES.BEFORE_CREATE);
        this.executeHook(LIFECYCLE_PHASES.CREATED);
    }

    /**
     * Generate unique component ID
     */
    generateId() {
        return `comp_${Date.now()}_${Math.random().toString(36).substr(2, 9)}`;
    }

    /**
     * Add lifecycle hook
     */
    hook(phase, callback) {
        if (typeof callback !== 'function') {
            throw new Error(`Hook callback must be a function for phase: ${phase}`);
        }

        if (!this.hooks.has(phase)) {
            this.hooks.set(phase, []);
        }

        this.hooks.get(phase).push(callback);
        return this;
    }

    /**
     * Execute hooks for a specific phase
     */
    async executeHook(phase, ...args) {
        if (this.isDestroyed) {
            return;
        }

        this.phase = phase;
        const hooks = this.hooks.get(phase) || [];

        for (const hook of hooks) {
            try {
                await hook.call(this, ...args);
            } catch (_error) {
                this.handleError(_error, phase);
            }
        }
    }

    /**
     * Handle component errors
     */
    handleError(_error, phase) {
        const enhancedError = globalErrorHandler.handle(_error, {
            component: this.component,
            context: {
                phase,
                componentId: this.id,
                props: this.props,
                state: this.state.toObject()
            }
        });

        this.executeHook(LIFECYCLE_PHASES.ERROR, enhancedError);
    }

    /**
     * Mount component
     */
    async mount(container, props = {}) {
        if (this.isMounted) {
            console.warn(`Component ${this.id} is already mounted`);
            return;
        }

        this.props = props;
        this.container = container;

        await this.executeHook(LIFECYCLE_PHASES.BEFORE_MOUNT, container, props);

        try {
            // Actual mounting logic would be handled by the renderer
            this.isMounted = true;
            await this.executeHook(LIFECYCLE_PHASES.MOUNTED, container);
        } catch (_error) {
            this.handleError(_error, 'mount');
        }
    }

    /**
     * Update component
     */
    async update(newProps = {}) {
        if (!this.isMounted || this.isDestroyed) {
            return;
        }

        const oldProps = this.props;
        this.props = { ...this.props, ...newProps };

        await this.executeHook(LIFECYCLE_PHASES.BEFORE_UPDATE, newProps, oldProps);

        try {
            // Update logic would be handled by the renderer
            await this.executeHook(LIFECYCLE_PHASES.UPDATED, this.props, oldProps);
        } catch (_error) {
            this.handleError(_error, 'update');
        }
    }

    /**
     * Unmount component
     */
    async unmount() {
        if (!this.isMounted || this.isDestroyed) {
            return;
        }

        await this.executeHook(LIFECYCLE_PHASES.BEFORE_UNMOUNT);

        try {
            // Cleanup children
            for (const child of this.children) {
                await child.unmount();
            }

            // Cleanup subscriptions
            this.subscriptions.forEach(unsub => {
                try {
                    unsub();
                } catch (_error) {
                    console.warn('Error cleaning up subscription:', _error);
                }
            });

            // Clear timers
            this.timers.forEach(timer => {
                clearTimeout(timer);
                clearInterval(timer);
            });

            // Remove event handlers
            this.eventHandlers.forEach((handler, element) => {
                handler.events.forEach((listeners, event) => {
                    listeners.forEach(listener => {
                        element.removeEventListener(event, listener);
                    });
                });
            });

            // Cleanup state
            this.state.destroy();

            this.isMounted = false;
            this.isDestroyed = true;

            await this.executeHook(LIFECYCLE_PHASES.UNMOUNTED);

            // Unregister
            componentRegistry.delete(this.id);

        } catch (_error) {
            this.handleError(_error, 'unmount');
        }
    }

    /**
     * Add child component
     */
    addChild(child) {
        child.parent = this;
        this.children.add(child);
    }

    /**
     * Remove child component
     */
    removeChild(child) {
        child.parent = null;
        this.children.delete(child);
    }

    /**
     * Add event listener with automatic cleanup
     */
    addEventListener(element, event, listener, options = {}) {
        if (!this.eventHandlers.has(element)) {
            this.eventHandlers.set(element, {
                events: new Map()
            });
        }

        const handler = this.eventHandlers.get(element);
        
        if (!handler.events.has(event)) {
            handler.events.set(event, new Set());
        }

        handler.events.get(event).add(listener);
        element.addEventListener(event, listener, options);

        // Return cleanup function
        return () => {
            handler.events.get(event).delete(listener);
            element.removeEventListener(event, listener);
        };
    }

    /**
     * Add subscription with automatic cleanup
     */
    addSubscription(unsubscribe) {
        this.subscriptions.add(unsubscribe);
        return unsubscribe;
    }

    /**
     * Set timer with automatic cleanup
     */
    setTimeout(callback, delay) {
        const timer = setTimeout(() => {
            this.timers.delete(timer);
            callback();
        }, delay);

        this.timers.add(timer);
        return timer;
    }

    setInterval(callback, interval) {
        const timer = setInterval(callback, interval);
        this.timers.add(timer);
        return timer;
    }

    /**
     * Get component statistics
     */
    getStats() {
        return {
            id: this.id,
            phase: this.phase,
            isMounted: this.isMounted,
            isDestroyed: this.isDestroyed,
            childCount: this.children.size,
            eventHandlers: this.eventHandlers.size,
            subscriptions: this.subscriptions.size,
            timers: this.timers.size,
            state: this.state.getStats()
        };
    }
}

/**
 * Event system for components
 */
export class ComponentEventSystem {
    constructor() {
        this.events = new Map();
        this.globalHandlers = new Map();
    }

    /**
     * Emit event to component or globally
     */
    emit(eventName, data = {}, target = null) {
        const event = {
            name: eventName,
            data,
            target,
            timestamp: Date.now(),
            stopped: false,
            preventDefault: false
        };

        // Target specific component
        if (target) {
            const instance = componentInstances.get(target);
            if (instance) {
                this._notifyHandlers(instance.id, event);
            }
        } else {
            // Global event
            this._notifyGlobalHandlers(event);
        }

        return event;
    }

    /**
     * Listen for events on component or globally
     */
    on(eventName, handler, componentId = null) {
        if (componentId) {
            // Component-specific event
            if (!this.events.has(componentId)) {
                this.events.set(componentId, new Map());
            }
            
            const componentEvents = this.events.get(componentId);
            if (!componentEvents.has(eventName)) {
                componentEvents.set(eventName, new Set());
            }
            
            componentEvents.get(eventName).add(handler);
        } else {
            // Global event
            if (!this.globalHandlers.has(eventName)) {
                this.globalHandlers.set(eventName, new Set());
            }
            
            this.globalHandlers.get(eventName).add(handler);
        }

        // Return unsubscribe function
        return () => this.off(eventName, handler, componentId);
    }

    /**
     * Remove event handler
     */
    off(eventName, handler, componentId = null) {
        if (componentId) {
            const componentEvents = this.events.get(componentId);
            if (componentEvents && componentEvents.has(eventName)) {
                componentEvents.get(eventName).delete(handler);
                
                // Cleanup empty sets
                if (componentEvents.get(eventName).size === 0) {
                    componentEvents.delete(eventName);
                    if (componentEvents.size === 0) {
                        this.events.delete(componentId);
                    }
                }
            }
        } else {
            const handlers = this.globalHandlers.get(eventName);
            if (handlers) {
                handlers.delete(handler);
                if (handlers.size === 0) {
                    this.globalHandlers.delete(eventName);
                }
            }
        }
    }

    /**
     * Listen once
     */
    once(eventName, handler, componentId = null) {
        const onceHandler = (event) => {
            handler(event);
            this.off(eventName, onceHandler, componentId);
        };

        return this.on(eventName, onceHandler, componentId);
    }

    /**
     * Notify component handlers
     */
    _notifyHandlers(componentId, event) {
        const componentEvents = this.events.get(componentId);
        if (componentEvents && componentEvents.has(event.name)) {
            const handlers = componentEvents.get(event.name);
            for (const handler of handlers) {
                if (event.stopped) break;
                
                try {
                    handler(event);
                } catch (_error) {
                    globalErrorHandler.handle(_error, {
                        type: 'event-handler-_error',
                        context: { event, handler: handler.toString() }
                    });
                }
            }
        }
    }

    /**
     * Notify global handlers
     */
    _notifyGlobalHandlers(event) {
        const handlers = this.globalHandlers.get(event.name);
        if (handlers) {
            for (const handler of handlers) {
                if (event.stopped) break;
                
                try {
                    handler(event);
                } catch (_error) {
                    globalErrorHandler.handle(_error, {
                        type: 'global-event-handler-_error',
                        context: { event, handler: handler.toString() }
                    });
                }
            }
        }
    }

    /**
     * Clean up events for a component
     */
    cleanup(componentId) {
        this.events.delete(componentId);
    }

    /**
     * Get event statistics
     */
    getStats() {
        return {
            componentEvents: this.events.size,
            globalEvents: this.globalHandlers.size,
            totalHandlers: Array.from(this.events.values()).reduce((sum, events) => {
                return sum + Array.from(events.values()).reduce((eventSum, handlers) => {
                    return eventSum + handlers.size;
                }, 0);
            }, 0) + Array.from(this.globalHandlers.values()).reduce((sum, handlers) => {
                return sum + handlers.size;
            }, 0)
        };
    }
}

/**
 * Global event system instance
 */
export const eventSystem = new ComponentEventSystem();

/**
 * Lifecycle hooks factory
 */
export function createLifecycleHooks() {
    const hooks = {};

    Object.values(LIFECYCLE_PHASES).forEach(phase => {
        hooks[phase] = (callback) => {
            // This would be called during component creation
            const instance = getCurrentInstance();
            if (instance) {
                instance.hook(phase, callback);
            }
        };
    });

    return hooks;
}

/**
 * Get current component instance (context-based)
 */
let currentInstance = null;

export function getCurrentInstance() {
    return currentInstance;
}

export function setCurrentInstance(instance) {
    currentInstance = instance;
}

/**
 * Lifecycle hooks for direct use
 */
export const useHooks = createLifecycleHooks();

/**
 * Utility functions for component management
 */
export const componentUtils = {
    /**
     * Get component lifecycle instance
     */
    getLifecycle(component) {
        return componentInstances.get(component);
    },

    /**
     * Create component with lifecycle
     */
    createWithLifecycle(component, options = {}) {
        const lifecycle = new ComponentLifecycle(component, options);
        return {
            component,
            lifecycle,
            mount: lifecycle.mount.bind(lifecycle),
            unmount: lifecycle.unmount.bind(lifecycle),
            update: lifecycle.update.bind(lifecycle)
        };
    },

    /**
     * Get all component instances
     */
    getAllInstances() {
        return Array.from(componentRegistry.values());
    },

    /**
     * Find component by ID
     */
    findById(id) {
        return componentRegistry.get(id);
    },

    /**
     * Emit event to component
     */
    emit(component, eventName, data) {
        return eventSystem.emit(eventName, data, component);
    },

    /**
     * Listen to component events
     */
    listen(component, eventName, handler) {
        const lifecycle = componentInstances.get(component);
        return eventSystem.on(eventName, handler, lifecycle?.id);
    }
};

/**
 * Component decorator for automatic lifecycle management
 */
export function withLifecycle(component, options = {}) {
    return function LifecycleComponent(props = {}) {
        const instance = componentUtils.getLifecycle(component);
        
        if (!instance) {
            const lifecycle = new ComponentLifecycle(component, options);
            setCurrentInstance(lifecycle);
        }

        const result = typeof component === 'function' ? component(props) : component;
        
        setCurrentInstance(null);
        
        return result;
    };
}

export default ComponentLifecycle;