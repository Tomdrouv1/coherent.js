---
"@coherent.js/forms": minor
---

Let a shared `FormBuilder` render per-request state without leaking it.

A builder keeps `values`, `errors` and `touched` on the instance, so one created
once at module scope and filled per request rendered the previous user's
submitted values and errors into the next user's form (a plain GET after
someone else's failed POST showed their email address).

- `form.fork()` returns a copy of the definition — fields, groups, options and
  handlers — with fresh state. Fork the shared definition per request.
- `form.buildForm({ values, errors, touched })` renders that state for one
  render only; the builder's own state is neither read nor changed. Values are
  merged over the fields' default values, and fields with an error are shown
  as touched unless `touched` is given.

Existing single-use builders behave as before. The type docs describe the
per-request pattern.
