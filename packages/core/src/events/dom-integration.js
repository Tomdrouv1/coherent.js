/**
 * DOM Integration for Coherent.js Event Bus
 *
 * Provides seamless integration between DOM events, data attributes,
 * and the event bus system. Enables declarative event handling in HTML.
 */

import { globalEventBus } from './event-bus.js';

/**
 * DOM Event Integration Class
 * Manages DOM event listeners and data-action attribute handling
 */
export class DOMEventIntegration {
    constructor(eventBus = globalEventBus, options = {}) {
        this.eventBus = eventBus;
        this.options = {
            debug: false,
            debounceDelay: 150,
            throttleDelay: 100,
            enableDelegation: true,
            enableDebounce: true,
            enableThrottle: false,
            ...options
        };

        this.boundHandlers = new Map();
        this.activeElement = null;
        this.isInitialized = false;

        // Bind context for event handlers
        this.handleClick = this.handleClick.bind(this);
        this.handleChange = this.handleChange.bind(this);
        this.handleInput = this.handleInput.bind(this);
        this.handleSubmit = this.handleSubmit.bind(this);
        this.handleKeydown = this.handleKeydown.bind(this);
        this.handleFocus = this.handleFocus.bind(this);
        this.handleBlur = this.handleBlur.bind(this);
    }

    /**
     * Initialize DOM event listeners
     * @param {HTMLElement} rootElement - Root element to attach listeners to (default: document)
     */
    initialize(rootElement = document) {
        if (this.isInitialized) {
            console.warn('[DOMEventIntegration] Already initialized');
            return;
        }

        if (typeof window === 'undefined' || !rootElement) {
            console.warn('[DOMEventIntegration] Cannot initialize: no DOM environment');
            return;
        }

        this.rootElement = rootElement;
        this.setupDOMEventListeners();
        this.isInitialized = true;

        if (this.options.debug) {
            console.log('[DOMEventIntegration] Initialized with options:', this.options);
        }
    }

    /**
     * Set up delegated DOM event listeners
     * @private
     */
    setupDOMEventListeners() {
        // Click events
        const clickHandler = this.createDelegatedHandler('click', this.handleClick);
        this.rootElement.addEventListener('click', clickHandler, { passive: false });
        this.boundHandlers.set('click', clickHandler);

        // Change events (with debouncing)
        const changeHandler = this.options.enableDebounce
            ? this.debounce(this.createDelegatedHandler('change', this.handleChange), this.options.debounceDelay)
            : this.createDelegatedHandler('change', this.handleChange);
        this.rootElement.addEventListener('change', changeHandler, { passive: true });
        this.boundHandlers.set('change', changeHandler);

        // Input events (with debouncing)
        const inputHandler = this.options.enableDebounce
            ? this.debounce(this.createDelegatedHandler('input', this.handleInput), this.options.debounceDelay)
            : this.createDelegatedHandler('input', this.handleInput);
        this.rootElement.addEventListener('input', inputHandler, { passive: true });
        this.boundHandlers.set('input', inputHandler);

        // Submit events
        const submitHandler = this.createDelegatedHandler('submit', this.handleSubmit);
        this.rootElement.addEventListener('submit', submitHandler, { passive: false });
        this.boundHandlers.set('submit', submitHandler);

        // Keyboard events
        const keydownHandler = this.createDelegatedHandler('keydown', this.handleKeydown);
        this.rootElement.addEventListener('keydown', keydownHandler, { passive: false });
        this.boundHandlers.set('keydown', keydownHandler);

        // Focus events
        const focusHandler = this.createDelegatedHandler('focus', this.handleFocus);
        this.rootElement.addEventListener('focus', focusHandler, { passive: true, capture: true });
        this.boundHandlers.set('focus', focusHandler);

        // Blur events
        const blurHandler = this.createDelegatedHandler('blur', this.handleBlur);
        this.rootElement.addEventListener('blur', blurHandler, { passive: true, capture: true });
        this.boundHandlers.set('blur', blurHandler);
    }

    /**
     * Create a delegated event handler
     * @private
     */
    createDelegatedHandler(eventType, handler) {
        return (event) => {
            const target = event.target;
            if (!target) return;

            // Find the closest element with data-action
            const actionElement = this.options.enableDelegation
                ? target.closest('[data-action]')
                : (target.hasAttribute?.('data-action') ? target : null);

            if (actionElement) {
                handler(actionElement, event);
            } else {
                // Also handle direct handler calls for elements without data-action
                handler(target, event);
            }
        };
    }

