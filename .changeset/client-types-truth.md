---
"@coherent.js/client": patch
---

Make the client's TypeScript declarations and README describe the real API.

- `wrapEvent` was declared as `(eventType, handler) => { handlerId }`; it takes
  a native event, the handler's element and a component reference, and returns
  the wrapped event, now typed as `CoherentEvent`.
- Delegated handlers (`EventHandler`, `ClickHandler`, ..., `StateAwareHandler`)
  were typed as `(event, element, data)` / `(event, state, setState)`; they
  receive one `CoherentEvent` carrying `originalEvent`, `state`, `setState` and
  `props`.
- `serializeState` / `serializeStateWithWarning` / `deserializeState` return
  `null` when there is nothing to (de)serialize; `HydrationMismatch.type` lists
  the values the detector reports (`tagName`, `children_count`,
  `missing_dom_child`, `extra_dom_child`, ...) and `domPath`.
- `HydrationOptions` only lists options `hydrate()` reads; `timeout`,
  `onError`, `validators` and the rest type-checked but did nothing.
- The HMR classes are declared as the classes they are, and some 400 lines of
  declarations for APIs that never existed at runtime (`autoHydrate`,
  `registerComponent`, `createStateManager`, `EventManager`, performance
  monitor, `hmrClient.onUpdate`, `cleanupTracker.trackTimer`, ...) are removed.
  **Behavior change:** code that referenced those phantom types no longer
  compiles.
- The router types are re-exported from `@coherent.js/client/router` instead
  of a diverging copy.

The README no longer documents `hydrateComponent`, `autoHydrate`,
`registerEventHandler` or `createClientRouter`, none of which exist.
