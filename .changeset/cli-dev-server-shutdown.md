---
"@coherent.js/cli": patch
---

Stop `coherent dev` shutdown hanging on open connections.

- **Fixed:** the dev server's `close()` (run on Ctrl-C) closed WebSocket clients with a closing handshake that waits up to 30 seconds for the browser, and then waited for every open HTTP connection, so a tab that did not answer, a keep-alive socket in use or a request still in flight kept the process alive. Clients are now terminated and connections closed at once.
