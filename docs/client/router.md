# Client-Side Router

**Package:** `@coherent.js/client`
**Module:** `@coherent.js/client/router`

## Overview

The router maps URL paths to routes, keeps the browser's address bar and history in sync, runs navigation guards and lazy-loads route modules. It **resolves** routes and tracks the current one; rendering the matched component into the page is up to your application.

```bash
pnpm add @coherent.js/client
```

## Basic Usage

```javascript
import { createRouter } from '@coherent.js/client/router';
import { HomePage } from './pages/HomePage.js';

const router = createRouter({ mode: 'history', base: '/app' }); // or { mode: 'hash' }

router.addRoute('/', { component: () => HomePage });
router.addRoute('/users/:id', { component: () => import('./pages/UserPage.js') });

await router.start();              // resolve the current URL, follow back/forward,
                                   // intercept clicks on links to registered routes
await router.push('/users/42?tab=posts');

const route = router.getCurrentRoute();
// { path: '/users/42', fullPath: '/users/42?tab=posts', params: { id: '42' },
//   query: { tab: 'posts' }, hash: '', meta: {}, component: <module namespace> }
```

Nothing touches the browser until `start()` is called, so importing the router has no side effects.

## Route Definitions

`router.addRoute(path, config)` registers a route:

| Config | |
| --- | --- |
| `component` | A value stored as the route's component, or a **loader function** called once, without arguments, the first time the route is visited or prefetched. Its (awaited) result becomes `route.component`. |
| `beforeEnter(to, from)` | Guard; returning (or resolving to) `false` cancels the navigation |
| `beforeLeave(to, from)` | Guard run when leaving this route; `false` cancels |
| `meta` | Arbitrary data, copied to `route.meta` |
| `priority` | Prefetch priority |
| `transition` | `{ enter, leave, duration }` for this route |

Because a function `component` is treated as a loader, wrap a component function you want to receive as-is: `component: () => UserPage`. For code splitting, return a dynamic import: `component: () => import('./pages/UserPage.js')` resolves to the module namespace (`route.component.default`).

### Dynamic Routes

```javascript
router.addRoute('/users/:id', { component: () => UserPage });
router.addRoute('/docs/*', { component: () => DocsPage });

await router.push('/users/42');
router.getCurrentRoute().params; // { id: '42' }

await router.push('/docs/guide/intro');
router.getCurrentRoute().params; // { pathMatch: 'guide/intro' }
```

Exact paths win over patterns; patterns match in registration order. Parameter values are URL-decoded.

## Rendering the Current Route

```javascript
import { render } from '@coherent.js/core';

async function show(path) {
  if (!(await router.push(path))) return; // not found, cancelled or superseded
  const { component, params } = router.getCurrentRoute();
  const Page = component.default ?? component; // a lazily imported module, or the component
  document.getElementById('app').innerHTML = render(Page(params));
}
```

To make the rendered page interactive, use `hydrate()` from `@coherent.js/client` instead of assigning `innerHTML` (see [Integration with Hydration](#integration-with-hydration)).

## Navigation

```javascript
await router.push('/about');              // adds a history entry
await router.push('/search?q=test#results');
await router.replace('/about');           // replaces the current entry
router.back();
router.forward();
```

- `push()` and `replace()` resolve to `true` when the navigation committed and to `false` when no route matched, a guard cancelled it, loading failed, or a later navigation superseded it — the last navigation wins.
- After `start()`, `back()` / `forward()` drive the browser's history; before it, the router keeps its own history.
- In history mode, URLs are written under `base`; in hash mode, as `#/path`.

## Browser Integration

```javascript
await router.start();                          // returns the result of the initial navigation
await router.start({ interceptLinks: false }); // leave link clicks alone
router.stop();                                 // detach every listener
```

`start()` navigates to the current location, listens to `popstate` (`hashchange` in hash mode) and intercepts left-clicks on same-origin `<a href>` links whose path is a registered route. Links with a `target` other than `_self`, links with a `download` or `data-router-ignore` attribute, and clicks with a modifier key are left to the browser.

## Navigation Guards

```javascript
router.addRoute('/admin', {
  component: () => import('./pages/Admin.js'),
  beforeEnter: (to, from) => isAdmin(),   // false cancels
  beforeLeave: (to, from) => !hasUnsavedChanges()
});
```

Guards may be async. To redirect, cancel and navigate yourself:

```javascript
beforeEnter: (to) => {
  if (!isAuthenticated()) {
    router.replace(`/login?next=${encodeURIComponent(to.fullPath)}`);
    return false;
  }
}
```

## Prefetching and Code Splitting

```javascript
const router = createRouter({
  prefetch: { enabled: true, strategy: 'hover', delay: 100, maxConcurrent: 3 },
  codeSplitting: { enabled: true, preload: ['/about'], onLoad: (path, module, ms) => {} }
});

router.addRoute('/about', { component: () => import('./pages/About.js') });
router.addRoute('/products', { component: () => import('./pages/Products.js') });

router.setupPrefetchStrategy(document.querySelector('a[href="/products"]'), '/products');
router.prefetchRoute('/products');           // manual
router.prefetchRoutes(['/about', '/products']);
```

- Prefetching is off unless `prefetch.enabled` is `true`. Strategies for `setupPrefetchStrategy(element, path)`: `hover` (after `delay` ms), `visible` (IntersectionObserver) and `idle` (`requestIdleCallback`; with this strategy every lazy route is also prefetched when the browser is idle).
- `codeSplitting.preload` loads the listed routes as soon as they are registered (when `codeSplitting.enabled` is `true`).

## Scroll Behavior

```javascript
const router = createRouter({
  scrollBehavior: {
    enabled: true,        // default
    behavior: 'smooth',
    position: 'top',      // scroll to top on new pages
    savePosition: true,   // restore the saved position on back/forward
    delay: 0,
    custom: (to, from, savedPosition) => savedPosition ?? { x: 0, y: 0 }
  }
});
```

A `#hash` in the URL scrolls to the element with that id. Saved positions are restored on back/forward only.

## Page Transitions

With `transitions: { enabled: true, default: { enter, leave, duration } }` (or a per-route `transition`), the router sets `style.animation` on the element marked `data-router-view` to the `leave` then the `enter` animation name, each for half of `duration`. Define the keyframes (`fade-in`, `fade-out`...) in your own CSS. `onStart(from, to)` and `onComplete(from, to)` are called around it.

## Router State

```javascript
router.getCurrentRoute();  // current route, or null before the first navigation
router.getRoute('/users/7');  // the registered route matching a path
router.getRoutes();        // every registered route
router.getStats();         // { navigations, prefetches, chunksLoaded, historyLength, ... }
router.clearCaches();      // forget prefetches, saved positions and loaded chunks
```

## TypeScript Support

```typescript
import { createRouter } from '@coherent.js/client/router';
import type { Router, Route, RouteConfig } from '@coherent.js/client/router';

const router: Router = createRouter({ mode: 'history' });

const userRoute: RouteConfig = {
  component: () => import('./pages/UserPage.js'),
  beforeEnter: (to: Route) => to.params?.id !== 'blocked'
};
router.addRoute('/users/:id', userRoute);
```

## Integration with Hydration

```javascript
import { hydrate } from '@coherent.js/client';
import { createRouter } from '@coherent.js/client/router';
import { App } from './App.js';

// Hydrate the server-rendered page first
hydrate(App, document.getElementById('app'));

// Then let the router follow the URL
const router = createRouter();
router.addRoute('/', { component: () => App });
await router.start();
```

## See Also

- [Client-Side Hydration](hydration.md)
- [Performance Optimizations](../deployment/performance.md)
