/**
 * Base Renderer Class
 * Provides common functionality shared across all Coherent.js renderers
 * Reduces code duplication and ensures consistent behavior
 */

import {
    validateComponent,
    isCoherentObject,
    hasChildren,
    normalizeChildren,
} from '../core/object-utils.js';
import { isTrustedContent } from '../core/html-utils.js';

import { performanceMonitor } from '../performance/monitor.js';

/**
 * Unified configuration for all Coherent.js renderers
 * Includes options for HTML, Streaming, and DOM renderers
 */
export const DEFAULT_RENDERER_CONFIG = {
    // Core rendering options
    maxDepth: 100,
    enableValidation: true,
    enableMonitoring: false,
    validateInput: true,

    // HTML Renderer specific options
    // Off by default: keying a render on its content costs a full walk of
    // the tree, which only pays off when identical trees are re-rendered.
    enableCache: false,
    minify: false,
    cacheSize: 1000,
    cacheTTL: 300000, // 5 minutes

    // Streaming Renderer specific options
    chunkSize: 1024,           // Size of each chunk in bytes
    bufferSize: 4096,          // Internal buffer size
    enableMetrics: false,      // Track streaming metrics
    yieldThreshold: 100,       // Yield control after N elements
    encoding: 'utf8',          // Output encoding

    // DOM Renderer specific options
    enableHydration: true,     // Enable hydration support
    namespace: null,           // SVG namespace support

    // Performance options
    enablePerformanceTracking: false,
    performanceThreshold: 10,  // ms threshold for slow renders

    // Development options
    enableDevWarnings: typeof process !== 'undefined' && process.env && process.env.NODE_ENV === 'development',
    enableDebugLogging: false,

    // Error handling options
    errorFallback: '',         // Fallback content on errors
    throwOnError: true,        // Whether to throw or return fallback
};

/**
 * Base renderer class with common functionality
 */
export class BaseRenderer {
    constructor(options = {}) {
        this.config = this.validateAndMergeConfig(options);
        this.metrics = {
            startTime: null,
            endTime: null,
            elementsProcessed: 0
        };
    }

    /**
     * Validate and merge configuration options
     */
    validateAndMergeConfig(options) {
        const config = { ...DEFAULT_RENDERER_CONFIG, ...options };
        
        // Validate critical options
        if (typeof config.maxDepth !== 'number') {
            throw new Error('maxDepth must be a number');
        }
        if (config.maxDepth <= 0) {
            throw new Error('maxDepth must be a positive number');
        }
        
        if (typeof config.chunkSize !== 'number') {
            throw new Error('chunkSize must be a number');
        }
        if (config.chunkSize <= 0) {
            throw new Error('chunkSize must be a positive number');
        }
        
        if (typeof config.yieldThreshold !== 'number') {
            throw new Error('yieldThreshold must be a number');
        }
        if (config.yieldThreshold <= 0) {
            throw new Error('yieldThreshold must be a positive number');
        }
        
        // Warn about potentially problematic configurations
        if (config.enableDevWarnings) {
            if (config.maxDepth > 1000) {
                console.warn('Coherent.js: maxDepth > 1000 may cause performance issues');
            }
            
            if (config.chunkSize > 16384) {
                console.warn('Coherent.js: Large chunkSize may increase memory usage');
            }
        }
        
        return config;
    }

    /**
     * Get configuration for specific renderer type
     */
    getRendererConfig(rendererType) {
        const baseConfig = { ...this.config };
        
        switch (rendererType) {
            case 'html':
                return {
                    ...baseConfig,
                    // HTML-specific defaults
                    enableCache: baseConfig.enableCache === true,
                    enableMonitoring: baseConfig.enableMonitoring !== false
                };
                
            case 'streaming':
                return {
                    ...baseConfig,
                    // Streaming-specific defaults
                    enableMetrics: baseConfig.enableMetrics ?? false,
                    maxDepth: baseConfig.maxDepth ?? 1000 // Higher default for streaming
                };
                
            case 'dom':
                return {
                    ...baseConfig,
                    // DOM-specific defaults
                    enableHydration: baseConfig.enableHydration !== false
                };
                
            default:
                return baseConfig;
        }
    }

    /**
     * Validate component structure
     */
    validateComponent(component) {
        if (this.config.validateInput !== false) {
            return validateComponent(component);
        }
        return true;
    }

    /**
     * Check if component is valid for rendering
     */
    isValidComponent(component) {
        if (component === null || component === undefined) return true;
        if (typeof component === 'string' || typeof component === 'number') return true;
        if (typeof component === 'function') return true;
        if (Array.isArray(component)) return component.every(child => this.isValidComponent(child));
        if (isCoherentObject(component)) return true;
        return false;
    }

