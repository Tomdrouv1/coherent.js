---
"@coherent.js/client": minor
---

Make `setState()` / `rerender()` actually patch the DOM, without leaking handlers.

The re-render patcher only walked the children that already existed and wrote
every prop with `setAttribute(String(value))`. It now diffs the previous
virtual tree against the next one:

- children are added, removed and replaced, so a list that grows from one item
  to three, or empties, is rendered; when every sibling has a `key`, children
  are matched by key and their DOM nodes (and focus) are kept
- attribute values follow core's renderer: `style` objects become
  `color: red; font-size: 12px`, function values are called, `true` is a bare
  attribute and `false`/`null`/`undefined` remove it; `key` and `html` are
  never attributes, and `html` updates the element's content
- `value`, `checked` and `selected` are also written to the element's
  properties, so a field the user edited follows the state
- `event.state`, `event.props` and `event.component` are populated for
  handlers bound by `hydrate()` (they were always `null`)

Handlers no longer leak: each re-render releases the previous render's handler
ids (1000 `setState()` calls left 1001 registry entries) and removes
`data-coherent-*` attributes whose handler went away.

**Behavior change:** `unmount()` is terminal — `setState()` and `rerender()`
on an unmounted component do nothing. Hydrating a container that is already
hydrated unmounts the previous hydration first, instead of binding a second
set of handlers. `value`/`checked`/`selected` props are controlled: a
re-render resets a field to the value its props give.
