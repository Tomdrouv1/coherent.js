# Coherent.js API Reference

A reference for the most used public APIs. Each package's README lists its full exports; the TypeScript declarations in `packages/*/types` are checked against the runtime exports in CI.

## Supported Imports

Use only the package entry points and their documented subpaths:

```javascript
import { render } from '@coherent.js/core';
import { hydrate } from '@coherent.js/client';
import { createRouter } from '@coherent.js/api';
```

## Core Rendering

### `render(component, options?)`

Renders a component tree to an HTML string. It is **synchronous**: await data and async components before calling it (a Promise anywhere in the tree throws `Cannot render a Promise at <path>`).

```javascript
import { render } from '@coherent.js/core';

const html = render({
  div: {
    className: 'greeting',
    children: [{ h1: { text: 'Hello, World!' } }]
  }
});
// <div class="greeting"><h1>Hello, World!</h1></div>
```

**Options:**

| Option | Default | |
| --- | --- | --- |
| `onError` | — | `(error, { path }) => replacement` — called when a function component throws; its return value is rendered instead (`null` omits the component). Without it the error propagates out of `render()` as a `RenderingError` with the component's path and the original error as `cause`. |
| `enableCache` | `false` | Cache whole renders, keyed on the complete tree. Trees containing functions, class instances or Dates are never cached. |
| `cache` | shared cache | A cache from `createCacheManager({ maxCacheSize, ttlMs })` to use instead of the shared one |
| `cacheTTL` | 300000 | TTL in ms for entries this render adds |
| `scoped` / `encapsulate` | `false` | Scope the component's `<style>` rules (see [Styling](../components/styling.md)) |
| `minify` | `false` | Minify the output |
| `maxDepth` | 100 | Maximum tree depth |
| `enableMonitoring` | `false` | Record timings in `performanceMonitor` |

`cacheSize` is deprecated and ignored; pass `cache: createCacheManager({ maxCacheSize })` instead.

**Rendering rules worth knowing:**

- `text` and attribute values are HTML-escaped. Raw markup only goes through `html:` or `dangerouslySetInnerContent()`.
- `null`, `undefined` and booleans in `children` render nothing, so `cond && { li: ... }` works. `text: false` prints `false`.
- `className` (or `class`) accepts a string, an array (`['btn', active && 'btn--active']`) or an object (`{ active: isActive }`).
- Function-valued `on*` props (`onClick: () => ...`) render nothing on the server; `hydrate()` attaches them in the browser. String handlers (`onclick: 'history.back()'`) are rendered as attributes.
- An attribute name containing whitespace, quotes, `<`, `>`, `/`, `=` or control characters makes `render()` throw. `data-*`, `aria-*`, `x-on:click`, `@click`, `:class` and `xlink:href` are fine.
- A multi-key object (`{ h1: ..., p: ... }`) renders each key as a sibling.

### `renderToStream(component, options?)`

An async generator of HTML chunks whose concatenation is exactly `render()`'s output. The event loop gets a turn after every chunk. Accepts `render()`'s options (except the cache ones and `minify`) plus `chunkSize` (default 8192 characters).

```javascript
import { Readable } from 'node:stream';
import { renderToStream, streamingUtils } from '@coherent.js/core';

Readable.from(renderToStream(Page())).pipe(res);

// or: writes with backpressure and aborts the response if rendering fails
await streamingUtils.streamToResponse(renderToStream(Page()), res);
```

Errors reject the iteration (they are not written into the HTML).

### `renderWithTemplate(component, { template })`

Renders a component and inserts it into a template at `{{content}}`; used by the framework adapters.

```javascript
import { renderWithTemplate } from '@coherent.js/core';

const page = renderWithTemplate(App(), { template: '<!DOCTYPE html>\n{{content}}' });
```

## Components

A component is a function returning a node. You call it with its props (`Card({ title })`); a function placed directly in a tree is called by the renderer with no arguments.

### `memo(component, keyFnOrOptions?)`

Caches a component's output per props. Every memoized component has its own bounded LRU cache.

```javascript
import { memo } from '@coherent.js/core';

const ProductCard = memo(
  ({ product }) => ({ article: { text: product.name } }),
  { keyFn: ({ product }) => `${product.id}:${product.updatedAt}`, maxSize: 500 }
);

// memo(fn, keyFn) works too
const Row = memo(({ item }) => ({ li: { text: item.name } }), ({ item }) => item.id);
```

