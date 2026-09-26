---
"@coherent.js/database": patch
---

Declare the database drivers as optional peer dependencies.

The adapters load `pg`, `mysql2` and `mongodb` with dynamic imports, but only `sqlite3` was declared, so package managers could neither warn about a missing driver nor check its version. All four are now optional peers: `pg >=8.8.0 <9`, `mysql2 >=3.23.1 <4` (3.23.1 fixes an RCE and an identifier-escaping SQL injection), `mongodb >=5 <7`, and `sqlite3 >=5.1.0 <6` (was `>=5.0.0`). Installing without them still works; install the driver for the database you use.
