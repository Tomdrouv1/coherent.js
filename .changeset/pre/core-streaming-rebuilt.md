---
"@coherent.js/core": minor
---

Rebuild and export `renderToStream`.

- **New export:** `renderToStream(component, options)` (and `streamingUtils`) from `@coherent.js/core`. It was documented but not exported, and the implementation behind it disagreed with `render()` in every case tested.
- The stream now shares its element serialization with `render()`, so the output is identical by construction. The old streamer HTML-escaped `<script>` bodies, dropped children next to `text`, emitted `key="…"`, rendered `{ td: 42 }` as empty, wrote `<br />`, and skipped tag-name validation (`{ 'img src=x onerror=alert(1)': {} }` became a live `<img>`).
- It really streams: large elements are emitted child by child and the event loop gets a turn after every chunk (the old yield check never fired, so a 1.4 MB page blocked the loop for its whole render and time-to-first-byte equaled a buffered render). On a 10,000-row page over HTTP: first byte after ~20 ms instead of ~80–100 ms; total time is higher (~175 ms vs ~80 ms) because other work runs between chunks.
- **Behavior change:** errors propagate out of the iteration instead of being written into an HTML comment (unescaped, with `-->` injectable) and ending as a truncated 200; `onError` works as in `render()`. `streamingUtils.streamToResponse` respects backpressure, aborts the response on error, and no longer sets `Transfer-Encoding` by hand.
- **Behavior change:** `render()` renders every key of a multi-key object as siblings (`{ h1: …, p: … }`), as the streamer did; it used to drop every key after the first silently.
