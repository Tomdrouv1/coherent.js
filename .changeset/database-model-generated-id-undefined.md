---
"@coherent.js/database": patch
---

Give a saved model its generated primary key when `fill()` dropped the key.

- **Fixed:** `fill()` stores attributes it filters out (not in `fillable`, or `guarded`) as `undefined`, and `save()` only copied the driver's generated id into a key that was exactly `null`. A model filled from a request body that carried an `id` was inserted but kept no id, and its next `save()` threw `Cannot update ... without a primary key`.
