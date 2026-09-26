---
"@coherent.js/core": patch
---

Make scoped event buses and `withEventBus` work.

- **Fixed:** `EventBus#createScope()` was declared in the types and called by `withEventBus({ scope })` and `emitEvent(name, { scope })`, but didn't exist, so any scoped usage threw `createScope is not a function`. It now returns a view whose event and action names are prefixed with `scope:`; `eventSystem.createScope` is available too.
- **Fixed:** `withEventBus` attached `__eventBusCleanup` as an enumerable key, so the element failed component validation and never rendered. It is now non-enumerable.
- **Fixed (memory leak):** on the server, every render of a `withEventBus` component added its listeners and actions to the global bus permanently (the bus then warned on every render once past 100). Listeners and actions are only registered in a browser now.
