/**
 * Coherent.js Event Bus System
 *
 * A comprehensive event-driven architecture for Coherent.js applications.
 * Provides centralized event management, DOM integration, and component utilities.
 */

// Core event bus
export {
    EventBus,
    createEventBus,
    globalEventBus,
    emit,
    emitSync,
    on,
    once,
    off,
    registerAction,
    handleAction
} from './event-bus.js';

// DOM integration
export {
    DOMEventIntegration,
    globalDOMIntegration,
    initializeDOMIntegration
} from './dom-integration.js';

// Component integration
export {
    withEventBus,
    withEventState,
    createActionHandlers,
    createEventHandlers,
    createEventComponent,
    emitEvent
} from './component-integration.js';

// Re-export for convenience
import { globalEventBus } from './event-bus.js';
import { globalDOMIntegration } from './dom-integration.js';

/**
 * Default export with all event system functionality
 */
const eventSystem = {
    // Core bus
    bus: globalEventBus,
    dom: globalDOMIntegration,

    // Quick access methods
    emit: globalEventBus.emit.bind(globalEventBus),
    emitSync: globalEventBus.emitSync.bind(globalEventBus),
    on: globalEventBus.on.bind(globalEventBus),
    once: globalEventBus.once.bind(globalEventBus),
    off: globalEventBus.off.bind(globalEventBus),

    // Action methods
    registerAction: globalEventBus.registerAction.bind(globalEventBus),
    registerActions: globalEventBus.registerActions.bind(globalEventBus),
    handleAction: globalEventBus.handleAction.bind(globalEventBus),

    // Statistics and debugging
    getStats: globalEventBus.getStats.bind(globalEventBus),
    resetStats: globalEventBus.resetStats.bind(globalEventBus),

    // Lifecycle
    destroy() {
        globalEventBus.destroy();
        globalDOMIntegration.destroy();
    }
};

export default eventSystem;