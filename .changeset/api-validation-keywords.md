---
"@coherent.js/api": minor
---

Validation enforces what its types advertise, and invalid requests say why.

- Object routes with `validation:` answer a valid body with the handler's response; they answered every valid body with a 500 ("next is not a function").
- A failed validation answers 400 with `{ error: 'Validation failed', details: { errors: [{ field, message, rule }] } }`; the field errors used to be dropped. `router.addRoute()` routes now answer an `ApiError` thrown by middleware or a handler with its own status (400, 404, 409...) instead of a 500.
- `validateAgainstSchema()` / `validateField()` / `withValidation()` implement `integer`, `enum`, `const`, `pattern` (string or RegExp), `items`, nested `properties` at any depth, `minimum`/`maximum`/`exclusiveMinimum`/`exclusiveMaximum`, `minLength`/`maxLength`, `min`/`max`, `minItems`/`maxItems`, `additionalProperties`, `minProperties`/`maxProperties`, `nullable`, type arrays, the `email`/`url`/`uuid`/`phone`/`credit-card`/`date` types and formats, `custom`, `message`, `trim`, `transform` and `default`. They were silently ignored.
- The field-map shape documented by the `ValidationSchema` type (`{ email: { type: 'email', required: true } }`) is validated; it used to accept every input.
- `required: [...]` checks own properties only, so `required: ['constructor']` no longer passes on `{}`.
- Results carry `data` (and `validateField()` a `value`) with defaults, trimming, transforms and coercion applied; each error has a `rule`. Options: `abortEarly`, `stripUnknown`, `allowUnknown`, `coerceTypes`, `context`.

**Behavior change:** input that used to pass because a keyword was ignored is now rejected with a 400. `withValidation()` replaces `req.body` with the validated data, so `default` values appear in it. `withQueryValidation()` / `withParamsValidation()` convert numeric and boolean strings for `number`/`integer`/`boolean` fields and write the converted values back to `req.query` / `req.params`.

Types: `ValidationRule` gains the JSON-Schema keywords, `SchemaDefinition` (rule or field map) is what the validators accept, `validateField()` is declared as returning `{ valid, errors, value }` as it always has, and `ValidationErrorInfo` has `rule` instead of the never-populated `value`.
