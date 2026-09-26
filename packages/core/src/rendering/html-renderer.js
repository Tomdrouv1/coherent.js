/**
 * High-performance HTML renderer with caching, monitoring, and streaming support
 * Converts object-based components to HTML strings with advanced optimizations
 */

import { BaseRenderer, RendererUtils, serializeForCache } from './base-renderer.js';
import { normalizeChildren } from '../core/object-utils.js';

import { validateNesting, FORBIDDEN_CHILDREN } from '../core/html-nesting-rules.js';

import {
    escapeHtml,
    isTrustedContent,
    isVoidElement,
    formatAttributes,
    minifyHtml,
    createStreamMinifier
} from '../core/html-utils.js';

import { performanceMonitor } from '../performance/monitor.js';
import { createCacheManager } from '../performance/cache-manager.js';
import { cssUtils, defaultCSSManager } from './css-manager.js';
import { CoherentError, RenderingError, globalErrorHandler } from '../utils/error-handler.js';

// Element props rendered as content or identity, never as attributes.
const RESERVED_PROPS = new Set(['children', 'text', 'key', 'html']);

// Shared by every render() call that opts in with `enableCache: true`.
const rendererCache = createCacheManager({
    maxCacheSize: 1000,
    ttlMs: 300000 // 5 minutes
});

/**
 * render() is synchronous. A Promise in the tree (an async component, or a
 * lazy() factory that returns one) used to render as an empty string
 * without any signal.
 */
function assertNotThenable(value, path) {
    if (value && (typeof value === 'object' || typeof value === 'function') && typeof value.then === 'function') {
        throw new RenderingError(
            `Cannot render a Promise at ${path === 'root' ? 'root' : formatRenderPath(path)}: render() is synchronous. Await async components (and their data) before rendering.`,
            undefined,
            { path: path === 'root' ? 'root' : formatRenderPath(path), renderer: 'html' }
        );
    }
}

/**
 * Render paths are linked lists ({ parent, segment }, null for the root),
 * extended in O(1) per node and formatted only when an error or warning
 * needs them. Copying an array per node ([...path, segment]) and formatting
 * a string per child made rendering quadratic in tree depth.
 */
function childPath(parent, segment) {
    return { parent, segment };
}

function formatRenderPath(path) {
    const segments = [];
    if (Array.isArray(path)) {
        segments.push(...path);
    } else {
        for (let node = path; node; node = node.parent) segments.push(node.segment);
        segments.reverse();
    }

    let rendered = 'root';
    for (const segment of segments) {
        if (typeof segment !== 'string' || segment.length === 0) continue;
        if (segment.startsWith('[')) {
            rendered += segment;
        } else {
            rendered += `.${segment}`;
        }
    }
    return rendered;
}

