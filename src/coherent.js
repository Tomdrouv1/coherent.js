/**
 * Coherent.js - Object-Based Rendering Framework
 * A pure JavaScript framework for server-side and client-side rendering
 * using natural object syntax without function wrappers like h() or m()
 *
 * @version 1.0.0
 * @author Coherent Framework Team
 * @license MIT
 */

// Core rendering engine
import {
    renderToString,
    renderHTML,
    renderHTMLSync,
    render,
    renderBatch,
    renderToChunks,
    renderWithTiming,
    precompileComponent,
    getCache,
    resetCache,
    getRenderingStats
} from './rendering/html-renderer.js';

// CSS management
import { CSSManager, createCSSManager, defaultCSSManager, cssUtils } from './rendering/css-manager.js';

// Cache management
import { createCacheManager, CacheManager } from './performance/cache-manager.js';
import { ComponentCache, createComponentCache, memoize } from './performance/component-cache.js';

// Enhanced error handling
import { globalErrorHandler, ErrorHandler, createErrorHandler } from './utils/error-handler.js';

// Reactive state management
import { ReactiveState, createReactiveState, observable, computed, stateUtils } from './state/reactive-state.js';

// Component lifecycle and events
import { ComponentLifecycle, eventSystem, componentUtils, withLifecycle, createLifecycleHooks } from './components/lifecycle.js';

// Advanced routing
import { Router, createRouter, routeGuards, routeComponents } from './routing/router.js';

// Form validation and binding
import { FormValidator, createForm, validationRules, binding, formComponents } from './forms/validation.js';

// Streaming capabilities
import {
    createStreamingRenderer,
    streamingUtils
} from './rendering/streaming-renderer.js';

// DOM rendering capabilities
import {
    renderToDOM,
    updateDOM
} from './rendering/dom-renderer.js';

// Import hydration functions
import { 
    hydrate, 
    makeHydratable, 
    autoHydrate, 
    hydrateAll, 
    hydrateBySelector, 
    enableClientEvents 
} from './client/hydration.js';

// Configuration utilities
import {
    createHtmlConfig,
    createStreamingConfig,
    createDomConfig,
    createDevConfig,
    createProdConfig,
    validateConfig,
    mergeConfigs,
    getConfigPreset,
    CONFIG_PRESETS
} from './rendering/renderer-config.js';

// Performance monitoring and optimization
import { performanceMonitor } from './performance/monitor.js';

// NOTE: Database functionality moved to @coherentjs/database package
// import { DatabaseManager, ... } from '@coherentjs/database';

// Core utilities
import {
    validateComponent,
    isCoherentObject,
    extractProps,
    hasChildren,
    normalizeChildren,
    deepClone,
    mergeProps,
    getNestedValue,
    setNestedValue
} from './core/object-utils.js';

import {
    escapeHtml,
    isVoidElement,
    formatAttributes,
    minifyHtml
} from './core/html-utils.js';

// Component system
import {
    createComponent,
    withState,
    withProps,
    memo,
    lazy
} from './components/component-system.js';

// Development tools
import { DevTools } from './dev/dev-tools.js';

/**
 * Main Coherent Framework Class
 * Provides a unified interface to all framework capabilities
 */
class Coherent {
    constructor(options = {}) {
        this.options = {
            enableCache: options.enableCache !== false,
            enableMonitoring: options.enableMonitoring !== false,
            enableDevTools: options.enableDevTools !== false,
            cacheSize: options.cacheSize || 1000,
            cacheTTL: options.cacheTTL || 300000, // 5 minutes
            maxDepth: options.maxDepth || 100,
            minify: options.minify || false,
            ...options
        };

        // Initialize cache if enabled
        if (this.options.enableCache) {
            this.cache = createCacheManager({
                maxSize: this.options.cacheSize,
                ttlMs: this.options.cacheTTL
            });
            
            // Initialize component cache for advanced caching
            this.componentCache = createComponentCache({
                maxSize: this.options.componentCacheSize || 500,
                defaultTTL: this.options.componentCacheTTL || 300000
            });
        }

        // Initialize reactive state system
        this.state = createReactiveState({}, {
            enableHistory: this.options.enableStateHistory !== false,
            maxHistorySize: this.options.stateHistorySize || 50
        });

        // Initialize router if routing is enabled
        if (this.options.enableRouting) {
            this.router = createRouter(this.options.routerOptions || {});
        }

        // Initialize global error handler
        this.errorHandler = this.options.errorHandler || globalErrorHandler;

        // Initialize dev tools in development
        if (this.options.enableDevTools && typeof process !== 'undefined' && process.env.NODE_ENV !== 'production') {
            this.devTools = new DevTools(this);
        }

        // Bind methods to maintain context
        this.render = this.render.bind(this);
        this.renderToString = this.renderToString.bind(this);
        this.renderBatch = this.renderBatch.bind(this);
        this.stream = this.stream.bind(this);
    }