Options: `keyFn`, `maxSize` (default 100), `strategy` (`'lru'`, `'ttl'`, `'weak'`, `'simple'`), `ttl`, `stats`, `onHit`, `onMiss`, `onEvict`.

### `createComponent(renderFunction | definition)`

Wraps a render function (or a `{ name, render, state, methods, ... }` definition) in a callable component instance with `mount`, `update` and `destroy`:

```javascript
import { createComponent } from '@coherent.js/core';

const Greeting = createComponent(({ name }) => ({ h1: { text: `Hello, ${name}!` } }));
render(Greeting({ name: 'Ada' })); // <h1>Hello, Ada!</h1>
```

The instance and its state are shared by everyone who renders it. On the server, pass per-request data through props.

### `withState(initialState, options?)`

A higher-order component that injects `state` and `stateUtils` props:

```javascript
import { withState } from '@coherent.js/core';

const Counter = withState({ count: 0 })(({ state, stateUtils }) => ({
  div: {
    children: [
      { p: { text: `Count: ${state.count}` } },
      { button: { text: 'Increment', onclick: () => stateUtils.setState({ count: state.count + 1 }) } }
    ]
  }
}));
```

- `stateUtils`: `setState`, `getState`, `resetState`, `updateState(fn)`, `batchUpdate`, `computed`, `subscribe`, `unsubscribe`.
- Options include `debug`, `validator`, `middleware`, `reducer`, `actions`, `persistent` / `storageKey`, `onStateChange`, `onMount`.
- The state container is created once per `withState(...)(Component)` call, so on the server it is shared by every request. Keep request data in props, and use `withState` for browser-side state.

### Error boundaries

```javascript
import { createErrorBoundary } from '@coherent.js/core';

const boundary = createErrorBoundary({
  fallback: { p: { text: 'This widget is unavailable.' } }
});
const SafeWidget = boundary(Widget);
```

`withErrorBoundary(options, { Header, Sidebar })` wraps several components at once and returns them under the same keys.

On the server a boundary starts from a clean state on every call. Function components nested inside the wrapped component are evaluated within the boundary. See [Error handling](../advanced/errors.md).

## Performance Monitoring

`performanceMonitor` records metrics from renders made with `enableMonitoring: true`:

```javascript
import { render, performanceMonitor } from '@coherent.js/core';

render(Page(), { enableMonitoring: true });

const report = performanceMonitor.generateReport();
console.log(report.metrics.renderTime.avg);
```

Other methods: `getStats()`, `reset()`, `measure(name, fn)`, `measureAsync(name, fn)`, `startRender()` / `endRender(id)`, `addMetric(name, config)`, `addAlertRule(rule)`, and `start()` / `stop()` for periodic resource sampling and reporting.

## Database Layer

See the [database guide](../database/index.md) for details.

```javascript
import { createDatabaseManager, executeQuery } from '@coherent.js/database';

const db = createDatabaseManager({ type: 'sqlite', database: ':memory:' });
await db.connect();

await db.query('CREATE TABLE users (id INTEGER PRIMARY KEY, name TEXT, active INTEGER)');
const { rows } = await executeQuery(db, {
  table: 'users',
  select: ['id', 'name'],
  where: { active: 1 },
  orderBy: { name: 'ASC' },
  limit: 10
});
```

- `createQuery(config)` returns a copy of the query object; `executeQuery(db, config)` validates it, builds the SQL and runs it.
- Identifiers, operators, `orderBy` directions and `limit` / `offset` are validated, and UPDATE/DELETE without `where` throws unless `allowFullTable: true` is passed.
- `DatabaseManager` is also available from `@coherent.js/database/connection`.

## Client-side Hydration

### `hydrate(component, container, options?)`

Hydrates server-rendered HTML with the same component so its `on*` handlers work.

**Options:**
- `initialState` (Object): state to hydrate with; defaults to the container's `data-state` attribute
- `props` (Object): extra props passed to the component
- `detectMismatch` (Boolean): compare the DOM with the component's output. Defaults to on only when `process.env.NODE_ENV === 'development'`, or when `strict` / `onMismatch` is set
- `strict` (Boolean): throw on mismatch instead of warning
- `onMismatch` (Function): receives the detected mismatches

