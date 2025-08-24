/**
 * High-performance HTML renderer with caching, monitoring, and streaming support
 * Converts object-based components to HTML strings with advanced optimizations
 */

import { BaseRenderer, RendererUtils } from './base-renderer.js';
import {
    hasChildren,
    normalizeChildren,
} from '../core/object-utils.js';

import {
    escapeHtml,
    isVoidElement,
    formatAttributes,
    minifyHtml
} from '../core/html-utils.js';

import { performanceMonitor } from '../performance/monitor.js';
import { CacheManager, globalCache } from '../performance/cache-manager.js';

/**
 * HTML Renderer Class extending BaseRenderer
 * 
 * @class HTMLRenderer
 * @extends BaseRenderer
 * @description High-performance HTML renderer with caching, monitoring, and streaming support.
 * Converts object-based components to HTML strings with advanced optimizations.
 * 
 * @param {Object} [options={}] - Renderer configuration options
 * @param {boolean} [options.enableCache=true] - Enable component caching
 * @param {boolean} [options.enableMonitoring=true] - Enable performance monitoring
 * @param {boolean} [options.minify=false] - Enable HTML minification
 * @param {boolean} [options.streaming=false] - Enable streaming mode
 * @param {number} [options.maxDepth=100] - Maximum rendering depth
 * @param {number} [options.cacheSize=1000] - Cache size limit
 * @param {number} [options.cacheTTL=300000] - Cache TTL in milliseconds
 * 
 * @example
 * const renderer = new HTMLRenderer({
 *   enableCache: true,
 *   enableMonitoring: true,
 *   minify: true
 * });
 * 
 * const html = renderer.render({ div: { text: 'Hello World' } });
 */
class HTMLRenderer extends BaseRenderer {
    constructor(options = {}) {
        super({
            enableCache: options.enableCache !== false,
            enableMonitoring: options.enableMonitoring !== false,
            minify: options.minify || false,
            streaming: options.streaming || false,
            maxDepth: options.maxDepth || 100,
            ...options
        });
        
        // Use globalCache if enabled, or create local cache as fallback
        if (this.config.enableCache) {
            if (globalCache) {
                this.cache = globalCache;
            } else if (!this.cache) {
                this.cache = new CacheManager({
                    maxSize: this.config.cacheSize || 1000,
                    ttl: this.config.cacheTTL || 300000 // 5 minutes
                });
            }
        }
    }

    /**
     * Main render method - converts components to HTML string
     * 
     * @param {Object|Array|string|Function} component - Component to render
     * @param {Object} [options={}] - Rendering options
     * @param {Object} [options.context] - Rendering context
     * @param {boolean} [options.enableCache] - Override cache setting
     * @param {number} [options.depth=0] - Current rendering depth
     * @returns {string} Rendered HTML string
     * 
     * @example
     * const html = renderer.render({
     *   div: {
     *     className: 'container',
     *     children: [
     *       { h1: { text: 'Title' } },
     *       { p: { text: 'Content' } }
     *     ]
     *   }
     * });
     */
    render(component, options = {}) {
        const config = { ...this.config, ...options };
        this.startTiming();

        try {
            // Input validation
            if (config.validateInput && !this.isValidComponent(component)) {
                throw new Error('Invalid component structure');
            }

            // Main rendering logic
            const html = this.renderComponent(component, config, 0);
            const finalHtml = config.minify ? minifyHtml(html, config) : html;

            // Performance monitoring
            this.endTiming();
            this.recordPerformance('renderToString', this.metrics.startTime, false, { 
                cacheEnabled: config.enableCache 
            });

            return finalHtml;

        } catch (error) {
            this.recordError('renderToString', error);
            throw error;
        }
    }

