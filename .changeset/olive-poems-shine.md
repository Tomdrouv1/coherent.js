---
"@coherent.js/forms": minor
---

Let the form builder express a production form.

**Forms work without JavaScript again.** `buildForm()` emitted
`onsubmit="handleSubmit(event)"` on every form — naming a global the package
never defines, since `hydrateForm` binds its own listener — plus `novalidate`,
which turns off the browser validation a no-JS submission depends on.
`novalidate: false` was ignored. Both are now off by default: the form posts to
its `action` and validates natively with JavaScript disabled. Opt back in with
`enhance: true` (or a handler string) and `novalidate: true`. This also stops
the builder emitting markup that a strict CSP blocks.

**`attributes` is honoured.** It was declared on `FormField` and read by
nothing, so `autocomplete`, `maxlength`, `tabindex` and `data-*` were silently
dropped. Attributes are applied before the builder's own, so `name`, `id`,
`type` and the `aria-*` pair cannot be overridden, and names that are not valid
HTML attribute names are rejected — `formatAttributes` escapes attribute values
but interpolates names raw. `disabled` and `readonly` are honoured too.

**Class names are yours.** A `classNames` option covers the wrapper, label,
control, invalid state, error message and submit button, defaulting to the
previous values and exported as `DEFAULT_CLASS_NAMES`. Per-field `className`
appends to the control class. `hydrateForm` now finds the field wrapper through
the `data-field` attribute the builder already emitted rather than
`.form-field`, and takes the same `classNames` so the classes it writes on
failure match what the server rendered.

Together these make a honeypot a plain field, with no dedicated API:

```js
builder.field('website', {
  label: 'Website',
  className: 'contact-form__trap',
  attributes: { tabindex: '-1', autocomplete: 'off' }
});
```

**Hidden fields are no longer rendered.** `buildForm()` ignored `visible: false`
and `showWhen`, while `validate()` had always skipped them — so a conditionally
hidden field rendered but was never validated. Both now agree.

Controls also no longer carry an empty `class=""` or `placeholder=""`.