    /**
     * Primary render method - converts components to HTML
     */
    render(component, options = {}) {
        const config = { ...this.options, ...options };

        try {
            const html = renderToString(component, config);

            // Development debugging
            if (this.devTools) {
                this.devTools.logRender(component, html, config);
            }

            return html;
        } catch (error) {
            if (this.devTools) {
                this.devTools.logError('render', error, { component, options });
            }
            throw error;
        }
    }

    /**
     * Alias for render method (for clarity)
     */
    renderToString(component, options = {}) {
        return this.render(component, options);
    }

    /**
     * Batch rendering for multiple components
     */
    renderBatch(components, options = {}) {
        const config = { ...this.options, ...options };

        try {
            const results = renderBatch(components, config);

            if (this.devTools) {
                this.devTools.logBatchRender(components, results, config);
            }

            return results;
        } catch (error) {
            if (this.devTools) {
                this.devTools.logError('renderBatch', error, { components, options });
            }
            throw error;
        }
    }

    /**
     * Streaming render for large components
     */
    async* stream(component, options = {}) {
        const config = {
            ...this.options,
            ...options,
            streaming: true
        };

        try {
            for await (const chunk of renderToStream(component, config)) {
                if (this.devTools) {
                    this.devTools.logStreamChunk(chunk);
                }
                yield chunk;
            }
        } catch (error) {
            if (this.devTools) {
                this.devTools.logError('stream', error, { component, options });
            }
            throw error;
        }
    }

    /**
     * Create a streaming renderer instance
     */
    createStreamingRenderer(options = {}) {
        const config = { ...this.options, ...options };
        return createStreamingRenderer(config);
    }

    /**
     * Component creation helpers
     */
    createComponent(definition) {
        return createComponent(definition);
    }

    withState(component, initialState) {
        return withState(component, initialState);
    }

    withProps(component, props) {
        return withProps(component, props);
    }

    memo(component, areEqual) {
        return memo(component, areEqual);
    }

    lazy(componentLoader) {
        return lazy(componentLoader);
    }

    /**
     * Component caching and memoization
     */
    memoize(component, keyGenerator, options = {}) {
        return memoize(component, keyGenerator, {
            ...options,
            cache: this.componentCache
        });
    }

    /**
     * Update DOM with virtual DOM diffing
     */
    updateDOM(element, newComponent, componentId = 'default', options = {}) {
        const config = { ...this.options, ...options };
        return updateDOM(element, newComponent, componentId, config);
    }

    /**
     * Invalidate component cache by dependencies
     */
    invalidateCache(dependencies) {
        if (this.componentCache) {
            if (Array.isArray(dependencies)) {
                return this.componentCache.invalidateMultiple(dependencies);
            } else {
                return this.componentCache.invalidate(dependencies);
            }
        }
        return 0;
    }

    /**
     * Reactive state management
     */
    setState(key, value) {
        return this.state.set(key, value);
    }

    getState(key) {
        return this.state.get(key);
    }

    watchState(key, callback, options) {
        return this.state.watch(key, callback, options);
    }

    createComputed(key, getter, options) {
        return this.state.computed(key, getter, options);
    }

    /**
     * Event system
     */
    emit(eventName, data, target) {
        return eventSystem.emit(eventName, data, target);
    }

    on(eventName, handler, componentId) {
        return eventSystem.on(eventName, handler, componentId);
    }

    off(eventName, handler, componentId) {
        return eventSystem.off(eventName, handler, componentId);
    }

    /**
     * Router methods
     */
    navigate(location) {
        if (!this.router) {
            console.warn('Router not initialized. Enable routing in options.');
            return Promise.resolve(false);
        }
        return this.router.push(location);
    }

    getCurrentRoute() {
        return this.router ? this.router.getCurrentRoute() : null;
    }

    addRoutes(routes) {
        if (this.router) {
            this.router.addRoutes(routes);
        }
    }

    /**
     * Form validation
     */
    createForm(schema, options) {
        return createForm(schema, options);
    }

    /**
     * Component lifecycle
     */
    createComponentWithLifecycle(component, options) {
        return componentUtils.createWithLifecycle(component, options);
    }

