/**
 * Base Renderer Class
 * Provides common functionality shared across all Coherent.js renderers
 * Reduces code duplication and ensures consistent behavior
 */

import {
    validateComponent,
    isCoherentObject,
    extractProps,
    hasChildren,
    normalizeChildren,
} from '../core/object-utils.js';

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
    enableCache: true,
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
                    enableCache: baseConfig.enableCache !== false,
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

        // Number/Boolean
        if (typeof component === 'number' || typeof component === 'boolean') {
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
     * Execute function components with _error handling
     */
    executeFunctionComponent(func, depth = 0) {
        try {
            // Check if this is a context provider by checking function arity or a marker
            const isContextProvider = func.length > 0 || func.isContextProvider;
            
            let result;
            if (isContextProvider) {
                // Call with render function for context providers
                result = func((children) => {
                    return this.renderComponent(children, this.config, depth + 1);
                });
            } else {
                // Regular function component
                result = func();
            }
            
            // Handle case where function returns another function
            if (typeof result === 'function') {
                return this.executeFunctionComponent(result, depth);
            }
            
            return result;
        } catch (_error) {
            if (this.config.enableMonitoring) {
                performanceMonitor.recordError('functionComponent', _error);
            }
            
            // In development, provide detailed _error info
            if (typeof process !== 'undefined' && process.env && process.env.NODE_ENV === 'development') {
                console.warn('Coherent.js Function Component Error:', _error.message);
            }
            
            return null;
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

/**
 * Utility functions for renderer implementations
 */
export const RendererUtils = {
    /**
     * Check if element is static (no functions)
     */
    isStaticElement(element) {
        if (!element || typeof element !== 'object') {
            return typeof element === 'string' || typeof element === 'number';
        }

        // Check if element has any dynamic content
        for (const [key, value] of Object.entries(element)) {
            if (typeof value === 'function') return false;

            if (key === 'children' && Array.isArray(value)) {
                // Recursively check children for dynamic content
                return value.every(child => RendererUtils.isStaticElement(child));
            }

            if (key === 'children' && typeof value === 'object' && value !== null) {
                return RendererUtils.isStaticElement(value);
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
        try {
            // Create a stable cache key for the element
            const keyData = {
                tag: tagName,
                props: extractProps(element),
                hasChildren: hasChildren(element),
                childrenType: Array.isArray(element.children) ? 'array' : typeof element.children
            };

            return `element:${JSON.stringify(keyData)}`;
        } catch (_error) {
            // Log _error in development mode
            if (typeof process !== 'undefined' && process.env && process.env.NODE_ENV === 'development') {
                console.warn('Failed to generate cache key:', _error);
            }
            // Return null to indicate uncacheable element
            return null;
        }
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
