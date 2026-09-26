---
"@coherent.js/database": minor
---

Remove the test scaffolding from the `Model` class (`@coherent.js/database/model`): it no longer invents data.

`User.find(424242)` on an empty table returned a fake `{ name: 'John Doe', email: 'john@example.com', ... }` user (any id except 999), `updateWhere` / `deleteWhere` returned 3 / 2 when nothing changed, `withModel` could never 404 because `req.user` became that fake user, `user()` and `posts()` returned hard-coded records on every model, and without a database `all()` returned two fake users and `save()` "succeeded" with `id = 1`. Every new row also got `id = 1` whenever the driver reported no insert id, so a second `save()` overwrote the first row.

- `find()` returns `null` when no row matches; `findOrFail()` throws; `withModel` responds 404.
- `updateWhere()` / `deleteWhere()` return the affected-row count reported by the driver (`affectedRows`, `changes` or `rowCount`), 0 when nothing changed.
- `save()` takes the primary key from the driver's `insertId` (or `RETURNING` on PostgreSQL) and never makes one up.
- Relationships run real queries: `hasMany` / `hasOne` query the related model by foreign key, `belongsTo` loads the owner. `model` may be the related class or the name of a globally registered one. Each declared relationship gets an accessor method (`user.posts()`), replacing the hard-coded `posts()` / `user()` methods.
- `set()` now behaves like `setAttribute()`: it casts the value and marks the model dirty, so `save()` persists it (it silently did nothing before).
- `create(attributes, { transaction })`, `save({ transaction })` and `delete({ transaction })` run on the given transaction.
- Table names and column keys go through the query builder's identifier validation instead of being interpolated.

**Behavior change:**

- Every query method (`find`, `all`, `where`, `updateWhere`, `deleteWhere`, `save`, `delete`) throws `"<Model> has no database connection. Call <Model>.setDatabase(db) before querying."` when no database is set.
- `where()`, `updateWhere()` and `deleteWhere()` throw on keys that are not identifiers and on values that are objects or arrays (use `executeQuery()` for operators), so a request body cannot inject an operator. `updateWhere()` / `deleteWhere()` throw when given no condition.
- A relationship whose related model cannot be found throws instead of returning fake records.