    /**
     * Render a single component with full optimization pipeline
     */
    renderComponent(component, options, depth = 0) {
        // Use base class depth validation
        this.validateDepth(depth);
        
        // Use base class component type processing
        const { type, value } = this.processComponentType(component);
        
        switch (type) {
            case 'empty':
                return '';
            case 'text':
                return escapeHtml(value);
            case 'function':
                const result = this.executeFunctionComponent(value, depth);
                return this.renderComponent(result, options, depth + 1);
            case 'array':
                return value.map(child => this.renderComponent(child, options, depth + 1)).join('');
            case 'element':
                // Process object-based component
                const tagName = Object.keys(value)[0];
                const elementContent = value[tagName];
                return this.renderElement(tagName, elementContent, options, depth);
            default:
                this.recordError('renderComponent', new Error(`Unknown component type: ${type}`));
                return '';
        }
    }

    /**
     * Render an HTML element with advanced caching and optimization
     */
    renderElement(tagName, element, options, depth = 0) {
        const startTime = performance.now();

        // Track element usage for performance analysis
        if (options.enableMonitoring && this.cache) {
            this.cache.trackElementUsage(tagName);
        }

        // Check cache first for static elements
        if (options.enableCache && this.cache && RendererUtils.isStaticElement(element)) {
            const cached = this.cache.getStaticElement(tagName, element);
            if (cached) {
                this.recordPerformance(tagName, startTime, true);
                return cached;
            }
        }

        // Handle text-only elements including booleans
        if (typeof element === 'string' || typeof element === 'number' || typeof element === 'boolean') {
            const html = isVoidElement(tagName)
                ? `<${tagName}>`
                : `<${tagName}>${escapeHtml(String(element))}</${tagName}>`;

            this.cacheIfStatic(tagName, element, html, options);
            this.recordPerformance(tagName, startTime, false);
            return html;
        }

        // Handle function elements
        if (typeof element === 'function') {
            const result = this.executeFunctionComponent(element, depth);
            return this.renderElement(tagName, result, options, depth);
        }

        // Handle object elements (complex elements with props and children)
        if (element && typeof element === 'object') {
            return this.renderObjectElement(tagName, element, options, depth);
        }

        // Handle null and undefined by returning empty tags
        if (element === null || element === undefined) {
            const html = isVoidElement(tagName)
                ? `<${tagName}>`
                : `<${tagName}></${tagName}>`;
            this.recordPerformance(tagName, startTime, false);
            return html;
        }

        // Fallback for any other types
        const html = `<${tagName}>${escapeHtml(String(element))}</${tagName}>`;
        this.recordPerformance(tagName, startTime, false);
        return html;
    }

    /**
     * Cache element if it's static
     */
    cacheIfStatic(tagName, element, html, options) {
        if (options.enableCache && this.cache && RendererUtils.isStaticElement(element)) {
            this.cache.cacheStaticElement(tagName, element, html);
        }
    }

    /**
     * Render complex object elements with attributes and children
     */
    renderObjectElement(tagName, element, options, depth = 0) {
        const startTime = performance.now();

        // Check component-level cache
        if (options.enableCache && this.cache) {
            const cacheKey = RendererUtils.generateCacheKey(tagName, element);
            if (cacheKey) {
                const cached = this.cache.get(cacheKey);
                if (cached) {
                    this.recordPerformance(tagName, startTime, true);
                    return cached;
                }
            }
        }

        // Extract props and children directly from element content
        const { children, text, ...attributes } = element || {};

        // Build opening tag with attributes
        const attributeString = formatAttributes(attributes);
        const openingTag = attributeString
            ? `<${tagName} ${attributeString}>`
            : `<${tagName}>`;

        // Handle text content
        let textContent = '';
        if (text !== undefined) {
            textContent = typeof text === 'function' ? String(text()) : escapeHtml(String(text));
        }

        // Handle children
        let childrenHtml = '';
        if (hasChildren(element)) {
            const normalizedChildren = normalizeChildren(children);
            childrenHtml = normalizedChildren
                .map(child => this.renderComponent(child, options, depth + 1))
                .join('');
        }

        // Build complete HTML
        const html = `${openingTag}${textContent}${childrenHtml}</${tagName}>`;

        // Cache the result if appropriate
        if (options.enableCache && this.cache && RendererUtils.isCacheable(element, options)) {
            const cacheKey = RendererUtils.generateCacheKey(tagName, element);
            if (cacheKey) {
                this.cache.set(cacheKey, html);
            }
        }

        this.recordPerformance(tagName, startTime, false);
        return html;
    }
}

