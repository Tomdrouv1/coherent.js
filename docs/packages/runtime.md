# Runtime

`@coherent.js/runtime` is a universal runtime that detects the current JavaScript environment and provides the appropriate Coherent.js runtime implementation. It works in browsers, Node.js, Deno, Bun, Cloudflare Workers, edge runtimes, Electron, and Tauri.

## Installation

```bash
pnpm add @coherent.js/runtime
```

## Basic Usage

### Auto-Detect and Create Runtime

```javascript
import { createRuntime, detectRuntime } from '@coherent.js/runtime';

const environment = detectRuntime(); // e.g. 'browser', 'node', 'edge'
const runtime = await createRuntime(); // auto-detects environment
const app = await runtime.createApp({ /* options */ });
```

### Quick App Creation

```javascript
import { createCoherentApp } from '@coherent.js/runtime';

const app = await createCoherentApp({ /* options */ });
```

### Script Tag Usage

When loaded via `<script>`, the runtime exposes a global `window.Coherent` object:

```html
<script src="coherent-runtime.js"></script>
<script>
  Coherent.render({ div: { text: 'Hello' } }).then(html => {
    document.body.innerHTML = html;
  });

  Coherent.defineComponent('my-element', { p: { text: 'Custom element' } });
</script>
```

Auto-hydration is supported via the `data-coherent-auto` attribute on any element.

## API Reference

### Environment Detection

| Export | Description |
|---|---|
| `detectRuntime()` | Returns a `RuntimeEnvironment` string for the current environment |
| `RuntimeEnvironment` | Enum: `BROWSER`, `NODE`, `EDGE`, `CLOUDFLARE`, `DENO`, `BUN`, `ELECTRON`, `TAURI`, `STATIC` |
| `getRuntimeCapabilities(env?)` | Returns capability flags (dom, ssr, filesystem, fetch, etc.) |
| `getRuntimeInfo()` | Returns environment, capabilities, version, features, and platform info |

### Runtime Creation

| Export | Description |
|---|---|
| `createRuntime(options?)` | Async factory that imports and instantiates the correct runtime |
| `createCoherentApp(options?)` | Shorthand: create runtime then call `runtime.createApp(options)` |
| `renderApp(component, props?, target?)` | Render a component using the detected runtime |

### Runtime Classes

| Class | Environment |
|---|---|
| `BrowserRuntime` | Browsers, Electron, Tauri |
| `EdgeRuntime` | Edge, Cloudflare Workers, Deno, Bun |
| `NodeRuntime` | Node.js (via `./runtimes/node.js`) |
| `StaticRuntime` | Static site generation |
| `DesktopRuntime` | Desktop-specific (Electron/Tauri helpers) |

### Utilities

| Export | Description |
|---|---|
| `RuntimeDetector` | Utility class for runtime detection |
| `ModuleResolver` | Resolves modules across environments |
| `AssetManager` | Manages assets across environments |
| `UniversalLoader` | Universal module loader |
| `ComponentLoader` | Loads Coherent.js components dynamically |

### Re-Exports

The runtime re-exports everything from `@coherent.js/core`, `@coherent.js/client`, and `@coherent.js/web-components` for convenience.

## Known Limitations

- `renderApp` throws if the detected runtime does not provide a `renderApp` method; use `createRuntime()` for reliable operation.
- The global `window.Coherent` object is only created in browser environments.
- Runtime classes beyond `BrowserRuntime` have minimal implementations in the current release.
