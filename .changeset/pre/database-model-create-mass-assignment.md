---
"@coherent.js/database": minor
---

Make `Model.create()` respect `fillable` / `guarded`, and always insert.

- **Fixed (security):** `create(attributes)` handed its attributes to the constructor, which ignores `fillable` and `guarded`, so `User.create(req.body)` inserted every column the client sent (`role: 'admin'`, `is_admin: true`, an `id` of their choosing). It now applies them like `fill()`.
- **Fixed:** with a primary key among the attributes, the new instance counted as already saved, so `create({ id: 5, ... })` ran no query at all and returned a record that did not exist. `create()` now always inserts.
- **Behavior change:** columns missing from a non-empty `fillable` (or listed in `guarded`) are no longer set by `create()`. List them in `fillable`, or set trusted values with `setAttribute()` before `save()`. Defaults from `static attributes` still apply.
