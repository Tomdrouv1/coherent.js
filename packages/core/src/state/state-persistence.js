/**
 * @fileoverview State Persistence for Coherent.js
 * Provides persistent state management with multiple storage backends
 * @module @coherentjs/core/state/state-persistence
 */

/**
 * @typedef {'localStorage'|'sessionStorage'|'indexedDB'|'memory'} StorageType
 */

/**
 * @typedef {Object} PersistenceOptions
 * @property {StorageType} [storage='localStorage'] - Storage backend to use
 * @property {string} [key='coherent-state'] - Storage key prefix
 * @property {boolean} [debounce=true] - Debounce state saves
 * @property {number} [debounceDelay=300] - Debounce delay in ms
 * @property {Function} [serialize=JSON.stringify] - Serialization function
 * @property {Function} [deserialize=JSON.parse] - Deserialization function
 * @property {Array<string>} [include] - Keys to include (whitelist)
 * @property {Array<string>} [exclude] - Keys to exclude (blacklist)
 * @property {boolean} [encrypt=false] - Encrypt stored data
 * @property {string} [encryptionKey] - Encryption key
 * @property {Function} [onSave] - Callback when state is saved
 * @property {Function} [onLoad] - Callback when state is loaded
 * @property {Function} [onError] - Error callback
 * @property {boolean} [versioning=false] - Enable versioning
 * @property {string} [version='1.0.0'] - Current version
 * @property {Function} [migrate] - Migration function for version changes
 * @property {number} [ttl] - Time to live in milliseconds
 * @property {boolean} [crossTab=false] - Enable cross-tab synchronization
 */

/**
 * Storage adapter interface
 * @interface StorageAdapter
 */

/**
 * LocalStorage adapter
 */
class LocalStorageAdapter {
  constructor() {
    this.available = typeof localStorage !== 'undefined';
  }

  async get(key) {
    if (!this.available) return null;
    try {
      return localStorage.getItem(key);
    } catch (error) {
      console.error('LocalStorage get error:', error);
      return null;
    }
  }

  async set(key, value) {
    if (!this.available) return false;
    try {
      localStorage.setItem(key, value);
      return true;
    } catch (error) {
      console.error('LocalStorage set error:', error);
      return false;
    }
  }

  async remove(key) {
    if (!this.available) return false;
    try {
      localStorage.removeItem(key);
      return true;
    } catch (error) {
      console.error('LocalStorage remove error:', error);
      return false;
    }
  }

  async clear() {
    if (!this.available) return false;
    try {
      localStorage.clear();
      return true;
    } catch (error) {
      console.error('LocalStorage clear error:', error);
      return false;
    }
  }
}

/**
 * SessionStorage adapter
 */
class SessionStorageAdapter {
  constructor() {
    this.available = typeof sessionStorage !== 'undefined';
  }

  async get(key) {
    if (!this.available) return null;
    try {
      return sessionStorage.getItem(key);
    } catch (error) {
      console.error('SessionStorage get error:', error);
      return null;
    }
  }

  async set(key, value) {
    if (!this.available) return false;
    try {
      sessionStorage.setItem(key, value);
      return true;
    } catch (error) {
      console.error('SessionStorage set error:', error);
      return false;
    }
  }

  async remove(key) {
    if (!this.available) return false;
    try {
      sessionStorage.removeItem(key);
      return true;
    } catch (error) {
      console.error('SessionStorage remove error:', error);
      return false;
    }
  }

  async clear() {
    if (!this.available) return false;
    try {
      sessionStorage.clear();
      return true;
    } catch (error) {
      console.error('SessionStorage clear error:', error);
      return false;
    }
  }
}

/**
 * IndexedDB adapter
 */
class IndexedDBAdapter {
  constructor(dbName = 'coherent-db', storeName = 'state') {
    this.dbName = dbName;
    this.storeName = storeName;
    this.available = typeof indexedDB !== 'undefined';
    this.db = null;
  }

