---
"@coherent.js/state": minor
---

Isolate the SSR context API per request and make context providers render.

**Context no longer leaks between concurrent requests.** `provideContext()` and
`useContext()` shared one module-level `Map`, so a request that provided a user
and then awaited could read back another request's user. On Node, context now
lives in `AsyncLocalStorage`: a value provided in one async execution is not
visible to a concurrent one, including across `await`s. The new
`runWithContext(fn, values?)` runs `fn` in a fresh scope that ends when it
returns — use it per request, and always around a streaming render. Browsers,
which have no `AsyncLocalStorage`, keep the synchronous behaviour.

**`createContextProvider()` output is markup again.** Core's renderer handed the
provider a render callback, got back an HTML string and escaped it, so
`render({ div: { children: [createContextProvider('theme', 'dark', Button)] } })`
produced `&lt;button ...`. The provider is now an ordinary zero-argument
component that returns its children between context enter/leave markers, so the
children are rendered once, by the renderer. Its render-callback form keeps the
context for an async callback instead of restoring it before the callback
resumes.

**Behavior change:** `provideContext()` no longer writes into
`globalStateManager`, and `clearAllContexts()` / `restoreContext()` only affect
the current execution. `useContext()` still falls back to `globalStateManager`
when no context was provided. The same element object can no longer appear
twice inside a provider's children, since they are now rendered by core, which
rejects a repeated object instance as a circular reference.
