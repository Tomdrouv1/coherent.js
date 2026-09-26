---
"@coherent.js/client": patch
---

Fix the HMR client.

- A changed module without an `accept` handler got neither an update nor a
  reload: the fallback imported `../hydration.js`, which no longer exists, and
  swallowed the failure. Such modules now trigger `location.reload()`.
- `disconnect()` scheduled a reconnect from the closed socket's own `close`
  event. Events from a socket that was disconnected or replaced are ignored.
- Every overlay `show()` added a keydown listener while `hide()` removed one,
  so Escape handlers piled up; there is now one per visible overlay.
- The form-state capturer keyed radios by name and type only, so a whole group
  collapsed onto one entry and restoring it wiped the selection. Radios and
  checkboxes sharing a name are now told apart by value.
- The tracked `fetch()` of a hot context replaced the caller's `AbortSignal`;
  the caller's signal and module disposal now both abort the request.
- **Behavior change:** the `@coherent.js/client/hmr` entry point threw a 1.0
  migration error on import although `package.json` exports it with types. It
  now exports the HMR API (`hmrClient`, `createHotContext`, ...); importing it
  still does not connect — call `hmrClient.initialize()`.

The stale `src/hydration.d.ts`, which described the removed legacy hydration
API and was referenced by nothing, is deleted.
