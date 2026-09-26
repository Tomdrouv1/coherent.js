---
"@coherent.js/core": minor
---

Stop swallowing component errors; make error boundaries per-request on the server.

- **Behavior change:** a function component that throws no longer renders as nothing. The error now propagates out of `render()` (as a `RenderingError` with `renderPath` and the original error as `cause`), so frameworks answer 500 instead of serving a partial page with a 200. To keep rendering, pass `onError: (error, { path }) => replacement` — return `null` to omit the component as before, or a fallback element.
- **Fixed:** error boundaries only caught errors thrown while calling the wrapped component itself; nested function components ran later in the renderer and escaped. Zero-argument function components inside a boundary are now evaluated within it.
- **Fixed:** on the server, a boundary kept its error state across calls, so one failed request made every later request render the fallback, and it retained that request's props. Server-side calls now start from a clean state; the stateful behavior (`resetKeys`, `maxErrors`, `resetTimeout`) still applies in the browser.
- **Fixed:** `createAsyncErrorBoundary` left its timeout timer running after the component resolved, keeping the process alive for `timeout` ms per call.
