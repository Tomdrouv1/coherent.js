# Client-Side Hydration in Coherent.js

> **1.0 update:** The legacy hydration helpers (`hydrateAll`, `hydrateBySelector`, `makeHydratable`, `autoHydrate`, `enableClientEvents`, `registerEventHandler`) were removed in 1.0. Use the unified `hydrate()` API documented below. See [`MIGRATION-1.0.md`](../../MIGRATION-1.0.md) for migration help.

This guide covers how to make server-rendered Coherent.js components interactive in the browser.

## What is Hydration?

The server renders a component to HTML with `render()` from `@coherent.js/core`. Function-valued event props (`onClick: () => ...`) render **nothing** on the server — there is no way to send a closure to the browser. In the browser, `hydrate()` from `@coherent.js/client` calls the same component again, pairs its output with the existing DOM, and attaches the handlers through document-level event delegation. The HTML is not re-created.

## Quick Start

```javascript
// components/Counter.js — shared by server and client
export function Counter({ count = 0 }) {
  return {
    div: {
      className: 'counter',
      children: [
        { span: { text: `Count: ${count}` } },
        { button: { text: '+1', onClick: (event) => event.setState({ count: event.state.count + 1 }) } }
      ]
    }
  };
}
```

```javascript
// server.js
import { render } from '@coherent.js/core';
import { Counter } from './components/Counter.js';

const html = render(Counter({ count: 0 }));
// <div class="counter"><span>Count: 0</span><button>+1</button></div>
```

```javascript
// client.js
import { hydrate } from '@coherent.js/client';
import { Counter } from './components/Counter.js';

hydrate(Counter, document.querySelector('.counter'), { initialState: { count: 0 } });
```

The container is the element the component's root renders (here the `.counter` div), not a wrapper around it.

Bundle the browser entry point with your bundler of choice:

```bash
npx esbuild client.js --bundle --format=esm --outfile=public/client.js
```

## `hydrate(component, container, options?)`

Returns `{ unmount, rerender, getState, setState }`.

| Option | Default | |
| --- | --- | --- |
| `initialState` | the container's `data-state` attribute | State to hydrate with; passed to the component as props |
| `props` | `{}` | Extra props passed to the component |
| `detectMismatch` | on only when `process.env.NODE_ENV === 'development'`, or when `strict` / `onMismatch` is set | Compare the server DOM with the component's output |
| `strict` | `false` | Throw on mismatch instead of warning |
| `onMismatch` | — | Receive the mismatches instead of the console warning |

The component is called with `{ ...props, ...state }`. Hydrating a container that is already hydrated unmounts the previous hydration first.

### Instance API

```javascript
const app = hydrate(Counter, container, { initialState: { count: 0 } });

app.setState({ count: 5 });      // or app.setState((s) => ({ count: s.count + 1 })); re-renders and patches the DOM
app.getState();                  // { count: 5 }
app.rerender({ label: 'Total' }); // re-render with extra props
app.unmount();                   // releases the handlers; later setState()/rerender() do nothing
```

Re-renders diff the previous output against the new one: children are added, removed or replaced (matched by `key` when every sibling has one), attributes follow the server's rules, and `value`, `checked` and `selected` are written to the element's properties, so form fields are controlled by state.

## Event Handling

`on*` props become delegated handlers: `onClick` → `click`, `onDoubleClick` → `dblclick`, `onPointerDown` → `pointerdown` and so on — any DOM event works. A handler receives one wrapped event:

```javascript
{
  button: {
    text: 'Save',
    onClick: (event) => {
      event.preventDefault();        // works: listeners are not passive
      event.stopPropagation();       // stops handlers on ancestors
      event.originalEvent;           // the native event
      event.target;                  // the element carrying this handler
      event.state;                   // component state when the event fired
      event.setState({ saving: true });
      event.props;                   // props the component rendered with
    }
  }
}
```

Handlers run from the target outwards through every ancestor that has one, like native bubbling: a click inside nested elements that both have `onClick` runs both, innermost first. Non-bubbling events (`mouseenter`, `load`, ...) only run the handler on their own element. `touchstart`, `touchmove`, `wheel` and `scroll` are delegated passively, so `preventDefault()` has no effect on them.

