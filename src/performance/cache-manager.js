/**
 * Advanced caching system with memory management and smart invalidation
 */

export class CacheManager {
    constructor(options = {}) {
        this.maxCacheSize = options.maxCacheSize || 1000;
        this.maxMemoryMB = options.maxMemoryMB || 100;
        this.ttlMs = options.ttlMs || 1000 * 60 * 5; // 5 minutes default

        // Multiple cache layers for different optimization strategies
        this.staticCache = new Map();      // Never-changing components
        this.componentCache = new Map();   // Component results with deps
        this.templateCache = new Map();    // Template strings
        this.usageStats = new Map();       // Track access patterns

        // Memory monitoring
        this.memoryUsage = 0;
        this.cacheHits = 0;
        this.cacheMisses = 0;

        // Cleanup interval
        this.cleanupInterval = setInterval(() => this.cleanup(), 30000)

        this.staticElementCache = new Map();  // Cache for static HTML elements
        this.elementUsageTracking = new Map(); // Track element usage patterns
    }

    // Generate smart cache keys based on component structure and props
    generateCacheKey(component, props = {}, context = {}) {
        const componentStr = typeof component === 'function'
            ? component.toString()
            : JSON.stringify(component);

        const propsStr = JSON.stringify(props, Object.keys(props).sort());
        const contextStr = JSON.stringify(context);

        // Use hash for shorter keys but include component name for debugging
        const componentName = this.extractComponentName(component);
        const hash = this.simpleHash(componentStr + propsStr + contextStr);

        return `${componentName}_${hash}`;
    }

    extractComponentName(component) {
        if (typeof component === 'function') {
            return component.name || 'AnonymousComponent';
        }
        if (component && typeof component === 'object') {
            const keys = Object.keys(component);
            return keys.length > 0 ? keys[0] : 'ObjectComponent';
        }
        return 'UnknownComponent';
    }

    simpleHash(str) {
        let hash = 0;
        for (let i = 0; i < str.length; i++) {
            const char = str.charCodeAt(i);
            hash = ((hash << 5) - hash) + char;
            hash = hash & hash; // Convert to 32-bit integer
        }
        return Math.abs(hash).toString(36);
    }

    // Get from cache with LRU update
    get(key, cacheType = 'component') {
        const cache = this.getCache(cacheType);
        const entry = cache.get(key);

        if (!entry) {
            this.cacheMisses++;
            return null;
        }

        // Check TTL
        if (Date.now() - entry.timestamp > this.ttlMs) {
            cache.delete(key);
            this.updateMemoryUsage(-entry.size);
            this.cacheMisses++;
            return null;
        }

        // Update LRU
        entry.lastAccess = Date.now();
        this.updateUsageStats(key);
        this.cacheHits++;

        return entry.value;
    }

    // Store in cache with memory management
    set(key, value, cacheType = 'component', metadata = {}) {
        const cache = this.getCache(cacheType);

        // Calculate approximate memory size
        const size = this.calculateSize(value);

        // Check memory limits before adding
        if (this.memoryUsage + size > this.maxMemoryMB * 1024 * 1024) {
            this.evictLRU(cacheType, size);
        }

        const entry = {
            value,
            timestamp: Date.now(),
            lastAccess: Date.now(),
            size,
            metadata,
            accessCount: 1
        };

        cache.set(key, entry);
        this.updateMemoryUsage(size);

        // Prevent cache from growing too large
        if (cache.size > this.maxCacheSize) {
            this.evictLRU(cacheType);
        }
    }

    getCache(type) {
        switch (type) {
            case 'static': return this.staticCache;
            case 'template': return this.templateCache;
            default: return this.componentCache;
        }
    }

    cacheStaticElement(tagName, props, html) {
        const key = this.generateStaticElementKey(tagName, props);
        this.staticElementCache.set(key, {
            html,
            createdAt: Date.now(),
            accessCount: 1,
            lastAccessed: Date.now()
        });
    }

    getStaticElement(tagName, props) {
        const key = this.generateStaticElementKey(tagName, props);
        const cached = this.staticElementCache.get(key);

        if (cached) {
            cached.accessCount++;
            cached.lastAccessed = Date.now();
            return cached.html;
        }

        return null;
    }

