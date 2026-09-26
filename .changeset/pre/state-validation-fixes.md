---
"@coherent.js/state": patch
---

Fix schema validation edge cases and a stuck `ModalState` promise.

- A `null` value for a property typed `object` passed the type check
  (`typeof null === 'object'`) and then threw a `TypeError` inside the
  validator; with `coerce: true` the same happened for any type that cannot be
  coerced. Both are now ordinary `type` validation errors.
- `additionalProperties: false` was ignored unless `allowUnknown: false` was
  also passed. It is now enforced on its own, and `allowUnknown: false` rejects
  keys missing from any object schema's `properties`.
- Coercion turned `"false"` into `true` (`Boolean("false")`), `""` into `0` and
  objects into `"[object Object]"`. Only unambiguous conversions remain:
  numeric strings to numbers, `"true"`/`"false"`/`"1"`/`"0"` to booleans,
  numbers and booleans to strings.
- `NaN` is no longer accepted as a `number`.
- Opening a `ModalState` while it was open left the first `open()` promise
  pending forever; it now resolves with `null`.
- The `demoEnhancedPatterns` example no longer ships in the package source.

**Behavior change:** arrays no longer satisfy `type: 'object'`, `NaN` fails
`type: 'number'`, and coercions listed above as removed are now type errors.
