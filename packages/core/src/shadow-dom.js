/**
 * Shadow DOM Component System for Coherent.js
 * Provides true style encapsulation using native Shadow DOM
 */

// Check if Shadow DOM is supported
export function isShadowDOMSupported() {
  if (typeof window === 'undefined') return false;
  if (typeof window.Element === 'undefined') return false;
  
  return 'attachShadow' in window.Element.prototype && 
         'getRootNode' in window.Element.prototype;
}

// Create a Shadow DOM component
export function createShadowComponent(element, componentDef, options = {}) {
  if (!isShadowDOMSupported()) {
    throw new Error('Shadow DOM is not supported in this environment');
  }
  
  const shadowRoot = element.attachShadow({ 
    mode: options.mode || 'closed',
    delegatesFocus: options.delegatesFocus || false
  });
  
  // Extract and inject styles
  const styles = extractStyles(componentDef);
  if (styles && typeof window !== 'undefined' && window.document) {
    const styleElement = window.document.createElement('style');
    styleElement.textContent = styles;
    shadowRoot.appendChild(styleElement);
  }
  
  // Render component content
  const content = renderToShadowDOM(componentDef);
  shadowRoot.innerHTML += content;
  
  return shadowRoot;
}

// Extract CSS from component definition
function extractStyles(componentDef) {
  let allStyles = '';
  
  function extractFromElement(element) {
    if (!element || typeof element !== 'object') return;
    
    if (Array.isArray(element)) {
      element.forEach(extractFromElement);
      return;
    }
    
    for (const [tagName, props] of Object.entries(element)) {
      if (tagName === 'style' && typeof props === 'object' && props.text) {
        allStyles += `${props.text  }\n`;
      } else if (typeof props === 'object' && props !== null) {
        if (props.children) {
          extractFromElement(props.children);
        }
      }
    }
  }
  
  extractFromElement(componentDef);
  return allStyles;
}

// Render component content for Shadow DOM (without style tags)
function renderToShadowDOM(componentDef) {
  function stripStyles(element) {
    if (!element || typeof element !== 'object') return element;
    
    if (Array.isArray(element)) {
      return element.map(stripStyles);
    }
    
    const result = {};
    for (const [tagName, props] of Object.entries(element)) {
      // Skip style elements - they're handled separately
      if (tagName === 'style') continue;
      
      if (typeof props === 'object' && props !== null) {
        const cleanProps = { ...props };
        if (cleanProps.children) {
          cleanProps.children = stripStyles(cleanProps.children);
        }
        result[tagName] = cleanProps;
      } else {
        result[tagName] = props;
      }
    }
    
    return result;
  }
  
  const cleanComponent = stripStyles(componentDef);
  
  // Import renderRaw from main module (avoiding circular deps)
  // This would need to be properly imported in real usage
  return renderComponentContent(cleanComponent);
}

// Simple DOM-based rendering for Shadow DOM content
function renderComponentContent(obj) {
  if (obj === null || obj === undefined) return '';
  if (typeof obj === 'string' || typeof obj === 'number') {
    return escapeHTML(String(obj));
  }
  if (Array.isArray(obj)) {
    return obj.map(renderComponentContent).join('');
  }
  
  if (typeof obj !== 'object') return escapeHTML(String(obj));

  // Handle text content
  if (obj.text !== undefined) {
    return escapeHTML(String(obj.text));
  }

  // Handle HTML elements
  for (const [tagName, props] of Object.entries(obj)) {
    if (typeof props === 'object' && props !== null) {
      const { children, text, ...attributes } = props;
      
      // Build attributes string
      const attrsStr = Object.entries(attributes)
        .filter(([, value]) => value !== null && value !== undefined && value !== false)
        .map(([key, value]) => {
          const attrName = key === 'className' ? 'class' : key;
          if (value === true) return attrName;
          return `${attrName}="${escapeHTML(String(value))}"`;
        })
        .join(' ');
      
      const openTag = attrsStr ? `<${tagName} ${attrsStr}>` : `<${tagName}>`;
      
      // Handle void elements
      if (['area', 'base', 'br', 'col', 'embed', 'hr', 'img', 'input',
           'link', 'meta', 'param', 'source', 'track', 'wbr'].includes(tagName)) {
        return openTag.replace('>', ' />');
      }
      
      let content = '';
      if (text !== undefined) {
        content = escapeHTML(String(text));
      } else if (children) {
        content = renderComponentContent(children);
      }
      
      return `${openTag}${content}</${tagName}>`;
    } else if (typeof props === 'string') {
      const content = escapeHTML(props);
      return `<${tagName}>${content}</${tagName}>`;
    }
  }

  return '';
}

function escapeHTML(text) {
  if (typeof window === 'undefined' || !window.document) {
    // Server-side fallback
    return String(text)
      .replace(/&/g, '&amp;')
      .replace(/</g, '&lt;')
      .replace(/>/g, '&gt;')
      .replace(/"/g, '&quot;')
      .replace(/'/g, '&#39;');
  }
  const div = window.document.createElement('div');
  div.textContent = text;
  return div.innerHTML;
}

// Hybrid rendering: Shadow DOM on client, scoped on server
export function renderWithBestEncapsulation(componentDef, containerElement = null) {
  if (isShadowDOMSupported() && containerElement) {
    // Use Shadow DOM for true isolation
    return createShadowComponent(containerElement, componentDef);
  } else {
    // Fallback to scoped rendering
    // This would import from main module in real usage
    console.warn('Shadow DOM not available, falling back to scoped rendering');
    return null; // Would return scoped render result
  }
}

export default {
  isShadowDOMSupported,
  createShadowComponent,
  renderWithBestEncapsulation
};