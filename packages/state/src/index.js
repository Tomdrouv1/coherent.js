/**
 * @coherent.js/state - Reactive State Management Package
 *
 * A comprehensive state management solution for Coherent.js applications
 * providing reactive state, persistence, validation, and SSR-compatible state management.
 */

// Re-export everything from reactive-state
export {
    Observable,
    ReactiveState,
    createReactiveState,
    observable,
    computed,
    stateUtils
} from './reactive-state.js';

// Import for default export
import {
    createReactiveState,
    observable,
    computed,
    stateUtils
} from './reactive-state.js';

import {
    createState,
    globalStateManager,
    provideContext,
    createContextProvider,
    restoreContext,
    clearAllContexts,
    useContext
} from './state-manager.js';

import {
    createPersistentState,
    withLocalStorage,
    withSessionStorage,
    withIndexedDB
} from './state-persistence.js';

import {
    createValidatedState,
    validators
} from './state-validation.js';

// Re-export everything from state-manager (SSR-compatible state)
export {
    createState,
    globalStateManager,
    provideContext,
    createContextProvider,
    restoreContext,
    clearAllContexts,
    useContext
} from './state-manager.js';

// Re-export everything from state-persistence
export {
    createPersistentState,
    withLocalStorage,
    withSessionStorage,
    withIndexedDB
} from './state-persistence.js';

// Re-export everything from state-validation
export {
    createValidatedState,
    validators
} from './state-validation.js';

// Default export provides all utilities
export default {
    // Reactive state utilities
    createReactiveState,
    observable,
    computed,

    // SSR-compatible state management
    createState,
    globalStateManager,
    provideContext,
    createContextProvider,
    restoreContext,
    clearAllContexts,
    useContext,

    // Persistence utilities
    createPersistentState,
    withLocalStorage,
    withSessionStorage,
    withIndexedDB,

    // Validation utilities
    createValidatedState,
    validators,

    // State utilities
    stateUtils
};
