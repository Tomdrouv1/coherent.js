# @coherent.js/client

[![npm version](https://img.shields.io/npm/v/@coherent.js/client.svg)](https://www.npmjs.com/package/@coherent.js/client)
[![license: MIT](https://img.shields.io/badge/license-MIT-blue.svg)](../../LICENSE)
[![Node >= 22.12](https://img.shields.io/badge/node-%3E%3D22.12-brightgreen)](https://nodejs.org)

Client-side hydration, event delegation, routing and HMR for Coherent.js
applications.

- ESM-only
- Hydrates HTML rendered by `@coherent.js/core` with the same component
- Document-level event delegation that survives re-renders
- DOM patching on `setState()` / `rerender()`
- Router with `:param` patterns and browser history
- HMR client for development

For a high-level overview and repository-wide instructions, see the root README: ../../README.md

## Installation

```bash
pnpm add @coherent.js/client
```

## Entry points

| Import | Contents |
| --- | --- |
| `@coherent.js/client` | `hydrate`, event delegation, state serialization, mismatch detection, HMR client |
| `@coherent.js/client/events` | `EventDelegation`, `eventDelegation`, `HandlerRegistry`, `handlerRegistry`, `wrapEvent` |
| `@coherent.js/client/router` | `createRouter`, `router` |
| `@coherent.js/client/hmr` | The HMR client API on its own (no side effects on import) |

## Hydration

Render on the server with `@coherent.js/core`, then hydrate the same component
on the client:

```js
import { hydrate } from '@coherent.js/client';

function Counter({ count = 0 }) {
  return {
    div: {
      className: 'counter',
      children: [
        { span: { text: `Count: ${count}` } },
        {
          button: {
            text: '+1',
            onClick: (event) => event.setState({ count: event.state.count + 1 })
          }
        }
      ]
    }
  };
}

const app = hydrate(Counter, document.querySelector('.counter'), {
  initialState: { count: 0 }   // defaults to the container's data-state attribute
});

app.setState({ count: 5 });  // patches the DOM
app.getState();              // { count: 5 }
app.rerender({ label: 'x' }); // re-render with extra props
app.unmount();               // releases handlers; later setState() does nothing
```

`hydrate(component, container, options)` options:

| Option | Default | |
| --- | --- | --- |
| `initialState` | `data-state` of the container | State to hydrate with |
| `props` | `{}` | Extra props passed to the component |
| `detectMismatch` | on in development (`process.env.NODE_ENV === 'development'`), or when `strict`/`onMismatch` is set | Compare the server DOM with the component's output |
| `strict` | `false` | Throw on mismatch instead of warning |
| `onMismatch` | — | Receive the mismatches instead of the console warning |

Hydrating the same container again replaces the previous hydration.

### Event handlers

`on*` props become delegated handlers: `onClick` → `click`, `onDoubleClick` →
`dblclick`, `onPointerDown` → `pointerdown`, and so on — any DOM event works.
A handler receives a wrapped event:

```js
onClick: (event) => {
  event.preventDefault();       // works: listeners are not passive
  event.stopPropagation();      // stops ancestor handlers
  event.originalEvent;          // the native event
  event.target;                 // the element carrying this handler
  event.state;                  // component state when the event fired
  event.setState({ open: true });
  event.props;                  // props the component rendered with
}
```

Handlers run from the target outwards through every ancestor that has one,
like native bubbling. Non-bubbling events (`mouseenter`, `load`, ...) only run
the handler on their own element. Scroll-blocking events (`touchstart`,
`touchmove`, `wheel`, `scroll`) are delegated passively, so `preventDefault()`
has no effect on them.

### Re-rendering

`setState()` and `rerender()` diff the previous output against the new one:
children are added, removed or replaced (matched by `key` when every sibling
has one), attributes follow the server's rules (`style` objects, function
values, `true`/`false`), `html` content is updated, and `value`, `checked` and
`selected` are written to the element's properties too, so they are
controlled by state.

### State serialization and mismatches

```js
import { serializeState, extractState, detectMismatch, reportMismatches } from '@coherent.js/client';

serializeState({ count: 1 });            // base64 string for data-state (null if empty)
extractState(element);                   // parsed data-state, or null
reportMismatches(detectMismatch(element, Counter({ count: 1 })), { componentName: 'Counter' });
```

## Router

```js
import { createRouter } from '@coherent.js/client/router';

const router = createRouter({ base: '/app' });   // or { mode: 'hash' }

router.addRoute('/', { component: () => Home });  // a function is a loader
router.addRoute('/users/:id', {
  component: () => import('./UserPage.js'),      // lazy: resolves to the module
  beforeEnter: (to) => to.params.id !== 'blocked' // false cancels
});

await router.start();          // resolve the current URL, follow back/forward,
                               // intercept clicks on links to registered routes
await router.push('/users/42?tab=posts');
router.getCurrentRoute();      // { path: '/users/42', params: { id: '42' }, query: { tab: 'posts' }, component, ... }
router.back();
router.stop();
```

The router resolves routes and tracks the current one; rendering the matched
component is up to the application. A function `component` is called once,
without arguments, and its awaited result becomes the route's component, so
wrap component functions: `component: () => Home`. The last navigation wins: a slow lazy
route that resolves after a later `push()` is dropped.

## HMR

```js
import { hmrClient, createHotContext } from '@coherent.js/client';

hmrClient.initialize();  // connects to the dev server's WebSocket

const hot = createHotContext(import.meta.url);
hot.accept((newModule) => { /* apply the update */ });
hot.dispose((data) => { data.saved = currentState; });
```

A changed module without `accept()` reloads the page. Form values (including
radio groups) and scroll positions are preserved across updates; timers,
listeners and fetches created through `cleanupTracker.createContext(id)` are
released when the module is replaced.

## Notes on testing

The package's own tests run in Node against a small DOM (see
`packages/client/test/helpers/dom.js`): it parses server HTML, dispatches
events with capture and bubbling, and models form properties.

## Development

```bash
pnpm --filter @coherent.js/client run test
pnpm --filter @coherent.js/client run typecheck
pnpm --filter @coherent.js/client run build
```

## License

MIT © Coherent.js Team
