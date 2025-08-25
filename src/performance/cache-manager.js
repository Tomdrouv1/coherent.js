/**
 * Advanced caching system with memory management and smart invalidation for Coherent.js
 * 
 * @module @coherent/performance/cache-manager
 * @license MIT
 */

/**
 * @typedef {Object} CacheEntry
 * @property {any} value - The cached value
 * @property {number} timestamp - When the entry was created
 * @property {number} lastAccess - Last access time
 * @property {number} size - Approximate size in bytes
 * @property {Object} metadata - Additional metadata
 * @property {number} accessCount - Number of times accessed
 */

/**
 * @typedef {Object} CacheStats
 * @property {number} hits - Number of cache hits
 * @property {number} misses - Number of cache misses
 * @property {number} size - Current cache size in bytes
 * @property {number} entries - Number of cache entries
 * @property {Record<string, number>} hitRate - Hit rate by cache type
 */

/**
 * @typedef {Object} CacheOptions
 * @property {number} [maxCacheSize=1000] - Maximum number of entries per cache type
 * @property {number} [maxMemoryMB=100] - Maximum memory usage in MB
 * @property {number} [ttlMs=300000] - Default time-to-live in milliseconds (5 minutes)
 * @property {boolean} [enableStatistics=true] - Whether to collect usage statistics
 */

/**
 * Creates a new CacheManager instance
 * @param {CacheOptions} [options] - Configuration options
 * @returns {Object} Cache manager instance
 */
