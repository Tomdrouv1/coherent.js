/**
 * Simple state management for server-side rendering
 * This is mainly for component state during rendering
 */

const globalState = new Map();

/**
 * Creates a state container for a request/render cycle
 * @param {Object} initialState - Initial state object
 * @returns {Object} State container
 */
export function createState(initialState = {}) {
    const state = new Map(Object.entries(initialState));

    return {
        get(key) {
            return state.get(key);
        },

        set(key, value) {
            state.set(key, value);
            return this;
        },

        has(key) {
            return state.has(key);
        },

        delete(key) {
            return state.delete(key);
        },

        clear() {
            state.clear();
            return this;
        },

        toObject() {
            return Object.fromEntries(state);
        },

        // For debugging
        _internal: state
    };
}

/**
 * Global state for sharing data across components during SSR
 */
export const globalStateManager = {
    set(key, value) {
        globalState.set(key, value);
    },

    get(key) {
        return globalState.get(key);
    },

    has(key) {
        return globalState.has(key);
    },

    clear() {
        globalState.clear();
    },

    // Create isolated state for each request
    createRequestState() {
        return createState();
    }
};

/**
 * Context provider for passing data down the component tree
 * @param {string} key - Context key
 * @param {*} value - Context value
 * @param {Object} children - Children to render with context
 * @returns {Object} Children with context available
 */
export function provideContext(key, value, children) {
    // Store context in global state temporarily
    const previousValue = globalState.get(key);
    globalState.set(key, value);

    // In a real implementation, we'd need to restore after rendering
    // This is a simplified version for demonstration

    return children;
}

/**
 * Context consumer to access provided context
 * @param {string} key - Context key
 * @returns {*} Context value
 */
export function useContext(key) {
    return globalState.get(key);
}
