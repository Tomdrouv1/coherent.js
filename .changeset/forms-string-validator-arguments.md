---
"@coherent.js/forms": patch
---

Support string validators with arguments, such as `'minLength:8'`.

A string entry in a validator list was looked up as a whole registry name, so
`validators: ['required', 'minLength:8']` in a `FormBuilder` field silently
dropped `'minLength:8'`: the server accepted a 3-character password, and the
rule never reached `data-validators`, so `hydrateForm` did not enforce it
either. The same entry was ignored by `FormValidator` schemas, `validateField`
and `validateForm`.

A built-in's name can now carry its arguments after a colon, mapped onto its
factory: `'minLength:8'` is `validators.minLength(8)`, `'min:18'`,
`'matches:password'`, `'oneOf:s,m,l'` (every value goes into the list),
`'pattern:^[a-z]{2,8}$'` (the whole remainder is the regular expression), and
an optional message after the parameter (`'minLength:8,Too short'`) or alone
for rules without one (`'required:Name please'`). These entries are enforced on
the server and rendered into `data-validators` exactly like the factory call,
so `hydrateForm` gives the same verdict and message. Unknown names and
arguments that do not fit the rule (`'minLength:abc'`) are still skipped;
registered validators are named without arguments.