    /**
     * Handle click events
     * @private
     */
    handleClick(element, event) {
        const action = element.getAttribute?.('data-action');

        if (action) {
            this.handleDataAction(element, event, action);
        }

        // Emit generic DOM event
        this.eventBus.emitSync('dom:click', {
            element,
            event,
            action,
            data: this.parseDataAttributes(element)
        });
    }

    /**
     * Handle change events
     * @private
     */
    handleChange(element, event) {
        const action = element.getAttribute?.('data-action');

        if (action) {
            this.handleDataAction(element, event, action);
        }

        // Emit form change event
        this.eventBus.emitSync('dom:change', {
            element,
            event,
            value: element.value,
            action,
            data: this.parseDataAttributes(element)
        });
    }

    /**
     * Handle input events
     * @private
     */
    handleInput(element, event) {
        const action = element.getAttribute?.('data-action');

        if (action) {
            this.handleDataAction(element, event, action);
        }

        // Emit input event
        this.eventBus.emitSync('dom:input', {
            element,
            event,
            value: element.value,
            action,
            data: this.parseDataAttributes(element)
        });
    }

    /**
     * Handle submit events
     * @private
     */
    handleSubmit(element, event) {
        const action = element.getAttribute?.('data-action');

        if (action) {
            event.preventDefault(); // Prevent default form submission
            this.handleDataAction(element, event, action);
        }

        // Emit form submit event
        this.eventBus.emitSync('dom:submit', {
            element,
            event,
            action,
            formData: this.extractFormData(element),
            data: this.parseDataAttributes(element)
        });
    }

    /**
     * Handle keydown events
     * @private
     */
    handleKeydown(element, event) {
        const action = element.getAttribute?.('data-action');
        const keyAction = element.getAttribute?.(`data-key-${event.key.toLowerCase()}`);

        if (action && this.shouldTriggerKeyAction(event)) {
            this.handleDataAction(element, event, action);
        }

        if (keyAction) {
            this.handleDataAction(element, event, keyAction);
        }

        // Emit keyboard event
        this.eventBus.emitSync('dom:keydown', {
            element,
            event,
            key: event.key,
            code: event.code,
            action,
            keyAction,
            data: this.parseDataAttributes(element)
        });
    }

    /**
     * Handle focus events
     * @private
     */
    handleFocus(element, event) {
        this.activeElement = element;

        this.eventBus.emitSync('dom:focus', {
            element,
            event,
            data: this.parseDataAttributes(element)
        });
    }

    /**
     * Handle blur events
     * @private
     */
    handleBlur(element, event) {
        if (this.activeElement === element) {
            this.activeElement = null;
        }

        this.eventBus.emitSync('dom:blur', {
            element,
            event,
            data: this.parseDataAttributes(element)
        });
    }

    /**
     * Handle data-action attributes
     * @private
     */
    handleDataAction(element, event, action) {
        if (!action) return;

        // Parse additional data from element
        const data = this.parseDataAttributes(element);

        // Emit generic action event
        this.eventBus.emitSync('dom:action', {
            action,
            element,
            event,
            data
        });

        // Let the event bus handle the specific action
        this.eventBus.handleAction(action, element, event, data);

        if (this.options.debug) {
            console.log(`[DOMEventIntegration] Action triggered: ${action}`, {
                element,
                event: event.type,
                data
            });
        }
    }

    /**
     * Parse data attributes from an element
     * @private
     */
    parseDataAttributes(element) {
        if (!element?.attributes) return {};

        const data = {};

        Array.from(element.attributes).forEach(attr => {
            if (attr.name.startsWith('data-') && attr.name !== 'data-action') {
                // Convert kebab-case to camelCase
                const key = attr.name
                    .slice(5) // Remove 'data-' prefix
                    .replace(/-([a-z])/g, (_, letter) => letter.toUpperCase());

                // Try to parse as JSON, fall back to string
                let value = attr.value;
                try {
                    // Attempt to parse numbers, booleans, and JSON
                    if (value === 'true') value = true;
                    else if (value === 'false') value = false;
                    else if (value === 'null') value = null;
                    else if (value === 'undefined') value = undefined;
                    else if (/^\d+$/.test(value)) value = parseInt(value, 10);
                    else if (/^\d*\.\d+$/.test(value)) value = parseFloat(value);
                    else if ((value.startsWith('{') && value.endsWith('}')) ||
                             (value.startsWith('[') && value.endsWith(']'))) {
                        value = JSON.parse(value);
                    }
                } catch (e) {
                    // Keep as string if parsing fails
                }

                data[key] = value;
            }
        });

        return data;
    }

