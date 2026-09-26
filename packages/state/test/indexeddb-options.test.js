/**
 * `withIndexedDB(initialState, key, { dbName, storeName })`
 *
 * The IndexedDB adapter takes a database and an object store name, but
 * createPersistentState built it without them, so every store was written to
 * the `state` store of `coherent-db` whatever the options said.
 */

import { describe, it, expect, beforeEach, afterEach } from 'vitest';
import { createPersistentState, withIndexedDB } from '../src/state-persistence.js';

/**
 * A minimal in-memory `indexedDB`: versioned databases holding named object
 * stores, asynchronous requests, `upgradeneeded` when the version grows and
 * `versionchange` to the connections already open.
 */
function createFakeIndexedDB() {
  const databases = new Map();
  const opens = [];

  const later = (fn) => setTimeout(fn, 0);
  const domError = (name, message) => Object.assign(new Error(message), { name });

  function request(run) {
    const req = { result: undefined, error: null, onsuccess: null, onerror: null };
    later(() => {
      try {
        req.result = run();
        req.onsuccess?.({ target: req });
      } catch (error) {
        req.error = error;
        req.onerror?.({ target: req });
      }
    });
    return req;
  }

  function connect(record) {
    const db = {
      closed: false,
      onversionchange: null,
      get version() { return record.version; },
      objectStoreNames: { contains: (name) => record.stores.has(name) },
      createObjectStore(name) {
        record.stores.set(name, new Map());
      },
      close() {
        db.closed = true;
        record.connections.delete(db);
      },
      transaction(storeNames) {
        if (db.closed) throw domError('InvalidStateError', 'The database connection is closing.');
        for (const name of storeNames) {
          if (!record.stores.has(name)) throw domError('NotFoundError', `No object store named "${name}"`);
        }
        return {
          objectStore(name) {
            const data = record.stores.get(name);
            return {
              get: (key) => request(() => data.get(key)),
              put: (value, key) => request(() => { data.set(key, value); return key; }),
              delete: (key) => request(() => { data.delete(key); }),
              clear: () => request(() => { data.clear(); })
            };
          }
        };
      }
    };
    record.connections.add(db);
    return db;
  }

  return {
    databases,
    opens,
    open(name, version) {
      opens.push({ name, version });
      const req = { result: undefined, error: null, onsuccess: null, onerror: null, onupgradeneeded: null };
      later(() => {
        let record = databases.get(name);
        const current = record ? record.version : 0;
        const target = version ?? (current || 1);
        if (target < current) {
          req.error = domError('VersionError', `Requested version ${target} is less than ${current}`);
          req.onerror?.({ target: req });
          return;
        }
        if (!record) {
          record = { version: 0, stores: new Map(), connections: new Set() };
          databases.set(name, record);
        }
        if (target > current) {
          for (const other of [...record.connections]) other.onversionchange?.({ target: other });
          // A real browser waits ("blocked") while another connection stays open.
          if (record.connections.size > 0) {
            req.error = domError('AbortError', 'Upgrade blocked by an open connection');
            req.onerror?.({ target: req });
            return;
          }
        }
        const db = connect(record);
        req.result = db;
        if (target > current) {
          record.version = target;
          req.onupgradeneeded?.({ target: req, oldVersion: current, newVersion: target });
        }
        req.onsuccess?.({ target: req });
      });
      return req;
    }
  };
}

let fake;
let hadWindow;

beforeEach(() => {
  fake = createFakeIndexedDB();
  globalThis.indexedDB = fake;
  // Browser backends are inert on the server (no `window`).
  hadWindow = 'window' in globalThis;
  if (!hadWindow) globalThis.window = {};
});

afterEach(() => {
  delete globalThis.indexedDB;
  if (!hadWindow) delete globalThis.window;
});

/** The state the fake holds in `dbName` / `storeName` under `key`. */
function stored(dbName, storeName, key) {
  const value = fake.databases.get(dbName)?.stores.get(storeName)?.get(key);
  // The payload wraps the serialized state: { state: '{"a":1}', timestamp, ... }
  return value === undefined ? undefined : JSON.parse(JSON.parse(value).state);
}

describe('withIndexedDB options', () => {
  it('stores in the dbName / storeName it was given', async () => {
    const cart = withIndexedDB({ items: [] }, 'cart', { dbName: 'shop', storeName: 'carts', debounce: false });
    await cart.ready;
    cart.setState({ items: ['apple'] });
    await expect(cart.save()).resolves.toBe(true);

    expect(cart.adapter.dbName).toBe('shop');
    expect(cart.adapter.storeName).toBe('carts');
    expect(fake.opens.map((open) => open.name)).toEqual(['shop']);
    expect(stored('shop', 'carts', 'cart')).toEqual({ items: ['apple'] });
    expect(fake.databases.has('coherent-db')).toBe(false);

    // A later store with the same options restores it.
    const again = withIndexedDB({ items: [] }, 'cart', { dbName: 'shop', storeName: 'carts' });
    await expect(again.ready).resolves.toBe(true);
    expect(again.getState('items')).toEqual(['apple']);
  });

  it('works through createPersistentState({ storage: "indexedDB" }) too', async () => {
    const prefs = createPersistentState({ theme: 'light' }, {
      storage: 'indexedDB', key: 'prefs', dbName: 'app', storeName: 'settings', debounce: false
    });
    await prefs.ready;
    prefs.setState({ theme: 'dark' });
    await prefs.save();

    expect(stored('app', 'settings', 'prefs')).toEqual({ theme: 'dark' });
  });

  it('keeps coherent-db / state as the defaults', async () => {
    const counter = withIndexedDB({ count: 0 }, 'counter', { debounce: false });
    await counter.ready;
    counter.setState({ count: 1 });
    await counter.save();

    expect(stored('coherent-db', 'state', 'counter')).toEqual({ count: 1 });
  });

  it('adds a new storeName to a database another store already created', async () => {
    const first = withIndexedDB({ a: 0 }, 'a', { dbName: 'shared', storeName: 'one', debounce: false });
    await first.ready;
    first.setState({ a: 1 });
    await first.save();

    const second = withIndexedDB({ b: 0 }, 'b', { dbName: 'shared', storeName: 'two', debounce: false });
    await second.ready;
    second.setState({ b: 2 });
    await expect(second.save()).resolves.toBe(true);

    expect(fake.databases.get('shared').version).toBe(2);
    expect(stored('shared', 'two', 'b')).toEqual({ b: 2 });

    // The first store gave way to the upgrade and still works afterwards.
    first.setState({ a: 3 });
    await expect(first.save()).resolves.toBe(true);
    expect(stored('shared', 'one', 'a')).toEqual({ a: 3 });
  });
});