Inline **string** handlers (`onclick: 'history.back()'`) are rendered as attributes on the server and are not managed by `hydrate()`.

## Passing State from the Server

Put the initial state in a `data-state` attribute with `serializeState()` so the client does not need to repeat it:

```javascript
// server.js
import { render } from '@coherent.js/core';
import { serializeState } from '@coherent.js/client';

const state = { count: 3 };
const tree = Counter(state);
tree.div['data-state'] = serializeState(state); // base64 JSON; functions are dropped
const html = render(tree);
```

```javascript
// client.js — initialState defaults to the container's data-state
hydrate(Counter, document.querySelector('.counter'));
```

`extractState(element)` reads the attribute back yourself; it returns `null` when there is none.

## Advanced Patterns

### Lazy Hydration

Hydrate below-the-fold components when they become visible:

```javascript
import { hydrate } from '@coherent.js/client';

function hydrateWhenVisible(component, element, options) {
  const observer = new IntersectionObserver((entries) => {
    for (const entry of entries) {
      if (entry.isIntersecting) {
        hydrate(component, entry.target, options);
        observer.unobserve(entry.target);
      }
    }
  }, { rootMargin: '100px' });
  observer.observe(element);
}

document.querySelectorAll('[data-widget="comments"]').forEach((el) => {
  hydrateWhenVisible(Comments, el);
});
```

### Code-Split Hydration

Load a component's code only on pages that contain it:

```javascript
const el = document.querySelector('.chart');
if (el) {
  const { Chart } = await import('./components/Chart.js');
  hydrate(Chart, el);
}
```

### Hydration Error Handling

`hydrate()` throws synchronously for invalid arguments (a non-function component, a missing container) and, with `strict: true`, on a mismatch:

```javascript
function safeHydrate(component, element, options) {
  try {
    return hydrate(component, element, options);
  } catch (error) {
    console.error('Hydration failed:', error);
    element.classList.add('hydration-failed');
    return null;
  }
}
```

## Best Practices

### 1. Share components between server and client

Import the same module on both sides so the output matches. Keep browser-only work inside event handlers, which only run in the browser.

### 2. Progressive enhancement

Make the page work without JavaScript, then enhance it:

```javascript
{
  form: {
    action: '/subscribe',             // works without JS
    method: 'POST',
    onSubmit: (event) => {            // attached by hydrate()
      event.preventDefault();
      submitWithFetch(new FormData(event.target));
    },
    children: [
      { input: { name: 'email', type: 'email', required: true } },
      { button: { type: 'submit', text: 'Subscribe' } }
    ]
  }
}
```

### 3. Check for mismatches in development

Run your development build with `NODE_ENV=development` (most bundlers set it), or pass `detectMismatch: true`, to be warned when the server HTML and the client component disagree. Mismatch detection is off in production so that hydration does not walk the whole DOM.

### 4. Clean up

Call `instance.unmount()` before removing a hydrated element from the page.

## Troubleshooting

### Buttons don't work after hydration

1. Make sure the client bundle calls `hydrate()` with the element the component's root renders.
2. Make sure the handler is a function prop (`onClick: () => ...`) on the component passed to `hydrate()`.
3. Turn on `detectMismatch: true` to see whether the DOM and the component disagree.

### State not updating

Update state with `event.setState()` in a handler or `instance.setState()`; mutating `event.state` does not re-render.

### Hydration mismatch

1. Render the same component with the same props/state on both sides.
2. Keep client-only values (dates, random ids, `window` reads) out of the first render.

## Browser Support

Hydration requires a browser with ES module support. `process.env.NODE_ENV` is read at runtime; bundlers usually replace it, and a page without `process` counts as production.

---

## Related Documentation

- [Router](router.md) - Client-side routing
- [Basic Components](../components/basics.md) - Component creation guide
- [State Management](../components/state.md)
- [Performance Guide](../deployment/performance.md) - Optimization strategies
