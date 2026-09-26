---
"@coherent.js/tooling": minor
---

`extendExpect(expect)` no longer replaces Vitest/Jest built-in matchers, and the
custom matchers work on `renderComponent()` output.

**Behavior change:**

- `toMatchSnapshot`, `toHaveBeenCalled`, `toHaveBeenCalledWith` and
  `toHaveBeenCalledTimes` are no longer registered. The overrides replaced the
  built-ins for the whole test run: `toMatchSnapshot` always passed and never
  wrote a snapshot (snapshot testing was silently off), and
  `toHaveBeenCalledWith` compared arguments with `===`. Snapshot with
  `expect(result.toSnapshot()).toMatchSnapshot()`. `createMock()` / `createSpy()`
  mocks now carry the `_isMockFunction` marker, so the built-in
  `toHaveBeenCalled*` matchers (with deep equality) accept them.
- `toHaveText` / `toContainText` / `toBeVisible` / `toBeEmpty` read the text
  content of a `renderComponent()` result (they used to see `null`), with HTML
  entities decoded.
- `toHaveClass` matches whole class tokens (`'btn'` no longer matches
  `btn-primary`) and reads the element's `class` attribute; `getByClassName`
  and `assertions.assertHasClass` match whole tokens too.
- `toHaveAttribute` and `toHaveTagName` look at the element itself (the first
  element of the HTML) instead of any substring match anywhere in the markup:
  `toHaveAttribute('id')` no longer matches `data-id`, `toHaveTagName('b')` no
  longer matches `<br>`, and boolean attributes such as `disabled` are found.
- `toBeValidHTML` checks tag nesting with a stack and accepts void elements
  (`<input>`, `<br>`, `<img>`, …), comments, doctypes and raw-text content.
- `getByTestId`/`getByClassName` matches carry the element's whole opening tag
  in `html`, and query strings are escaped before being used in a RegExp.
- The matcher type declarations now describe the matchers that exist
  (`toHaveTag`, `toBeDisabled`, `toHaveState`, … were declared but never
  implemented), and `renderComponent()` is typed as returning
  `TestRendererResult`.
