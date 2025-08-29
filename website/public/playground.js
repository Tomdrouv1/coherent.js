// Playground functionality - loaded as a separate script
console.log('Loading playground functionality...');

// Safe component parser - converts JSON to Coherent.js components
function parseComponentJSON(jsonString) {
  try {
    const parsed = JSON.parse(jsonString);
    return validateAndNormalizeComponent(parsed);
  } catch (error) {
    throw new Error(`Invalid JSON: ${error.message}`);
  }
}

function validateAndNormalizeComponent(obj) {
  if (obj === null || obj === undefined) {
    return null;
  }
  
  if (typeof obj === 'string' || typeof obj === 'number' || typeof obj === 'boolean') {
    return obj;
  }
  
  if (Array.isArray(obj)) {
    return obj.map(item => validateAndNormalizeComponent(item));
  }
  
  if (typeof obj === 'object') {
    const result = {};
    for (const [key, value] of Object.entries(obj)) {
      // Only allow safe HTML elements and properties
      if (isSafeElement(key) || isSafeProperty(key)) {
        result[key] = validateAndNormalizeComponent(value);
      }
    }
    return result;
  }
  
  return obj;
}

function isSafeElement(tagName) {
  const safeTags = [
    'div', 'span', 'p', 'h1', 'h2', 'h3', 'h4', 'h5', 'h6',
    'ul', 'ol', 'li', 'em', 'strong', 'a', 'img', 'br',
    'section', 'article', 'header', 'footer', 'nav', 'main',
    'button', 'input', 'select', 'option', 'textarea', 'form',
    'table', 'tr', 'td', 'th', 'thead', 'tbody', 'tfoot'
  ];
  return safeTags.includes(tagName.toLowerCase());
}

function isSafeProperty(propName) {
  const safeProps = [
    'text', 'children', 'style', 'className', 'class', 'id',
    'href', 'src', 'alt', 'title', 'placeholder', 'value',
    'type', 'name', 'for', 'colspan', 'rowspan'
  ];
  return safeProps.includes(propName);
}

// Simple browser-compatible renderToString function
function browserRenderToString(component) {
  if (!component) return '';
  if (typeof component === 'string') return component;
  if (typeof component === 'number' || typeof component === 'boolean') return String(component);
  if (Array.isArray(component)) return component.map(browserRenderToString).join('');
  
  if (typeof component === 'object') {
    const tagName = Object.keys(component)[0];
    const props = component[tagName] || {};
    
    if (typeof props === 'string') return `<${tagName}>${props}</${tagName}>`;
    
    let html = `<${tagName}`;
    
    // Add attributes
    Object.keys(props).forEach(key => {
      if (key !== 'children' && key !== 'text') {
        html += ` ${key}="${props[key]}"`;
      }
    });
    
    html += '>';
    
    // Add text content
    if (props.text) {
      html += props.text;
    }
    
    // Add children
    if (props.children) {
      if (Array.isArray(props.children)) {
        html += props.children.map(browserRenderToString).join('');
      } else {
        html += browserRenderToString(props.children);
      }
    }
    
    html += `</${tagName}>`;
    return html;
  }
  
  return '';
}

// Simple DOM renderer
function browserRenderToDOM(component, container) {
  if (!container) return;
  
  const html = browserRenderToString(component);
  container.innerHTML = html;
}

// Global playground function
window.runPlaygroundComponent = function() {
  console.log('runPlaygroundComponent called!');
  
  const codeEl = document.getElementById('code');
  const outputEl = document.getElementById('output');
  const previewEl = document.getElementById('preview');
  const sourceEl = document.getElementById('source');
  
  console.log('Elements found:', { codeEl, outputEl, previewEl, sourceEl });
  
  if (!codeEl) {
    console.error('Code element not found!');
    return;
  }
  
  const setStatus = (message) => {
    if (outputEl) {
      outputEl.textContent = message;
      outputEl.className = 'output-status';
    }
  };

  const setError = (message) => {
    if (outputEl) {
      outputEl.textContent = `Error: ${message}`;
      outputEl.className = 'output-error';
    }
    if (previewEl) previewEl.innerHTML = '';
    if (sourceEl) sourceEl.textContent = '';
  };

  const setSuccess = (component, html) => {
    if (outputEl) {
      outputEl.textContent = 'Component rendered successfully!';
      outputEl.className = 'output-success';
    }
    
    // Clear and render the preview
    if (previewEl) {
      try {
        browserRenderToDOM(component, previewEl);
      } catch (domError) {
        console.error('DOM render error:', domError);
        previewEl.innerHTML = html; // Fallback to HTML
      }
    }
    
    // Show the generated HTML source
    if (sourceEl) {
      sourceEl.textContent = html;
    }
  };

  try {
    setStatus('Parsing component...');
    
    const userInput = codeEl.value.trim();
    if (!userInput) {
      setError('No component definition provided');
      return;
    }

    console.log('User input:', userInput);

    // Parse the JSON component definition safely
    const component = parseComponentJSON(userInput);
    console.log('Parsed component:', component);
    
    if (!component) {
      setError('Component definition is empty');
      return;
    }
    
    setStatus('Rendering component...');
    
    // Render to HTML string using browser-compatible function
    const html = browserRenderToString(component);
    console.log('Generated HTML:', html);
    setSuccess(component, html);
    
  } catch (error) {
    console.error('Playground execution error:', error);
    setError(error.message);
  }
};

console.log('Playground functionality loaded successfully!');