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
// - runWithContext() (and a provider) runs its callback with a fresh holder
//   that it owns. Inside it every change updates that holder in place, so
//   the value stays put across the awaits and yields of an async or
//   streaming render, and nothing leaks out of it.
// - Outside any owned holder there is nothing request-scoped to write to, so
//   providing a value throws (see setScope()).
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
 * Make `scope` current in `holder` (the scope of the enclosing
 * runWithContext() call, or the browser's single holder).
 *
 * There is deliberately no fallback outside runWithContext() on the server.
 * AsyncLocalStorage#enterWith() attached the value to the caller's async
 * context, and a request's async context is shared with the next request
 * on the same keep-alive connection: the value leaked to other users (and
 * a module-level store would leak to every request).
 */
function setScope(scope, holder = currentHolder()) {
    if (!holder?.owned) {
        throw new Error(
            'Context can only be provided inside runWithContext() on the server: outside it the value ' +
            'would leak into other requests. Wrap each request or render: runWithContext(() => ...).'
        );
    }
    holder.scope = scope;
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
 * Provide a context value for the rest of the current runWithContext() scope,
 * remembering the previous one so {@link restoreContext} can unwind it.
 *
 * On Node it must be called inside {@link runWithContext} (it throws
 * otherwise); a concurrent request does not see the value, even across
 * `await`s. In browsers it may be called anywhere.
 *
 * @throws {Error} On Node, when called outside runWithContext()
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
 * it, it evaluates the function components and function-valued props below
 * it with the value provided, and returns the resulting plain tree; its
 * siblings do not see the value. Nothing is pre-rendered, so the renderer
 * escapes the children exactly once. Values read later, such as in an event
 * handler, do not see it.
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
    // Rest parameters keep `length` at 0, so a renderer calls this as an
    // ordinary function component.
    function contextProvider(...args) {
        const renderFunction = args[0];
        const scope = withValue(currentScope(), key, value);

        if (typeof renderFunction === 'function') {
            return runInScope(scope, renderFunction, [children]);
        }

        // Evaluate the function components below the provider inside its
        // scope, and hand the renderer the resulting plain tree. The scope
        // is restored even when a child throws; enter/leave marker
        // components used to leave the value set for the next request when
        // a child threw before the "leave" marker ran.
        return runInScope(scope, resolveComponents, [children]);
    }

    return contextProvider;
}

const TAG_NAME = /^[a-zA-Z][a-zA-Z0-9-]*$/;

/**
 * Call the function components in a tree the way the renderer does (no
 * arguments, following returned functions), so context reads happen now.
 * Unchanged nodes are returned as they are (trusted-content markers keep
 * their brand); event handlers are props and are never called.
 */
function resolveComponents(node, depth = 0) {
    if (depth > 1000) return node;

    if (typeof node === 'function') {
        return resolveComponents(node(), depth + 1);
    }
    if (Array.isArray(node)) {
        let changed = false;
        const resolved = node.map((child) => {
            const next = resolveComponents(child, depth + 1);
            if (next !== child) changed = true;
            return next;
        });
        return changed ? resolved : node;
    }
    if (!node || typeof node !== 'object') return node;

    if (node.__isLazy === true && typeof node.evaluate === 'function') {
        return resolveComponents(node.evaluate(), depth + 1);
    }

    const tags = Object.keys(node);
    if (tags.length === 0 || !tags.every((tag) => TAG_NAME.test(tag))) return node;

    let changed = false;
    const resolved = {};
    for (const tag of tags) {
        let content = node[tag];
        if (typeof content === 'function') {
            content = resolveComponents(content(), depth + 1);
        }
        if (content && typeof content === 'object' && !Array.isArray(content) && !isTrusted(content)) {
            content = resolveProps(content, depth);
        }
        if (content !== node[tag]) changed = true;
        resolved[tag] = content;
    }
    return changed ? resolved : node;
}

function isTrusted(value) {
    return value[Symbol.for('coherent.js.trustedContent')] === true;
}

/**
 * Evaluate the function-valued props the renderer would call (`text`,
 * `html` and attributes other than `on*` event handlers) and the children.
 * An attribute function that throws is left for the renderer, which
 * reports it and renders an empty value.
 */
function resolveProps(props, depth) {
    let next = props;
    const set = (key, value) => {
        if (next === props) next = { ...props };
        next[key] = value;
    };

    for (const key of Object.keys(props)) {
        const value = props[key];
        if (key === 'children') {
            if (value !== undefined && value !== null) {
                const children = resolveComponents(value, depth + 1);
                if (children !== value) set(key, children);
            }
        } else if (typeof value === 'function' && key !== 'key') {
            if (key === 'text' || key === 'html') {
                set(key, value());
            } else if (!key.startsWith('on')) {
                try {
                    set(key, value());
                } catch {
                    // left in place for the renderer
                }
            }
        }
    }
    return next;
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
