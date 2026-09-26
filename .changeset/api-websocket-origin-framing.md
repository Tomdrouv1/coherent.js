---
"@coherent.js/api": minor
---

WebSocket routes check the handshake Origin and read frames correctly.

- The handshake accepted any `Origin`, so any web page could open a socket carrying the visitor's cookies (cross-site WebSocket hijacking). New `wsAllowedOrigins` router option and per-route `allowedOrigins` (`addWebSocketRoute(path, handler, { allowedOrigins })`); `'*'` allows any origin. A rejected handshake gets `403 Forbidden`.
- Each TCP chunk was parsed as exactly one frame: a frame split across chunks, a second frame in the same chunk, and a frame sent together with the handshake were silently dropped. Incoming bytes are now buffered and split into frames; fragmented text messages are reassembled, pings are answered with pongs, and a close frame is answered and closes the socket.
- Frames or messages above `wsMaxPayload` (1 MiB by default) close the connection with status 1009 instead of being buffered without limit.
- A client that disconnects without a close frame no longer leaves the server side of the socket half-open.
- A malformed `Host` header no longer throws inside the `'upgrade'` listener.

**Behavior change:** with neither `wsAllowedOrigins` nor `allowedOrigins` configured, only same-origin browser handshakes (Origin host equal to the Host header) are accepted; cross-origin browser clients need their origin listed. Handshakes without an `Origin` header (non-browser clients) are accepted as before.