**Returns:** `{ unmount, rerender, getState, setState }`.

```javascript
import { hydrate } from '@coherent.js/client';
import { Counter } from './components/Counter.js';

const container = document.getElementById('counter');
const instance = hydrate(Counter, container, {
  initialState: { count: 10 },
  props: { theme: 'dark' }
});

instance.setState({ count: 11 }); // patches the DOM
instance.unmount();               // releases handlers; later setState() does nothing
```

Hydrating a container again replaces the previous hydration.

### `extractState(element)` / `serializeState(state)`

`serializeState(state)` returns the base64 string to put in a `data-state` attribute (or `null` when there is nothing serializable); `extractState(element)` reads it back.

```javascript
import { extractState } from '@coherent.js/client';

const state = extractState(document.getElementById('counter')); // parsed data-state, or null
```

### Removed in 1.0

`legacyHydrate`, `hydrateAll`, `hydrateBySelector`, `makeHydratable`, `autoHydrate`, `enableClientEvents` and `registerEventHandler` were removed in 1.0 in favor of `hydrate()`. See [`MIGRATION-1.0.md`](../../MIGRATION-1.0.md).

## Framework Integrations

All adapters live in `@coherent.js/integrations/<framework>` and render only what they are handed explicitly; plain objects stay JSON. See the [integrations guide](../deployment/integrations.md).

### Express (`@coherent.js/integrations/express`)

- `setupCoherent(app, options?)` installs `coherentMiddleware`, which adds `res.coherent(component, { template? })`. Options: `template` (with a `{{content}}` placeholder), `enablePerformanceMonitoring`, `autoRender` (render component-shaped objects passed to `res.send`, off by default), `useEngine` / `engineName` (register the view engine, off by default).
- `createCoherentHandler(componentFactory, options?)` — a route handler; the factory receives `(req, res, next)`.

### Fastify (`@coherent.js/integrations/fastify`)

- `setupCoherent` / `coherentFastify` is a Fastify **plugin**: `await fastify.register(setupCoherent, { template })`. It adds `reply.coherent(component, { template? })`, which returns the reply; render errors go through Fastify's error handling. `autoRender: true` also renders component-shaped handler return values.
- `createHandler(componentFactory, options?)` — the factory receives `(request, reply)`.

### Koa (`@coherent.js/integrations/koa`)

- `setupCoherent(app, options?)` installs `coherentKoaMiddleware`, which adds `ctx.coherent(component, { template? })`. `autoRender: true` also renders a component-shaped `ctx.body`.
- `createHandler(componentFactory, options?)`.

### Next.js (`@coherent.js/integrations/nextjs`)

- `createCoherentAppRouterHandler(factory, options?)` — App Router route handler; the factory receives `(request, { params })` (`params` is a Promise from Next.js 15 on).
- `createCoherentNextHandler(factory, options?)` — Pages Router API route handler.
- `createCoherentServerComponent(factory, options?)` / `createCoherentClientComponent(factory, options?)` — **async**; they resolve to React components. Pass `{ React }` to supply the React module explicitly.

## Utilities

- `escapeHtml(text)` — escapes `&`, `<`, `>`, `"` and `'`.
- `validateComponent(component)` — a quick structural check: throws when the value is not a component (e.g. `null` or a number) and returns `true` otherwise. `render()` performs the full validation.
- `isValidAttributeName(name)` — whether `render()` accepts an attribute name.
- `dangerouslySetInnerContent(html)` / `isTrustedContent(value)` — mark raw HTML as trusted. Markers carry a non-enumerable symbol brand; plain objects such as `{ __html, __trusted: true }` parsed from JSON are never trusted.

## Types

`@coherent.js/core` ships declarations for `CoherentNode`, `CoherentElement`, `CoherentComponent`, `RenderOptions`, `StreamOptions` and more:

```typescript
import type { CoherentNode, RenderOptions } from '@coherent.js/core';

const Badge = ({ label }: { label: string }): CoherentNode => ({
  span: { className: ['badge', label === 'new' && 'badge--new'], text: label }
});
```

A `CoherentNode` is an element object, a string, a number, a boolean, `null`, `undefined`, or an array of nodes.
