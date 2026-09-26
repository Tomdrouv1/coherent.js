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
 * Global state for sharing data across components during SSR.
 *
 * This store is process-wide: every request sees it. It is also the fallback
 * useContext() reads when no context has been provided for a key, so it suits
 * application-wide defaults, never request data.
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

// ============================================================================
// Context API
// ============================================================================
//
// A scope is an immutable Map from context key to a linked stack entry
// `{ value, previous }`. A holder `{ scope, owned }` points at the current
// scope.
//
// On Node the holder lives in an AsyncLocalStorage, so it follows each
// request's async execution:
//
// - runWithContext() (and a provider's render-callback form) runs its callback
//   with a fresh holder that it owns. Inside it every change updates that
//   holder in place, so the value stays put across the awaits and yields of
//   an async or streaming render, and nothing leaks out of it.
// - Outside any owned holder, a change never mutates the holder it found:
//   it moves the current execution onto a new one with `enterWith`. Two
//   concurrent handlers that each provide a value and then `await` read back
//   their own value, and nothing becomes visible process-wide.
//
// Browsers have no AsyncLocalStorage. There a single module holder is updated
// in place, which is exact for synchronous rendering; a value read after an
// `await` sees whatever is current at that point.

const EMPTY_SCOPE = new Map();

function createAsyncStorage() {
    try {
        // Never a static import: this module also runs in browsers.
        const asyncHooks = globalThis.process?.getBuiltinModule?.('node:async_hooks');
        const AsyncLocalStorage = asyncHooks?.AsyncLocalStorage;
        return typeof AsyncLocalStorage === 'function' ? new AsyncLocalStorage() : null;
    } catch {
        return null;
    }
}

const asyncStorage = createAsyncStorage();

/** The holder used when AsyncLocalStorage is unavailable. */
const syncHolder = { scope: EMPTY_SCOPE, owned: true };

function currentHolder() {
    return asyncStorage ? asyncStorage.getStore() : syncHolder;
}

function currentScope() {
    return currentHolder()?.scope ?? EMPTY_SCOPE;
}

/**
 * Make `scope` current for the rest of this execution, preferring `holder`
 * (the one the change was computed from) when it may be updated in place.
 */
function setScope(scope, holder = currentHolder()) {
    if (holder?.owned) {
        holder.scope = scope;
    } else {
        asyncStorage.enterWith({ scope, owned: false });
    }
}

/**
 * Run `fn(...args)` with `scope` current in a holder of its own, restoring the
 * previous scope afterwards.
 */
function runInScope(scope, fn, args) {
    if (asyncStorage) {
        return asyncStorage.run({ scope, owned: true }, fn, ...args);
    }

    const previous = syncHolder.scope;
    syncHolder.scope = scope;
    try {
        return fn(...args);
    } finally {
        syncHolder.scope = previous;
    }
}

function withValue(scope, key, value) {
    const next = new Map(scope);
    next.set(key, { value, previous: scope.get(key) });
    return next;
}

/**
 * Run `fn` in a fresh, isolated context scope — one per request or render.
 *
 * Nothing provided inside `fn` is visible outside it and nothing provided
 * outside is visible inside. On Node this holds across `await`s, so wrap each
 * request (or each `renderToStream()` consumer) in it.
 *
 * @template T
 * @param {() => T} fn - Work to run, typically a request handler or a render
 * @param {Object} [values] - Initial context values, keyed by context key
 * @returns {T} Whatever `fn` returns (a promise for an async `fn`)
 */
export function runWithContext(fn, values) {
    if (typeof fn !== 'function') {
        throw new TypeError(`runWithContext() requires a function, received: ${typeof fn}`);
    }

    let scope = EMPTY_SCOPE;
    if (values && typeof values === 'object') {
        for (const [key, value] of Object.entries(values)) {
            scope = withValue(scope, key, value);
        }
    }

    return runInScope(scope, fn, []);
}

/**
 * Provide a context value for the rest of the current execution, remembering
 * the previous one so {@link restoreContext} can unwind it.
 *
 * On Node the value is scoped to the calling async execution: a concurrent
 * request does not see it, even across `await`s.
 *
 * @param {string} key - Context key
 * @param {*} value - Context value
 */
export function provideContext(key, value) {
    setScope(withValue(currentScope(), key, value));
}

/**
 * Create a context provider component.
 *
 * The provider is a zero-argument function component. When the renderer calls
 * it, it returns its children between two marker components that enter and
 * leave the context; the renderer renders array items in order, so the
 * children see the value and their following siblings do not. Nothing is
 * pre-rendered, so the renderer escapes the children exactly once.
 *
 * Called with a render function instead, the provider runs
 * `renderFunction(children)` with the context provided and returns its result.
 * On Node an async render function keeps the context across its `await`s.
 *
 * @param {string} key - Context key
 * @param {*} value - Context value
 * @param {*} children - Children to render with context
 * @returns {Function} Context provider component
 */
export function createContextProvider(key, value, children) {
    // Rest parameters keep `length` at 0, so core's renderer calls this as an
    // ordinary function component instead of handing it a callback that
    // returns an HTML string (which it would then escape a second time).
    function contextProvider(...args) {
        const renderFunction = args[0];

        if (typeof renderFunction === 'function') {
            return runInScope(withValue(currentScope(), key, value), renderFunction, [children]);
        }

        let holder;
        let outer = EMPTY_SCOPE;
        return [
            function enterContext() {
                holder = currentHolder();
                outer = holder?.scope ?? EMPTY_SCOPE;
                setScope(withValue(outer, key, value), holder);
                return null;
            },
            function contextChildren() {
                return children;
            },
            function leaveContext() {
                setScope(outer, holder);
                return null;
            }
        ];
    }

    return contextProvider;
}

/**
 * Restore context to its previous value
 * @param {string} key - Context key
 */
export function restoreContext(key) {
    const scope = currentScope();
    const entry = scope.get(key);
    if (!entry) return;

    const next = new Map(scope);
    if (entry.previous) {
        next.set(key, entry.previous);
    } else {
        next.delete(key);
    }
    setScope(next);
}

/**
 * Drop every context provided in the current execution.
 *
 * Values set through {@link globalStateManager} are not contexts and are left
 * alone; useContext() falls back to them again.
 */
export function clearAllContexts() {
    if (currentScope().size > 0) {
        setScope(EMPTY_SCOPE);
    }
}

/**
 * Context consumer to access provided context
 *
 * Falls back to {@link globalStateManager} when no context has been provided
 * for `key`.
 *
 * @param {string} key - Context key
 * @returns {*} Context value
 */
export function useContext(key) {
    const entry = currentScope().get(key);
    return entry ? entry.value : globalState.get(key);
}
