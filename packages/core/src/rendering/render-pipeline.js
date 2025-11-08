/**
 * @fileoverview Rendering Pipeline Hooks for Coherent.js
 * Provides customizable rendering pipeline with hooks and middleware
 * @module @coherent.js/core/rendering/render-pipeline
 */

/**
 * @typedef {Object} RenderPipelineOptions
 * @property {Array<Function>} [beforeRender] - Hooks called before rendering
 * @property {Array<Function>} [afterRender] - Hooks called after rendering
 * @property {Array<Function>} [middleware] - Middleware functions
 * @property {Object<string, Function>} [customRenderers] - Custom element renderers
 * @property {boolean} [escapeHTML=true] - Escape HTML by default
 * @property {Function} [escapeFunction] - Custom HTML escape function
 * @property {boolean} [enableCache=false] - Enable render result caching
 * @property {Function} [shouldCache] - Function to determine if result should be cached
 * @property {boolean} [debug=false] - Enable debug logging
 * @property {Object} [performance] - Performance monitoring options
 */

/**
 * @typedef {Object} RenderContext
 * @property {Object} component - Component being rendered
 * @property {Object} props - Component props
 * @property {Object} state - Component state
 * @property {string} path - Component path in tree
 * @property {number} depth - Nesting depth
 * @property {Object} metadata - Custom metadata
 */

/**
 * Default HTML escape function
 * @param {string} str - String to escape
 * @returns {string} Escaped string
 */
