---
"@coherent.js/core": patch
---

Stop `streamingUtils.streamToResponse()` hanging when the client disconnects.

- **Fixed:** when the socket was full, it waited for `'drain'` only. A client that disconnected (closed tab, timeout, network drop) never drains, so the returned promise never settled and the suspended render kept the whole page tree in memory for good. It now also listens for `'close'` / `'error'`, closes the chunk generator and resolves with the bytes written so far.
