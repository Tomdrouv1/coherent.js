/**
 * Coherent.js Advanced Caching
 * 
 * Smart caching strategies for performance optimization
 * 
 * @module performance/cache
 */

/**
 * LRU Cache
 * Least Recently Used cache implementation
 */
export class LRUCache {
  constructor(options = {}) {
    this.maxSize = options.maxSize || 100;
    this.ttl = options.ttl || null; // Time to live in ms
    this.cache = new Map();
    this.accessOrder = [];
  }

  /**
   * Get value from cache
   */
  get(key) {
    if (!this.cache.has(key)) {
      return undefined;
    }

    const entry = this.cache.get(key);

    // Check TTL
    if (this.ttl && Date.now() - entry.timestamp > this.ttl) {
      this.delete(key);
      return undefined;
    }

    // Update access order
    this.updateAccessOrder(key);

    return entry.value;
  }

  /**
   * Set value in cache
   */
  set(key, value) {
    // Remove if exists
    if (this.cache.has(key)) {
      this.delete(key);
    }

    // Evict if at capacity
    if (this.cache.size >= this.maxSize) {
      this.evict();
    }

    // Add new entry
    this.cache.set(key, {
      value,
      timestamp: Date.now()
    });

    this.accessOrder.push(key);

    return this;
  }

  /**
   * Check if key exists
   */
  has(key) {
    if (!this.cache.has(key)) {
      return false;
    }

    const entry = this.cache.get(key);

    // Check TTL
    if (this.ttl && Date.now() - entry.timestamp > this.ttl) {
      this.delete(key);
      return false;
    }

    return true;
  }

  /**
   * Delete key
   */
  delete(key) {
    this.cache.delete(key);
    const index = this.accessOrder.indexOf(key);
    if (index > -1) {
      this.accessOrder.splice(index, 1);
    }
    return this;
  }

  /**
   * Clear cache
   */
  clear() {
    this.cache.clear();
    this.accessOrder = [];
    return this;
  }

  /**
   * Get cache size
   */
  size() {
    return this.cache.size;
  }

  /**
   * Update access order
   */
  updateAccessOrder(key) {
    const index = this.accessOrder.indexOf(key);
    if (index > -1) {
      this.accessOrder.splice(index, 1);
    }
    this.accessOrder.push(key);
  }

  /**
   * Evict least recently used
   */
  evict() {
    if (this.accessOrder.length > 0) {
      const oldest = this.accessOrder.shift();
      this.cache.delete(oldest);
    }
  }

  /**
   * Get all keys
   */
  keys() {
    return Array.from(this.cache.keys());
  }

  /**
   * Get all values
   */
  values() {
    return Array.from(this.cache.values()).map(entry => entry.value);
  }

  /**
   * Get statistics
   */
  getStats() {
    return {
      size: this.cache.size,
      maxSize: this.maxSize,
      utilizationPercent: (this.cache.size / this.maxSize * 100).toFixed(2),
      oldestKey: this.accessOrder[0],
      newestKey: this.accessOrder[this.accessOrder.length - 1]
    };
  }
}

/**
 * Memory Cache with strategies
 */
export class MemoryCache {
  constructor(options = {}) {
    this.options = {
      strategy: 'lru', // lru, lfu, fifo
      maxSize: 100,
      ttl: null,
      ...options
    };

    this.cache = new Map();
    this.metadata = new Map();
    this.hits = 0;
    this.misses = 0;
  }

  /**
   * Get from cache
   */
  get(key) {
    if (!this.cache.has(key)) {
      this.misses++;
      return undefined;
    }

    const entry = this.cache.get(key);

    // Check TTL
    if (entry.ttl && Date.now() > entry.expiresAt) {
      this.delete(key);
      this.misses++;
      return undefined;
    }

    // Update metadata
    this.updateMetadata(key);
    this.hits++;

    return entry.value;
  }

  /**
   * Set in cache
   */
  set(key, value, options = {}) {
    // Evict if needed
    if (this.cache.size >= this.options.maxSize && !this.cache.has(key)) {
      this.evict();
    }

    const ttl = options.ttl || this.options.ttl;

    this.cache.set(key, {
      value,
      ttl,
      expiresAt: ttl ? Date.now() + ttl : null,
      createdAt: Date.now()
    });

    this.metadata.set(key, {
      accessCount: 0,
      lastAccess: Date.now()
    });

    return this;
  }

  /**
   * Update metadata based on strategy
   */
  updateMetadata(key) {
    const meta = this.metadata.get(key);
    if (meta) {
      meta.accessCount++;
      meta.lastAccess = Date.now();
    }
  }

