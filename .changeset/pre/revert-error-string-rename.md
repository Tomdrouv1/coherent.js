---
"@coherent.js/api": patch
"@coherent.js/cli": patch
"@coherent.js/client": patch
"@coherent.js/core": patch
"@coherent.js/database": patch
"@coherent.js/devtools": patch
"@coherent.js/integrations": patch
"@coherent.js/state": patch
---

Revert an `error` → `_error` identifier rename that leaked into strings and object keys.

- Error events are listened for again: `pool.on('error')` (pg), the API router's `req`/`socket` `'error'` handlers, the CLI dev server's child-process `'error'`, and devtools' `window` `'error'`. Before, an idle PostgreSQL client error or a WebSocket client reset was an uncaught exception.
- `DatabaseManager` emits `'error'` only when a listener is attached; the failure still surfaces through the rejected `connect()` promise.
- JSON error responses from `@coherent.js/api`, the framework adapters, and the scaffolded API/JSON-RPC code use `error` instead of `_error` (JSON-RPC requires `error`). **Behavior change:** clients that read `body._error` must read `body.error`.
- Messages, CSS classes (`component-error`, `error-message`), log levels, event types and the generated `.gitignore` (`yarn-error.log*`) are spelled correctly again; the CLI's load-failure fallback no longer crashes on `console._error`.

`withLoading`'s documented `_loading` / `_error` state keys are unchanged. An ESLint rule now rejects `_error` inside strings, template text and object keys in `packages/*/src` and `packages/*/bin`.
