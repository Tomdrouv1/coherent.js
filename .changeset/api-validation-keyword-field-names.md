---
"@coherent.js/api": patch
---

Validate field maps that contain a field named `items`, `default`, `const` or `additionalProperties`.

- **Fixed:** such a schema (`{ customerId: {...}, total: {...}, items: { type: 'array', required: true } }`) was mistaken for a single rule because those names are also keywords, so none of its fields was checked and every request body passed validation. A keyword now only makes an object a rule when it has a scalar value (`type: 'string'`) or when no other key holds a schema.
