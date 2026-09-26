---
"@coherent.js/devtools": minor
---

Make `DevTools` safe to construct and stop it hijacking the process.

**Behavior change:**

- `createDevTools()` with no arguments no longer throws, and
  `createDevTools(coherent)` with the core module namespace
  (`import * as coherent from '@coherent.js/core'`) no longer throws
  "Cannot assign to read only property 'render'". DevTools no longer
  monkey-patches `render`/`createComponent` on the instance: render through
  `devtools.render(component, context?, options?)` and
  `devtools.createComponent(config)`, which record timings, warnings and
  registrations. The constructor takes a second `options` argument
  (`enabled`, `maxEntries`, `captureConsoleErrors`,
  `trackUnhandledRejections`, `hotReloadUrl`, `globalHelpers`).
- No `unhandledRejection` listener is installed by default. With
  `trackUnhandledRejections: true` the rejection is recorded and then rethrown
  (unless another listener handles it), so the process still crashes as it
  would without DevTools. `reject(undefined)` no longer crashes inside the
  handler.
- The `SIGINT` handler that printed a summary and called `process.exit()` is
  gone; call `devtools.printDevSummary()` yourself.
- `warnings` and `errors` keep at most `maxEntries` (default 100) entries.
- In the browser, `?dev=true` no longer enables DevTools on a non-localhost
  host; pass `{ enabled: true }` explicitly.
- The hot-reload WebSocket is only opened to an explicit `hotReloadUrl` (it
  always tried `ws://localhost:3001/coherent-dev`). The Node "hot reload"
  (`require`-based, never functional under ESM) is removed.
- New `devtools.destroy()` removes the global helpers, the `console.error`
  hook, listeners, the socket and the browser panel.
