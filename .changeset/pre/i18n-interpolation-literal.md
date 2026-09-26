---
"@coherent.js/i18n": patch
---

Interpolate translation params literally and ignore inherited keys.

- A param containing `$'`, `$&`, `` $` `` or `$$` corrupted the output
  (`t('hi', { name: "$'" })` gave `"Hello !!"`), because each value was passed
  to `String#replace` as a replacement string. Values are now inserted as
  written.
- A custom `interpolation.prefix` / `suffix` such as `%(` / `)s` was compiled as
  a raw regular expression and never matched (or threw). Delimiters and param
  names are now matched literally, and the `interpolation` option is merged
  with the defaults, so overriding only `prefix` keeps the `}}` suffix.
- `t('constructor')` returned `"function Object() { [native code] }"` because
  lookups used `in`. Only own properties of the translation objects are
  resolved now, including through nested dot keys.

**Behavior change:** interpolation is a single pass, so a param value that
itself contains a placeholder (`{ a: '{{b}}', b: 'B' }`) is no longer expanded
a second time; keys such as `constructor`, `toString` or `a.valueOf` now go
through the missing-key path (returning the key, or calling
`missingKeyHandler`) unless the translations define them.