    /**
     * Extract form data from a form element
     * @private
     */
    extractFormData(formElement) {
        if (!formElement || formElement.tagName !== 'FORM') {
            return {};
        }

        const formData = new FormData(formElement);
        const data = {};

        for (const [key, value] of formData.entries()) {
            // Handle multiple values (checkboxes, multiple selects)
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

    /**
     * Check if a key event should trigger an action
     * @private
     */
    shouldTriggerKeyAction(event) {
        // Common keys that should trigger actions
        const triggerKeys = ['Enter', 'Space', 'Escape'];
        return triggerKeys.includes(event.key);
    }

    /**
     * Debounce utility function
     * @private
     */
    debounce(func, wait) {
        let timeout;
        return function executedFunction(...args) {
            const later = () => {
                clearTimeout(timeout);
                func.apply(this, args);
            };
            clearTimeout(timeout);
            timeout = setTimeout(later, wait);
        };
    }

    /**
     * Throttle utility function
     * @private
     */
    throttle(func, limit) {
        let inThrottle;
        return function executedFunction(...args) {
            if (!inThrottle) {
                func.apply(this, args);
                inThrottle = true;
                setTimeout(() => inThrottle = false, limit);
            }
        };
    }

    /**
     * Add custom event listener
     * @param {string} eventType - Event type
     * @param {Function} handler - Event handler
     * @param {Object} options - Event listener options
     */
    addCustomListener(eventType, handler, options = {}) {
        const wrappedHandler = this.createDelegatedHandler(eventType, handler);
        this.rootElement.addEventListener(eventType, wrappedHandler, options);
        this.boundHandlers.set(`custom:${eventType}`, wrappedHandler);
    }

    /**
     * Remove custom event listener
     * @param {string} eventType - Event type
     */
    removeCustomListener(eventType) {
        const handler = this.boundHandlers.get(`custom:${eventType}`);
        if (handler) {
            this.rootElement.removeEventListener(eventType, handler);
            this.boundHandlers.delete(`custom:${eventType}`);
        }
    }

    /**
     * Register action handlers in bulk
     * @param {Object} actions - Object mapping action names to handlers
     */
    registerActions(actions) {
        this.eventBus.registerActions(actions);
    }

    /**
     * Get the currently active (focused) element
     * @returns {HTMLElement|null}
     */
    getActiveElement() {
        return this.activeElement;
    }

    /**
     * Trigger an action programmatically
     * @param {string} action - Action name
     * @param {HTMLElement} element - Target element
     * @param {Object} data - Additional data
     */
    triggerAction(action, element, data = {}) {
        const syntheticEvent = new CustomEvent('synthetic', {
            bubbles: true,
            cancelable: true,
            detail: data
        });

        this.eventBus.handleAction(action, element, syntheticEvent, data);
    }

    /**
     * Clean up event listeners
     */
    destroy() {
        if (!this.isInitialized) return;

        this.boundHandlers.forEach((handler, eventType) => {
            this.rootElement.removeEventListener(
                eventType.replace('custom:', ''),
                handler
            );
        });

        this.boundHandlers.clear();
        this.activeElement = null;
        this.isInitialized = false;

        if (this.options.debug) {
            console.log('[DOMEventIntegration] Destroyed');
        }
    }
}

/**
 * Global DOM integration instance
 */
export const globalDOMIntegration = new DOMEventIntegration(globalEventBus, {
    debug: typeof process !== 'undefined' && process.env?.NODE_ENV === 'development'
});

/**
 * Initialize DOM integration with auto-start
 * @param {Object} options - Configuration options
 * @returns {DOMEventIntegration} DOM integration instance
 */
export function initializeDOMIntegration(options = {}) {
    const integration = new DOMEventIntegration(globalEventBus, options);

    // Auto-initialize when DOM is ready
    if (typeof window !== 'undefined') {
        if (document.readyState === 'loading') {
            document.addEventListener('DOMContentLoaded', () => {
                integration.initialize();
            });
        } else {
            integration.initialize();
        }
    }

    return integration;
}

/**
 * Auto-initialize global DOM integration
 */
if (typeof window !== 'undefined') {
    // Auto-start the global integration
    if (document.readyState === 'loading') {
        document.addEventListener('DOMContentLoaded', () => {
            globalDOMIntegration.initialize();
        });
    } else {
        globalDOMIntegration.initialize();
    }
}

export default globalDOMIntegration;