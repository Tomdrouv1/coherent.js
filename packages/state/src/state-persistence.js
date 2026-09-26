/**
 * @fileoverview State Persistence for Coherent.js
 * Provides persistent state management with multiple storage backends
 * @module @coherent.js/core/state/state-persistence
 */

/**
 * @typedef {'localStorage'|'sessionStorage'|'indexedDB'|'memory'} StorageType
 */

/**
 * @typedef {Object} PersistenceOptions
 * @property {StorageType} [storage='localStorage'] - Storage backend to use
 * @property {StorageAdapter} [adapter] - Custom storage backend; used as is,
 *   also on the server
 * @property {string} [key='coherent-state'] - Storage key prefix
 * @property {boolean} [debounce=true] - Debounce state saves
 * @property {number} [debounceDelay=300] - Debounce delay in ms
 * @property {Function} [serialize=JSON.stringify] - Serialization function
 * @property {Function} [deserialize=JSON.parse] - Deserialization function
 * @property {Array<string>} [include] - Keys to include (whitelist)
 * @property {Array<string>} [exclude] - Keys to exclude (blacklist)
 * @property {boolean} [encrypt=false] - Obfuscate stored data with
 *   `encryptionKey` (XOR — not encryption; anyone with the key, which ships
 *   to the browser, can read it)
 * @property {string} [encryptionKey] - Obfuscation key; required with `encrypt`
 * @property {Function} [onSave] - Callback when state is saved
 * @property {Function} [onLoad] - Callback when state is loaded
 * @property {Function} [onError] - Error callback (load, save or storage failures)
 * @property {boolean} [versioning=false] - Enable versioning
 * @property {string} [version='1.0.0'] - Current version
 * @property {Function} [migrate] - Migration function for version changes
 * @property {number} [ttl] - Time to live in milliseconds
 * @property {boolean} [crossTab=false] - Enable cross-tab synchronization
 * @property {string} [dbName='coherent-db'] - IndexedDB database name (`storage: 'indexedDB'`)
 * @property {string} [storeName='state'] - IndexedDB object store name (`storage: 'indexedDB'`)
 */

/**
 * Storage adapter interface: async get/set/remove/clear. `set` resolves to
 * `true` once the value is stored and rejects (or resolves `false`) when it
 * could not be.
 * @interface StorageAdapter
 */

/**
 * Web Storage adapter (localStorage / sessionStorage). Storage errors, such as
 * QuotaExceededError, propagate to the caller.
 */
class WebStorageAdapter {
  constructor(storageName) {
    this.storageName = storageName;
    this.available = typeof globalThis[storageName] !== 'undefined' && globalThis[storageName] !== null;
  }

  get storage() {
    return globalThis[this.storageName];
  }

  async get(key) {
    if (!this.available) return null;
    return this.storage.getItem(key);
  }

  async set(key, value) {
    if (!this.available) return false;
    this.storage.setItem(key, value);
    return true;
  }

  async remove(key) {
    if (!this.available) return false;
    this.storage.removeItem(key);
    return true;
  }

  async clear() {
    if (!this.available) return false;
    this.storage.clear();
    return true;
  }
}

/**
 * LocalStorage adapter
 */
class LocalStorageAdapter extends WebStorageAdapter {
  constructor() {
    super('localStorage');
  }
}

/**
 * SessionStorage adapter
 */
class SessionStorageAdapter extends WebStorageAdapter {
  constructor() {
    super('sessionStorage');
  }
}

/**
 * IndexedDB adapter: values are kept in the object store `storeName` of the
 * database `dbName`.
 */
class IndexedDBAdapter {
  constructor(dbName = 'coherent-db', storeName = 'state') {
    this.dbName = dbName;
    this.storeName = storeName;
    this.available = typeof indexedDB !== 'undefined';
    this.db = null;
    this.opening = null;
  }

  /**
   * Open the database, creating the store in an upgrade. Without `version`,
   * opens the current version (creating version 1 for a new database).
   */
  open(version) {
    return new Promise((resolve, reject) => {
      const request = version === undefined
        ? indexedDB.open(this.dbName)
        : indexedDB.open(this.dbName, version);

      request.onerror = () => {
        console.error('IndexedDB open error:', request.error);
        reject(request.error);
      };

      request.onsuccess = () => {
        resolve(request.result);
      };

      request.onupgradeneeded = (event) => {
        const db = event.target.result;
        if (!db.objectStoreNames.contains(this.storeName)) {
          db.createObjectStore(this.storeName);
        }
      };
    });
  }

