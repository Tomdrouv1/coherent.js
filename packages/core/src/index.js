/**
 * Coherent.js - Object-Based Rendering Framework
 * A pure JavaScript framework for server-side rendering using natural object syntax
 *
 * @version 1.1.1
 * @author Coherent Framework Team  
 * @license MIT
 */

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
    .filter(([key, value]) => value !== null && value !== undefined && value !== false)
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

// Core rendering function
export function renderToString(obj) {
  if (obj === null || obj === undefined) return '';
  if (typeof obj === 'string' || typeof obj === 'number') return escapeHtml(String(obj));
  if (Array.isArray(obj)) return obj.map(renderToString).join('');
  
  // Handle functions (like context providers)
  if (typeof obj === 'function') {
    const result = obj(renderToString);
    return renderToString(result);
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
        content = renderToString(children);
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

// Alias for renderToString
export function renderHTML(obj) {
  return renderToString(obj);
}

// Synchronous version (same as renderHTML for now)
export function renderHTMLSync(obj) {
  return renderToString(obj);
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

// Default export
const coherent = {
  renderToString,
  renderHTML,
  renderHTMLSync,
  withState,
  memo,
  validateComponent,
  isCoherentObject,
  deepClone,
  escapeHtml,
  VERSION
};

export default coherent;