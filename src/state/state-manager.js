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
 * Context stack for managing nested context providers
 */
const contextStacks = new Map();

/**
 * Context provider for passing data down the component tree
 * @param {string} key - Context key
 * @param {*} value - Context value
 * @param {Object} children - Children to render with context
 * @returns {Object} Children with context available
 */
export function provideContext(key, value) {
    // Initialize context stack if it doesn't exist
    if (!contextStacks.has(key)) {
        contextStacks.set(key, []);
    }
    
    const stack = contextStacks.get(key);
    
    // Store previous value
    const previousValue = globalState.get(key);
    
    // Push previous value to stack and set new value
    stack.push(previousValue);
    globalState.set(key, value);
}

/**
 * Create a context provider component that works with the rendering system
 * @param {string} key - Context key
 * @param {*} value - Context value
 * @param {Object} children - Children to render with context
 * @returns {Function} Component function that provides context
 */
export function createContextProvider(key, value, children) {
    // Return a function that will render the children within the context
    return (renderFunction) => {
        try {
            // Provide context
            provideContext(key, value);
            
            // If a render function is provided, use it to render children
            // Otherwise return children to be rendered by the caller
            if (renderFunction && typeof renderFunction === 'function') {
                return renderFunction(children);
            } else {
                return children;
            }
        } finally {
            // Always restore context when done
            restoreContext(key);
        }
    };
}

/**
 * Restore context to previous value
 * @param {string} key - Context key
 */
export function restoreContext(key) {
    if (!contextStacks.has(key)) return;
    
    const stack = contextStacks.get(key);
    
    // Restore previous value from stack
    const previousValue = stack.pop();
    
    if (stack.length === 0) {
        // No more providers, delete the key if it was undefined before
        if (previousValue === undefined) {
            globalState.delete(key);
        } else {
            globalState.set(key, previousValue);
        }
        
        // Clean up empty stack
        contextStacks.delete(key);
    } else {
        // Restore previous value
        globalState.set(key, previousValue);
    }
}

/**
 * Clear all context stacks (useful for cleanup after rendering)
 */
export function clearAllContexts() {
    contextStacks.clear();
    // Note: This doesn't clear globalState as it might contain other data
}

/**
 * Context consumer to access provided context
 * @param {string} key - Context key
 * @returns {*} Context value
 */
export function useContext(key) {
    return globalState.get(key);
}
