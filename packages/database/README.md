# @coherent.js/database

[![npm version](https://img.shields.io/npm/v/@coherent.js/database.svg)](https://www.npmjs.com/package/@coherent.js/database)
[![license: MIT](https://img.shields.io/badge/license-MIT-blue.svg)](../../LICENSE)
[![Node >= 20](https://img.shields.io/badge/node-%3E%3D20-brightgreen)](https://nodejs.org)

Database utilities and adapters for Coherent.js.

- ESM-only, Node 20+
- Optional adapters for popular databases
- Designed to pair with `@coherent.js/core` and server frameworks

For a high-level overview and repository-wide instructions, see the root README: ../../README.md

## Installation

```bash
pnpm add @coherent.js/database
```

Optional peer dependencies -- install the driver for the database you use:
- `sqlite3` (`type: 'sqlite'`, the default configuration)
- `pg` (`type: 'postgresql'`)
- `mysql2` (`type: 'mysql'`)
- `mongodb` (`type: 'mongodb'`)

## Quick start

JavaScript (ESM):
```js
import { createDatabaseManager, executeQuery } from '@coherent.js/database';

const db = createDatabaseManager({ type: 'sqlite', database: ':memory:' });
await db.connect();

await db.query('CREATE TABLE users (id INTEGER PRIMARY KEY AUTOINCREMENT, name TEXT)');
const { insertId } = await db.query('INSERT INTO users (name) VALUES (?)', ['Ada']);

// Object queries: values are bound, identifiers and operators are validated
const { rows } = await executeQuery(db, {
  table: 'users',
  where: { id: insertId },
  limit: 1
});

await db.close();
```

TypeScript:
```ts
import { createDatabaseManager, type Transaction } from '@coherent.js/database';

const db = createDatabaseManager({ type: 'postgresql', database: 'app', username: 'app', password: process.env.PGPASSWORD });
await db.connect();

await db.transaction(async (tx: Transaction) => {
  await tx.query('UPDATE accounts SET balance = balance - ? WHERE id = ?', [10, 1]);
  await tx.query('UPDATE accounts SET balance = balance + ? WHERE id = ?', [10, 2]);
});
```

The package has no default export; import the functions you need by name.

## Development

Run tests for this package:
```bash
pnpm --filter @coherent.js/database run test
```

Watch mode:
```bash
pnpm --filter @coherent.js/database run test:watch
```

Type check:
```bash
pnpm --filter @coherent.js/database run typecheck
```

Build:
```bash
pnpm --filter @coherent.js/database run build
```

## License

MIT © Coherent.js Team
