/**
 * Compile-only fixture for the manager, model, migration, middleware and adapter APIs,
 * type-checked by declarations.test.js against ../../types/index.d.ts. It is never executed.
 */

import {
  createDatabaseManager,
  createConnection,
  createModel,
  createMigration,
  runMigrations,
  withDatabase,
  withTransaction,
  withModel,
  withPagination,
  setupDatabase,
  SQLiteAdapter,
  PostgreSQLAdapter,
  MongoDBAdapter,
  type Transaction,
  type MigrationRunner
} from '../../types/index.js';
import * as database from '../../types/index.js';

const db = createDatabaseManager({ type: 'sqlite', database: ':memory:', healthCheckInterval: 1000 });
await db.connect();
db.retryDelay = 0;
const { rows } = await db.query<{ id: number }>('SELECT id FROM users WHERE id = ?', [1]);
export const firstId: number = rows[0].id;

const tx: Transaction = await db.transaction({ isolationLevel: 'serializable', readOnly: true });
await tx.query('UPDATE users SET name = ? WHERE id = ?', ['x', 1]);
await tx.commit();
export const done: boolean = tx.isCommitted;
export const result: string = await db.transaction(async (trx) => {
  await trx.query('SELECT 1');
  return 'ok';
});
db.on('healthCheck', (event: { status: string }) => event.status);
export const stats = db.getStats().poolStats?.available;

const custom = createDatabaseManager({ adapter: { createPool: async () => ({}) } });
await createConnection({ type: 'memory' });
setupDatabase({ autoConnect: false });

interface User { id: number; name: string; email: string }
const models = createModel(db);
const Users = models.registerModel<User>('User', {
  tableName: 'users',
  attributes: { id: { type: 'number', primaryKey: true }, name: { type: 'string' }, email: { type: 'string' } },
  methods: { label() { return this.name; } },
  statics: { async byEmail(email: string) { return this.where({ select: '*', where: { email } }); } }
});
const user = await Users.create({ name: 'a', email: 'a@example.com' });
export const email: string = user.email;
await user.save();
export const deleted: number = await user.delete();
export const found = await Users.find(1);
export const changed: number = await Users.updateWhere({ id: 1 }, { name: 'b' });
await Users.byEmail('a@example.com');
await models.execute({ User: { select: '*' } });

const migration: MigrationRunner = createMigration(db, { directory: './migrations', dialect: 'postgresql', transactional: false });
export const applied: string[] = await migration.run({ continueOnError: true });
export const rolledBack: string[] = await migration.rollback(2);
export const status = (await migration.status())[0].applied;
export const names: string[] = await runMigrations(db, { directory: 'db/migrations' });

const middleware = [
  withDatabase(db, { autoConnect: false }),
  withTransaction(db, { isolationLevel: 'READ COMMITTED' }),
  withModel({ name: 'User', find: async (id: string) => ({ id }) }, 'userId', 'user'),
  withPagination({ defaultLimit: 10, maxLimit: 50, pageParam: 'p', limitParam: 'size' })
];
await middleware[0]({}, {}, () => {});
await middleware[1]({}, {});

export const pg = PostgreSQLAdapter().getPoolStats;
export const sqlite = SQLiteAdapter().transaction;
export const mongo = MongoDBAdapter().transaction;

// @ts-expect-error there is no default export at runtime
export const noDefault = database.default;
// @ts-expect-error isolation levels are whitelisted
await db.transaction({ isolationLevel: 'CHAOS' });
// @ts-expect-error withTransaction needs the database
withTransaction({ isolationLevel: 'SERIALIZABLE' });
export { custom };
