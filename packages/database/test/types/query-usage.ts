/**
 * Compile-only fixture for the query builder API, type-checked by declarations.test.js
 * against ../../types/index.d.ts. It is never executed.
 */

import { executeQuery, type QueryConfig, type WhereConditions } from '../../types/index.js';

const db = { query: async (_sql: string, _params?: any[]) => ({ rows: [] }) };
const q: QueryConfig = {
  from: { table: 'users', alias: 'u' },
  select: ['u.id', 'COUNT(*) AS total'],
  joins: [{ type: 'left', table: 'posts', alias: 'p', condition: 'u.id = p.user_id' }],
  where: {
    active: true,
    age: { '>': 18, in: [1, 2] },
    $or: [{ role: 'admin' }, { role: { like: 'mod%' } }],
    $not: { banned: true },
    deleted_at: null
  },
  orderBy: [{ created_at: 'DESC' }, 'name'],
  limit: 10,
  offset: 0
};
const r = await executeQuery<{ id: number }>(db, q);
export const id: number = r.rows[0].id;
await executeQuery(db, { table: 'users', delete: true, allowFullTable: true });
await executeQuery(db, { table: 'users', insert: [{ a: 1 }], returning: ['id'] });

// @ts-expect-error undefined WHERE values throw at runtime
export const bad: WhereConditions = { id: undefined };
// @ts-expect-error groupBy is not supported
export const bad2: QueryConfig = { table: 'users', groupBy: 'x' };