/**
 * HTML Renderer Class extending BaseRenderer
 *
 * @class HTMLRenderer
 * @extends BaseRenderer
 * @description High-performance HTML renderer with caching, monitoring, and streaming support.
 * Converts object-based components to HTML strings with advanced optimizations.
 *
 * @param {Object} [options={}] - Renderer configuration options
 * @param {boolean} [options.enableCache=false] - Cache the HTML of whole renders, keyed on
 *   the full component tree (trees containing functions are never cached)
 * @param {Object} [options.cache] - Cache instance from createCacheManager() to use
 *   instead of the shared one (e.g. with its own `maxCacheSize` / `ttlMs`)
 * @param {boolean} [options.enableMonitoring=true] - Enable performance monitoring
 * @param {boolean} [options.minify=false] - Enable HTML minification
 * @param {boolean} [options.streaming=false] - Enable streaming mode
 * @param {number} [options.maxDepth=100] - Maximum rendering depth
 * @param {number} [options.cacheTTL=300000] - Cache TTL in milliseconds for entries this render adds
 * @param {Function} [options.onError] - `(error, { path }) => replacement` called when a
 *   function component throws; its return value is rendered in place of the component
 *   (return null to omit it). Without it the error propagates out of render().
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
            enableMonitoring: options.enableMonitoring !== false,
            minify: options.minify || false,
            streaming: options.streaming || false,
            maxDepth: options.maxDepth || 100,
            ...options,
            enableCache: options.enableCache === true
        });

        if (this.config.enableCache) {
            this.cache = options.cache || rendererCache;
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
            assertNotThenable(component, 'root');

            // Input validation
            if (config.validateInput && !this.isValidComponent(component)) {
                throw new Error('Invalid component structure');
            }

            // One cache entry per whole render. Caching every element
            // separately meant serializing each subtree again at every level
            // (quadratic in depth) and made rendering slower than not caching.
            const cacheKey = this.cache && config.enableCache
                ? serializeForCache(component)
                : null;
            const fullKey = cacheKey === null ? null : `render:${config.minify ? 'min' : 'raw'}:${cacheKey}`;
            if (fullKey !== null) {
                const cached = this.cache.get(fullKey);
                if (cached !== null) {
                    this.endTiming();
                    return cached;
                }
            }

            // Initialize seenObjects for circular reference detection
            const renderOptions = {
                ...config,
                seenObjects: new WeakSet()
            };

            // Main rendering logic
            const html = this.renderComponent(component, renderOptions, 0, null);
            const finalHtml = config.minify ? minifyHtml(html, config) : html;

            if (fullKey !== null) {
                this.cache.set(fullKey, finalHtml, 'component', {
                    ttlMs: typeof config.cacheTTL === 'number' ? config.cacheTTL : undefined
                });
            }

            // Performance monitoring
            this.endTiming();
            this.recordPerformance('render', this.metrics.startTime, false, {
                cacheEnabled: config.enableCache
            });

            return finalHtml;

        } catch (_error) {
            this.recordError('render', _error);
            const enhancedError = globalErrorHandler.handle(_error, {
                renderContext: { path: 'root', renderer: 'html' }
            });

            if (config.throwOnError === false) {
                return config.errorFallback;
            }

            throw enhancedError;
        }
    }

    /**
     * Render a single component with full optimization pipeline
     */
    renderComponent(component, options, depth = 0, path = null) {
        // Handle nullish and empty inputs immediately
        if (component === null || component === undefined) {
            return '';
        }
        if (Array.isArray(component) && component.length === 0) {
            return '';
        }

        // Before cycle tracking: a marker is an inert leaf, so the same one
        // may appear twice without that being a cycle.
        if (isTrustedContent(component)) {
            return component.__html;
        }

        // Its keys (__isLazy, evaluate...) aren't tag names, so a lazy() value
        // used to render as nothing unless evaluateLazy() ran first.
        if (typeof component === 'object' && component.__isLazy === true && typeof component.evaluate === 'function') {
            return this.renderComponent(component.evaluate(), options, depth + 1, childPath(path, '()'));
        }

        assertNotThenable(component, path);

        // Detect circular references. Only the current ancestor path is
        // tracked (added here, removed in `finally`): the same object may
        // legitimately appear twice in a tree — a shared node, or a memo()
        // result rendered twice — and that used to be reported as a cycle.
        const tracked = options.seenObjects && typeof component === 'object' && component !== null
            ? component
            : null;
        if (tracked) {
            if (options.seenObjects.has(tracked)) {
                throw new RenderingError(
                    'Circular reference detected in component tree',
                    component,
                    { path: formatRenderPath(path) },
                    ['Remove the circular reference', 'Use lazy loading to break the cycle']
                );
            }
            options.seenObjects.add(tracked);
        }

        // Use base class depth validation
        this.validateDepth(depth);

        try {
            // Use base class component type processing
            const { type, value } = this.processComponentType(component);

            switch (type) {
                case 'empty':
                    return '';
                case 'text':
                    return escapeHtml(value);
                case 'function':
                    {
                        const result = this.runFunctionComponent(value, options, depth, path);
                        return this.renderComponent(result, options, depth + 1, childPath(path, '()'));
                    }
                case 'array':
                    // Development mode warning for missing keys
                    if (typeof process !== 'undefined' &&
                        process.env &&
                        process.env.NODE_ENV !== 'production' &&
                        value.length > 1) {

                        const missingKeyCount = value.filter((child) => {
                            if (child && typeof child === 'object' && !Array.isArray(child)) {
                                const tagName = Object.keys(child)[0];
                                const props = child[tagName];
                                return props && typeof props === 'object' && props.key === undefined;
                            }
                            return false;  // primitives don't need keys
                        }).length;

                        if (missingKeyCount > 0) {
                            console.warn(
                                `[Coherent.js] Array of ${value.length} elements at ${formatRenderPath(path)} ` +
                                `has ${missingKeyCount} items missing "key" props. ` +
                                `Keys help identify which items changed for efficient updates. ` +
                                `Add unique key props like: { div: { key: 'unique-id', ... } }`
                            );
                        }
                    }
                    {
                        let html = '';
                        for (let index = 0; index < value.length; index++) {
                            html += this.renderComponent(value[index], options, depth + 1, childPath(path, `[${index}]`));
                        }
                        return html;
                    }
                case 'element':
                    {
                        // Every key is an element; siblings render in order.
                        // Keys after the first used to be dropped silently.
                        const tagNames = Object.keys(value);
                        if (tagNames.length === 1) {
                            return this.renderElement(tagNames[0], value[tagNames[0]], options, depth, childPath(path, tagNames[0]));
                        }
                        let html = '';
                        for (const tagName of tagNames) {
                            html += this.renderElement(tagName, value[tagName], options, depth, childPath(path, tagName));
                        }
                        return html;
                    }
                default:
                    this.recordError('renderComponent', new Error(`Unknown component type: ${type}`));
                    return '';
            }
        } catch (_error) {
            const renderPath = formatRenderPath(path);

            if (_error instanceof CoherentError) {
                if (!_error.context || typeof _error.context !== 'object') {
                    _error.context = { path: renderPath };
                } else if (!_error.context.path) {
                    _error.context = { ..._error.context, path: renderPath };
                }
                throw _error;
            }

            const wrapped = new RenderingError(_error.message, undefined, { path: renderPath, renderer: 'html' });
            wrapped.cause = _error;
            throw wrapped;
        } finally {
            if (tracked) options.seenObjects.delete(tracked);
        }
    }

    /**
     * Run a function component, giving `options.onError` the chance to
     * replace a component that throws.
     */
    runFunctionComponent(func, options, depth, path) {
        try {
            return this.executeFunctionComponent(func, depth);
        } catch (error) {
            if (typeof options.onError === 'function') {
                return options.onError(error, { path: formatRenderPath(path) });
            }
            throw error;
        }
    }

    /**
     * Render an HTML element with advanced caching and optimization
     */
    renderElement(tagName, element, options, depth = 0, path = null) {
        // Check for circular references in element props (ancestor path only,
        // see renderComponent).
        const tracked = options.seenObjects && element && typeof element === 'object' && !Array.isArray(element)
            ? element
            : null;
        if (tracked) {
            if (options.seenObjects.has(tracked)) {
                throw new RenderingError(
                    'Circular reference detected in component tree',
                    element,
                    { path: formatRenderPath(path) },
                    ['Remove the circular reference', 'Use lazy loading to break the cycle']
                );
            }
            options.seenObjects.add(tracked);
        }
        try {
            return this.renderElementContent(tagName, element, options, depth, path);
        } finally {
            if (tracked) options.seenObjects.delete(tracked);
        }
    }

    renderElementContent(tagName, element, options, depth = 0, path = null) {
        const startTime = options.enableMonitoring ? performance.now() : 0;

        // Handle text-only elements including booleans
        if (typeof element === 'string' || typeof element === 'number' || typeof element === 'boolean') {
            const html = isVoidElement(tagName)
                ? `<${tagName}>`
                : `<${tagName}>${escapeHtml(String(element))}</${tagName}>`;

            this.recordPerformance(tagName, startTime, false);
            return html;
        }

        // Handle function elements
        if (typeof element === 'function') {
            let result;
            try {
                result = this.executeFunctionComponent(element, depth);
            } catch (error) {
                if (typeof options.onError !== 'function') throw error;
                // The replacement stands in for the whole element: rendered
                // as the element's content it became attributes
                // (`<div p="[object Object]">`).
                const replacement = options.onError(error, { path: formatRenderPath(path) });
                return this.renderComponent(replacement, options, depth + 1, childPath(path, '()'));
            }
            return this.renderElement(tagName, result, options, depth, childPath(path, '()'));
        }

        // Handle object elements (complex elements with props and children)
        if (element && typeof element === 'object') {
            return this.renderObjectElement(tagName, element, options, depth, path);
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
     * Render complex object elements with attributes and children
     */
    renderObjectElement(tagName, element, options, depth = 0, path = null) {
        const startTime = options.enableMonitoring ? performance.now() : 0;
        const parts = elementParts(tagName, element);

        let html = parts.open + parts.content;
        if (parts.children) {
            const forbidden = FORBIDDEN_CHILDREN[tagName.toLowerCase()];
            for (let index = 0; index < parts.children.length; index++) {
                const child = parts.children[index];
                const segment = childPath(path, `children[${index}]`);
                checkNesting(tagName, forbidden, child, segment);
                html += this.renderComponent(child, options, depth + 1, segment);
            }
        }
        html += parts.close;

        this.recordPerformance(tagName, startTime, false);
        return html;
    }

    /**
     * Streaming counterpart of renderComponent: yields HTML pieces. Elements
     * with many children are streamed child by child; everything else goes
     * through the synchronous renderer, which is exact and faster, so the
     * streamed output is the same as render()'s by construction.
     */
    async *streamComponent(component, options, depth = 0, path = null) {
        if (component === null || component === undefined) return;

        // Every branch, like renderComponent: deeply nested arrays or
        // functions returning functions overflowed the stack instead of
        // reporting maxDepth.
        this.validateDepth(depth);

        if (typeof component === 'function') {
            const result = this.runFunctionComponent(component, options, depth, path);
            yield* this.streamComponent(result, options, depth + 1, childPath(path, '()'));
            return;
        }

        if (Array.isArray(component)) {
            yield* this.streamTracked(component, options, path, async function* (renderer) {
                for (let index = 0; index < component.length; index++) {
                    yield* renderer.streamComponent(component[index], options, depth + 1, childPath(path, `[${index}]`));
                }
            });
            return;
        }

        if (typeof component === 'object' && !isTrustedContent(component) && component.__isLazy !== true) {
            const { type, value } = this.processComponentType(component);
            if (type === 'element') {
                yield* this.streamTracked(component, options, path, async function* (renderer) {
                    for (const tagName of Object.keys(value)) {
                        yield* renderer.streamElement(tagName, value[tagName], options, depth, childPath(path, tagName));
                    }
                });
                return;
            }
        }

        yield this.renderComponent(component, options, depth, path);
    }

    async *streamElement(tagName, element, options, depth, path) {
        if (!element || typeof element !== 'object' || Array.isArray(element) || !shouldStream(element.children)) {
            yield this.renderElement(tagName, element, options, depth, path);
            return;
        }

        yield* this.streamTracked(element, options, path, async function* (renderer) {
            const parts = elementParts(tagName, element);
            yield parts.open + parts.content;
            if (parts.children) {
                const forbidden = FORBIDDEN_CHILDREN[tagName.toLowerCase()];
                for (let index = 0; index < parts.children.length; index++) {
                    const child = parts.children[index];
                    const segment = childPath(path, `children[${index}]`);
                    checkNesting(tagName, forbidden, child, segment);
                    yield* renderer.streamComponent(child, options, depth + 1, segment);
                }
            }
            yield parts.close;
        });
    }

    /**
     * Run `body` with `value` on the ancestor path used for cycle detection.
     */
    async *streamTracked(value, options, path, body) {
        if (options.seenObjects.has(value)) {
            throw new RenderingError(
                'Circular reference detected in component tree',
                value,
                { path: formatRenderPath(path) },
                ['Remove the circular reference', 'Use lazy loading to break the cycle']
            );
        }
        options.seenObjects.add(value);
        try {
            yield* body(this);
        } finally {
            options.seenObjects.delete(value);
        }
    }
}

// Elements with at least this many children are streamed child by child.
const STREAM_MIN_CHILDREN = 8;

/**
 * Whether to stream an element's children one by one rather than render the
 * element in one synchronous step: when it has many children, or when a
 * child has children of its own (wrappers like body > main > list must be
 * descended into to reach the long list) or is a function whose output size
 * is unknown. Leaf-level rows (a <tr> of text <td>s) render synchronously.
 */
function shouldStream(children) {
    if (children === undefined || children === null) return false;
    const list = Array.isArray(children) ? children : [children];
    if (list.length >= STREAM_MIN_CHILDREN) return true;

    for (const child of list) {
        if (typeof child === 'function' || Array.isArray(child)) return true;
        if (child && typeof child === 'object') {
            for (const key in child) {
                const content = child[key];
                if (typeof content === 'function') return true;
                if (content && typeof content === 'object' && content.children !== undefined && content.children !== null) return true;
            }
        }
    }
    return false;
}

/**
 * Split an element into the markup around its children. Shared by render()
 * and renderToStream() so the two can't drift apart (the old streaming
 * renderer escaped <script> bodies, dropped children next to text, emitted
 * key="..." and skipped tag-name validation).
 *
 * @returns {{open: string, content: string, children: Array|null, close: string}}
 */
function elementParts(tagName, element) {
    // children/text/html are content, and key is reconciliation identity:
    // none of them is rendered as an attribute. formatAttributes skips
    // them instead of this copying the props with rest destructuring.
    const { children, text, html: rawHtml } = element || {};

    const attributeString = formatAttributes(element, RESERVED_PROPS);
    const open = attributeString ? `<${tagName} ${attributeString}>` : `<${tagName}>`;

    // Void elements: no closing tag; any text/children are dropped.
    if (isVoidElement(tagName)) {
        return { open, content: '', children: null, close: '' };
    }

    const close = `</${tagName}>`;

    // Raw HTML injection (unescaped) — for SSR use cases like syntax highlighting
    if (rawHtml !== undefined) {
        const resolved = typeof rawHtml === 'function' ? rawHtml() : rawHtml;
        return { open, content: isTrustedContent(resolved) ? resolved.__html : String(resolved), children: null, close };
    }

    // Content marked by dangerouslySetInnerContent() is emitted verbatim.
    if (isTrustedContent(text)) {
        return { open, content: text.__html, children: null, close };
    }

    // Text content (null means "no text", not the string "null")
    let content = '';
    if (text !== undefined && text !== null) {
        const raw = typeof text === 'function' ? String(text()) : String(text);
        if (tagName === 'script' || tagName === 'style') {
            // Prevent </script> or </style> early-terminating the tag
            content = raw
                .replace(/<\/(script)/gi, '<\\/$1')
                .replace(/<\/(style)/gi, '<\\/$1')
                // Escape problematic Unicode line separators in JS
                .replace(/\u2028/g, '\\u2028')
                .replace(/\u2029/g, '\\u2029');
        } else {
            content = escapeHtml(raw);
        }
    }

    // Children are checked directly: hasChildren() validates every prop name
    // against the tag-name pattern, so an element with a prop like `@click`
    // or `data_id` silently lost all of its children.
    const normalized = children !== undefined && children !== null ? normalizeChildren(children) : null;
    return { open, content, children: normalized && normalized.length > 0 ? normalized : null, close };
}

/**
 * Validate HTML nesting, formatting the path only on a violation.
 */
function checkNesting(tagName, forbidden, child, path) {
    if (forbidden && child && typeof child === 'object' && !Array.isArray(child)) {
        const childTagName = Object.keys(child)[0];
        if (childTagName && forbidden.has(childTagName.toLowerCase())) {
            validateNesting(tagName, childTagName, formatRenderPath(path));
        }
    }
}

// Note: globalCache is now imported from cache-manager.js

/**
 * Main render function - converts object components to HTML
 */
export function render(component, options = {}) {
    // Merge default options with provided options
    const mergedOptions = {
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
        enableMonitoring: false,
        ...options
    };

    const renderer = new HTMLRenderer(mergedOptions);
    return components.map(component => renderer.render(component, mergedOptions));
}

/**
 * Stream a component as HTML chunks: an async generator yielding strings of
 * about `chunkSize` characters. The output is exactly render()'s; the event
 * loop gets a turn after every chunk, so a large page doesn't block other
 * requests and the first bytes can leave before the whole tree is rendered.
 *
 * Errors propagate out of the generator (after the chunks already yielded):
 * abort the response rather than end it, so a truncated page isn't taken as
 * complete. `onError` works as in render().
 *
 * @example
 * import { Readable } from 'node:stream';
 * Readable.from(renderToStream(Page())).pipe(res);
 *
 * @param {*} component - Component to render
 * @param {Object} [options] - render() options, plus `chunkSize` (default 8192)
 * @returns {AsyncGenerator<string>}
 */
export async function* renderToStream(component, options = {}) {
    const { chunkSize = 8192, ...renderOptions } = options;
    const renderer = new HTMLRenderer({ enableMonitoring: false, ...renderOptions, enableCache: false });
    const config = { ...renderer.config, seenObjects: new WeakSet() };

    assertNotThenable(component, 'root');
    if (config.validateInput && !renderer.isValidComponent(component)) {
        throw new Error('Invalid component structure');
    }

    // `minify` used to be ignored here, so the stream differed from render().
    const minifier = config.minify ? createStreamMinifier() : null;

    let buffer = '';
    for await (const piece of renderer.streamComponent(component, config, 0, null)) {
        buffer += minifier ? minifier.push(piece) : piece;
        if (buffer.length >= chunkSize) {
            yield buffer;
            buffer = '';
            await yieldToEventLoop();
        }
    }
    if (minifier) buffer += minifier.end();
    if (buffer) yield buffer;
}

const yieldToEventLoop = typeof setImmediate === 'function'
    ? () => new Promise((resolve) => setImmediate(resolve))
    : () => new Promise((resolve) => setTimeout(resolve, 0));

/**
 * Wait until `response` can take more data. Resolves `true` on 'drain' and
 * `false` when the response closes (or errors) first.
 */
function waitForDrain(response) {
    if (response.destroyed) return Promise.resolve(false);
    return new Promise((resolve) => {
        const settle = (drained) => () => {
            response.off('drain', onDrain);
            response.off('close', onClose);
            response.off('error', onClose);
            resolve(drained);
        };
        const onDrain = settle(true);
        const onClose = settle(false);
        response.on('drain', onDrain);
        response.on('close', onClose);
        response.on('error', onClose);
    });
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
     * Stream directly to a Node.js response, with backpressure.
     *
     * Resolves with the number of bytes written once the response has ended.
     * If the client disconnects first, rendering stops (the generator is
     * closed) and it resolves with the bytes written so far without ending
     * the response. If rendering fails, the response is destroyed and it
     * rejects with the rendering error.
     */
    async streamToResponse(chunkGenerator, response) {
        let totalBytes = 0;
        if (!response.headersSent && !response.getHeader?.('Content-Type')) {
            response.setHeader('Content-Type', 'text/html; charset=utf-8');
        }

        try {
            // Leaving the loop early closes the generator, so a client that
            // went away stops the render instead of leaving it suspended.
            for await (const chunk of chunkGenerator) {
                if (response.destroyed) return totalBytes;
                totalBytes += Buffer.byteLength(chunk);
                // Respect backpressure instead of buffering the whole page
                // in the socket when the client reads slowly. 'drain' never
                // comes once the client disconnects: waiting for it alone
                // left the promise (and the render) pending forever.
                if (!response.write(chunk) && !(await waitForDrain(response))) {
                    return totalBytes;
                }
            }
        } catch (error) {
            // Headers are gone: abort the connection so the client sees a
            // failed response, not a complete-looking truncated page.
            response.destroy(error);
            throw error;
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
    if (!RendererUtils.isStaticElement(component)) {
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