  async init() {
    if (!this.available) return false;
    if (this.db) return true;

    return new Promise((resolve, reject) => {
      const request = indexedDB.open(this.dbName, 1);

      request.onerror = () => {
        console.error('IndexedDB open error:', request.error);
        reject(request.error);
      };

      request.onsuccess = () => {
        this.db = request.result;
        resolve(true);
      };

      request.onupgradeneeded = (event) => {
        const db = event.target.result;
        if (!db.objectStoreNames.contains(this.storeName)) {
          db.createObjectStore(this.storeName);
        }
      };
    });
  }

  async get(key) {
    if (!this.available) return null;
    await this.init();

    return new Promise((resolve, reject) => {
      const transaction = this.db.transaction([this.storeName], 'readonly');
      const store = transaction.objectStore(this.storeName);
      const request = store.get(key);

      request.onerror = () => {
        console.error('IndexedDB get error:', request.error);
        reject(request.error);
      };

      request.onsuccess = () => {
        resolve(request.result || null);
      };
    });
  }

  async set(key, value) {
    if (!this.available) return false;
    await this.init();

    return new Promise((resolve, reject) => {
      const transaction = this.db.transaction([this.storeName], 'readwrite');
      const store = transaction.objectStore(this.storeName);
      const request = store.put(value, key);

      request.onerror = () => {
        console.error('IndexedDB set error:', request.error);
        reject(request.error);
      };

      request.onsuccess = () => {
        resolve(true);
      };
    });
  }

  async remove(key) {
    if (!this.available) return false;
    await this.init();

    return new Promise((resolve, reject) => {
      const transaction = this.db.transaction([this.storeName], 'readwrite');
      const store = transaction.objectStore(this.storeName);
      const request = store.delete(key);

      request.onerror = () => {
        console.error('IndexedDB remove error:', request.error);
        reject(request.error);
      };

      request.onsuccess = () => {
        resolve(true);
      };
    });
  }

  async clear() {
    if (!this.available) return false;
    await this.init();

    return new Promise((resolve, reject) => {
      const transaction = this.db.transaction([this.storeName], 'readwrite');
      const store = transaction.objectStore(this.storeName);
      const request = store.clear();

      request.onerror = () => {
        console.error('IndexedDB clear error:', request.error);
        reject(request.error);
      };

      request.onsuccess = () => {
        resolve(true);
      };
    });
  }
}

/**
 * Memory adapter (for testing or fallback)
 */
class MemoryAdapter {
  constructor() {
    this.storage = new Map();
    this.available = true;
  }

  async get(key) {
    return this.storage.get(key) || null;
  }

  async set(key, value) {
    this.storage.set(key, value);
    return true;
  }

  async remove(key) {
    return this.storage.delete(key);
  }

  async clear() {
    this.storage.clear();
    return true;
  }
}

/**
 * Simple encryption/decryption (basic XOR cipher)
 * For production, use Web Crypto API or a proper crypto library
 */
class SimpleEncryption {
  constructor(key) {
    this.key = key || 'default-key';
  }

  encrypt(text) {
    let result = '';
    for (let i = 0; i < text.length; i++) {
      result += String.fromCharCode(
        text.charCodeAt(i) ^ this.key.charCodeAt(i % this.key.length)
      );
    }
    return btoa(result);
  }

  decrypt(encrypted) {
    const text = atob(encrypted);
    let result = '';
    for (let i = 0; i < text.length; i++) {
      result += String.fromCharCode(
        text.charCodeAt(i) ^ this.key.charCodeAt(i % this.key.length)
      );
    }
    return result;
  }
}

/**
 * Create storage adapter
 * @param {StorageType} type - Storage type
 * @returns {StorageAdapter} Storage adapter instance
 */
function createStorageAdapter(type) {
  switch (type) {
    case 'localStorage':
      return new LocalStorageAdapter();
    case 'sessionStorage':
      return new SessionStorageAdapter();
    case 'indexedDB':
      return new IndexedDBAdapter();
    case 'memory':
      return new MemoryAdapter();
    default:
      return new LocalStorageAdapter();
  }
}

