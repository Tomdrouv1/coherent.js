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
import { createCacheManager } from '../performance/cache-manager.js';
import { cssUtils, defaultCSSManager } from './css-manager.js';

// Create a global cache instance for the renderer
const rendererCache = createCacheManager({
    maxSize: 1000,
    ttlMs: 300000 // 5 minutes
});

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
        
        // Initialize cache if enabled
        if (this.config.enableCache && !this.cache) {
            this.cache = rendererCache;
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
            this.recordPerformance('render', this.metrics.startTime, false, {
                cacheEnabled: config.enableCache 
            });

            return finalHtml;

        } catch (_error) {
            this.recordError('render', _error);
            throw _error;
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

        // Track element usage for performance analysis (via stats in the new cache manager)
        if (options.enableMonitoring && this.cache) {
            // The new cache manager tracks usage automatically via get/set operations
        }

        // Check cache first for static elements
        if (options.enableCache && this.cache && RendererUtils.isStaticElement(element)) {
            const cacheKey = `static:${tagName}:${JSON.stringify(element)}`;
            const cached = this.cache.get('static', cacheKey);
            if (cached) {
                this.recordPerformance(tagName, startTime, true);
                return cached.value; // Return the cached HTML
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
    cacheIfStatic(tagName, element, html) {
        if (this.config.enableCache && this.cache && RendererUtils.isStaticElement(element)) {
            const cacheKey = `static:${tagName}:${JSON.stringify(element)}`;
            this.cache.set('static', cacheKey, html, {
                ttlMs: this.config.cacheTTL || 5 * 60 * 1000, // 5 minutes default
                size: html.length // Approximate size
            });
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
            const isScript = tagName === 'script';
            const isStyle = tagName === 'style';
            const isRawTag = isScript || isStyle;
            const raw = typeof text === 'function' ? String(text()) : String(text);
            if (isRawTag) {
                // Prevent </script> or </style> early-terminating the tag
                const safe = raw
                  .replace(/<\/(script)/gi, '<\\/$1')
                  .replace(/<\/(style)/gi, '<\\/$1')
                  // Escape problematic Unicode line separators in JS
                  .replace(/\u2028/g, '\\u2028')
                  .replace(/\u2029/g, '\\u2029');
                textContent = safe;
            } else {
                textContent = escapeHtml(raw);
            }
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
export function render(component, options = {}) {
    // Merge default options with provided options
    const mergedOptions = {
        enableCache: true,
        enableMonitoring: false,
        ...options
    };
    
    const renderer = new HTMLRenderer(mergedOptions);
    return renderer.render(component, mergedOptions);
}

/**
 * Renders component to complete HTML document with DOCTYPE
 * Better alternative to manual DOCTYPE concatenation
 * Supports CSS file inclusion and inline styles
 */
export async function renderHTML(component, options = {}) {
    const htmlContent = render(component, options);
    
    // Process CSS options
    const cssOptions = cssUtils.processCSSOptions(options);
    
    // Generate CSS HTML if any CSS is specified
    let cssHtml = '';
    if (cssOptions.files.length > 0 || cssOptions.links.length > 0 || cssOptions.inline) {
        cssHtml = await cssUtils.generateCSSHtml(cssOptions, defaultCSSManager);
    }
    
    // If the component includes a head tag, inject CSS into it
    if (cssHtml && htmlContent.includes('<head>')) {
        const htmlWithCSS = htmlContent.replace(
            '</head>', 
            `${cssHtml}\n</head>`
        );
        return `<!DOCTYPE html>\n${htmlWithCSS}`;
    }
    
    // If there's CSS but no head tag, wrap the component with a basic HTML structure
    if (cssHtml) {
        return `<!DOCTYPE html>
<html>
<head>
<meta charset="utf-8">
<meta name="viewport" content="width=device-width, initial-scale=1">
${cssHtml}
</head>
<body>
${htmlContent}
</body>
</html>`;
    }
    
    return `<!DOCTYPE html>\n${htmlContent}`;
}

/**
 * Synchronous version of render for cases without CSS files
 * Falls back to async if CSS files are detected
 */
export function renderHTMLSync(component, options = {}) {
    const cssOptions = cssUtils.processCSSOptions(options);
    
    // If CSS files are specified, return a promise
    if (cssOptions.files.length > 0) {
        console.warn('CSS files detected, use render() (async) instead of renderSync()');
        return render(component, options);
    }
    
    const htmlContent = render(component, options);
    
    // Handle inline CSS and external links only
    let cssHtml = '';
    if (cssOptions.links.length > 0) {
        cssHtml += defaultCSSManager.generateCSSLinks(cssOptions.links);
    }
    if (cssOptions.inline) {
        cssHtml += `\n${  defaultCSSManager.generateInlineStyles(cssOptions.inline)}`;
    }
    
    if (cssHtml && htmlContent.includes('<head>')) {
        const htmlWithCSS = htmlContent.replace(
            '</head>', 
            `${cssHtml}\n</head>`
        );
        return `<!DOCTYPE html>\n${htmlWithCSS}`;
    }
    
    if (cssHtml) {
        return `<!DOCTYPE html>
<html>
<head>
<meta charset="utf-8">
<meta name="viewport" content="width=device-width, initial-scale=1">
${cssHtml}
</head>
<body>
${htmlContent}
</body>
</html>`;
    }
    
    return `<!DOCTYPE html>\n${htmlContent}`;
}


// Old functions removed - now part of HTMLRenderer class

// Old helper functions removed - now available in RendererUtils from BaseRenderer

/**
 * Batch rendering for multiple components
 */
export function renderBatch(components, options = {}) {
    if (!Array.isArray(components)) {
        throw new Error('renderBatch expects an array of components');
    }

    // Merge default options with provided options
    const mergedOptions = {
        enableCache: true,
        enableMonitoring: false,
        ...options
    };

    const renderer = new HTMLRenderer(mergedOptions);
    return components.map(component => renderer.render(component, mergedOptions));
}

/**
 * Real streaming render - yields chunks progressively as HTML is generated
 * Ideal for large component trees or memory-constrained environments
 */
export async function* renderToStream(component, options = {}) {
    const config = {
        chunkSize: 8192, // 8KB default chunk size
        maxDepth: 1000,
        yieldThreshold: 100, // Yield control every 100 elements
        encoding: 'utf8',
        ...options
    };

    let buffer = '';
    let elementCount = 0;

    // Helper to flush buffer when it reaches chunk size
    async function* flushBuffer(force = false) {
        if (force || buffer.length >= config.chunkSize) {
            if (buffer.length > 0) {
                yield buffer;
                buffer = '';
            }
        }
    }

    // Helper to add to buffer
    async function* write(text) {
        buffer += text;
        yield* flushBuffer();
    }

    // Recursive streaming component renderer
    async function* streamComponent(comp, depth = 0) {
        if (depth > config.maxDepth) {
            throw new Error(`Maximum nesting depth exceeded: ${config.maxDepth}`);
        }

        // Handle null/undefined
        if (comp === null || comp === undefined) return;

        // Handle primitives
        if (typeof comp === 'string' || typeof comp === 'number') {
            yield* write(escapeHtml(String(comp)));
            return;
        }

        // Handle arrays
        if (Array.isArray(comp)) {
            for (const child of comp) {
                yield* streamComponent(child, depth);

                // Yield control periodically
                if (elementCount++ % config.yieldThreshold === 0) {
                    await new Promise(resolve => setImmediate(resolve));
                }
            }
            return;
        }

        // Handle functions
        if (typeof comp === 'function') {
            const result = comp();
            yield* streamComponent(result, depth);
            return;
        }

        // Handle objects (HTML elements)
        if (typeof comp === 'object') {
            for (const [tagName, props] of Object.entries(comp)) {
                if (typeof props === 'object' && props !== null) {
                    const { children, text, ...attributes } = props;
                    const attrsStr = formatAttributes(attributes);
                    const openTag = attrsStr ? `<${tagName} ${attrsStr}>` : `<${tagName}>`;

                    if (isVoidElement(tagName)) {
                        yield* write(openTag.replace('>', ' />'));
                        elementCount++;
                        return;
                    }

                    yield* write(openTag);

                    if (text !== undefined) {
                        yield* write(escapeHtml(String(text)));
                    } else if (children) {
                        yield* streamComponent(children, depth + 1);
                    }

                    yield* write(`</${tagName}>`);
                    elementCount++;
                } else if (typeof props === 'string') {
                    const content = escapeHtml(props);
                    if (isVoidElement(tagName)) {
                        yield* write(`<${tagName} />`);
                    } else {
                        yield* write(`<${tagName}>${content}</${tagName}>`);
                    }
                    elementCount++;
                }
            }
        }
    }

    // Start streaming
    try {
        yield* streamComponent(component);
        yield* flushBuffer(true); // Force flush remaining buffer
    } catch (error) {
        // Stream error as HTML comment
        yield `<!-- Streaming Error: ${error.message} -->`;
    }
}

/**
 * Streaming utilities for common use cases
 */
export const streamingUtils = {
    /**
     * Collect all chunks into a single string
     */
    async collectChunks(chunkGenerator) {
        let html = '';
        for await (const chunk of chunkGenerator) {
            html += chunk;
        }
        return html;
    },

    /**
     * Stream directly to a Node.js response
     */
    async streamToResponse(chunkGenerator, response) {
        let totalBytes = 0;
        response.setHeader('Content-Type', 'text/html; charset=utf-8');
        response.setHeader('Transfer-Encoding', 'chunked');

        for await (const chunk of chunkGenerator) {
            response.write(chunk);
            totalBytes += Buffer.byteLength(chunk);
        }

        response.end();
        return totalBytes;
    },

    /**
     * Stream with progress callback
     */
    async* streamWithProgress(chunkGenerator, onProgress) {
        let totalBytes = 0;
        let chunkCount = 0;

        for await (const chunk of chunkGenerator) {
            totalBytes += Buffer.byteLength(chunk);
            chunkCount++;

            if (onProgress) {
                onProgress({ chunkCount, totalBytes, chunk });
            }

            yield chunk;
        }
    }
};

/**
 * Render to chunks (legacy - kept for backward compatibility)
 * For true streaming, use renderToStream() instead
 */
export function* renderToChunks(component, options = {}) {
    const mergedOptions = {
        enableCache: true,
        enableMonitoring: false,
        ...options,
        chunkSize: options.chunkSize || 1024 // Default 1KB chunks
    };

    const html = render(component, mergedOptions);

    for (let i = 0; i < html.length; i += mergedOptions.chunkSize) {
        yield html.slice(i, i + mergedOptions.chunkSize);
    }
}

/**
 * Get global cache instance for external access
 */
export function getCache() {
    return rendererCache;
}

/**
 * Reset cache (useful for testing)
 */
export function resetCache() {
    if (rendererCache) {
        rendererCache.clear();
    }
}

/**
 * Get rendering statistics
 */
export function getRenderingStats() {
    return {
        cache: rendererCache ? rendererCache.getStats() : null,
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

    const html = render(component, { ...options, enableCache: false });

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
    const html = render(component, { ...options, enableMonitoring: true });
    const end = performance.now();

    return {
        html,
        timing: {
            total: end - start,
            breakdown: performanceMonitor.getStats()
        }
    };
}