    /**
     * Validate rendering depth to prevent stack overflow
     */
    validateDepth(depth) {
        if (depth > this.config.maxDepth) {
            throw new Error(`Maximum render depth (${this.config.maxDepth}) exceeded`);
        }
    }

    /**
     * Handle different component types with consistent logic
     */
    processComponentType(component) {
        // Null/undefined
        if (component === null || component === undefined) {
            return { type: 'empty', value: '' };
        }

        // String
        if (typeof component === 'string') {
            return { type: 'text', value: component };
        }

        // Booleans render nothing, so `cond && { li: ... }` can sit in a
        // children array (it used to print "false").
        if (typeof component === 'boolean') {
            return { type: 'empty', value: '' };
        }

        // Number
        if (typeof component === 'number') {
            return { type: 'text', value: String(component) };
        }

        // Function
        if (typeof component === 'function') {
            return { type: 'function', value: component };
        }

        // Array
        if (Array.isArray(component)) {
            return { type: 'array', value: component };
        }

        // Object (Coherent element)
        if (isCoherentObject(component)) {
            return { type: 'element', value: component };
        }

        // Unknown type
        return { type: 'unknown', value: component };
    }

    /**
     * Execute function components. Errors propagate: they used to be
     * swallowed here (the component rendered as nothing, logged only when
     * NODE_ENV=development), so a broken component produced a partial page
     * with a 200 and error boundaries never saw nested failures.
     */
    executeFunctionComponent(func, depth = 0) {
        try {
            // Always called without arguments. Functions declaring a parameter
            // used to receive a render callback returning an HTML string,
            // which then got escaped (double-escaped context providers), and a
            // `({ name }) => ...` child destructured its props from it.
            const result = func();

            // Handle case where function returns another function
            if (typeof result === 'function') {
                return this.executeFunctionComponent(result, depth);
            }

            return result;
        } catch (error) {
            if (this.config.enableMonitoring) {
                performanceMonitor.recordError('functionComponent', error);
            }
            throw error;
        }
    }

    /**
     * Process element children consistently
     */
    processChildren(children, options, depth) {
        if (!hasChildren({ children })) {
            return [];
        }

        const normalizedChildren = normalizeChildren(children);
        return normalizedChildren.map(child => 
            this.renderComponent(child, options, depth + 1)
        );
    }

    /**
     * Extract and process element attributes
     */
    extractElementAttributes(props) {
        if (!props || typeof props !== 'object') return {};

        const attributes = { ...props };
        delete attributes.children;
        delete attributes.text;
        return attributes;
    }

    /**
     * Record performance metrics
     */
    recordPerformance(operation, startTime, fromCache = false, metadata = {}) {
        if (this.config.enableMonitoring) {
            performanceMonitor.recordRender(
                operation,
                this.getCurrentTime() - startTime,
                fromCache,
                metadata
            );
        }
    }

    /**
     * Record _error for monitoring
     */
    recordError(operation, _error, metadata = {}) {
        if (this.config.enableMonitoring) {
            performanceMonitor.recordError(operation, _error, metadata);
        }
    }

    /**
     * Get current timestamp with fallback
     */
    getCurrentTime() {
        if (typeof performance !== 'undefined' && performance.now) {
            return performance.now();
        }
        return Date.now();
    }

    /**
     * Start performance timing
     */
    startTiming() {
        this.metrics.startTime = this.getCurrentTime();
    }

    /**
     * End performance timing
     */
    endTiming() {
        this.metrics.endTime = this.getCurrentTime();
    }

    /**
     * Get performance metrics
     */
    getMetrics() {
        const duration = this.metrics.endTime ? 
            this.metrics.endTime - this.metrics.startTime :
            this.getCurrentTime() - this.metrics.startTime;

        return {
            ...this.metrics,
            duration,
            elementsPerSecond: this.metrics.elementsProcessed / (duration / 1000)
        };
    }

    /**
     * Reset metrics for new render
     */
    resetMetrics() {
        this.metrics = {
            startTime: null,
            endTime: null,
            elementsProcessed: 0
        };
    }

    /**
     * Abstract method - must be implemented by subclasses
     */
    renderComponent() {
        throw new Error('renderComponent must be implemented by subclass');
    }

    /**
     * Abstract method - must be implemented by subclasses
     */
    render() {
        throw new Error('render must be implemented by subclass');
    }
}

const UNCACHEABLE = Symbol('uncacheable');