/**
 * Create persistent state manager
 * @param {Object} initialState - Initial state
 * @param {PersistenceOptions} options - Persistence options
 * @returns {Object} Persistent state manager
 */
export function createPersistentState(initialState = {}, options = {}) {
  const opts = {
    storage: 'localStorage',
    key: 'coherent-state',
    debounce: true,
    debounceDelay: 300,
    serialize: JSON.stringify,
    deserialize: JSON.parse,
    include: null,
    exclude: null,
    encrypt: false,
    encryptionKey: null,
    onSave: null,
    onLoad: null,
    onError: null,
    versioning: false,
    version: '1.0.0',
    migrate: null,
    ttl: null,
    crossTab: false,
    ...options
  };

  const adapter = createStorageAdapter(opts.storage);
  const encryption = opts.encrypt ? new SimpleEncryption(opts.encryptionKey) : null;

  let state = { ...initialState };
  let saveTimeout = null;
  const listeners = new Set();

  /**
   * Filter state keys based on include/exclude options
   * @param {Object} obj - State object
   * @returns {Object} Filtered state
   */
  function filterKeys(obj) {
    if (!obj || typeof obj !== 'object') return obj;

    // If include list is provided, only include those keys
    if (opts.include && Array.isArray(opts.include)) {
      const filtered = {};
      opts.include.forEach(key => {
        if (key in obj) {
          filtered[key] = obj[key];
        }
      });
      return filtered;
    }

    // If exclude list is provided, exclude those keys
    if (opts.exclude && Array.isArray(opts.exclude)) {
      const filtered = { ...obj };
      opts.exclude.forEach(key => {
        delete filtered[key];
      });
      return filtered;
    }

    return obj;
  }

  /**
   * Save state to storage
   * @param {boolean} immediate - Save immediately without debounce
   */
  async function save(immediate = false) {
    if (opts.debounce && !immediate) {
      clearTimeout(saveTimeout);
      saveTimeout = setTimeout(() => save(true), opts.debounceDelay);
      return;
    }

    try {
      const filteredState = filterKeys(state);
      const serialized = opts.serialize(filteredState);

      // Add metadata
      const data = {
        state: serialized,
        version: opts.version,
        timestamp: Date.now(),
        ttl: opts.ttl
      };

      let dataString = JSON.stringify(data);

      // Encrypt if enabled
      if (encryption) {
        dataString = encryption.encrypt(dataString);
      }

      await adapter.set(opts.key, dataString);

      // Call onSave callback
      if (opts.onSave) {
        opts.onSave(filteredState);
      }

      // Broadcast to other tabs if cross-tab sync is enabled
      if (opts.crossTab && typeof BroadcastChannel !== 'undefined') {
        const channel = new BroadcastChannel('coherent-state-sync');
        channel.postMessage({ type: 'state-update', state: filteredState });
        channel.close();
      }
    } catch (error) {
      console.error('State save error:', error);
      if (opts.onError) {
        opts.onError(error);
      }
    }
  }

  /**
   * Load state from storage
   */
  async function load() {
    try {
      let dataString = await adapter.get(opts.key);
      if (!dataString) return null;

      // Decrypt if enabled
      if (encryption) {
        dataString = encryption.decrypt(dataString);
      }

      const data = JSON.parse(dataString);

      // Check TTL
      if (data.ttl && data.timestamp) {
        const age = Date.now() - data.timestamp;
        if (age > data.ttl) {
          await adapter.remove(opts.key);
          return null;
        }
      }

      // Check version and migrate if needed
      if (opts.versioning && data.version !== opts.version) {
        if (opts.migrate) {
          const migrated = opts.migrate(data.state, data.version, opts.version);
          return opts.deserialize(migrated);
        }
        return null;
      }

      const loadedState = opts.deserialize(data.state);

      // Call onLoad callback
      if (opts.onLoad) {
        opts.onLoad(loadedState);
      }

      return loadedState;
    } catch (error) {
      console.error('State load error:', error);
      if (opts.onError) {
        opts.onError(error);
      }
      return null;
    }
  }

  /**
   * Subscribe to state changes
   * @param {Function} listener - Change listener
   * @returns {Function} Unsubscribe function
   */
  function subscribe(listener) {
    listeners.add(listener);
    return () => listeners.delete(listener);
  }

  /**
   * Notify listeners of state changes
   * @param {Object} oldState - Previous state
   * @param {Object} newState - New state
   */
  function notifyListeners(oldState, newState) {
    listeners.forEach(listener => {
      try {
        listener(newState, oldState);
      } catch (error) {
        console.error('Listener error:', error);
      }
    });
  }

  /**
   * Get current state
   * @param {string} [key] - State key
   * @returns {*} State value or entire state
   */
  function getState(key) {
    return key ? state[key] : { ...state };
  }

  /**
   * Set state
   * @param {Object|Function} updates - State updates or updater function
   * @param {boolean} persist - Persist to storage
   */
  function setState(updates, persist = true) {
    const oldState = { ...state };

    if (typeof updates === 'function') {
      updates = updates(oldState);
    }

    state = { ...state, ...updates };

    notifyListeners(oldState, state);

    if (persist) {
      save();
    }
  }

  /**
   * Reset state to initial values
   * @param {boolean} persist - Persist to storage
   */
  function resetState(persist = true) {
    const oldState = { ...state };
    state = { ...initialState };
    notifyListeners(oldState, state);

    if (persist) {
      save(true);
    }
  }

  /**
   * Clear persisted state
   */
  async function clearStorage() {
    await adapter.remove(opts.key);
  }

  /**
   * Manually trigger persistence
   */
  async function persist() {
    await save(true);
  }

  /**
   * Restore state from storage
   */
  async function restore() {
    const loaded = await load();
    if (loaded) {
      const oldState = { ...state };
      state = { ...state, ...loaded };
      notifyListeners(oldState, state);
      return true;
    }
    return false;
  }

  // Setup cross-tab synchronization
  if (opts.crossTab && typeof BroadcastChannel !== 'undefined') {
    const channel = new BroadcastChannel('coherent-state-sync');
    channel.onmessage = (event) => {
      if (event.data.type === 'state-update') {
        const oldState = { ...state };
        state = { ...state, ...event.data.state };
        notifyListeners(oldState, state);
      }
    };
  }

  // Auto-restore on creation
  if (opts.storage !== 'memory') {
    restore();
  }

  return {
    getState,
    setState,
    resetState,
    subscribe,
    persist,
    restore,
    clearStorage,
    load,
    save: () => save(true),
    get adapter() {
      return adapter;
    }
  };
}

