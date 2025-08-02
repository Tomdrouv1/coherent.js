/**
 * High-performance HTML renderer with caching, monitoring, and streaming support
 * Converts object-based components to HTML strings with advanced optimizations
 */

import {
    validateComponent,
    isCoherentObject,
    extractProps,
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
import { CacheManager } from '../performance/cache-manager.js';

// Global cache instance for renderer
let globalCache = null;

/**
 * Main render function - converts object components to HTML
 */
export function renderToString(component, options = {}) {
    const config = {
        enableCache: options.enableCache !== false,
        enableMonitoring: options.enableMonitoring !== false,
        minify: options.minify || false,
        streaming: options.streaming || false,
        validateInput: options.validateInput !== false,
        maxDepth: options.maxDepth || 100,
        ...options
    };

    // Initialize global cache if needed
    if (config.enableCache && !globalCache) {
        globalCache = new CacheManager({
            maxSize: config.cacheSize || 1000,
            ttl: config.cacheTTL || 300000 // 5 minutes
        });
    }

    const startTime = performance.now();

    try {
        // Input validation
        if (config.validateInput && !isValidComponent(component)) {
            throw new Error('Invalid component structure');
        }

        // Main rendering logic
        const html = renderComponent(component, config, 0);
        const finalHtml = config.minify ? minifyHtml(html, config) : html;

        // Performance monitoring
        if (config.enableMonitoring) {
            performanceMonitor.recordRender(
                'renderToString',
                performance.now() - startTime,
                false,
                { cacheEnabled: config.enableCache }
            );
        }

        return finalHtml;

    } catch (error) {
        if (config.enableMonitoring) {
            performanceMonitor.recordError('renderToString', error);
        }
        throw error;
    }
}

/**
 * Render a single component with full optimization pipeline
 */
function renderComponent(component, options, depth = 0) {
    // Depth protection
    if (depth > options.maxDepth) {
        throw new Error(`Maximum render depth (${options.maxDepth}) exceeded`);
    }

    // Handle different component types
    if (component === null || component === undefined) {
        return '';
    }

    if (typeof component === 'string') {
        return escapeHtml(component);
    }

    if (typeof component === 'number' || typeof component === 'boolean') {
        return String(component);
    }

    if (typeof component === 'function') {
        // Execute the function component
        const result = component();
        
        // Handle case where function returns another function
        if (typeof result === 'function') {
            // Prevent infinite recursion by limiting depth
            if (depth + 1 > options.maxDepth) {
                throw new Error(`Maximum render depth (${options.maxDepth}) exceeded`);
            }
            return renderComponent(result, options, depth + 1);
        }
        
        return renderComponent(result, options, depth + 1);
    }

    if (Array.isArray(component)) {
        return component
            .map(child => renderComponent(child, options, depth + 1))
            .join('');
    }

    if (isCoherentObject(component)) {
        // Extract tagName from the first key of the component object
        const keys = Object.keys(component);
        if (keys.length === 0) {
            throw new Error('Coherent object has no keys');
        }
        
        // Use the first key as the tagName
        const tagName = keys[0];
        const element = component[tagName];
        
        // Validate the component structure
        validateComponent(component);
        
        return renderElement(tagName, element, options, depth);
    }

    // Fallback for unknown types
    const errorMessage = `Unknown component type: ${typeof component}. Component: ${JSON.stringify(component, null, 2)}`;
    
    if (options.enableMonitoring) {
        performanceMonitor.recordError('renderComponent',
            new Error(errorMessage)
        );
    }
    
    // In development mode, provide more detailed error information
    if (typeof process !== 'undefined' && process.env.NODE_ENV === 'development') {
        console.warn('Coherent.js Render Warning:', errorMessage);
    }

    return '';
}

/**
 * Render an HTML element with advanced caching and optimization
 */
function renderElement(tagName, element, options, depth = 0) {
    const startTime = performance.now();

    // Track element usage for performance analysis
    if (options.enableMonitoring && globalCache) {
        globalCache.trackElementUsage(tagName);
    }

    // Check cache first for static elements
    if (options.enableCache && globalCache && isStaticElement(element)) {
        const cached = globalCache.getStaticElement(tagName, element);
        if (cached) {
            if (options.enableMonitoring) {
                performanceMonitor.recordRender(tagName, performance.now() - startTime, true);
            }
            return cached;
        }
    }

    // Handle text-only elements including booleans
    if (typeof element === 'string' || typeof element === 'number' || typeof element === 'boolean') {
        const html = isVoidElement(tagName)
            ? `<${tagName}>`
            : `<${tagName}>${escapeHtml(String(element))}</${tagName}>`;

        cacheIfStatic(tagName, element, html, options);
        recordPerformance(tagName, startTime, options, false);
        return html;
    }

    // Handle function elements
    if (typeof element === 'function') {
        const result = element();
        return renderElement(tagName, result, options, depth + 1);
    }

    // Handle object elements with props and children
    if (element && typeof element === 'object') {
        return renderObjectElement(tagName, element, options, depth);
    }

    // Handle null and undefined by returning empty tags
    if (element === null || element === undefined) {
        const html = isVoidElement(tagName)
            ? `<${tagName}>`
            : `<${tagName}></${tagName}>`;
        recordPerformance(tagName, startTime, options, false);
        return html;
    }

    // Fallback for any other types
    const html = `<${tagName}>${escapeHtml(String(element))}</${tagName}>`;
    recordPerformance(tagName, startTime, options, false);
    return html;
}

/**
 * Render complex object elements with attributes and children
 */
function renderObjectElement(tagName, element, options, depth = 0) {
    const startTime = performance.now();

    // Check component-level cache
    if (options.enableCache && globalCache) {
        const cacheKey = generateCacheKey(tagName, element);
        const cached = globalCache.get(cacheKey);
        if (cached) {
            recordPerformance(tagName, startTime, options, true);
            return cached;
        }
    }

    // Extract props and children directly from element content
    // Element content structure: { className: 'class', id: 'id', children: [...], text: 'content' }
    const { children, text, ...props } = element;

    // Build opening tag
    const attributes = formatAttributes(props);
    const openingTag = attributes
        ? `<${tagName} ${attributes}>`
        : `<${tagName}>`;

    // Handle void elements
    if (isVoidElement(tagName)) {
        const html = openingTag;
        cacheIfStatic(tagName, element, html, options);
        recordPerformance(tagName, startTime, options, false);
        return html;
    }

    // Render children or text content
    let childrenHtml = '';
    if (text !== undefined) {
        // Handle text content
        childrenHtml = typeof text === 'function'
            ? escapeHtml(String(text()))
            : escapeHtml(String(text));
    } else if (children) {
        // Handle child components
        const normalizedChildren = normalizeChildren(children);
        childrenHtml = normalizedChildren
            .map(child => renderComponent(child, options, depth + 1))
            .join('');
    }

    // Build complete HTML
    const html = `${openingTag}${childrenHtml}</${tagName}>`;

    // Cache the result if appropriate
    if (options.enableCache && globalCache && isCacheable(element, options)) {
        const cacheKey = generateCacheKey(tagName, element);
        globalCache.set(cacheKey, html);
    }

    recordPerformance(tagName, startTime, options, false);
    return html;
}

/**
 * Helper functions for caching and optimization
 */

function isStaticElement(element) {
    if (!element || typeof element !== 'object') {
        return typeof element === 'string' || typeof element === 'number';
    }

    // Check if element has any dynamic content
    for (const [key, value] of Object.entries(element)) {
        if (typeof value === 'function') return false;

        if (key === 'children' && Array.isArray(value)) {
            // Recursively check children for dynamic content
            return value.every(child => isStaticElement(child));
        }

        if (key === 'children' && typeof value === 'object' && value !== null) {
            return isStaticElement(value);
        }
    }

    return true;
}

function isCacheable(element, options) {
    // Don't cache if caching is disabled
    if (!options.enableCache) return false;

    // Don't cache elements with functions (dynamic content)
    if (hasFunctions(element)) return false;

    // Don't cache very large elements (memory consideration)
    if (getElementComplexity(element) > 1000) return false;

    return true;
}

function hasFunctions(obj, visited = new WeakSet()) {
    if (visited.has(obj)) return false;
    visited.add(obj);

    for (const value of Object.values(obj)) {
        if (typeof value === 'function') return true;
        if (typeof value === 'object' && value !== null && hasFunctions(value, visited)) {
            return true;
        }
    }
    return false;
}

function getElementComplexity(element) {
    if (!element || typeof element !== 'object') return 1;

    let complexity = Object.keys(element).length;

    if (element.children && Array.isArray(element.children)) {
        complexity += element.children.reduce(
            (sum, child) => sum + getElementComplexity(child),
            0
        );
    }

    return complexity;
}

function generateCacheKey(tagName, element) {
    try {
        // Create a stable cache key for the element
        const keyData = {
            tag: tagName,
            props: extractProps(element),
            hasChildren: hasChildren(element),
            childrenType: Array.isArray(element.children) ? 'array' : typeof element.children
        };

        return `element:${JSON.stringify(keyData)}`;
    } catch {
        // Fallback for circular references or complex objects
        return `element:${tagName}:${Date.now()}:${Math.random()}`;
    }
}

function cacheIfStatic(tagName, element, html, options) {
    if (options.enableCache && globalCache && isStaticElement(element)) {
        globalCache.cacheStaticElement(tagName, element, html);
    }
}

function recordPerformance(tagName, startTime, options, fromCache) {
    if (options.enableMonitoring) {
        performanceMonitor.recordRender(
            tagName,
            performance.now() - startTime,
            fromCache
        );
    }
}

function isValidComponent(component) {
    if (component === null || component === undefined) return true;
    if (typeof component === 'string' || typeof component === 'number') return true;
    if (typeof component === 'function') return true;
    if (Array.isArray(component)) return component.every(isValidComponent);
    if (isCoherentObject(component)) return true;

    return false;
}

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
 * Render with streaming support for large output
 */
export async function* renderToStream(component, options = {}) {
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
