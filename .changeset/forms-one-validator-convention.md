---
"@coherent.js/forms": minor
---

One `validators` registry and one calling convention across every entry point.

`@coherent.js/forms` and `@coherent.js/forms/validators` exported two different
`validators` objects and two different `createValidator` functions: the root's
explicit export of the factory-style set (`validators.minLength(8)(value)`)
silently shadowed the direct-style set (`validators.minLength(value, { min: 8
})`) that the subpath exported. `validateForm` runs validators as `(value,
formData)`, so a root built-in listed uncalled came back as the error —
`validateForm({ name: 'Ada' }, { name: [validators.required] })` returned `{
name: [Function] }` — and `hydrateForm` mixed both conventions.

Now the root, `/validation` and `/validators` export the same `validators` and
`createValidator`:

- A **validator** is `(value, formData) => string | null`. Schemas,
  `validateField`, `validateForm`, `FormBuilder` fields and `hydrateForm` all
  run validators that way.
- Each built-in is a **factory** returning a validator:
  `validators.required('Name please')`, `validators.minLength(8)`. A built-in
  listed uncalled (`[validators.required]`) runs with its defaults, and a
  string names a built-in or registered validator.
- The direct form still works when an options object is passed:
  `validators.minLength('abc', { min: 5 })` returns the error.
- `createValidator(schema)` returns a `FormValidator`; `createValidator(fn,
  message)` wraps a check function.
- The root now also has the built-ins that only the subpath had: `number`,
  `integer`, `phone`, `date`, `alpha`, `alphanumeric`, `uppercase`, `match`,
  `fileType`, `fileSize`, `fileExtension`, plus `get`, `compose`, `debounce`,
  `cancellable`, `when` and `chain`.

**Behavior change:**

- On `@coherent.js/forms/validators`, a built-in called with one argument that
  could be a message (a non-empty string, `undefined` or `null`) now returns a
  validator instead of checking that value: `validators.email('a@b.c')` is a
  validator. Pass an options object to check directly —
  `validators.email('a@b.c', {})` — or call the validator:
  `validators.email()('a@b.c')`.
- Default messages follow the root set (`'Invalid email address'`,
  `'Minimum length is 8'`, …) on every entry point; the subpath used different
  wording (`'Please enter a valid email address'`, `'Must be at least 8
  characters'`).
- `validators.min()` / `max()` now pass an empty value (combine with
  `required`) and fail a non-numeric one: `min(5)('')` was an error and
  `min(5)('abc')` passed.
