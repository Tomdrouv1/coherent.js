---
"@coherent.js/state": minor
---

Stop SSR context values from leaking between requests.

- **Fixed:** outside `runWithContext()`, `provideContext()` attached the value to the caller's async context with `AsyncLocalStorage#enterWith()`. Node handles every request of a keep-alive connection in the same async context, so a value provided for one user's request (say, the logged-in user) was read by the next request on that socket.
- **Fixed:** `createContextProvider()` entered its value with one marker component and left it with another rendered after its children. A child that threw skipped the second marker, so the value stayed set for the rest of the request (or, outside `runWithContext()`, for the next request on the connection). The provider now evaluates its subtree's function components and function-valued props (never `on*` event handlers) with the value set and restores the outer value in all cases.
- **Behavior change:** on Node, `provideContext()` throws outside `runWithContext()` (as do `restoreContext()` / `clearAllContexts()` when there is something to remove). Wrap each request in `runWithContext(() => ...)`, or use `createContextProvider()` / `runWithContext(fn, { key: value })`. Browsers are unaffected.
- **Behavior change:** a context value read after a provider has been rendered (in an event handler, for instance) no longer sees the provider's value; read it while rendering and close over it.
