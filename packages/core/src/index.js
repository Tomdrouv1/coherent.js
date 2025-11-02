/**
 * Coherent.js - Object-Based Rendering Framework
 * A pure JavaScript framework for server-side rendering using natural object syntax
 *
 * @version 2.0.0
 * @author Coherent Framework Team  
 * @license MIT
 */

// Performance monitoring
import { performanceMonitor } from './performance/monitor.js';

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
  evaluateLazy
} from './components/component-system.js';

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
const scopeCounter = { value: 0 };

function generateScopeId() {
  return `coh-${scopeCounter.value++}`;
}

function scopeCSS(css, scopeId) {
  if (!css || typeof css !== 'string') return css;
  
  // Add scope attribute to all selectors
  return css
    .replace(/([^{}]*)\s*{/g, (match, selector) => {
      // Handle multiple selectors separated by commas
      const selectors = selector.split(',').map(s => {
        const trimmed = s.trim();
        if (!trimmed) return s;
        
        // Handle pseudo-selectors and complex selectors
        if (trimmed.includes(':')) {
          return trimmed.replace(/([^:]+)(:.*)?/, `$1[${scopeId}]$2`);
        }
        
        // Simple selector scoping
        return `${trimmed}[${scopeId}]`;
      });
      
      return `${selectors.join(', ')} {`;
    });
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

// Core HTML utilities
function escapeHtml(text) {
  if (typeof text !== 'string') return text;
  return text
    .replace(/&/g, '&amp;')
    .replace(/</g, '&lt;')
    .replace(/>/g, '&gt;')
    .replace(/"/g, '&quot;')
    .replace(/'/g, '&#x27;');
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
  return {
    __html: content,
    __trusted: true
  };
}

/**
 * Check if content is marked as safe
 */
function isTrustedContent(value) {
  return value && typeof value === 'object' && value.__trusted === true && typeof value.__html === 'string';
}

function isVoidElement(tagName) {
  const voidElements = new Set([
    'area', 'base', 'br', 'col', 'embed', 'hr', 'img', 'input',
    'link', 'meta', 'param', 'source', 'track', 'wbr'
  ]);
  return voidElements.has(tagName.toLowerCase());
}

function formatAttributes(attrs) {
  if (!attrs || typeof attrs !== 'object') return '';
  
  return Object.entries(attrs)
    .filter(([, value]) => value !== null && value !== undefined && value !== false)
    .map(([key, value]) => {
      // Execute functions to get the actual value
      if (typeof value === 'function') {
        value = value();
      }
      
      // Convert className to class
      const attrName = key === 'className' ? 'class' : key;
      if (value === true) return attrName;
      return `${attrName}="${escapeHtml(String(value))}"`;
    })
    .join(' ');
}

// Internal raw rendering (no encapsulation) - used by scoped renderer
function renderRaw(obj) {
  if (obj === null || obj === undefined) return '';
  if (typeof obj === 'string' || typeof obj === 'number') return escapeHtml(String(obj));
  if (Array.isArray(obj)) return obj.map(renderRaw).join('');
  
  // Handle functions (like context providers)
  if (typeof obj === 'function') {
    const result = obj(renderRaw);
    return renderRaw(result);
  }
  
  if (typeof obj !== 'object') return escapeHtml(String(obj));

  // Handle text content
  if (obj.text !== undefined) {
    return escapeHtml(String(obj.text));
  }

  // Handle HTML elements
  for (const [tagName, props] of Object.entries(obj)) {
    if (typeof props === 'object' && props !== null) {
      const { children, text, ...attributes } = props;
      const attrsStr = formatAttributes(attributes);
      const openTag = attrsStr ? `<${tagName} ${attrsStr}>` : `<${tagName}>`;
      
      if (isVoidElement(tagName)) {
        return openTag.replace('>', ' />');
      }
      
      let content = '';
      if (text !== undefined) {
        // Check if content is explicitly marked as trusted
        if (isTrustedContent(text)) {
          content = text.__html;
        } else {
          content = escapeHtml(String(text));
        }
      } else if (children) {
        content = renderRaw(children);
      }
      
      return `${openTag}${content}</${tagName}>`;
    } else if (typeof props === 'string') {
      // Simple text content - always escape unless explicitly marked as trusted
      const content = isTrustedContent(props) ? props.__html : escapeHtml(props);
      return isVoidElement(tagName) ? `<${tagName} />` : `<${tagName}>${content}</${tagName}>`;
    }
  }

  return '';
}

// Main rendering function
export function render(obj, options = {}) {
  const { scoped = false } = options;

  // Scoped mode - use CSS encapsulation
  if (scoped) {
    return renderScopedComponent(obj);
  }

  // Default: unscoped rendering
  return renderRaw(obj);
}

// Internal: Scoped rendering with CSS encapsulation
function renderScopedComponent(component) {
  const scopeId = generateScopeId();
  
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
  
  return renderRaw(scopedComponent);
}

// Component system - Re-export from component-system for unified API
export { 
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
  evaluateLazy
} from './components/component-system.js';

// Error boundaries
export {
  createErrorBoundary,
  createErrorFallback,
  withErrorBoundary,
  createAsyncErrorBoundary,
  GlobalErrorHandler,
  createGlobalErrorHandler
} from './components/error-boundary.js';

// Simple memoization
const memoCache = new Map();

export function memo(component, keyGenerator) {
  return function MemoizedComponent(props = {}) {
    const key = keyGenerator ? keyGenerator(props) : JSON.stringify(props);
    
    if (memoCache.has(key)) {
      return memoCache.get(key);
    }
    
    const result = component(props);
    memoCache.set(key, result);
    
    // Simple cache cleanup - keep only last 100 items
    if (memoCache.size > 100) {
      const firstKey = memoCache.keys().next().value;
      memoCache.delete(firstKey);
    }
    
    return result;
  };
}

// Utility functions
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

// Version info
export const VERSION = '2.0.0';

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

// Form system imports and exports
import { createForm, formValidators } from './forms/forms.js';

export {
    createForm,
    formValidators
};

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

  // Form system
  createForm,
  formValidators,

  // Utilities
  validateComponent,
  isCoherentObject,
  deepClone,
  escapeHtml,
  performanceMonitor,
  VERSION
};

export default coherent;