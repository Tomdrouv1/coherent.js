import { describe, it, expect, beforeEach, afterEach, vi } from 'vitest';
import {
  createPersistentState,
  withLocalStorage,
  withSessionStorage,
  withIndexedDB
} from '../src/state-persistence.js';

// Mock localStorage and sessionStorage for Node.js environment
const localStorageMock = (() => {
  let store = {};
  return {
    getItem: (key) => store[key] || null,
    setItem: (key, value) => { store[key] = value.toString(); },
    removeItem: (key) => { delete store[key]; },
    clear: () => { store = {}; }
  };
})();

const sessionStorageMock = (() => {
  let store = {};
  return {
    getItem: (key) => store[key] || null,
    setItem: (key, value) => { store[key] = value.toString(); },
    removeItem: (key) => { delete store[key]; },
    clear: () => { store = {}; }
  };
})();

global.localStorage = localStorageMock;
global.sessionStorage = sessionStorageMock;

describe('State Persistence', () => {
  beforeEach(() => {
    // Clear storage before each test
    localStorageMock.clear();
    sessionStorageMock.clear();
  });

  afterEach(() => {
    vi.clearAllTimers();
  });

  describe('createPersistentState', () => {
    it('should create persistent state manager', () => {
      const state = createPersistentState({ count: 0 }, { storage: 'memory' });

      expect(state).toBeDefined();
      expect(typeof state.getState).toBe('function');
      expect(typeof state.setState).toBe('function');
    });

    it('should get and set state', () => {
      const state = createPersistentState({ count: 0 }, { storage: 'memory' });

      expect(state.getState('count')).toBe(0);

      state.setState({ count: 1 }, false);
      expect(state.getState('count')).toBe(1);
    });

    it('should support function updates', () => {
      const state = createPersistentState({ count: 0 }, { storage: 'memory' });

      state.setState(prev => ({ count: prev.count + 1 }), false);
      expect(state.getState('count')).toBe(1);
    });

    it('should notify listeners on state change', () => {
      const state = createPersistentState({ count: 0 }, { storage: 'memory' });
      const listener = vi.fn();

      state.subscribe(listener);
      state.setState({ count: 1 }, false);

      expect(listener).toHaveBeenCalled();
      expect(listener.mock.calls[0][0].count).toBe(1);
      expect(listener.mock.calls[0][1].count).toBe(0);
    });

    it('should unsubscribe listeners', () => {
      const state = createPersistentState({ count: 0 }, { storage: 'memory' });
      const listener = vi.fn();

      const unsubscribe = state.subscribe(listener);
      state.setState({ count: 1 }, false);

      expect(listener).toHaveBeenCalledTimes(1);

      unsubscribe();
      state.setState({ count: 2 }, false);

      expect(listener).toHaveBeenCalledTimes(1);
    });

    it('should reset state to initial values', () => {
      const state = createPersistentState({ count: 0 }, { storage: 'memory' });

      state.setState({ count: 5 }, false);
      expect(state.getState('count')).toBe(5);

      state.resetState(false);
      expect(state.getState('count')).toBe(0);
    });
  });

  describe('LocalStorage persistence', () => {
    it('should save to localStorage', async () => {
      const state = withLocalStorage({ count: 0 }, 'test-state', { debounce: false });

      state.setState({ count: 1 });
      await state.save();

      const stored = localStorage.getItem('test-state');
      expect(stored).toBeTruthy();

      const data = JSON.parse(stored);
      const parsedState = JSON.parse(data.state);
      expect(parsedState.count).toBe(1);
    });

    it('should restore from localStorage', async () => {
      const state1 = withLocalStorage({ count: 0 }, 'test-restore', { debounce: false });
      state1.setState({ count: 42 });
      await state1.save();

      const state2 = withLocalStorage({ count: 0 }, 'test-restore');
      await state2.restore();

      expect(state2.getState('count')).toBe(42);
    });

    it('should clear storage', async () => {
      const state = withLocalStorage({ count: 0 }, 'test-clear', { debounce: false });
      state.setState({ count: 1 });
      await state.save();

      expect(localStorage.getItem('test-clear')).toBeTruthy();

      await state.clearStorage();
      expect(localStorage.getItem('test-clear')).toBeNull();
    });
  });

  describe('SessionStorage persistence', () => {
    it('should save to sessionStorage', async () => {
      const state = withSessionStorage({ count: 0 }, 'test-session', { debounce: false });

      state.setState({ count: 1 });
      await state.save();

      const stored = sessionStorage.getItem('test-session');
      expect(stored).toBeTruthy();

      const data = JSON.parse(stored);
      const parsedState = JSON.parse(data.state);
      expect(parsedState.count).toBe(1);
    });

    it('should restore from sessionStorage', async () => {
      const state1 = withSessionStorage({ count: 0 }, 'test-session-restore', { debounce: false });
      state1.setState({ count: 99 });
      await state1.save();

      const state2 = withSessionStorage({ count: 0 }, 'test-session-restore');
      await state2.restore();

      expect(state2.getState('count')).toBe(99);
    });
  });

  describe('Filtering', () => {
    it('should filter keys with include list', async () => {
      const state = withLocalStorage(
        { count: 0, secret: 'hidden', name: 'test' },
        'test-include',
        {
          include: ['count', 'name'],
          debounce: false
        }
      );

      state.setState({ count: 1, secret: 'changed' });
      await state.save();

      const stored = localStorage.getItem('test-include');
      const data = JSON.parse(stored);
      const parsedState = JSON.parse(data.state);

      expect(parsedState.count).toBe(1);
      expect(parsedState.name).toBe('test');
      expect(parsedState.secret).toBeUndefined();
    });

    it('should filter keys with exclude list', async () => {
      const state = withLocalStorage(
        { count: 0, secret: 'hidden', name: 'test' },
        'test-exclude',
        {
          exclude: ['secret'],
          debounce: false
        }
      );

      state.setState({ count: 1, secret: 'changed' });
      await state.save();

      const stored = localStorage.getItem('test-exclude');
      const data = JSON.parse(stored);
      const parsedState = JSON.parse(data.state);

      expect(parsedState.count).toBe(1);
      expect(parsedState.name).toBe('test');
      expect(parsedState.secret).toBeUndefined();
    });
  });

  describe('Debouncing', () => {
    it('should debounce saves', async () => {
      vi.useFakeTimers();

      const onSave = vi.fn();
      const state = withLocalStorage({ count: 0 }, 'test-debounce', {
        debounce: true,
        debounceDelay: 300,
        onSave
      });

      state.setState({ count: 1 });
      state.setState({ count: 2 });
      state.setState({ count: 3 });

      // Should not save immediately
      expect(onSave).not.toHaveBeenCalled();

      // Fast-forward time
      vi.advanceTimersByTime(300);

      await vi.runAllTimersAsync();

      // Should save once after debounce
      expect(onSave).toHaveBeenCalledTimes(1);

      vi.useRealTimers();
    });

    it('should save immediately when debounce is false', async () => {
      const onSave = vi.fn();
      const state = withLocalStorage({ count: 0 }, 'test-no-debounce', {
        debounce: false,
        onSave
      });

      state.setState({ count: 1 });
      await state.save();

      // onSave is called at least once (may be called on setState too if persist=true by default)
      expect(onSave).toHaveBeenCalled();
    });
  });

  describe('Callbacks', () => {
    it('should call onSave callback', async () => {
      const onSave = vi.fn();
      const state = withLocalStorage({ count: 0 }, 'test-onsave', {
        debounce: false,
        onSave
      });

      state.setState({ count: 1 });
      await state.save();

      expect(onSave).toHaveBeenCalled();
      expect(onSave.mock.calls[0][0].count).toBe(1);
    });

    it('should call onLoad callback', async () => {
      const state1 = withLocalStorage({ count: 0 }, 'test-onload', { debounce: false });
      state1.setState({ count: 42 });
      await state1.save();

      const onLoad = vi.fn();
      const state2 = withLocalStorage({ count: 0 }, 'test-onload', { onLoad });
      await state2.restore();

      expect(onLoad).toHaveBeenCalled();
      expect(onLoad.mock.calls[0][0].count).toBe(42);
    });

    it('should call onError callback on save error', async () => {
      const onError = vi.fn();
      const state = createPersistentState({ count: 0 }, {
        storage: 'localStorage',
        key: 'test-error',
        debounce: false,
        serialize: () => {
          throw new Error('Serialization error');
        },
        onError
      });

      state.setState({ count: 1 });
      await state.save();

      expect(onError).toHaveBeenCalled();
    });
  });

  describe('Encryption', () => {
    it('should encrypt stored data', async () => {
      const state = withLocalStorage({ secret: 'sensitive' }, 'test-encrypt', {
        encrypt: true,
        encryptionKey: 'my-secret-key',
        debounce: false
      });

      state.setState({ secret: 'very-sensitive' });
      await state.save();

      const stored = localStorage.getItem('test-encrypt');
      expect(stored).toBeTruthy();

      // Should not contain plain text
      expect(stored).not.toContain('very-sensitive');
    });

    it('should decrypt stored data', async () => {
      const state1 = withLocalStorage({ secret: 'sensitive' }, 'test-decrypt', {
        encrypt: true,
        encryptionKey: 'my-secret-key',
        debounce: false
      });

      state1.setState({ secret: 'encrypted-value' });
      await state1.save();

      const state2 = withLocalStorage({ secret: '' }, 'test-decrypt', {
        encrypt: true,
        encryptionKey: 'my-secret-key'
      });

      await state2.restore();
      expect(state2.getState('secret')).toBe('encrypted-value');
    });
  });

  describe('Versioning', () => {
    it('should store version information', async () => {
      const state = withLocalStorage({ count: 0 }, 'test-version', {
        versioning: true,
        version: '1.0.0',
        debounce: false
      });

      state.setState({ count: 1 });
      await state.save();

      const stored = localStorage.getItem('test-version');
      const data = JSON.parse(stored);

      expect(data.version).toBe('1.0.0');
    });

    it('should migrate between versions', async () => {
      // Save with v1
      const state1 = withLocalStorage({ count: 0 }, 'test-migrate', {
        versioning: true,
        version: '1.0.0',
        debounce: false
      });

      state1.setState({ count: 5 });
      await state1.save();

      // Load with v2 and migrate
      const migrate = vi.fn((data, fromVersion, toVersion) => {
        expect(fromVersion).toBe('1.0.0');
        expect(toVersion).toBe('2.0.0');
        return JSON.stringify({ count: JSON.parse(data).count * 2 });
      });

      const state2 = withLocalStorage({ count: 0 }, 'test-migrate', {
        versioning: true,
        version: '2.0.0',
        migrate
      });

      await state2.restore();

      expect(migrate).toHaveBeenCalled();
      expect(state2.getState('count')).toBe(10);
    });
  });

  describe('TTL (Time To Live)', () => {
    it('should expire old data', async () => {
      vi.useFakeTimers();
      const now = Date.now();
      vi.setSystemTime(now);

      const state1 = withLocalStorage({ count: 0 }, 'test-ttl', {
        ttl: 1000, // 1 second
        debounce: false
      });

      state1.setState({ count: 1 });
      await state1.save();

      // Fast-forward past TTL
      vi.setSystemTime(now + 2000);

      const state2 = withLocalStorage({ count: 0 }, 'test-ttl', { ttl: 1000 });
      const restored = await state2.restore();

      expect(restored).toBe(false);
      expect(state2.getState('count')).toBe(0);

      vi.useRealTimers();
    });

    it('should not expire fresh data', async () => {
      const state1 = withLocalStorage({ count: 0 }, 'test-ttl-fresh', {
        ttl: 10000, // 10 seconds
        debounce: false
      });

      state1.setState({ count: 42 });
      await state1.save();

      const state2 = withLocalStorage({ count: 0 }, 'test-ttl-fresh', { ttl: 10000 });
      const restored = await state2.restore();

      expect(restored).toBe(true);
      expect(state2.getState('count')).toBe(42);
    });
  });

  describe('Memory storage', () => {
    it('should work with memory storage', () => {
      const state = createPersistentState({ count: 0 }, { storage: 'memory' });

      state.setState({ count: 1 }, false);
      expect(state.getState('count')).toBe(1);
    });

    it('should save and load from memory', async () => {
      const state = createPersistentState({ count: 0 }, {
        storage: 'memory',
        key: 'test-memory'
      });

      state.setState({ count: 42 }, false);
      await state.save();

      const loaded = await state.load();
      expect(loaded.count).toBe(42);
    });
  });

  describe('Helpers', () => {
    it('withLocalStorage should create localStorage state', () => {
      const state = withLocalStorage({ count: 0 }, 'test-helper');
      expect(state.adapter.constructor.name).toBe('LocalStorageAdapter');
    });

    it('withSessionStorage should create sessionStorage state', () => {
      const state = withSessionStorage({ count: 0 }, 'test-helper');
      expect(state.adapter.constructor.name).toBe('SessionStorageAdapter');
    });

    it('withIndexedDB should create indexedDB state', () => {
      const state = withIndexedDB({ count: 0 }, 'test-helper');
      expect(state.adapter.constructor.name).toBe('IndexedDBAdapter');
    });
  });
});
