---
"@coherent.js/database": patch
---

Fix `createModel` writes.

- INSERT / UPDATE / DELETE issued by a registered model targeted the table `undefined`: `query()` defaulted `config.from` to the model's table, but the write builders only read `config.table`. `query()` now defaults `table` (and the query builder accepts either).
- `query()` no longer mutates the config object passed to it.
- `instance.save()` no longer sends the instance's own methods (`save`, `delete`, definition `methods`) as columns, and leaves the primary key out of the UPDATE's SET clause.