function defaultEscapeHTML(str) {
  if (typeof str !== 'string') return str;
  return str
    .replace(/&/g, '&amp;')
    .replace(/</g, '&lt;')
    .replace(/>/g, '&gt;')
    .replace(/"/g, '&quot;')
    .replace(/'/g, '&#39;');
}

/**
 * Create render pipeline
 * @param {RenderPipelineOptions} options - Pipeline options
 * @returns {Object} Render pipeline
 */
export function createRenderPipeline(options = {}) {
  const opts = {
    beforeRender: [],
    afterRender: [],
    middleware: [],
    customRenderers: {},
    escapeHTML: true,
    escapeFunction: defaultEscapeHTML,
    enableCache: false,
    shouldCache: null,
    debug: false,
    performance: {
      enabled: false,
      logSlowRenders: false,
      threshold: 10
    },
    ...options
  };

  const cache = new Map();
  const stats = {
    renders: 0,
    cacheHits: 0,
    cacheMisses: 0,
    totalTime: 0,
    slowRenders: 0
  };

  /**
   * Execute hooks
   * @param {Array<Function>} hooks - Hooks to execute
   * @param {RenderContext} context - Render context
   * @returns {Promise<RenderContext>} Modified context
   */
  async function executeHooks(hooks, context) {
    let ctx = { ...context };
    for (const hook of hooks) {
      try {
        const result = await hook(ctx);
        if (result !== undefined) {
          ctx = { ...ctx, ...result };
        }
      } catch (error) {
        if (opts.debug) {
          console.error('Hook execution error:', error);
        }
        throw error;
      }
    }
    return ctx;
  }

  /**
   * Execute middleware
   * @param {Object} component - Component to render
   * @param {RenderContext} context - Render context
   * @returns {Promise<Object>} Modified component
   */
  async function executeMiddleware(component, context) {
    let comp = component;

    for (const middleware of opts.middleware) {
      try {
        const result = await middleware(comp, context);
        if (result !== undefined) {
          comp = result;
        }
      } catch (error) {
        if (opts.debug) {
          console.error('Middleware execution error:', error);
        }
        throw error;
      }
    }

    return comp;
  }

  /**
   * Render element
   * @param {Object} element - Element to render
   * @param {RenderContext} context - Render context
   * @returns {string} Rendered HTML
   */
  function renderElement(element, context) {
    if (!element || typeof element !== 'object') {
      return opts.escapeHTML ? opts.escapeFunction(String(element || '')) : String(element || '');
    }

    const tag = Object.keys(element)[0];
    const props = element[tag];

    // Use custom renderer if available
    if (opts.customRenderers[tag]) {
      return opts.customRenderers[tag](props, context, renderElement);
    }

    if (!props) {
      return `<${tag}></${tag}>`;
    }

    const attributes = [];
    let content = '';
    let selfClosing = false;

    // Self-closing tags
    const selfClosingTags = ['img', 'br', 'hr', 'input', 'meta', 'link', 'area', 'base', 'col', 'embed', 'param', 'source', 'track', 'wbr'];
    if (selfClosingTags.includes(tag)) {
      selfClosing = true;
    }

    Object.entries(props).forEach(([key, value]) => {
      if (key === 'children') {
        content = Array.isArray(value)
          ? value.map((child, idx) => renderElement(child, {
              ...context,
              path: `${context.path}.children[${idx}]`,
              depth: context.depth + 1
            })).join('')
          : renderElement(value, {
              ...context,
              path: `${context.path}.children`,
              depth: context.depth + 1
            });
      } else if (key === 'text') {
        content = opts.escapeHTML ? opts.escapeFunction(String(value)) : String(value);
      } else if (key === 'html') {
        content = String(value);
      } else if (key === 'dangerouslySetInnerHTML') {
        content = value.__html || '';
      } else if (!key.startsWith('on') && key !== 'ref' && key !== 'key') {
        // Skip event handlers and special props
        if (typeof value === 'boolean') {
          if (value) {
            attributes.push(key);
          }
        } else if (value !== null && value !== undefined) {
          const escapedValue = opts.escapeHTML ? opts.escapeFunction(String(value)) : String(value);
          attributes.push(`${key}="${escapedValue}"`);
        }
      }
    });

    const attrsStr = attributes.length > 0 ? ` ${  attributes.join(' ')}` : '';

    if (selfClosing) {
      return `<${tag}${attrsStr} />`;
    }

    return `<${tag}${attrsStr}>${content}</${tag}>`;
  }

  /**
   * Render component
   * @param {Object} component - Component to render
   * @param {Object} initialContext - Initial context
   * @returns {Promise<string>} Rendered HTML
   */
  async function render(component, initialContext = {}) {
    const startTime = opts.performance.enabled ? performance.now() : 0;

    stats.renders++;

    // Create render context
    let context = {
      component,
      props: initialContext.props || {},
      state: initialContext.state || {},
      path: initialContext.path || 'root',
      depth: initialContext.depth || 0,
      metadata: initialContext.metadata || {},
      ...initialContext
    };

    try {
      // Check cache
      if (opts.enableCache) {
        const cacheKey = JSON.stringify({ component, context });
        if (cache.has(cacheKey)) {
          stats.cacheHits++;
          if (opts.debug) {
            console.log('[RenderPipeline] Cache hit:', context.path);
          }
          return cache.get(cacheKey);
        }
        stats.cacheMisses++;
      }

      // Execute beforeRender hooks
      if (opts.beforeRender.length > 0) {
        context = await executeHooks(opts.beforeRender, context);
      }

      // Execute middleware
      let processedComponent = component;
      if (opts.middleware.length > 0) {
        processedComponent = await executeMiddleware(component, context);
      }

      // Render
      const result = renderElement(processedComponent, context);

      // Execute afterRender hooks
      if (opts.afterRender.length > 0) {
        context.result = result;
        const afterContext = await executeHooks(opts.afterRender, context);
        if (afterContext.result !== undefined) {
          const finalResult = afterContext.result;

          // Cache result
          if (opts.enableCache && (!opts.shouldCache || opts.shouldCache(processedComponent, context))) {
            const cacheKey = JSON.stringify({ component, context });
            cache.set(cacheKey, finalResult);
          }

          // Performance monitoring
          if (opts.performance.enabled) {
            const renderTime = performance.now() - startTime;
            stats.totalTime += renderTime;

            if (renderTime > opts.performance.threshold) {
              stats.slowRenders++;
              if (opts.performance.logSlowRenders) {
                console.warn(`[RenderPipeline] Slow render (${renderTime.toFixed(2)}ms):`, context.path);
              }
            }
          }

          return finalResult;
        }
      }

      // Cache result
      if (opts.enableCache && (!opts.shouldCache || opts.shouldCache(processedComponent, context))) {
        const cacheKey = JSON.stringify({ component, context });
        cache.set(cacheKey, result);
      }

      // Performance monitoring
      if (opts.performance.enabled) {
        const renderTime = performance.now() - startTime;
        stats.totalTime += renderTime;

        if (renderTime > opts.performance.threshold) {
          stats.slowRenders++;
          if (opts.performance.logSlowRenders) {
            console.warn(`[RenderPipeline] Slow render (${renderTime.toFixed(2)}ms):`, context.path);
          }
        }
      }

      return result;
    } catch (error) {
      if (opts.debug) {
        console.error('[RenderPipeline] Render error:', error, 'at', context.path);
      }
      throw error;
    }
  }

  /**
   * Add hook
   * @param {string} type - Hook type ('before' or 'after')
   * @param {Function} hook - Hook function
   */
  function addHook(type, hook) {
    if (type === 'before') {
      opts.beforeRender.push(hook);
    } else if (type === 'after') {
      opts.afterRender.push(hook);
    }
  }

  /**
   * Add middleware
   * @param {Function} middleware - Middleware function
   */
  function addMiddleware(middleware) {
    opts.middleware.push(middleware);
  }

  /**
   * Register custom renderer
   * @param {string} tag - Element tag
   * @param {Function} renderer - Renderer function
   */
  function registerRenderer(tag, renderer) {
    opts.customRenderers[tag] = renderer;
  }

  /**
   * Clear render cache
   */
  function clearCache() {
    cache.clear();
    if (opts.debug) {
      console.log('[RenderPipeline] Cache cleared');
    }
  }

  /**
   * Get render statistics
   * @returns {Object} Render stats
   */
  function getStats() {
    return {
      ...stats,
      averageRenderTime: stats.renders > 0 ? stats.totalTime / stats.renders : 0,
      cacheSize: cache.size,
      cacheHitRate: stats.renders > 0 ? (stats.cacheHits / stats.renders) * 100 : 0
    };
  }

  return {
    render,
    addHook,
    addMiddleware,
    registerRenderer,
    clearCache,
    getStats,
    get options() {
      return { ...opts };
    }
  };
}

/**
 * Common middleware functions
 */
export const middleware = {
  /**
   * Add class name middleware
   * @param {string|Function} className - Class name or function
   * @returns {Function} Middleware function
   */
  addClassName: (className) => (component, context) => {
    const tag = Object.keys(component)[0];
    const props = component[tag];

    const additionalClass = typeof className === 'function'
      ? className(component, context)
      : className;

    if (!additionalClass) return component;

    return {
      [tag]: {
        ...props,
        className: props.className
          ? `${props.className} ${additionalClass}`
          : additionalClass
      }
    };
  },

  /**
   * Add data attributes middleware
   * @param {Object|Function} attributes - Data attributes
   * @returns {Function} Middleware function
   */
  addDataAttributes: (attributes) => (component, context) => {
    const tag = Object.keys(component)[0];
    const props = component[tag];

    const attrs = typeof attributes === 'function'
      ? attributes(component, context)
      : attributes;

    return {
      [tag]: {
        ...props,
        ...attrs
      }
    };
  },

  /**
   * Wrap component middleware
   * @param {Function} wrapper - Wrapper function
   * @returns {Function} Middleware function
   */
  wrap: (wrapper) => (component, context) => {
    return wrapper(component, context);
  },

  /**
   * Conditional rendering middleware
   * @param {Function} condition - Condition function
   * @param {Function} transform - Transform function
   * @returns {Function} Middleware function
   */
  conditional: (condition, transform) => (component, context) => {
    if (condition(component, context)) {
      return transform(component, context);
    }
    return component;
  }
};

/**
 * Common hooks
 */
export const hooks = {
  /**
   * Performance monitoring hook
   * @returns {Function} Hook function
   */
  performanceMonitor: () => (context) => {
    const start = performance.now();
    context.metadata.renderStart = start;

    return {
      ...context,
      metadata: {
        ...context.metadata,
        renderStart: start
      }
    };
  },

  /**
   * Debug logging hook
   * @returns {Function} Hook function
   */
  debugLog: () => (context) => {
    const indent = '  '.repeat(context.depth);
    console.log(`${indent}[Render] ${context.path}`, context.component);
    return context;
  },

  /**
   * Metadata injection hook
   * @param {Object|Function} metadata - Metadata to inject
   * @returns {Function} Hook function
   */
  injectMetadata: (metadata) => (context) => {
    const meta = typeof metadata === 'function'
      ? metadata(context)
      : metadata;

    return {
      ...context,
      metadata: {
        ...context.metadata,
        ...meta
      }
    };
  }
};

/**
 * Create custom renderer
 * @param {Function} renderFunction - Custom render function
 * @returns {Function} Renderer function
 */
export function createCustomRenderer(renderFunction) {
  return (props, context, renderElement) => {
    return renderFunction(props, context, renderElement);
  };
}

/**
 * Common custom renderers
 */
export const customRenderers = {
  /**
   * Markdown renderer (basic)
   * @param {Object} props - Component props
   * @returns {string} Rendered HTML
   */
  markdown: (props) => {
    let content = props.text || props.children || '';

    // Basic markdown transformations
    content = content
      .replace(/^### (.*$)/gm, '<h3>$1</h3>')
      .replace(/^## (.*$)/gm, '<h2>$1</h2>')
      .replace(/^# (.*$)/gm, '<h1>$1</h1>')
      .replace(/\*\*(.*?)\*\*/g, '<strong>$1</strong>')
      .replace(/\*(.*?)\*/g, '<em>$1</em>')
      .replace(/\[(.*?)\]\((.*?)\)/g, '<a href="$2">$1</a>');

    return `<div class="markdown">${content}</div>`;
  },

  /**
   * Code block renderer with syntax highlighting markers
   * @param {Object} props - Component props
   * @returns {string} Rendered HTML
   */
  codeBlock: (props) => {
    const code = props.text || props.children || '';
    const language = props.language || 'javascript';

    return `<pre><code class="language-${language}">${defaultEscapeHTML(code)}</code></pre>`;
  },

  /**
   * Icon renderer
   * @param {Object} props - Component props
   * @returns {string} Rendered HTML
   */
  icon: (props) => {
    const name = props.name || '';
    const size = props.size || '24';
    const color = props.color || 'currentColor';

    return `<svg class="icon icon-${name}" width="${size}" height="${size}" fill="${color}"><use href="#icon-${name}"></use></svg>`;
  }
};

export default {
  createRenderPipeline,
  createCustomRenderer,
  middleware,
  hooks,
  customRenderers
};
