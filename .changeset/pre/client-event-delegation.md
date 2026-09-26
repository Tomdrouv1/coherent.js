---
"@coherent.js/client": minor
---

Make delegated events behave like DOM events.

- **`preventDefault()` works.** Every delegated listener except `submit` was
  registered `passive: true`, so `preventDefault()` in an `onClick`,
  `onKeyDown` or `onChange` handler was silently ignored — an SPA link still
  navigated. Listeners are now non-passive, except for the scroll-blocking
  `touchstart`, `touchmove`, `wheel` and `scroll`.
- **Every event type works.** Only nine types were listened for, so
  `onDoubleClick`, `onMouseEnter`, `onPointerDown` and the like received a
  `data-coherent-*` attribute but never fired. `hydrate()` now registers a
  document listener for each type a component uses (new
  `EventDelegation#listen(type)`); `onDoubleClick` maps to `dblclick`.
  Non-bubbling events such as `mouseenter` only run the handler on their own
  target.
- **Handlers bubble.** Only the nearest element with a handler ran. Handlers
  now run from the target outwards through every ancestor that has one, until
  a handler calls `stopPropagation()`. The wrapped event also exposes `type`,
  `currentTarget`, `defaultPrevented` and `stopImmediatePropagation()`.

**Behavior change:** a click inside nested elements that both have `onClick`
now runs both handlers, innermost first; call `event.stopPropagation()` to keep
the old nearest-only behaviour.