/**
 * Serialize a component tree into a string that identifies its rendered
 * output: two trees with the same key always render the same HTML.
 *
 * JSON.stringify can't be used for this. It drops functions and undefined,
 * turns NaN into null and Dates into ISO strings, and ignores the brand on
 * trusted content, so different trees (rendering different HTML) collided.
 * Values whose output isn't a pure function of their content — functions,
 * class instances, Dates — make the tree uncacheable instead.
 *
 * @param {*} value - Component tree
 * @returns {string|null} Cache key, or null when the tree can't be cached
 */
export function serializeForCache(value) {
    try {
        return serialize(value, new Set());
    } catch (error) {
        if (error === UNCACHEABLE) return null;
        throw error;
    }
}

function serialize(value, ancestors) {
    switch (typeof value) {
        case 'string':
            return JSON.stringify(value);
        case 'number':
            return `n${value}`;
        case 'boolean':
            return value ? 't' : 'f';
        case 'undefined':
            return 'u';
        case 'object': {
            if (value === null) return 'z';
            if (isTrustedContent(value)) return `T${JSON.stringify(value.__html)}`;
            if (ancestors.has(value)) throw UNCACHEABLE;

            const isArray = Array.isArray(value);
            if (!isArray) {
                const proto = Object.getPrototypeOf(value);
                if (proto !== Object.prototype && proto !== null) throw UNCACHEABLE;
            }

            ancestors.add(value);
            const body = isArray
                ? value.map((item) => serialize(item, ancestors)).join(',')
                : Object.keys(value)
                    .map((key) => `${JSON.stringify(key)}:${serialize(value[key], ancestors)}`)
                    .join(',');
            ancestors.delete(value);
            return isArray ? `[${body}]` : `{${body}}`;
        }
        default:
            // functions, symbols, bigints
            throw UNCACHEABLE;
    }
}

/**
 * Utility functions for renderer implementations
 */
export const RendererUtils = {
    /**
     * Check if element is static (no functions or circular references)
     */
    isStaticElement(element, visited = new WeakSet()) {
        if (!element || typeof element !== 'object') {
            return typeof element === 'string' || typeof element === 'number';
        }

        // Handle circular references - treat as non-static (will be caught during render)
        if (visited.has(element)) {
            return false;
        }
        visited.add(element);

        // Check if element has any dynamic content
        for (const [_key, value] of Object.entries(element)) {
            if (typeof value === 'function') return false;

            // Recursively check arrays (including children)
            if (Array.isArray(value)) {
                const allStatic = value.every(child => RendererUtils.isStaticElement(child, visited));
                if (!allStatic) return false;
            }
            // Recursively check nested objects
            else if (typeof value === 'object' && value !== null) {
                if (!RendererUtils.isStaticElement(value, visited)) return false;
            }
        }

        return true;
    },

    /**
     * Check if object has functions (for caching decisions)
     */
    hasFunctions(obj, visited = new WeakSet()) {
        if (visited.has(obj)) return false;
        visited.add(obj);

        for (const value of Object.values(obj)) {
            if (typeof value === 'function') return true;
            if (typeof value === 'object' && value !== null && RendererUtils.hasFunctions(value, visited)) {
                return true;
            }
        }
        return false;
    },

    /**
     * Get element complexity score
     */
    getElementComplexity(element) {
        if (!element || typeof element !== 'object') return 1;

        let complexity = Object.keys(element).length;

        if (element.children && Array.isArray(element.children)) {
            complexity += element.children.reduce(
                (sum, child) => sum + RendererUtils.getElementComplexity(child),
                0
            );
        }

        return complexity;
    },

    /**
     * Generate cache key for element
     */
    generateCacheKey(tagName, element) {
        // The whole element, not a summary of it: a key that leaves out any
        // part of the content lets two different elements share an entry.
        const serialized = serializeForCache(element);
        return serialized === null ? null : `element:${JSON.stringify(tagName)}:${serialized}`;
    },

    /**
     * Check if element is cacheable
     */
    isCacheable(element, options) {
        // Don't cache if caching is disabled
        if (!options.enableCache) return false;

        // Don't cache elements with functions (dynamic content)
        if (RendererUtils.hasFunctions(element)) return false;

        // Don't cache very large elements (memory consideration)
        if (RendererUtils.getElementComplexity(element) > 1000) return false;

        // Don't cache if we can't generate a stable cache key
        const cacheKey = RendererUtils.generateCacheKey(element.tagName || 'unknown', element);
        if (!cacheKey) return false;

        return true;
    }
};

export default BaseRenderer;