  /**
   * Evict based on strategy
   */
  evict() {
    let keyToEvict;

    switch (this.options.strategy) {
      case 'lru': // Least Recently Used
        keyToEvict = this.findLRU();
        break;
      case 'lfu': // Least Frequently Used
        keyToEvict = this.findLFU();
        break;
      case 'fifo': // First In First Out
        keyToEvict = this.findFIFO();
        break;
      default:
        keyToEvict = this.cache.keys().next().value;
    }

    if (keyToEvict) {
      this.delete(keyToEvict);
    }
  }

  /**
   * Find least recently used key
   */
  findLRU() {
    let oldest = null;
    let oldestTime = Infinity;

    for (const [key, meta] of this.metadata.entries()) {
      if (meta.lastAccess < oldestTime) {
        oldestTime = meta.lastAccess;
        oldest = key;
      }
    }

    return oldest;
  }

  /**
   * Find least frequently used key
   */
  findLFU() {
    let leastUsed = null;
    let minCount = Infinity;

    for (const [key, meta] of this.metadata.entries()) {
      if (meta.accessCount < minCount) {
        minCount = meta.accessCount;
        leastUsed = key;
      }
    }

    return leastUsed;
  }

  /**
   * Find first in (oldest)
   */
  findFIFO() {
    let oldest = null;
    let oldestTime = Infinity;

    for (const [key, entry] of this.cache.entries()) {
      if (entry.createdAt < oldestTime) {
        oldestTime = entry.createdAt;
        oldest = key;
      }
    }

    return oldest;
  }

  /**
   * Check if key exists
   */
  has(key) {
    return this.cache.has(key);
  }

  /**
   * Delete key
   */
  delete(key) {
    this.cache.delete(key);
    this.metadata.delete(key);
    return this;
  }

  /**
   * Clear cache
   */
  clear() {
    this.cache.clear();
    this.metadata.clear();
    this.hits = 0;
    this.misses = 0;
    return this;
  }

  /**
   * Get cache statistics
   */
  getStats() {
    const total = this.hits + this.misses;
    const hitRate = total > 0 ? (this.hits / total * 100).toFixed(2) : 0;

    return {
      size: this.cache.size,
      maxSize: this.options.maxSize,
      hits: this.hits,
      misses: this.misses,
      hitRate: `${hitRate}%`,
      strategy: this.options.strategy
    };
  }
}

/**
 * Memoization cache
 */
export class MemoCache {
  constructor(options = {}) {
    this.cache = new LRUCache(options);
    this.keyGenerator = options.keyGenerator || this.defaultKeyGenerator;
  }

  /**
   * Default key generator
   */
  defaultKeyGenerator(...args) {
    return JSON.stringify(args);
  }

  /**
   * Memoize a function
   */
  memoize(fn) {
    return (...args) => {
      const key = this.keyGenerator(...args);
      
      if (this.cache.has(key)) {
        return this.cache.get(key);
      }

      const result = fn(...args);
      this.cache.set(key, result);
      
      return result;
    };
  }

  /**
   * Clear memoization cache
   */
  clear() {
    this.cache.clear();
  }

  /**
   * Get statistics
   */
  getStats() {
    return this.cache.getStats();
  }
}

/**
 * Component render cache
 */
export class RenderCache {
  constructor(options = {}) {
    this.cache = new MemoryCache({
      maxSize: options.maxSize || 50,
      ttl: options.ttl || 60000, // 1 minute default
      strategy: 'lru'
    });
  }

  /**
   * Generate cache key for component
   */
  generateKey(component, props) {
    const componentName = component.name || 'anonymous';
    const propsKey = this.hashProps(props);
    return `${componentName}:${propsKey}`;
  }

  /**
   * Hash props for cache key
   */
  hashProps(props) {
    try {
      return JSON.stringify(props, Object.keys(props).sort());
    } catch {
      return String(Date.now());
    }
  }

  /**
   * Get cached render
   */
  get(component, props) {
    const key = this.generateKey(component, props);
    return this.cache.get(key);
  }

  /**
   * Cache render result
   */
  set(component, props, result, options = {}) {
    const key = this.generateKey(component, props);
    this.cache.set(key, result, options);
  }

  /**
   * Clear cache
   */
  clear() {
    this.cache.clear();
  }

  /**
   * Get statistics
   */
  getStats() {
    return this.cache.getStats();
  }
}

/**
 * Create a cache instance
 */
export function createCache(type = 'lru', options = {}) {
  switch (type) {
    case 'lru':
      return new LRUCache(options);
    case 'memory':
      return new MemoryCache(options);
    case 'memo':
      return new MemoCache(options);
    case 'render':
      return new RenderCache(options);
    default:
      return new LRUCache(options);
  }
}

/**
 * Memoize a function
 */
export function memoize(fn, options = {}) {
  const cache = new MemoCache(options);
  return cache.memoize(fn);
}

export default {
  LRUCache,
  MemoryCache,
  MemoCache,
  RenderCache,
  createCache,
  memoize
};
