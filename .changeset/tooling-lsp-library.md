---
"@coherent.js/tooling": minor
---

`@coherent.js/tooling/lsp` can be imported as a library.

The module created a connection and started listening at import time, so
importing it anywhere but a language-server process threw "Connection input
stream is not set" — while the package declares `sideEffects: false`.

**Behavior change:** `@coherent.js/tooling/lsp` now exports
`startServer(connection?)`, which registers the handlers on the given
connection (default: the transport named on the command line) and starts
listening; importing the module does nothing else. The module-level
`connection` and `documents` exports are gone — `startServer()` returns them.
The `coherent-language-server` binary is now `dist/lsp/bin.js` and behaves as
before (`--stdio`, `--node-ipc`, `--socket=<port>`).