export function createCacheManager(options = {}) {
  const {
    maxCacheSize = 1000,
    maxMemoryMB = 100,
    ttlMs = 1000 * 60 * 5, // 5 minutes
    enableStatistics = true
  } = options;

  // Internal state
  const caches = {
    static: new Map(),     // Never-changing components
    component: new Map(),  // Component results with deps
    template: new Map(),   // Template strings
    data: new Map()        // General purpose data
  };

  let memoryUsage = 0;
  const stats = {
    hits: 0,
    misses: 0,
    hitRate: {
      static: 0,
      component: 0,
      template: 0,
      data: 0
    },
    accessCount: {
      static: 0,
      component: 0,
      template: 0,
      data: 0
    }
  };

  // Cleanup interval (doesn't keep Node.js process alive)
  let cleanupInterval;
  if (typeof setInterval === 'function') {
    cleanupInterval = setInterval(() => cleanup(), 30000);
    if (cleanupInterval.unref) {
      cleanupInterval.unref();
    }
  }

  /**
   * Generate a cache key from component and props
   * @param {any} component - Component or component name
   * @param {Object} [props={}] - Component props
   * @param {Object} [context={}] - Additional context
   * @returns {string} Cache key
   */
  function generateCacheKey(component, props = {}, context = {}) {
    const componentStr = typeof component === 'function'
      ? component.name || component.toString()
      : JSON.stringify(component);

    const propsStr = JSON.stringify(props, Object.keys(props).sort());
    const contextStr = JSON.stringify(context);
    const hash = simpleHash(componentStr + propsStr + contextStr);
    
    return `${extractComponentName(component)}_${hash}`;
  }

  /**
   * Get a value from the cache
   * @param {string} key - Cache key
   * @param {string} [type='component'] - Cache type
   * @returns {any|null} Cached value or null if not found
   */
  function get(key, type = 'component') {
    const cache = caches[type] || caches.component;
    const entry = cache.get(key);

    if (!entry) {
      stats.misses++;
      if (enableStatistics) stats.accessCount[type]++;
      return null;
    }

    // Check TTL
    if (Date.now() - entry.timestamp > ttlMs) {
      cache.delete(key);
      updateMemoryUsage(-entry.size);
      stats.misses++;
      if (enableStatistics) stats.accessCount[type]++;
      return null;
    }

    // Update access time and stats
    entry.lastAccess = Date.now();
    entry.accessCount++;
    stats.hits++;
    if (enableStatistics) {
      stats.accessCount[type]++;
      stats.hitRate[type] = (stats.hits / (stats.hits + stats.misses)) * 100;
    }

    return entry.value;
  }

  /**
   * Store a value in the cache
   * @param {string} key - Cache key
   * @param {any} value - Value to cache
   * @param {string} [type='component'] - Cache type
   * @param {Object} [metadata={}] - Additional metadata
   */
  function set(key, value, type = 'component', metadata = {}) {
    const cache = caches[type] || caches.component;
    const size = calculateSize(value);

    // Check memory limits
    if (memoryUsage + size > maxMemoryMB * 1024 * 1024) {
      optimize(type, size);
    }

    const entry = {
      value,
      timestamp: Date.now(),
      lastAccess: Date.now(),
      size,
      metadata,
      accessCount: 0
    };

    // Remove existing entry if it exists
    const existing = cache.get(key);
    if (existing) {
      updateMemoryUsage(-existing.size);
    }

    cache.set(key, entry);
    updateMemoryUsage(size);

    // Enforce cache size limits
    if (cache.size > maxCacheSize) {
      optimize(type);
    }
  }

  /**
   * Remove an entry from the cache
   * @param {string} key - Cache key
   * @param {string} [type] - Cache type (optional, checks all caches if not provided)
   * @returns {boolean} True if an entry was removed
   */
  function remove(key, type) {
    if (type) {
      const cache = caches[type];
      if (!cache) return false;
      
      const entry = cache.get(key);
      if (entry) {
        updateMemoryUsage(-entry.size);
        return cache.delete(key);
      }
      return false;
    }

    // Check all caches if no type specified
    for (const [, cache] of Object.entries(caches)) {
      const entry = cache.get(key);
      if (entry) {
        updateMemoryUsage(-entry.size);
        return cache.delete(key);
      }
    }
    return false;
  }

  /**
   * Clear all caches or a specific cache type
   * @param {string} [type] - Cache type to clear (optional, clears all if not provided)
   */
  function clear(type) {
    if (type) {
      const cache = caches[type];
      if (cache) {
        cache.clear();
      }
    } else {
      Object.values(caches).forEach(cache => cache.clear());
    }
    memoryUsage = 0;
  }

  /**
   * Get cache statistics
   * @returns {CacheStats} Cache statistics
   */
  function getStats() {
    const entries = Object.values(caches).reduce((sum, cache) => sum + cache.size, 0);
    
    return {
      hits: stats.hits,
      misses: stats.misses,
      size: memoryUsage,
      entries,
      hitRate: stats.hitRate,
      accessCount: stats.accessCount
    };
  }

  /**
   * Clean up expired entries
   */
  function cleanup() {
    const now = Date.now();
    let freed = 0;

    for (const [, cache] of Object.entries(caches)) {
      for (const [key, entry] of cache.entries()) {
        if (now - entry.timestamp > ttlMs) {
          cache.delete(key);
          updateMemoryUsage(-entry.size);
          freed++;
        }
      }
    }

    return { freed };
  }

  // Internal helper functions
  function calculateSize(value) {
    if (value === null || value === undefined) return 0;
    if (typeof value === 'string') return value.length * 2; // UTF-16
    if (typeof value === 'number') return 8; // 64-bit float
    if (typeof value === 'boolean') return 4;
    if (Array.isArray(value)) {
      return value.reduce((sum, item) => sum + calculateSize(item), 0);
    }
    if (typeof value === 'object') {
      return Object.values(value).reduce((sum, val) => sum + calculateSize(val), 0);
    }
    return 0;
  }

  function updateMemoryUsage(delta) {
    memoryUsage = Math.max(0, memoryUsage + delta);
  }

  function optimize(type, requiredSpace = 0) {
    const cache = caches[type] || caches.component;
    const entries = Array.from(cache.entries())
      .sort(([, a], [, b]) => a.lastAccess - b.lastAccess);

    let freed = 0;
    for (const [key, entry] of entries) {
      if (freed >= requiredSpace) break;
      
      cache.delete(key);
      updateMemoryUsage(-entry.size);
      freed += entry.size;
    }

    return { freed };
  }

  function simpleHash(str) {
    let hash = 0;
    for (let i = 0; i < str.length; i++) {
      const char = str.charCodeAt(i);
      hash = ((hash << 5) - hash) + char;
      hash = hash & hash; // Convert to 32-bit integer
    }
    return Math.abs(hash).toString(36);
  }

  function extractComponentName(component) {
    if (typeof component === 'function') {
      return component.name || 'AnonymousComponent';
    }
    if (component && typeof component === 'object') {
      const keys = Object.keys(component);
      return keys.length > 0 ? keys[0] : 'ObjectComponent';
    }
    return 'UnknownComponent';
  }

  // Clean up on destroy
  function destroy() {
    if (cleanupInterval) {
      clearInterval(cleanupInterval);
    }
    clear();
  }

  // Public API
  return {
    get,
    set,
    remove,
    clear,
    getStats,
    cleanup,
    destroy,
    generateCacheKey,
    get memoryUsage() {
      return memoryUsage;
    },
    get maxMemory() {
      return maxMemoryMB * 1024 * 1024;
    }
  };
}

// Create a default instance for convenience
export const cacheManager = createCacheManager();

// For backward compatibility
export const CacheManager = { create: createCacheManager };
