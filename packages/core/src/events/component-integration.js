/**
 * Component Integration for Coherent.js Event Bus
 *
 * Provides higher-order components and utilities for integrating
 * the event bus with Coherent.js components and state management.
 */

import { globalEventBus } from './event-bus.js';
import { withProps, withState } from '../components/component-system.js';

/**
 * Higher-order component that provides event bus integration
 * @param {Object} options - Integration options
 * @returns {Function} HOC function
 */
export function withEventBus(options = {}) {
    const {
        scope = null,           // Event scope for namespacing
        events = {},            // Event listeners to register
        actions = {},           // Action handlers to register
        eventBus = globalEventBus,
        debug = false,
        autoCleanup = true
    } = options;

    return function withEventBusHOC(WrappedComponent) {
        function EventBusComponent(props = {}, state = {}, context = {}) {
            // Create scoped event bus if scope is provided
            const bus = scope ? eventBus.createScope(scope) : eventBus;

            // Register event listeners
            const listenerIds = new Map();

            Object.entries(events).forEach(([event, handler]) => {
                const listenerId = bus.on(event, (data, eventName) => {
                    if (typeof handler === 'function') {
                        handler.call(this, data, eventName, {props, state, context});
                    }
                });
                listenerIds.set(event, listenerId);
            });

            // Register action handlers
            Object.entries(actions).forEach(([action, handler]) => {
                bus.registerAction(action, (actionContext) => {
                    if (typeof handler === 'function') {
                        handler.call(this, actionContext, {props, state, context});
                    }
                });
            });

            // Create event bus utilities for the component
            const eventUtils = {
                emit: bus.emit.bind(bus),
                emitSync: bus.emitSync.bind(bus),
                on: bus.on.bind(bus),
                once: bus.once.bind(bus),
                off: bus.off.bind(bus),
                registerAction: bus.registerAction.bind(bus),
                handleAction: bus.handleAction.bind(bus),

                // Cleanup function
                cleanup: () => {
                    listenerIds.forEach((listenerId, event) => {
                        bus.off(event, listenerId);
                    });
                    listenerIds.clear();
                }
            };

            // Enhanced props with event bus
            const enhancedProps = {
                ...props,
                eventBus: bus,
                eventUtils
            };

            if (debug) {
                console.log('[withEventBus] Rendering component with event bus:', {
                    scope,
                    registeredEvents: Object.keys(events),
                    registeredActions: Object.keys(actions)
                });
            }

            // Render the wrapped component
            const result = typeof WrappedComponent === 'function'
                ? WrappedComponent(enhancedProps, state, context)
                : WrappedComponent;

            // Auto-cleanup on unmount (if supported)
            if (autoCleanup && result && typeof result === 'object') {
                // Add cleanup to the component if it supports lifecycle
                if (result.componentWillUnmount) {
                    const originalUnmount = result.componentWillUnmount;
                    result.componentWillUnmount = function() {
                        eventUtils.cleanup();
                        originalUnmount.call(this);
                    };
                } else {
                    result.__eventBusCleanup = eventUtils.cleanup;
                }
            }

            return result;
        }

        EventBusComponent.displayName = `withEventBus(${WrappedComponent.displayName || WrappedComponent.name || 'Component'})`;
        EventBusComponent.__isHOC = true;
        EventBusComponent.__eventBusIntegration = true;

        return EventBusComponent;
    };
}

/**
 * Higher-order component that combines event bus with state management
 * @param {Object} initialState - Initial component state
 * @param {Object} options - Integration options
 * @returns {Function} HOC function
 */