// Note: globalCache is now imported from cache-manager.js

/**
 * Main render function - converts object components to HTML
 */
export function renderToString(component, options = {}) {
    // Use the imported globalCache - no need to initialize as it's already created in cache-manager.js
    
    const renderer = new HTMLRenderer(options);
    return renderer.render(component, options);
}

// Old functions removed - now part of HTMLRenderer class

// Old helper functions removed - now available in RendererUtils from BaseRenderer

/**
 * Batch rendering for multiple components
 */
export function renderBatch(components, options = {}) {
    const startTime = performance.now();

    try {
        const results = components.map((component, index) => {
            try {
                return renderToString(component, {
                    ...options,
                    enableMonitoring: false // Avoid double monitoring
                });
            } catch (error) {
                if (options.enableMonitoring) {
                    performanceMonitor.recordError(`batch[${index}]`, error);
                }
                return options.fallback || '';
            }
        });

        if (options.enableMonitoring) {
            performanceMonitor.recordRender(
                'renderBatch',
                performance.now() - startTime,
                false,
                { batchSize: components.length }
            );
        }

        return results;
    } catch (error) {
        if (options.enableMonitoring) {
            performanceMonitor.recordError('renderBatch', error);
        }
        throw error;
    }
}

/**
 * Render to chunks for large output (fake streaming - renders full HTML then chunks it)
 * For true progressive streaming, use the streaming-renderer.js renderToStream function
 */
export async function* renderToChunks(component, options = {}) {
    const config = {
        chunkSize: options.chunkSize || 8192,
        ...options,
        streaming: true
    };

    const html = renderToString(component, config);

    // Split into chunks for streaming
    for (let i = 0; i < html.length; i += config.chunkSize) {
        const chunk = html.slice(i, i + config.chunkSize);
        yield {
            chunk,
            index: Math.floor(i / config.chunkSize),
            size: chunk.length,
            isLast: i + config.chunkSize >= html.length
        };
    }
}

/**
 * @deprecated Use renderToChunks instead. This function will be removed in a future version.
 * For true progressive streaming, use the streaming-renderer.js renderToStream function.
 */
export async function* renderToStream(component, options = {}) {
    console.warn('renderToStream from html-renderer is deprecated. Use renderToChunks for chunking or streaming-renderer.js renderToStream for true streaming.');
    return yield* renderToChunks(component, options);
}

/**
 * Get global cache instance for external access
 */
export function getCache() {
    return globalCache;
}

/**
 * Reset cache (useful for testing)
 */
export function resetCache() {
    if (globalCache) {
        globalCache.clear();
    }
}

/**
 * Get rendering statistics
 */
export function getRenderingStats() {
    return {
        cache: globalCache ? globalCache.getStats() : null,
        performance: performanceMonitor.getStats()
    };
}

/**
 * Precompile static components for maximum performance
 */
export function precompileComponent(component, options = {}) {
    if (!isStaticElement(component)) {
        throw new Error('Can only precompile static components');
    }

    const html = renderToString(component, { ...options, enableCache: false });

    return {
        html,
        isPrecompiled: true,
        render: () => html
    };
}

/**
 * Development helper - render with detailed timing
 */
export function renderWithTiming(component, options = {}) {
    const start = performance.now();
    const html = renderToString(component, { ...options, enableMonitoring: true });
    const end = performance.now();

    return {
        html,
        timing: {
            total: end - start,
            breakdown: performanceMonitor.getStats()
        }
    };
}
