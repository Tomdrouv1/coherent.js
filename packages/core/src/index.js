/**
 * Coherent.js - Object-Based Rendering Framework
 * A pure JavaScript framework for server-side rendering using natural object syntax
 *
 * @author Coherent Framework Team
 * @license MIT
 */


// Performance monitoring
import { readFileSync } from 'node:fs';
import { performanceMonitor } from './performance/monitor.js';
import { escapeHtml, createTrustedContent } from './core/html-utils.js';

// Unified HTML renderer
import { render as renderWithHtmlRenderer } from './rendering/html-renderer.js';

// Component system imports
import {
  withState,
  withStateUtils,
  createStateManager,
  createComponent,
  defineComponent,
  registerComponent,
  getComponent,
  getRegisteredComponents,
  lazy,
  isLazy,
  evaluateLazy,
  memo as memoWithOptions
} from './components/component-system.js';

// Component lifecycle imports
import {
  ComponentLifecycle,
  LIFECYCLE_PHASES,
  withLifecycle,
  createLifecycleHooks,
  useHooks,
  componentUtils as lifecycleUtils
} from './components/lifecycle.js';

// Object factory imports
import {
  createElement,
  createTextNode,
  h
} from './core/object-factory.js';

// Component cache imports
import {
  ComponentCache,
  createComponentCache,
  memoize
} from './performance/component-cache.js';

// Error boundary imports
import {
  createErrorBoundary,
  createErrorFallback,
  withErrorBoundary,
  createAsyncErrorBoundary,
  GlobalErrorHandler,
  createGlobalErrorHandler
} from './components/error-boundary.js';

// CSS Scoping System (similar to Angular View Encapsulation)

/**
 * Scope id derived from the component's CSS (FNV-1a), so the same component
 * renders the same HTML every time. A global counter used to give it coh-0,
 * then coh-1..., which broke HTML caching and hydration comparisons. Two
 * components with identical CSS may share an id; their rules are the same.
 */
function generateScopeId(cssText) {
  let hash = 0x811c9dc5;
  for (let i = 0; i < cssText.length; i++) {
    hash ^= cssText.charCodeAt(i);
    hash = Math.imul(hash, 0x01000193);
  }
  return `coh-${(hash >>> 0).toString(36)}`;
}

// At-rules whose blocks contain style rules; others (@keyframes,
// @font-face, @page, @property...) contain declarations or keyframe
// selectors and are left untouched.
const GROUPING_AT_RULES = new Set(['media', 'supports', 'container', 'layer', 'document', 'scope']);

function splitSelectorList(prelude) {
  const parts = [];
  let depth = 0;
  let start = 0;
  for (let i = 0; i < prelude.length; i++) {
    const ch = prelude[i];
    if (ch === '(' || ch === '[') depth++;
    else if (ch === ')' || ch === ']') depth--;
    else if (ch === ',' && depth === 0) {
      parts.push(prelude.slice(start, i));
      start = i + 1;
    }
  }
  parts.push(prelude.slice(start));
  return parts;
}

function scopeSelector(selector, scopeId) {
  const trimmed = selector.trim();
  if (!trimmed) return selector;

  // Handle pseudo-selectors and complex selectors
  if (trimmed.includes(':')) {
    return trimmed.replace(/([^:]+)(:.*)?/, `$1[${scopeId}]$2`);
  }

  // Simple selector scoping
  return `${trimmed}[${scopeId}]`;
}

/**
 * Add the scope attribute to every selector in a stylesheet, recursing into
 * grouping at-rules. The previous regex treated `@media (max-width: 600px)`
 * and keyframe selectors (`from`, `50%`) as selectors and corrupted them.
 */
