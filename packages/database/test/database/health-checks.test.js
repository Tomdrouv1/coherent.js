/**
 * Regression tests: connect() must actually start the periodic health checks, and the
 * backup helpers must not pretend to succeed.
 */

import { describe, it, expect, vi, afterEach } from 'vitest';
import { createDatabaseManager } from '../../src/connection-manager.js';
import { createBackup, restoreBackup } from '../../src/utils.js';

function adapterWith(testConnection) {
  return {
    createPool: vi.fn(async () => ({ query: async () => ({ rows: [] }) })),
    testConnection,
    closePool: vi.fn(async () => {})
  };
}

describe('periodic health checks', () => {
  afterEach(() => {
    vi.useRealTimers();
  });

  it('start on connect and report healthy and unhealthy checks', async () => {
    vi.useFakeTimers();
    const testConnection = vi.fn(async () => {});
    const db = createDatabaseManager({ adapter: adapterWith(testConnection), healthCheckInterval: 1000 });
    const events = [];
    db.on('healthCheck', event => events.push(event.status));
    db.on('error', () => {});

    await db.connect();
    expect(testConnection).toHaveBeenCalledTimes(1);

    await vi.advanceTimersByTimeAsync(1000);
    testConnection.mockRejectedValueOnce(new Error('connection reset'));
    await vi.advanceTimersByTimeAsync(1000);

    expect(testConnection).toHaveBeenCalledTimes(3);
    expect(events).toEqual(['healthy', 'unhealthy']);

    await db.close();
    await vi.advanceTimersByTimeAsync(5000);
    expect(testConnection).toHaveBeenCalledTimes(3);
  });

  it('can be turned off', async () => {
    vi.useFakeTimers();
    const testConnection = vi.fn(async () => {});
    const db = createDatabaseManager({ adapter: adapterWith(testConnection), healthCheck: false, healthCheckInterval: 1000 });

    await db.connect();
    await vi.advanceTimersByTimeAsync(5000);

    expect(testConnection).toHaveBeenCalledTimes(1);
    expect(db.healthCheckInterval).toBe(null);
  });

  it('rejects an invalid interval when the manager is created', () => {
    expect(() => createDatabaseManager({ adapter: adapterWith(async () => {}), healthCheckInterval: 0 }))
      .toThrow('healthCheckInterval must be a positive number of milliseconds');
  });

  it('does not keep the process alive', async () => {
    const db = createDatabaseManager({ adapter: adapterWith(async () => {}) });
    await db.connect();

    expect(db.healthCheckInterval.hasRef()).toBe(false);
    await db.close();
  });
});

describe('backup helpers', () => {
  it('throw instead of pretending to back up or restore', async () => {
    const log = vi.spyOn(console, 'log').mockImplementation(() => {});

    await expect(createBackup({}, { outputPath: './backups' })).rejects.toThrow('createBackup() is not implemented');
    await expect(restoreBackup({}, './backups/x.sql')).rejects.toThrow('restoreBackup() is not implemented');
    expect(log).not.toHaveBeenCalled();
    log.mockRestore();
  });
});
