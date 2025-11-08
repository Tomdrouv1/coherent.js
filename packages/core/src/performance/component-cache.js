/**
 * Advanced Component Caching System for Coherent.js
 * Provides intelligent caching with dependency tracking and invalidation
 */

import { deepClone } from '../core/object-utils.js';

/**
 * Cache entry structure
 */
class CacheEntry {
    constructor(key, component, deps = [], options = {}) {
        this.key = key;
        this.component = deepClone(component);
        this.deps = new Set(deps);
        this.createdAt = Date.now();
        this.lastAccessed = Date.now();
        this.accessCount = 1;
        this.ttl = options.ttl || 300000; // 5 minutes default
        this.persistent = options.persistent || false;
    }

    isExpired() {
        return !this.persistent && (Date.now() - this.createdAt) > this.ttl;
    }

    touch() {
        this.lastAccessed = Date.now();
        this.accessCount++;
    }

    hasDependency(dep) {
        return this.deps.has(dep);
    }

    addDependency(dep) {
        this.deps.add(dep);
    }

    removeDependency(dep) {
        this.deps.delete(dep);
    }
}

/**
 * Component Cache Manager with intelligent invalidation
 */
export class ComponentCache {
    constructor(options = {}) {
        this.options = {
            maxSize: options.maxSize || 1000,
            defaultTTL: options.defaultTTL || 300000,
            cleanupInterval: options.cleanupInterval || 60000, // 1 minute
            enableStats: options.enableStats !== false,
            ...options
        };

        this.cache = new Map();
        this.dependencies = new Map(); // dependency -> Set of cache keys
        this.stats = {
            hits: 0,
            misses: 0,
            evictions: 0,
            cleanups: 0,
            invalidations: 0
        };

        // Start periodic cleanup
        if (this.options.cleanupInterval > 0) {
            this.cleanupTimer = setInterval(() => {
                this.cleanup();
            }, this.options.cleanupInterval);
        }
    }

    /**
     * Generate cache key from component and props
     */
    generateKey(component, props = {}, context = {}) {
        if (typeof component === 'string') {
            return `str:${component}`;
        }

        if (typeof component === 'function') {
            return `fn:${component.name || 'anonymous'}:${JSON.stringify(props)}`;
        }

        if (typeof component === 'object' && component !== null) {
            const serialized = this.serializeComponent(component);
            const propsHash = Object.keys(props).length > 0 ? `:${JSON.stringify(props)}` : '';
            const contextHash = Object.keys(context).length > 0 ? `:${JSON.stringify(context)}` : '';
            return `obj:${serialized}${propsHash}${contextHash}`;
        }

        return `primitive:${String(component)}`;
    }

    /**
     * Serialize component for cache key generation
     */
    serializeComponent(component, maxDepth = 3, currentDepth = 0) {
        if (currentDepth > maxDepth) {
            return '[DEEP]';
        }

        if (typeof component !== 'object' || component === null) {
            return String(component);
        }

        if (Array.isArray(component)) {
            return `[${component.map(item => 
                this.serializeComponent(item, maxDepth, currentDepth + 1)
            ).join(',')}]`;
        }

        const entries = Object.entries(component);
        if (entries.length === 1) {
            const [key, value] = entries[0];
            const serializedValue = typeof value === 'object' 
                ? this.serializeComponent(value, maxDepth, currentDepth + 1)
                : String(value);
            return `${key}:${serializedValue}`;
        }

        return '[COMPLEX]';
    }

    /**
     * Get component from cache
     */
    get(key, dependencies = []) {
        const entry = this.cache.get(key);

        if (!entry) {
            this.stats.misses++;
            return null;
        }

        if (entry.isExpired()) {
            this.cache.delete(key);
            this.removeDependencyMappings(key);
            this.stats.misses++;
            return null;
        }

        entry.touch();
        this.stats.hits++;

        // Update dependency tracking
        dependencies.forEach(dep => {
            if (!entry.hasDependency(dep)) {
                entry.addDependency(dep);
                this.addDependencyMapping(dep, key);
            }
        });

        return deepClone(entry.component);
    }

    /**
     * Set component in cache
     */
    set(key, component, options = {}) {
        // Enforce size limit
        if (this.cache.size >= this.options.maxSize) {
            this.evictLeastUsed();
        }

        const deps = options.dependencies || [];
        const entry = new CacheEntry(key, component, deps, {
            ttl: options.ttl || this.options.defaultTTL,
            persistent: options.persistent || false
        });

        this.cache.set(key, entry);

        // Update dependency mappings
        deps.forEach(dep => {
            this.addDependencyMapping(dep, key);
        });

        return true;
    }

    /**
     * Check if component exists in cache
     */
    has(key) {
        const entry = this.cache.get(key);
        return entry && !entry.isExpired();
    }

    /**
     * Invalidate cache entries by dependency
     */
    invalidate(dependency) {
        const dependentKeys = this.dependencies.get(dependency);
        if (!dependentKeys) {
            return 0;
        }

        let invalidated = 0;
        for (const key of dependentKeys) {
            if (this.cache.delete(key)) {
                invalidated++;
                this.stats.invalidations++;
            }
        }

        this.dependencies.delete(dependency);
        return invalidated;
    }