/**
 * Create persistent state with localStorage
 * @param {Object} initialState - Initial state
 * @param {string} key - Storage key
 * @param {Partial<PersistenceOptions>} options - Additional options
 * @returns {Object} Persistent state manager
 */
export function withLocalStorage(initialState = {}, key = 'coherent-state', options = {}) {
  return createPersistentState(initialState, {
    ...options,
    storage: 'localStorage',
    key
  });
}

/**
 * Create persistent state with sessionStorage
 * @param {Object} initialState - Initial state
 * @param {string} key - Storage key
 * @param {Partial<PersistenceOptions>} options - Additional options
 * @returns {Object} Persistent state manager
 */
export function withSessionStorage(initialState = {}, key = 'coherent-state', options = {}) {
  return createPersistentState(initialState, {
    ...options,
    storage: 'sessionStorage',
    key
  });
}

/**
 * Create persistent state with IndexedDB
 * @param {Object} initialState - Initial state
 * @param {string} key - Storage key
 * @param {Partial<PersistenceOptions>} options - Additional options
 * @returns {Object} Persistent state manager
 */
export function withIndexedDB(initialState = {}, key = 'coherent-state', options = {}) {
  return createPersistentState(initialState, {
    ...options,
    storage: 'indexedDB',
    key
  });
}

export default {
  createPersistentState,
  withLocalStorage,
  withSessionStorage,
  withIndexedDB,
  createStorageAdapter
};