    /**
     * Error handling
     */
    handleError(error, context) {
        return this.errorHandler.handle(error, context);
    }

    /**
     * Performance and monitoring
     */
    getPerformanceStats() {
        return {
            cache: this.cache ? this.cache.getStats() : null,
            componentCache: this.componentCache ? this.componentCache.getStats() : null,
            monitor: performanceMonitor.getStats(),
            rendering: getRenderingStats()
        };
    }

    getPerformanceRecommendations() {
        const stats = this.getPerformanceStats();
        const recommendations = [];

        // Cache recommendations
        if (stats.cache && stats.cache.hitRate < 50) {
            recommendations.push({
                type: 'cache',
                priority: 'HIGH',
                suggestion: 'Consider increasing cache size or enabling component-level caching',
                impact: 'Major performance improvement for repeated renders',
                details: `Current hit rate: ${stats.cache.hitRate}%`
            });
        }

        // Hot path recommendations
        if (this.cache) {
            const hotPaths = this.cache.getHotPathElements(10);
            hotPaths.forEach(({ tagName, count }) => {
                recommendations.push({
                    type: 'static-cache',
                    priority: 'MEDIUM',
                    suggestion: `Consider static caching for: ${tagName}`,
                    impact: 'Significant performance improvement for hot paths',
                    details: `Rendered ${count} times, good candidate for static caching`
                });
            });
        }

        // Memory recommendations
        if (stats.monitor && stats.monitor.avgRenderTime > 10) {
            recommendations.push({
                type: 'optimization',
                priority: 'MEDIUM',
                suggestion: 'Consider component memoization or precompilation',
                impact: 'Reduced render times and better user experience',
                details: `Average render time: ${stats.monitor.avgRenderTime}ms`
            });
        }

        return recommendations;
    }

    /**
     * Development and debugging tools
     */
    enableDevMode() {
        if (!this.devTools) {
            this.devTools = new DevTools(this);
        }
        this.options.enableDevTools = true;
        return this;
    }

    disableDevMode() {
        this.options.enableDevTools = false;
        this.devTools = null;
        return this;
    }

    benchmark(component, iterations = 1000) {
        console.time('Coherent Benchmark');

        for (let i = 0; i < iterations; i++) {
            this.render(component, { enableMonitoring: false });
        }

        console.timeEnd('Coherent Benchmark');

        const stats = this.getPerformanceStats();
        console.log(`\n📊 Benchmark Results (${iterations} iterations):`);
        console.log(`Average render time: ${stats.monitor.avgRenderTime}ms`);
        console.log(`Cache hit rate: ${stats.cache ? stats.cache.hitRate : 0}%`);

        return stats;
    }

    /**
     * Cache management
     */
    clearCache() {
        if (this.cache) {
            this.cache.clear();
            return true;
        }
        return false;
    }

    getCacheStats() {
        if (!this.cache) {
            return {
                enabled: false,
                size: 0,
                hits: 0,
                misses: 0,
                hitRate: 0
            };
        }
        return this.cache.getStats();
    }

    optimizeCache() {
        if (this.cache) {
            this.cache.cleanup();
            return true;
        }
        return false;
    }

    /**
     * Precompilation for static components
     */
    precompile(component, options = {}) {
        const config = { ...this.options, ...options };
        return precompileComponent(component, config);
    }

    /**
     * Validation helpers
     */
    validate(component) {
        try {
            validateComponent(component);
            return { valid: true };
        } catch (error) {
            return { valid: false, error: error.message };
        }
    }

    isCoherent(obj) {
        return isCoherentObject(obj);
    }

    /**
     * Utility methods
     */
    clone(obj) {
        return deepClone(obj);
    }

    merge(obj1, obj2) {
        return mergeProps(obj1, obj2);
    }

    extract(element) {
        return extractProps(element);
    }

    normalize(children) {
        return normalizeChildren(children);
    }

    escape(text) {
        return escapeHtml(text);
    }

    /**
     * Framework information
     */
    getVersion() {
        return '1.0.0';
    }

    getInfo() {
        return {
            name: 'Coherent.js',
            version: this.getVersion(),
            description: 'Object-based rendering framework',
            features: [
                'Pure object syntax',
                'Server-side rendering',
                'Performance monitoring',
                'Intelligent caching',
                'Streaming support',
                'Development tools'
            ],
            stats: this.getPerformanceStats()
        };
    }
}

/**
 * Convenience function to create a Coherent instance
 */
export function createCoherent(options = {}) {
    return new Coherent(options);
}

