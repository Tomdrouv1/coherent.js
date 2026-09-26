---
"@coherent.js/state": minor
---

Rebuild the reactive core of `observable` / `computed` / `createReactiveState`.

- **Watching an expression works.** `state.watch(() => state.get('a') * 2, cb)`
  fired once with `undefined` and never again, and a watched `computed()` only
  noticed a change when something read it. Watched computeds are now kept up
  to date and notify their watchers when their value changes.
- **No leaks.** Every computed stayed registered on its sources forever
  (10 000 create-and-unwatch cycles left 10 000 entries). A computed now
  subscribes to its sources only while it is watched; an unwatched one
  validates its dependencies on read.
- **`delete()` / `clear()` update computeds** that read the key, including when
  the key is set again later.
- **`batch()` batches.** Watchers run once, after the outermost batch, with the
  final values; a key changed and changed back does not notify. A standalone
  `batch(fn)` is exported for plain observables.
- **Update loops are bounded.** Watchers no longer run inside the setter, so a
  watcher that writes cannot overflow the stack; a loop that never settles is
  stopped after 100 rounds and reported as a `StateError` (`type:
  'update-depth'`) instead of being swallowed.
- **Errors are isolated and reported.** A throwing watcher no longer stops the
  other watchers or leaves a computed stuck; errors go to the new `onError`
  option, or `globalErrorHandler`. A cycle between computed properties throws a
  `StateError` instead of silently producing `NaN`.
- **Dot paths.** `set('user.name', 'John')` writes a copy of `user` and
  notifies watchers of `user` and of `user.name`; `get`, `has`, `watch` and
  `delete` accept paths, as `docs/components/state.md` already documented.
- `toObject()` keeps a `"__proto__"` key as data; `Observable#peek()` reads
  without tracking; `ReactiveState#computed()` is typed to return the computed.

**Behavior change:** watchers run after the write completes rather than
synchronously inside it (still before `set()` / the assignment returns, unless
inside a `batch()`). Assigning an identical primitive no longer notifies
(`deep` now only means "re-assigning the same object notifies"). A key
containing a dot is treated as a path, not a flat key. Reading a computed whose
getter throws rethrows the error instead of returning the stale value. The
internal `_computedDependents` / `_invalidate` / `Observable._currentComputed`
members are gone.
