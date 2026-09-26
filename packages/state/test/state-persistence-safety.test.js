/**
 * Persistence defects: the automatic restore overwrote updates made right
 * after creation; storage failures reported success; `encrypt` used a public
 * default key and threw on non-Latin-1 text; cross-tab sync merged unrelated
 * stores and echoed a store's own updates; and on the server every request
 * shared one Web Storage.
 */

import { describe, it, expect, beforeEach, afterEach, vi } from 'vitest';
import { createPersistentState } from '../src/state-persistence.js';

const tick = (ms = 20) => new Promise((resolve) => setTimeout(resolve, ms));

function createStorage() {
  const store = new Map();
  return {
    store,
    failWith: null,
    getItem(key) {
      return store.has(key) ? store.get(key) : null;
    },
    setItem(key, value) {
      if (this.failWith) throw this.failWith;
      store.set(key, String(value));
    },
    removeItem(key) {
      store.delete(key);
    },
    clear() {
      store.clear();
    },
  };
}

const stored = (storage, key) => JSON.parse(JSON.parse(storage.store.get(key)).state);
const payload = (state) => JSON.stringify({ state: JSON.stringify(state), version: '1.0.0', timestamp: Date.now() });

let storage;
let created;

function create(initial, options) {
  const instance = createPersistentState(initial, options);
  created.push(instance);
  return instance;
}

beforeEach(() => {
  storage = createStorage();
  created = [];
  vi.stubGlobal('localStorage', storage);
  vi.stubGlobal('window', {});
});

afterEach(async () => {
  await Promise.all(created.map((instance) => instance.destroy()));
  vi.unstubAllGlobals();
});

describe('restore on creation', () => {
  it('keeps an update made before the restore finished, and persists it', async () => {
    storage.store.set('cart', payload({ qty: 1, coupon: 'SPRING' }));

    const cart = create({ qty: 0, coupon: null }, { key: 'cart', debounceDelay: 5 });
    cart.setState({ qty: 5 });
    await cart.ready;
    await tick();

    expect(cart.getState()).toEqual({ qty: 5, coupon: 'SPRING' });
    expect(stored(storage, 'cart')).toEqual({ qty: 5, coupon: 'SPRING' });
  });

  it('exposes `ready`, resolving to whether stored state was restored', async () => {
    storage.store.set('prefs', payload({ theme: 'dark' }));

    const withData = create({ theme: 'light' }, { key: 'prefs' });
    const empty = create({ theme: 'light' }, { key: 'missing' });

    await expect(withData.ready).resolves.toBe(true);
    await expect(empty.ready).resolves.toBe(false);
    expect(withData.getState('theme')).toBe('dark');
  });
});

describe('storage failures', () => {
  it('reports a failed write through onError, not onSave', async () => {
    const quota = Object.assign(new Error('The quota has been exceeded.'), { name: 'QuotaExceededError' });
    storage.failWith = quota;
    const onSave = vi.fn();
    const onError = vi.fn();

    const state = create({ items: [1, 2, 3] }, { key: 'big', onSave, onError });
    await state.ready;
    const saved = await state.save();

    expect(saved).toBe(false);
    expect(onSave).not.toHaveBeenCalled();
    expect(onError).toHaveBeenCalledWith(quota);
    expect(storage.store.has('big')).toBe(false);
  });
});

describe('encrypt (XOR obfuscation)', () => {
  it('has no default key', () => {
    expect(() => createPersistentState({}, { key: 'x', encrypt: true })).toThrow(TypeError);
  });

  it('round-trips any Unicode text', async () => {
    const onError = vi.fn();
    const first = create({ name: '日本 — café 🎉' }, { key: 'enc', encrypt: true, encryptionKey: 'k3y', onError });
    await first.ready;
    await first.save();

    const raw = storage.store.get('enc');
    const second = create({ name: '' }, { key: 'enc', encrypt: true, encryptionKey: 'k3y', onError });
    await second.ready;

    expect(onError).not.toHaveBeenCalled();
    expect(raw).not.toContain('café');
    expect(second.getState('name')).toBe('日本 — café 🎉');
  });
});

describe('crossTab', () => {
  it('syncs stores sharing a key, once per update, and never unrelated stores', async () => {
    const tabA = create({ items: [] }, { key: 'cart', storage: 'memory', crossTab: true, debounce: false });
    const tabB = create({ items: [] }, { key: 'cart', storage: 'memory', crossTab: true, debounce: false });
    const user = create({ name: 'ann' }, { key: 'user', storage: 'memory', crossTab: true, debounce: false });
    const tabANotified = vi.fn();
    tabA.subscribe(tabANotified);

    tabA.setState({ items: ['sku-1'] });
    await tick();

    expect(tabB.getState()).toEqual({ items: ['sku-1'] });
    expect(user.getState()).toEqual({ name: 'ann' });
    expect(tabANotified).toHaveBeenCalledTimes(1);
  });

  it('stops syncing after destroy()', async () => {
    const tabA = create({ n: 0 }, { key: 'counter', storage: 'memory', crossTab: true, debounce: false });
    const tabB = create({ n: 0 }, { key: 'counter', storage: 'memory', crossTab: true, debounce: false });

    await tabB.destroy();
    tabA.setState({ n: 1 });
    await tick();

    expect(tabB.getState('n')).toBe(0);
  });
});

describe('on the server', () => {
  beforeEach(() => {
    vi.stubGlobal('window', undefined);
  });

  it('never shares browser storage between requests', async () => {
    const requestA = create({}, { key: 'session', debounce: false });
    requestA.setState({ email: 'alice@example.com' });
    await requestA.save();

    const requestB = create({}, { key: 'session' });
    await requestB.ready;

    expect(requestB.getState()).toEqual({});
    expect(storage.store.size).toBe(0);
  });

  it('persists through an explicit adapter', async () => {
    const backing = new Map();
    const adapter = {
      get: async (key) => backing.get(key) ?? null,
      set: async (key, value) => (backing.set(key, value), true),
      remove: async (key) => backing.delete(key),
      clear: async () => (backing.clear(), true),
    };

    const first = create({ n: 1 }, { key: 'srv', adapter, debounce: false });
    await first.save();
    const second = create({ n: 0 }, { key: 'srv', adapter });

    await expect(second.ready).resolves.toBe(true);
    expect(second.getState('n')).toBe(1);
  });
});
