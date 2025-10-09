/**
 * Coherent.js - Object-Based Rendering Framework
 * A pure JavaScript framework for server-side rendering using natural object syntax
 *
 * @version 1.1.1
 * @author Coherent Framework Team  
 * @license MIT
 */

// Performance monitoring
import { performanceMonitor } from './performance/monitor.js';

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
        content = escapeHtml(String(text));
      } else if (children) {
        content = renderRaw(children);
      }
      
      return `${openTag}${content}</${tagName}>`;
    } else if (typeof props === 'string') {
      // Simple text content
      const content = escapeHtml(props);
      return isVoidElement(tagName) ? `<${tagName} />` : `<${tagName}>${content}</${tagName}>`;
    }
  }

  return '';
}

// Core rendering function with optional encapsulation (default: enabled)
export function renderToString(obj, options = { encapsulate: true }) {
  // Use scoped rendering by default for better isolation
  if (options.encapsulate !== false) {
    return renderScopedComponent(obj);
  }
  
  return renderRaw(obj);
}

// Explicit unsafe rendering (opt-out of encapsulation)
export function renderUnsafe(obj) {
  return renderRaw(obj);
}

// Scoped rendering with CSS encapsulation
export function renderScopedComponent(component) {
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

// Alias for renderToString
export function renderHTML(obj) {
  return renderToString(obj);
}

// Synchronous version (same as renderHTML for now)
export function renderHTMLSync(obj) {
  return renderToString(obj);
}

// Scoped version
export function renderScopedHTML(obj) {
  return renderScopedComponent(obj);
}

// Simple state management
const componentState = new Map();

export function withState(initialStateOrComponent, maybeInitialState) {
  // Support both API styles:
  // 1. withState(initialState)(component) - curried
  // 2. withState(component, initialState) - direct
  
  if (typeof initialStateOrComponent === 'function') {
    // Direct style: withState(component, initialState)
    const component = initialStateOrComponent;
    const initialState = maybeInitialState || {};
    
    return function StatefulComponent(props = {}) {
      const stateKey = component.name || 'anonymous';
      
      if (!componentState.has(stateKey)) {
        componentState.set(stateKey, { ...initialState });
      }
      
      const state = componentState.get(stateKey);
      
      const setState = (newState) => {
        componentState.set(stateKey, { ...state, ...newState });
      };
      
      const stateUtils = {
        setState,
        getState: () => componentState.get(stateKey),
        resetState: () => componentState.set(stateKey, { ...initialState }),
        updateState: (updater) => {
          const currentState = componentState.get(stateKey);
          const newState = typeof updater === 'function' ? updater(currentState) : updater;
          componentState.set(stateKey, { ...currentState, ...newState });
        },
        batchUpdate: (updates) => {
          const currentState = componentState.get(stateKey);
          componentState.set(stateKey, { ...currentState, ...updates });
        }
      };

      return component({
        ...props,
        state,
        setState,
        stateUtils
      });
    };
  } else {
    // Curried style: withState(initialState)(component)
    const initialState = initialStateOrComponent || {};
    
    return function withStateHOC(component) {
      if (typeof component !== 'function') {
        throw new Error('withState: component must be a function');
      }
      
      return function StatefulComponent(props = {}) {
        const stateKey = component.name || 'anonymous';
        
        if (!componentState.has(stateKey)) {
          componentState.set(stateKey, { ...initialState });
        }
        
        const state = componentState.get(stateKey);
        
        const setState = (newState) => {
          componentState.set(stateKey, { ...state, ...newState });
        };
        
        const stateUtils = {
          setState,
          getState: () => componentState.get(stateKey),
          resetState: () => componentState.set(stateKey, { ...initialState }),
          updateState: (updater) => {
            const currentState = componentState.get(stateKey);
            const newState = typeof updater === 'function' ? updater(currentState) : updater;
            componentState.set(stateKey, { ...currentState, ...newState });
          },
          batchUpdate: (updates) => {
            const currentState = componentState.get(stateKey);
            componentState.set(stateKey, { ...currentState, ...updates });
          }
        };

        return component({
          ...props,
          state,
          setState,
          stateUtils
        });
      };
    };
  }
}

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
export const VERSION = '1.1.1';

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
  // Core rendering (encapsulated by default)
  renderToString,
  renderHTML,
  renderHTMLSync,

  // Explicit encapsulation control
  renderScopedComponent,
  renderScopedHTML,
  renderUnsafe,

  // Shadow DOM (client-side only)
  shadowDOM,

  // State management
  withState,
  memo,

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