export function withEventState(initialState = {}, options = {}) {
    const {
        events = {},
        actions = {},
        stateActions = {},      // Actions that modify state
        eventBus = globalEventBus,
        scope = null,
        debug = false
    } = options;

    return function withEventStateHOC(WrappedComponent) {
        // First apply state management
        const StatefulComponent = withState(initialState, {
            actions: stateActions,
            debug
        })(WrappedComponent);

        // Then apply event bus integration
        return withEventBus({
            scope,
            events: {
                ...events,
                // Add state-aware event handlers
                ...Object.entries(events).reduce((acc, [event, handler]) => {
                    acc[event] = function(data, eventName, context) {
                        // Pass state utilities to event handlers
                        return handler.call(this, data, eventName, {
                            ...context,
                            stateUtils: context.props.stateUtils
                        });
                    };
                    return acc;
                }, {})
            },
            actions: {
                ...actions,
                // Add state-aware action handlers
                ...Object.entries(actions).reduce((acc, [action, handler]) => {
                    acc[action] = function(actionContext, componentContext) {
                        // Pass state utilities to action handlers
                        return handler.call(this, actionContext, {
                            ...componentContext,
                            stateUtils: componentContext.props.stateUtils
                        });
                    };
                    return acc;
                }, {})
            },
            eventBus,
            debug
        })(StatefulComponent);
    };
}

/**
 * Create action handlers for common patterns
 */
export const createActionHandlers = {
    /**
     * Create a modal control action handler
     * @param {string} modalId - Modal identifier
     * @returns {Object} Action handlers for modal control
     */
    modal: (modalId) => ({
        'open-modal': ({data, emit}) => {
            const targetModalId = data.modalId || modalId;
            emit('modal:open', {modalId: targetModalId});
        },
        'close-modal': ({data, emit}) => {
            const targetModalId = data.modalId || modalId;
            emit('modal:close', {modalId: targetModalId});
        },
        'toggle-modal': ({data, emit}) => {
            const targetModalId = data.modalId || modalId;
            emit('modal:toggle', {modalId: targetModalId});
        }
    }),

    /**
     * Create form handling action handlers
     * @param {Object} options - Form handling options
     * @returns {Object} Action handlers for forms
     */
    form: (options = {}) => {
        const {
            onSubmit = null,
            onValidate = null,
            onReset = null
        } = options;

        return {
            'submit-form': ({element, data, emit}) => {
                const formData = extractFormData(element.closest('form'));

                if (onValidate) {
                    const isValid = onValidate(formData);
                    if (!isValid) {
                        emit('form:validation-failed', {formData});
                        return;
                    }
                }

                if (onSubmit) {
                    onSubmit(formData);
                }

                emit('form:submit', {formData, element});
            },
            'reset-form': ({element, emit}) => {
                const form = element.closest('form');
                if (form) {
                    form.reset();
                }

                if (onReset) {
                    onReset();
                }

                emit('form:reset', {element});
            },
            'validate-form': ({element, emit}) => {
                const formData = extractFormData(element.closest('form'));

                if (onValidate) {
                    const isValid = onValidate(formData);
                    emit('form:validation', {formData, isValid});
                }
            }
        };
    },

    /**
     * Create CRUD action handlers
     * @param {Object} options - CRUD options
     * @returns {Object} Action handlers for CRUD operations
     */
    crud: (options = {}) => {
        const {
            entityName = 'item',
            onCreate = null,
            onUpdate = null,
            onDelete = null,
            onRead = null
        } = options;

        return {
            [`create-${entityName}`]: ({data, emit}) => {
                if (onCreate) {
                    onCreate(data);
                }
                emit(`${entityName}:create`, data);
            },
            [`update-${entityName}`]: ({data, emit}) => {
                if (onUpdate) {
                    onUpdate(data);
                }
                emit(`${entityName}:update`, data);
            },
            [`delete-${entityName}`]: ({data, emit}) => {
                if (onDelete) {
                    onDelete(data);
                }
                emit(`${entityName}:delete`, data);
            },
            [`read-${entityName}`]: ({data, emit}) => {
                if (onRead) {
                    onRead(data);
                }
                emit(`${entityName}:read`, data);
            }
        };
    },

    /**
     * Create navigation action handlers
     * @param {Object} options - Navigation options
     * @returns {Object} Action handlers for navigation
     */
    navigation: (options = {}) => {
        const {
            onNavigate = null,
            history = null
        } = options;

        return {
            'navigate-to': ({data, emit}) => {
                const {url, replace = false} = data;

                if (history) {
                    if (replace) {
                        history.replace(url);
                    } else {
                        history.push(url);
                    }
                } else if (typeof window !== 'undefined') {
                    if (replace) {
                        window.location.replace(url);
                    } else {
                        window.location.href = url;
                    }
                }

                if (onNavigate) {
                    onNavigate(url, replace);
                }

                emit('navigation:change', {url, replace});
            },
            'navigate-back': ({emit}) => {
                if (history) {
                    history.goBack();
                } else if (typeof window !== 'undefined') {
                    window.history.back();
                }

                emit('navigation:back');
            }
        };
    }
};