function scopeCSS(css, scopeId) {
  if (!css || typeof css !== 'string') return css;

  let result = '';
  let i = 0;
  while (i < css.length) {
    const open = css.indexOf('{', i);
    if (open === -1) {
      result += css.slice(i);
      break;
    }

    let depth = 1;
    let j = open + 1;
    while (j < css.length && depth > 0) {
      if (css[j] === '{') depth++;
      else if (css[j] === '}') depth--;
      j++;
    }
    const body = css.slice(open + 1, depth === 0 ? j - 1 : j);

    // Statements before the rule (`@import ...;`) pass through verbatim.
    const rawPrelude = css.slice(i, open);
    const semicolon = rawPrelude.lastIndexOf(';');
    const lead = semicolon === -1 ? '' : rawPrelude.slice(0, semicolon + 1);
    const prelude = semicolon === -1 ? rawPrelude : rawPrelude.slice(semicolon + 1);
    const trimmed = prelude.trim();

    if (trimmed.startsWith('@')) {
      const name = trimmed.slice(1).split(/[\s({]/)[0].toLowerCase();
      const inner = GROUPING_AT_RULES.has(name) ? scopeCSS(body, scopeId) : body;
      result += `${lead}${prelude}{${inner}}`;
    } else {
      const leading = prelude.match(/^\s*/)[0];
      const scoped = splitSelectorList(prelude).map((part) => scopeSelector(part, scopeId)).join(', ');
      result += `${lead}${leading}${scoped} {${body}}`;
    }

    i = j;
  }
  return result;
}

function applyScopeToElement(element, scopeId) {
  if (typeof element === 'string' || typeof element === 'number' || !element) {
    return element;
  }

  if (Array.isArray(element)) {
    return element.map(item => applyScopeToElement(item, scopeId));
  }

  if (typeof element === 'object') {
    const scoped = {};

    for (const [tagName, props] of Object.entries(element)) {
      if (typeof props === 'object' && props !== null) {
        const scopedProps = { ...props };

        // Add scope attribute to the element
        scopedProps[scopeId] = '';

        // Recursively scope children
        if (scopedProps.children) {
          scopedProps.children = applyScopeToElement(scopedProps.children, scopeId);
        }

        scoped[tagName] = scopedProps;
      } else {
        // For simple text content elements, keep them as is
        // Don't add scope attributes to text-only elements
        scoped[tagName] = props;
      }
    }

    return scoped;
  }

  return element;
}

/**
 * Mark content as safe/trusted to skip HTML escaping
 * USE WITH EXTREME CAUTION - only for developer-controlled content
 * NEVER use with user input!
 *
 * @param {string} content - Trusted content (e.g., inline scripts/styles)
 * @returns {Object} Marked safe content
 */
export function dangerouslySetInnerContent(content) {
  return createTrustedContent(content);
}

export { isTrustedContent, isValidAttributeName } from './core/html-utils.js';

// Hydration attribute injection
function injectHydrationAttributes(component, options) {
  if (!component || typeof component !== 'object' || Array.isArray(component)) {
    return component;
  }

  const tagName = Object.keys(component)[0];
  if (!tagName) return component;

  const props = component[tagName];
  if (typeof props !== 'object' || props === null) return component;

  const injected = { ...props };

  if (options.hydratable) {
    injected['data-hydratable'] = 'true';
  }

  if (options.island) {
    injected['data-coherent-island'] = 'true';
  }

  if (options._islandComponentName) {
    injected['data-coherent-island-component'] = options._islandComponentName;
  }

  return { [tagName]: injected };
}

/**
 * Island wrapper - marks a component for island-based hydration
 * @param {Function} componentFn - A function component to wrap as an island
 * @returns {Function} Wrapped component that renders with island attributes
 */
export function Island(componentFn) {
  const componentName = componentFn.name || 'Anonymous';

  return function IslandComponent(props) {
    const result = componentFn(props);
    return injectHydrationAttributes(result, {
      island: true,
      _islandComponentName: componentName
    });
  };
}

// Main rendering function
export function render(obj, options = {}) {
  const scoped = options.scoped ?? options.encapsulate ?? false;

  const { scoped: _scoped, encapsulate: _encapsulate, hydratable: _hydratable, island: _island, ...rendererOptions } = options;

  // Handle function components passed directly to render. Called before
  // scoping: scoping a function was a no-op, so render(Fn, { scoped: true })
  // came out unscoped.
  let component = typeof obj === 'function' ? obj(options) : obj;

  if (scoped) {
    component = renderScopedComponent(component);
  }

  // Inject hydration attributes if needed
  if (_hydratable || _island) {
    component = injectHydrationAttributes(component, { hydratable: _hydratable, island: _island });
  }

  return renderWithHtmlRenderer(component, rendererOptions);
}

function collectStyleText(element, out = []) {
  if (Array.isArray(element)) {
    element.forEach((item) => collectStyleText(item, out));
  } else if (element && typeof element === 'object') {
    for (const [tagName, props] of Object.entries(element)) {
      if (tagName === 'style' && props && typeof props === 'object' && typeof props.text === 'string') {
        out.push(props.text);
      } else if (props && typeof props === 'object' && props.children) {
        collectStyleText(props.children, out);
      }
    }
  }
  return out;
}

// Internal: Scoped rendering with CSS encapsulation
function renderScopedComponent(component) {
  const scopeId = generateScopeId(collectStyleText(component).join('\n'));

  // Handle style elements specially
  function processScopedElement(element) {
    if (!element || typeof element !== 'object') {
      return element;
    }

    if (Array.isArray(element)) {
      return element.map(processScopedElement);
    }

    const result = {};

    for (const [tagName, props] of Object.entries(element)) {
      if (tagName === 'style' && typeof props === 'object' && props.text) {
        // Scope CSS within style tags
        result[tagName] = {
          ...props,
          text: scopeCSS(props.text, scopeId)
        };
      } else if (typeof props === 'object' && props !== null) {
        // Recursively process children
        const scopedProps = { ...props };
        if (scopedProps.children) {
          scopedProps.children = processScopedElement(scopedProps.children);
        }
        result[tagName] = scopedProps;
      } else {
        result[tagName] = props;
      }
    }

    return result;
  }

  // First process styles, then apply scope attributes
  const processedComponent = processScopedElement(component);
  const scopedComponent = applyScopeToElement(processedComponent, scopeId);

  return scopedComponent;
}

// Component system - Re-export from component-system for unified API
export {
  Component,
  withState,
  withStateUtils,
  createStateManager,
  createComponent,
  createHOC,
  defineComponent,
  memoComponent,
  registerComponent,
  getComponent,
  getRegisteredComponents,
  lazy,
  isLazy,
  evaluateLazy
} from './components/component-system.js';

// HTML utilities. escapeHtml is also imported below for the default export;
// index.js used to carry a second copy that escaped ' as &#x27; instead of
// &#39;, so the package shipped two different escapers.
export {
  escapeHtml,
  isVoidElement,
  formatAttributes
} from './core/html-utils.js';

// Cache management
export {
  cacheManager,
  createCacheManager
} from './performance/cache-manager.js';

// Component lifecycle exports
export {
  ComponentLifecycle,
  LIFECYCLE_PHASES,
  withLifecycle,
  createLifecycleHooks,
  useHooks,
  componentUtils as lifecycleUtils
} from './components/lifecycle.js';

// Object factory exports
export {
  createElement,
  createTextNode,
  h
} from './core/object-factory.js';

// Component cache exports
export {
  ComponentCache,
  createComponentCache,
  memoize
} from './performance/component-cache.js';

// Error boundaries
export {
  createErrorBoundary,
  createErrorFallback,
  withErrorBoundary,
  createAsyncErrorBoundary,
  GlobalErrorHandler,
  createGlobalErrorHandler
};

export {
  renderWithMonitoring,
  renderWithTemplate,
  renderComponentFactory,
  isCoherentComponent,
  createErrorResponse
} from './utils/render-utils.js';

export {
  isPeerDependencyAvailable,
  importPeerDependency,
  createLazyIntegration,
  checkPeerDependencies
} from './utils/dependency-utils.js';

export {
  hasChildren,
  normalizeChildren
} from './core/object-utils.js';

// HTML nesting validation exports
export {
  validateNesting,
  FORBIDDEN_CHILDREN,
  HTMLNestingError
} from './core/html-nesting-rules.js';

/**
 * Memoize a component (or any function). Each memoized function has its own
 * cache: this used to be one module-level Map keyed only by props, so two
 * components called with the same props returned each other's output.
 *
 * @param {Function} component - Component or function to memoize
 * @param {Function|Object} [options] - Key function `(props) => key`, or
 *   options `{ keyFn, maxSize, strategy, ttl, stats, onHit, onMiss, onEvict }`
 * @returns {Function} Memoized function with `clear()`, `has()`, `size()`...
 */
export function memo(component, options = {}) {
  // Components receive `{}` when called without props, as they always have.
  const withDefaultProps = (props = {}, ...rest) => component(props, ...rest);
  if (typeof options === 'function') {
    const keyGenerator = options;
    return memoWithOptions(withDefaultProps, { keyFn: (props = {}, ...rest) => keyGenerator(props, ...rest) });
  }
  return memoWithOptions(withDefaultProps, options);
}

export function validateComponent(obj) {
  if (!obj || typeof obj !== 'object') {
    throw new Error('Component must be an object');
  }
  return true;
}

export function isCoherentObject(obj) {
  return obj && typeof obj === 'object' && !Array.isArray(obj);
}

export function deepClone(obj) {
  if (obj === null || typeof obj !== 'object') return obj;
  if (obj instanceof Date) return new Date(obj);
  if (Array.isArray(obj)) return obj.map(deepClone);

  const cloned = {};
  for (const [key, value] of Object.entries(obj)) {
    cloned[key] = deepClone(value);
  }
  return cloned;
}

/* global __COHERENT_VERSION__ */
// Substituted with the manifest version by esbuild `define` at build time
// (a literal, so it works in both the ESM and CJS bundles); the fallback
// covers running from source inside the monorepo.
export const VERSION = typeof __COHERENT_VERSION__ !== 'undefined'
  ? __COHERENT_VERSION__
  : JSON.parse(readFileSync(new URL('../package.json', import.meta.url), 'utf8')).version;

// Performance monitoring export
export { performanceMonitor };

// Shadow DOM exports
export { shadowDOM };

// Import Shadow DOM functionality
import * as shadowDOM from './shadow-dom.js';

// Event system imports and exports
import eventSystemDefault, {
    EventBus,
    createEventBus,
    globalEventBus,
    emit,
    emitSync,
    on,
    once,
    off,
    registerAction,
    handleAction,
    DOMEventIntegration,
    globalDOMIntegration,
    initializeDOMIntegration,
    withEventBus,
    withEventState,
    createActionHandlers,
    createEventHandlers,
    createEventComponent
} from './events/index.js';

export {
    eventSystemDefault as eventSystem,
    EventBus,
    createEventBus,
    globalEventBus,
    emit,
    emitSync,
    on,
    once,
    off,
    registerAction,
    handleAction,
    DOMEventIntegration,
    globalDOMIntegration,
    initializeDOMIntegration,
    withEventBus,
    withEventState,
    createActionHandlers,
    createEventHandlers,
    createEventComponent
};

// Enhanced FP composition tools
export { hoc, compose } from './components/enhanced-composition.js';

/**
 * Functional programming utilities
 */
export const fp = {
  /**
   * Curried map: fp.map(fn)(array)
   */
  map(fn) {
    return (array) => array.map(fn);
  }
};

// Note: Forms have been moved to @coherent.js/forms package

// Default export
const coherent = {
  // Core rendering
  render,

  // Shadow DOM (client-side only)
  shadowDOM,

  // Component system
  createComponent,
  defineComponent,
  registerComponent,
  getComponent,
  getRegisteredComponents,
  lazy,
  isLazy,
  evaluateLazy,

  // Component lifecycle
  ComponentLifecycle,
  LIFECYCLE_PHASES,
  withLifecycle,
  createLifecycleHooks,
  useHooks,
  lifecycleUtils,

  // Object factory
  createElement,
  createTextNode,
  h,

  // Component cache
  ComponentCache,
  createComponentCache,
  memoize,

  // State management
  withState,
  withStateUtils,
  createStateManager,
  memo,

  // Error boundaries
  createErrorBoundary,
  createErrorFallback,
  withErrorBoundary,
  createAsyncErrorBoundary,
  GlobalErrorHandler,
  createGlobalErrorHandler,

  // Event system
  eventSystem: eventSystemDefault,
  emit,
  emitSync,
  on,
  once,
  off,
  registerAction,
  handleAction,
  withEventBus,
  withEventState,

  // Utilities
  validateComponent,
  isCoherentObject,
  deepClone,
  escapeHtml,
  performanceMonitor,
  VERSION
};

export default coherent;
