import { describe, it, expect, vi } from 'vitest';

// A fake pg.Pool: an EventEmitter, like the real one, so an 'error' event with
// no listener throws exactly as it would crash a real process.
vi.mock('pg', async () => {
  const { EventEmitter } = await import('node:events');
  class Pool extends EventEmitter {}
  return { default: { Pool } };
});

const { createPostgreSQLAdapter } = await import('../../src/adapters/postgresql.js');

describe('error events', () => {
  it('listens for idle-client errors on the pg pool', async () => {
    const pool = await createPostgreSQLAdapter().createPool({ pool: {} });
    const spy = vi.spyOn(console, 'error').mockImplementation(() => {});

    expect(pool.listenerCount('error')).toBe(1);
    expect(pool.listenerCount('_error')).toBe(0);
    expect(() => pool.emit('error', new Error('terminating connection due to administrator command'))).not.toThrow();
    expect(spy).toHaveBeenCalledWith('PostgreSQL pool error:', expect.any(Error));
  });
});