  async init() {
    if (!this.available) return false;
    if (this.db) return true;

    this.opening ??= (async () => {
      let db = await this.open();
      // The database already exists without this store (another store with
      // the same dbName created it): add the store in a version upgrade.
      if (!db.objectStoreNames.contains(this.storeName)) {
        const version = db.version + 1;
        db.close();
        db = await this.open(version);
      }
      // Let another store's upgrade proceed; reopen on the next access.
      db.onversionchange = () => {
        db.close();
        if (this.db === db) this.db = null;
      };
      this.db = db;
      return true;
    })().finally(() => {
      this.opening = null;
    });

    return this.opening;
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
 * Stand-in for browser storage on the server. Web Storage there (Node's
 * `--experimental-webstorage`, on by default in newer releases) is shared by
 * every request in the process, so one visitor's state would be restored into
 * another's render. Nothing is read or written.
 */
class ServerAdapter {
  constructor() {
    this.available = false;
  }

  async get() {
    return null;
  }

  async set() {
    return false;
  }

  async remove() {
    return false;
  }

  async clear() {
    return false;
  }
}

function toBase64(bytes) {
  let binary = '';
  for (let i = 0; i < bytes.length; i += 0x8000) {
    binary += String.fromCharCode(...bytes.subarray(i, i + 0x8000));
  }
  return btoa(binary);
}

function fromBase64(encoded) {
  const binary = atob(encoded);
  const bytes = new Uint8Array(binary.length);
  for (let i = 0; i < binary.length; i++) {
    bytes[i] = binary.charCodeAt(i);
  }
  return bytes;
}

/**
 * XOR obfuscation of the stored payload (option `encrypt`).
 *
 * This is NOT encryption: the key has to ship to the browser, and XOR with a
 * repeating key is trivially reversible. It only keeps casual readers of the
 * storage from seeing plain JSON. Do not store secrets in browser storage.
 *
 * Works on UTF-8 bytes, so any Unicode text round-trips.
 */
class XorObfuscation {
  constructor(key) {
    if (typeof key !== 'string' || key.length === 0) {
      throw new TypeError(
        'createPersistentState: `encrypt: true` requires a non-empty `encryptionKey`. ' +
        'It is XOR obfuscation, not encryption; there is no default key.'
      );
    }
    this.keyBytes = new globalThis.TextEncoder().encode(key);
  }

  xor(bytes) {
    for (let i = 0; i < bytes.length; i++) {
      bytes[i] ^= this.keyBytes[i % this.keyBytes.length];
    }
    return bytes;
  }

  encode(text) {
    return toBase64(this.xor(new globalThis.TextEncoder().encode(text)));
  }

  decode(encoded) {
    return new globalThis.TextDecoder().decode(this.xor(fromBase64(encoded)));
  }
}

/**
 * Create storage adapter
 * @param {StorageType} type - Storage type
 * @param {Pick<PersistenceOptions, 'dbName'|'storeName'>} [options] - IndexedDB
 *   database and object store names
 * @returns {StorageAdapter} Storage adapter instance
 */
function createStorageAdapter(type, options = {}) {
  switch (type) {
    case 'localStorage':
      return new LocalStorageAdapter();
    case 'sessionStorage':
      return new SessionStorageAdapter();
    case 'indexedDB':
      return new IndexedDBAdapter(options.dbName ?? undefined, options.storeName ?? undefined);
    case 'memory':
      return new MemoryAdapter();
    default:
      return new LocalStorageAdapter();
  }
}

function createInstanceId() {
  const cryptoApi = globalThis.crypto;
  if (cryptoApi && typeof cryptoApi.randomUUID === 'function') {
    return cryptoApi.randomUUID();
  }
  return `${Date.now().toString(36)}-${Math.random().toString(36).slice(2)}`;
}

/**
 * Create persistent state manager
 *
 * Unless the backend is `'memory'`, stored state is restored on creation;
 * `ready` settles once that is done. Keys set before then keep the value they
 * were set to rather than the stored one.
 *
 * On the server (no `window`), browser storage backends read and write
 * nothing and cross-tab sync is off; pass an explicit `adapter` to persist
 * there.
 *
 * @param {Object} initialState - Initial state
 * @param {PersistenceOptions} options - Persistence options
 * @returns {Object} Persistent state manager
 */
export function createPersistentState(initialState = {}, options = {}) {
  const opts = {
    storage: 'localStorage',
    adapter: null,
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

  const onServer = typeof window === 'undefined';
  const obfuscation = opts.encrypt ? new XorObfuscation(opts.encryptionKey) : null;

  let adapter;
  if (opts.adapter) {
    adapter = opts.adapter;
  } else if (onServer && opts.storage !== 'memory') {
    adapter = new ServerAdapter();
  } else {
    adapter = createStorageAdapter(opts.storage, opts);
  }

  const instanceId = createInstanceId();
  let state = { ...initialState };
  let saveTimeout = null;
  let destroyed = false;
  const listeners = new Set();

  // Keys written while the initial restore is in flight; it must not
  // overwrite them with the older stored values.
  let initialRestorePending = false;
  const touchedKeys = new Set();

  function reportError(error) {
    if (opts.onError) {
      opts.onError(error);
    } else {
      console.error('State persistence error:', error);
    }
  }

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

  // Cross-tab synchronisation: one channel per storage key, so unrelated
  // stores never merge each other's state, and messages carry the sender's
  // id so a store never applies its own update.
  let channel = null;
  if (opts.crossTab && !onServer && typeof BroadcastChannel !== 'undefined') {
    channel = new BroadcastChannel(`coherent-state-sync:${opts.key}`);
    channel.onmessage = (event) => {
      const message = event.data;
      if (destroyed || !message || message.type !== 'state-update' || message.source === instanceId) {
        return;
      }
      const oldState = { ...state };
      state = { ...state, ...message.state };
      notifyListeners(oldState, state);
    };
    // Node: do not keep the process alive for this channel
    channel.unref?.();
  }

  function broadcast(filteredState) {
    if (!channel) return;
    try {
      channel.postMessage({ type: 'state-update', source: instanceId, state: filteredState });
    } catch (error) {
      reportError(error);
    }
  }

  /**
   * Write the current state now.
   * @returns {Promise<boolean>} Whether it was stored
   */
  async function write() {
    if (adapter.available === false) {
      return false;
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

      if (obfuscation) {
        dataString = obfuscation.encode(dataString);
      }

      const stored = await adapter.set(opts.key, dataString);
      if (stored === false) {
        throw new Error(`State "${opts.key}" could not be written to storage`);
      }

      // Call onSave callback
      if (opts.onSave) {
        opts.onSave(filteredState);
      }

      broadcast(filteredState);
      return true;
    } catch (error) {
      reportError(error);
      return false;
    }
  }

  /**
   * Save state to storage
   * @param {boolean} immediate - Save immediately without debounce
   * @returns {Promise<boolean>|undefined} Whether it was stored (immediate saves)
   */
  function save(immediate = false) {
    if (destroyed) {
      return Promise.resolve(false);
    }

    if (opts.debounce && !immediate) {
      clearTimeout(saveTimeout);
      saveTimeout = setTimeout(() => {
        saveTimeout = null;
        write();
      }, opts.debounceDelay);
      return undefined;
    }

    clearTimeout(saveTimeout);
    saveTimeout = null;
    return write();
  }

  /**
   * Load state from storage
   */
  async function load() {
    try {
      let dataString = await adapter.get(opts.key);
      if (!dataString) return null;

      if (obfuscation) {
        dataString = obfuscation.decode(dataString);
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
      reportError(error);
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
   * Merge loaded state, optionally leaving keys touched since creation alone.
   * @returns {boolean} Whether stored state was found
   */
  function applyLoaded(loaded, skipTouched) {
    if (!loaded || typeof loaded !== 'object') {
      return false;
    }

    // Object.fromEntries defines keys as own data properties, so a stored
    // "__proto__" key cannot reach a prototype.
    const updates = Object.fromEntries(
      Object.entries(loaded).filter(([key]) => !skipTouched || !touchedKeys.has(key))
    );

    if (Object.keys(updates).length > 0) {
      const oldState = { ...state };
      state = { ...state, ...updates };
      notifyListeners(oldState, state);
    }
    return true;
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

    if (initialRestorePending && updates && typeof updates === 'object') {
      for (const key of Object.keys(updates)) touchedKeys.add(key);
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

    if (initialRestorePending) {
      for (const key of Object.keys(oldState)) touchedKeys.add(key);
      for (const key of Object.keys(initialState)) touchedKeys.add(key);
    }

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
    try {
      await adapter.remove(opts.key);
    } catch (error) {
      reportError(error);
    }
  }

  /**
   * Manually trigger persistence
   * @returns {Promise<boolean>} Whether it was stored
   */
  async function persist() {
    return save(true);
  }

  /**
   * Restore state from storage
   * @returns {Promise<boolean>} Whether stored state was found
   */
  async function restore() {
    return applyLoaded(await load(), false);
  }

  /**
   * Stop syncing and saving: flushes a pending debounced save, closes the
   * cross-tab channel and drops listeners.
   * @returns {Promise<void>}
   */
  async function destroy() {
    if (destroyed) return;
    const pending = saveTimeout !== null;
    clearTimeout(saveTimeout);
    saveTimeout = null;
    if (pending) {
      await write();
    }
    destroyed = true;
    channel?.close();
    channel = null;
    listeners.clear();
  }

  // Auto-restore on creation
  let ready;
  if (opts.storage !== 'memory' || opts.adapter) {
    initialRestorePending = true;
    ready = load().then((loaded) => {
      initialRestorePending = false;
      if (destroyed) return false;
      const restored = applyLoaded(loaded, true);
      // Keys set meanwhile were saved without the restored ones; save the merge
      if (restored && touchedKeys.size > 0) save();
      touchedKeys.clear();
      return restored;
    });
  } else {
    ready = Promise.resolve(false);
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
    destroy,
    /** Settles once the automatic restore on creation is done */
    ready,
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