// NOTE: createDatabaseManager moved to @coherentjs/database package

/**
 * Default instance for quick usage
 */
export const coherent = new Coherent();

/**
 * Named exports for specific functionality
 */
export {
    // Main class
    Coherent,

    // Core rendering
    renderToString,
    renderHTML,
    render,
    renderBatch,
    renderToChunks,
    renderWithTiming,

    // Streaming
    createStreamingRenderer,
    streamingUtils,

    // Client-side rendering and hydration
    renderToDOM,
    updateDOM,
    hydrate, 
    makeHydratable, 
    autoHydrate, 
    hydrateAll, 
    hydrateBySelector, 
    enableClientEvents,

    // Components
    createComponent,
    withState,
    withProps,
    memo,
    lazy,

    // NOTE: Database functionality moved to @coherentjs/database package

    // Utilities
    validateComponent,
    isCoherentObject,
    extractProps,
    hasChildren,
    normalizeChildren,
    deepClone,
    escapeHtml,
    isVoidElement,
    formatAttributes,
    minifyHtml,

    // Configuration utilities
    createHtmlConfig,
    createStreamingConfig,
    createDomConfig,
    createDevConfig,
    createProdConfig,
    validateConfig,
    mergeConfigs,
    getConfigPreset,
    CONFIG_PRESETS,

    // Performance (factory functions preferred)
    performanceMonitor,
    createComponentCache,
    createCacheManager,
    memoize,
    getCache,
    resetCache,
    getRenderingStats,

    // Error Handling (factory functions preferred)
    createErrorHandler,
    globalErrorHandler,

    // Reactive State (factory functions preferred)
    createReactiveState,
    observable,
    computed,
    stateUtils,

    // Component Lifecycle & Events (factory functions preferred)
    createLifecycleHooks,
    eventSystem,
    componentUtils,
    withLifecycle,

    // Routing (factory functions preferred)
    createRouter,
    routeGuards,
    routeComponents,

    // Forms & Validation (factory functions preferred)
    createForm,
    validationRules,
    binding,
    formComponents,

    // CSS Management (factory functions preferred)
    CSSManager,
    createCSSManager,
    defaultCSSManager,
    cssUtils,

    // Development
    DevTools
};

/**
 * Export specific module bundles for different use cases
 */

// Server-side rendering bundle
export const server = {
    render: renderToString,
    renderBatch,
    chunk: renderToChunks, // chunking pre-rendered HTML
    stream: createStreamingRenderer, // true progressive streaming
    CacheManager,
    performanceMonitor
};

// Component development bundle
export const components = {
    createComponent,
    withState,
    withProps,
    memo,
    lazy,
    validateComponent,
    isCoherentObject
};

// Utilities bundle - Pure JS object approach
export const utils = {
    // Core utilities
    extractProps,
    hasChildren,
    normalizeChildren,
    deepClone,
    escapeHtml,
    isVoidElement,
    formatAttributes,
    minifyHtml,
    mergeProps,
    getNestedValue,
    setNestedValue,
    
    // CSS utilities
    cssUtils,
    
    // NOTE: Database functionality moved to @coherentjs/database package
};

// Performance bundle
export const performance = {
    performanceMonitor,
    CacheManager,
    getCache,
    resetCache,
    getRenderingStats
};

/**
 * Browser compatibility check
 */
if (typeof window !== 'undefined') {
    // Browser environment
    window.Coherent = Coherent;
    window.coherent = coherent;

    // Add browser-specific optimizations
    if (typeof window !== 'undefined' && window.requestIdleCallback) {
        // Use idle time for cache optimization
        const optimizeInIdle = () => {
            if (coherent.cache) {
                coherent.cache.optimize('component');
            }
        };
        window.requestIdleCallback(optimizeInIdle);
    }
}

/**
 * Node.js environment setup
 */
if (typeof process !== 'undefined' && process.versions && process.versions.node) {
    // Node.js environment

    // Graceful cleanup on exit
    process.on('exit', () => {
        if (coherent.cache) {
            coherent.cache.destroy();
        }
    });

    // Performance monitoring in development
    if (process.env.NODE_ENV === 'development') {
        coherent.enableDevMode();
    }
}

/**
 * Version and build information
 */
export const VERSION = '1.0.0';
export const BUILD_DATE = new Date().toISOString();
export const FEATURES = [
    'object-syntax',
    'server-rendering',
    'streaming',
    'caching',
    'monitoring',
    'components',
    'dev-tools'
].join(',');

// Single default export
export default Coherent;