    /**
     * Invalidate multiple dependencies
     */
    invalidateMultiple(dependencies) {
        let totalInvalidated = 0;
        dependencies.forEach(dep => {
            totalInvalidated += this.invalidate(dep);
        });
        return totalInvalidated;
    }

    /**
     * Clear entire cache
     */
    clear() {
        const size = this.cache.size;
        this.cache.clear();
        this.dependencies.clear();
        return size;
    }

    /**
     * Add dependency mapping
     */
    addDependencyMapping(dependency, key) {
        if (!this.dependencies.has(dependency)) {
            this.dependencies.set(dependency, new Set());
        }
        this.dependencies.get(dependency).add(key);
    }

    /**
     * Remove dependency mappings for a cache key
     */
    removeDependencyMappings(key) {
        for (const [dep, keys] of this.dependencies.entries()) {
            keys.delete(key);
            if (keys.size === 0) {
                this.dependencies.delete(dep);
            }
        }
    }

    /**
     * Evict least recently used entry
     */
    evictLeastUsed() {
        let oldestKey = null;
        let oldestTime = Date.now();

        for (const [key, entry] of this.cache.entries()) {
            if (!entry.persistent && entry.lastAccessed < oldestTime) {
                oldestTime = entry.lastAccessed;
                oldestKey = key;
            }
        }

        if (oldestKey) {
            this.cache.delete(oldestKey);
            this.removeDependencyMappings(oldestKey);
            this.stats.evictions++;
        }
    }

    /**
     * Cleanup expired entries
     */
    cleanup() {
        const before = this.cache.size;
        const expiredKeys = [];

        for (const [key, entry] of this.cache.entries()) {
            if (entry.isExpired()) {
                expiredKeys.push(key);
            }
        }

        expiredKeys.forEach(key => {
            this.cache.delete(key);
            this.removeDependencyMappings(key);
        });

        const cleaned = before - this.cache.size;
        if (cleaned > 0) {
            this.stats.cleanups++;
        }

        return cleaned;
    }

    /**
     * Get cache statistics
     */
    getStats() {
        const totalRequests = this.stats.hits + this.stats.misses;
        return {
            size: this.cache.size,
            maxSize: this.options.maxSize,
            hits: this.stats.hits,
            misses: this.stats.misses,
            hitRate: totalRequests > 0 ? (this.stats.hits / totalRequests * 100).toFixed(2) : 0,
            evictions: this.stats.evictions,
            cleanups: this.stats.cleanups,
            invalidations: this.stats.invalidations,
            dependencies: this.dependencies.size,
            memoryUsage: this.estimateMemoryUsage()
        };
    }

    /**
     * Estimate memory usage (rough approximation)
     */
    estimateMemoryUsage() {
        let totalSize = 0;
        for (const entry of this.cache.values()) {
            // Rough estimate: 1KB per component + overhead
            totalSize += JSON.stringify(entry.component).length + 500;
        }
        return Math.round(totalSize / 1024); // Return in KB
    }

    /**
     * Get hot path components (most accessed)
     */
    getHotComponents(limit = 10) {
        const entries = Array.from(this.cache.entries());
        return entries
            .sort((a, b) => b[1].accessCount - a[1].accessCount)
            .slice(0, limit)
            .map(([key, entry]) => ({
                key,
                accessCount: entry.accessCount,
                component: entry.component,
                dependencies: Array.from(entry.deps)
            }));
    }

    /**
     * Get cache recommendations
     */
    getRecommendations() {
        const stats = this.getStats();
        const recommendations = [];

        if (stats.hitRate < 50) {
            recommendations.push({
                type: 'low-hit-rate',
                message: `Hit rate is ${stats.hitRate}%. Consider increasing cache size or TTL.`,
                priority: 'HIGH'
            });
        }

        if (stats.evictions > stats.hits * 0.1) {
            recommendations.push({
                type: 'frequent-evictions',
                message: 'Frequent evictions detected. Consider increasing maxSize.',
                priority: 'MEDIUM'
            });
        }

        if (stats.invalidations > stats.hits * 0.05) {
            recommendations.push({
                type: 'frequent-invalidations',
                message: 'Frequent invalidations. Review dependency tracking.',
                priority: 'LOW'
            });
        }

        return recommendations;
    }

    /**
     * Destroy cache and cleanup
     */
    destroy() {
        if (this.cleanupTimer) {
            clearInterval(this.cleanupTimer);
        }
        this.clear();
    }
}

/**
 * Create a new component cache instance
 */
export function createComponentCache(options = {}) {
    return new ComponentCache(options);
}

/**
 * Memoization decorator for components
 */
export function memoize(component, keyGenerator, options = {}) {
    const cache = new ComponentCache({
        maxSize: options.maxSize || 100,
        defaultTTL: options.ttl || 300000
    });

    return function memoizedComponent(...args) {
        const key = keyGenerator ? keyGenerator(...args) : JSON.stringify(args);
        
        const cached = cache.get(key, options.dependencies);
        if (cached) {
            return cached;
        }

        const result = typeof component === 'function' ? component(...args) : component;
        cache.set(key, result, options);
        return result;
    };
}

export default ComponentCache;