/**
 * Create event handlers for common patterns
 */
export const createEventHandlers = {
    /**
     * Create notification event handlers
     * @param {Function} showNotification - Function to show notifications
     * @returns {Object} Event handlers for notifications
     */
    notifications: (showNotification) => ({
        'notification:show': (data) => {
            showNotification(data);
        },
        'notification:success': (data) => {
            showNotification({
                type: 'success',
                message: data.message || 'Operation successful',
                ...data
            });
        },
        'notification:error': (data) => {
            showNotification({
                type: 'error',
                message: data.message || 'An error occurred',
                ...data
            });
        },
        'notification:warning': (data) => {
            showNotification({
                type: 'warning',
                message: data.message || 'Warning',
                ...data
            });
        },
        'notification:info': (data) => {
            showNotification({
                type: 'info',
                message: data.message || 'Information',
                ...data
            });
        }
    }),

    /**
     * Create loading state event handlers
     * @param {Function} setLoading - Function to set loading state
     * @returns {Object} Event handlers for loading states
     */
    loading: (setLoading) => ({
        'loading:start': (data) => {
            setLoading(true, data);
        },
        'loading:stop': (data) => {
            setLoading(false, data);
        },
        'loading:toggle': (data) => {
            setLoading(current => !current, data);
        }
    })
};

/**
 * Utility to create a component with built-in event patterns
 * @param {Function} component - Component function
 * @param {Object} options - Configuration options
 * @returns {Function} Enhanced component
 */
export function createEventComponent(component, options = {}) {
    const {
        initialState = {},
        scope = null,
        patterns = [],          // Array of pattern names: ['modal', 'form', 'crud', 'navigation']
        patternOptions = {},    // Options for each pattern
        customActions = {},
        customEvents = {},
        debug = false
    } = options;

    // Build actions from patterns
    let actions = {...customActions};
    patterns.forEach(pattern => {
        const patternActions = createActionHandlers[pattern]?.(patternOptions[pattern] || {});
        if (patternActions) {
            actions = {...actions, ...patternActions};
        }
    });

    // Build events from patterns
    let events = {...customEvents};
    patterns.forEach(pattern => {
        const patternEvents = createEventHandlers[pattern]?.(patternOptions[pattern]);
        if (patternEvents) {
            events = {...events, ...patternEvents};
        }
    });

    return withEventState(initialState, {
        scope,
        actions,
        events,
        debug
    })(component);
}

/**
 * Decorator for adding event bus to component methods
 * @param {string} eventName - Event to emit
 * @param {Object} options - Emit options
 * @returns {Function} Method decorator
 */
export function emitEvent(eventName, options = {}) {
    const {
        scope = null,
        data = null,
        async = false
    } = options;

    return function decorator(target, propertyKey, descriptor) {
        const originalMethod = descriptor.value;

        descriptor.value = function(...args) {
            const bus = scope ? globalEventBus.createScope(scope) : globalEventBus;

            const result = originalMethod.apply(this, args);

            const eventData = typeof data === 'function' ? data(args, result) : data;

            if (async) {
                bus.emit(eventName, eventData);
            } else {
                bus.emitSync(eventName, eventData);
            }

            return result;
        };

        return descriptor;
    };
}

/**
 * Utility function to extract form data
 * @private
 */
function extractFormData(form) {
    if (!form) return {};

    const formData = new FormData(form);
    const data = {};

    for (const [key, value] of formData.entries()) {
        if (data[key]) {
            if (Array.isArray(data[key])) {
                data[key].push(value);
            } else {
                data[key] = [data[key], value];
            }
        } else {
            data[key] = value;
        }
    }

    return data;
}

export default {
    withEventBus,
    withEventState,
    createActionHandlers,
    createEventHandlers,
    createEventComponent,
    emitEvent
};