    generateStaticElementKey(tagName, props) {
        // Only cache truly static elements (no functions, no complex children)
        const staticProps = {};
        for (const [key, value] of Object.entries(props)) {
            if (key === 'children' || typeof value === 'function') {
                return null; // Don't cache dynamic elements
            }
            staticProps[key] = value;
        }

        return `static:${tagName}:${JSON.stringify(staticProps)}`;
    }

    trackElementUsage(tagName) {
        const count = this.elementUsageTracking.get(tagName) || 0;
        this.elementUsageTracking.set(tagName, count + 1);
    }

    getHotPathElements(threshold = 10) {
        return Array.from(this.elementUsageTracking.entries())
            .filter(([, count]) => count >= threshold)
            .sort(([, a], [, b]) => b - a)
            .map(([tagName, count]) => ({ tagName, count }));
    }

    calculateSize(value) {
        if (typeof value === 'string') {
            return value.length * 2; // Rough UTF-16 estimate
        }
        return JSON.stringify(value).length * 2;
    }

    updateMemoryUsage(delta) {
        this.memoryUsage += delta;
    }

    updateUsageStats(key) {
        const stats = this.usageStats.get(key) || { count: 0, lastAccess: 0 };
        stats.count++;
        stats.lastAccess = Date.now();
        this.usageStats.set(key, stats);
    }

    // Intelligent LRU eviction based on usage patterns
    evictLRU(cacheType, requiredSpace = 0) {
        const cache = this.getCache(cacheType);
        const entries = Array.from(cache.entries());

        // Sort by access patterns (least recently used + least frequently used)
        entries.sort(([keyA, entryA], [keyB, entryB]) => {
            const scoreA = this.calculateEvictionScore(entryA, keyA);
            const scoreB = this.calculateEvictionScore(entryB, keyB);
            return scoreA - scoreB;
        });

        let freedSpace = 0;
        for (const [key, entry] of entries) {
            cache.delete(key);
            this.updateMemoryUsage(-entry.size);
            freedSpace += entry.size;

            if (freedSpace >= requiredSpace) break;
            if (cache.size <= this.maxCacheSize * 0.8) break; // Leave some headroom
        }
    }

    calculateEvictionScore(entry, key) {
        const age = Date.now() - entry.lastAccess;
        const usage = this.usageStats.get(key)?.count || 1;
        const sizeWeight = entry.size / 1024; // Favor evicting larger items

        // Lower score = higher priority for eviction
        return age + (sizeWeight * 1000) - (usage * 5000);
    }

    cleanup() {
        const now = Date.now();
        const caches = [this.staticCache, this.componentCache, this.templateCache];

        for (const cache of caches) {
            for (const [key, entry] of cache.entries()) {
                if (now - entry.timestamp > this.ttlMs) {
                    cache.delete(key);
                    this.updateMemoryUsage(-entry.size);
                }
            }
        }
    }

    // Analytics and monitoring
    getStats() {
        const hitRate = this.cacheHits / (this.cacheHits + this.cacheMisses) * 100;

        return {
            hitRate: `${hitRate.toFixed(2)}%`,
            totalHits: this.cacheHits,
            totalMisses: this.cacheMisses,
            memoryUsageMB: (this.memoryUsage / (1024 * 1024)).toFixed(2),
            cacheEntries: {
                static: this.staticCache.size,
                component: this.componentCache.size,
                template: this.templateCache.size
            },
            topComponents: this.getTopComponents()
        };
    }

    getTopComponents(limit = 10) {
        return Array.from(this.usageStats.entries())
            .sort(([, a], [, b]) => b.count - a.count)
            .slice(0, limit)
            .map(([key, stats]) => ({ key, ...stats }));
    }

    destroy() {
        clearInterval(this.cleanupInterval);
        this.staticCache.clear();
        this.componentCache.clear();
        this.templateCache.clear();
        this.usageStats.clear();
    }
}

// Singleton instance for global use
export const globalCache = new CacheManager({
    maxCacheSize: 2000,
    maxMemoryMB: 200,
    ttlMs: 1000 * 60 * 10 // 10 minutes
});
