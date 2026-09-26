---
"@coherent.js/client": minor
---

Connect the router to the browser.

`createRouter()` accepted `mode` and `base` but never touched the URL: it made
no `pushState` calls, listened to neither `popstate` nor link clicks, and only
matched paths registered verbatim, so `/users/:id` never matched `/users/42`.

- Routes may contain `:param` segments and end in `/*`; the current route
  carries `params`, `query`, `hash` and `fullPath`.
- `push()` / `replace()` write browser history (`pushState` / `replaceState`),
  honouring `base` in history mode and using the hash in `mode: 'hash'`.
- New `start()` navigates to the current location, follows back/forward
  (`popstate`, or `hashchange` in hash mode) and intercepts clicks on
  same-origin links to registered routes (`interceptLinks: false` opts out);
  `stop()` detaches. Nothing is attached before `start()`, so importing the
  router has no side effects.
- `beforeEnter` / `beforeLeave` guards, declared in the types but never called,
  now run; returning `false` cancels the navigation.

**Behavior change:** the last navigation wins — a slow `push('/slow')` that
resolves after a later `push('/fast')` now resolves `false` instead of
replacing it. `back()` goes back through history: calling it twice after
`/a → /b → /c` ends on `/a` instead of bouncing between `/b` and `/c`;
`forward()` works without a browser too. A saved scroll position is restored
on back/forward only, not on every visit to a path.
