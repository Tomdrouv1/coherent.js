/**
 * HTML-specific utility functions
 */

export function escapeHtml(text) {
  if (typeof text !== 'string') return text;

  return text
    .replace(/&/g, '&amp;')
    .replace(/</g, '&lt;')
    .replace(/>/g, '&gt;')
    .replace(/"/g, '&quot;')
    .replace(/'/g, '&#39;');
}

export function unescapeHtml(text) {
  if (typeof text !== 'string') return text;

  return text
    .replace(/&quot;/g, '"')
    .replace(/&#39;/g, "'")
    .replace(/&gt;/g, '>')
    .replace(/&lt;/g, '<')
    .replace(/&amp;/g, '&');
}

export function isVoidElement(tagName) {
  // Ensure tagName is a string before processing
  if (typeof tagName !== 'string') {
    return false;
  }

  const voidElements = new Set([
    'area',
    'base',
    'br',
    'col',
    'embed',
    'hr',
    'img',
    'input',
    'link',
    'meta',
    'param',
    'source',
    'track',
    'wbr',
  ]);
  return voidElements.has(tagName.toLowerCase());
}

export function formatAttributes(props) {
  let formatted = '';
  for (const key in props) {
    if (props.hasOwnProperty(key)) {
      let value = props[key];

      // Convert className to class for HTML output
      const attributeName = key === 'className' ? 'class' : key;

      // Handle function values - for event handlers, use data-action attributes
      if (typeof value === 'function') {
        // Check if this is an event handler (starts with 'on')
        if (attributeName.startsWith('on')) {
          // For event handlers, create a unique action identifier
          const actionId = `__coherent_action_${Date.now()}_${Math.random().toString(36).substr(2, 9)}`;
          const DEBUG = (typeof process !== 'undefined' && process && process.env && (process.env.COHERENT_DEBUG === '1' || process.env.NODE_ENV === 'development'))
            || (typeof window !== 'undefined' && window && window.COHERENT_DEBUG === true);
          
          // Store the function in a global registry that will be available during hydration
          // Check if we're in Node.js or browser environment
          if (typeof global !== 'undefined') {
            // Server-side, store in global for hydration
            if (!global.__coherentActionRegistry) {
              global.__coherentActionRegistry = {};
              if (DEBUG) console.log('Initialized global action registry');
            }
            global.__coherentActionRegistry[actionId] = value;
            if (DEBUG) console.log(`Added action ${actionId} to global registry, total: ${Object.keys(global.__coherentActionRegistry).length}`);
            if (DEBUG) console.log(`Global registry keys: ${Object.keys(global.__coherentActionRegistry).join(', ')}`);
            
            // Log the global object to see if it's being reset
            if (DEBUG) {
              if (typeof global.__coherentActionRegistryLog === 'undefined') {
                global.__coherentActionRegistryLog = [];
              }
              global.__coherentActionRegistryLog.push({
                action: 'add',
                actionId: actionId,
                timestamp: Date.now(),
                registrySize: Object.keys(global.__coherentActionRegistry).length
              });
            }
          } else if (typeof window !== 'undefined') {
            // Browser-side, store in window
            if (!window.__coherentActionRegistry) {
              window.__coherentActionRegistry = {};
              if (DEBUG) console.log('Initialized window action registry');
            }
            window.__coherentActionRegistry[actionId] = value;
            if (DEBUG) console.log(`Added action ${actionId} to window registry, total: ${Object.keys(window.__coherentActionRegistry).length}`);
            if (DEBUG) console.log(`Window registry keys: ${Object.keys(window.__coherentActionRegistry).join(', ')}`);
          }
          
          // Use data-action and data-event attributes instead of inline JS
          const eventType = attributeName.substring(2); // Remove 'on' prefix
          formatted += ` data-action="${actionId}" data-event="${eventType}"`;
          continue; // Skip normal processing
        } else {
          // For other function attributes, call them to get the value
          try {
            value = value();
          } catch (error) {
            console.warn(`Error executing function for attribute '${key}':`, {
              error: error.message,
              stack: error.stack,
              attributeKey: key,
            });
            // Consider different fallback strategies based on attribute type
            value = '';
          }
        }
      }

      if (value === true) {
        formatted += ` ${attributeName}`;
      } else if (value !== false && value !== null && value !== undefined) {
        formatted += ` ${attributeName}="${escapeHtml(String(value))}"`;
      }
    }
  }
  return formatted.trim();
}

export function minifyHtml(html, options = {}) {
  if (!options.minify) return html;

  return (
    html
      // Remove comments
      .replace(/<!--[\s\S]*?-->/g, '')
      // Remove extra whitespace
      .replace(/\s+/g, ' ')
      // Remove whitespace around tags
      .replace(/>\s+</g, '><')
      // Remove leading/trailing whitespace
      .trim()
  );
}

/**
 * HTML Void Elements - elements that cannot have children
 * These elements are self-closing and don't need closing tags
 */
export const voidElements = new Set([
  'area',
  'base',
  'br',
  'col',
  'embed',
  'hr',
  'img',
  'input',
  'link',
  'meta',
  'param',
  'source',
  'track',
  'wbr',
]);
