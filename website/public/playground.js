// Coherent.js Playground with Browser Runtime
console.log('Loading Coherent.js playground functionality...');

// ================================
// COHERENT.JS BROWSER RUNTIME
// ================================

// Global Coherent.js object for playground use
window.Coherent = window.Coherent || {};

// Core rendering functions
window.Coherent.renderToString = function(component) {
  return browserRenderToString(component);
};

window.Coherent.renderToDOM = function(component, container) {
  return browserRenderToDOM(component, container);
};

// Component composition utilities
window.Coherent.component = function(name, fn) {
  window.Coherent.components = window.Coherent.components || {};
  window.Coherent.components[name] = fn;
  return fn;
};

window.Coherent.getComponent = function(name) {
  return window.Coherent.components && window.Coherent.components[name];
};

// State management (simplified for browser)
window.Coherent.useState = function(initialValue) {
  let value = initialValue;
  const setValue = (newValue) => {
    value = typeof newValue === 'function' ? newValue(value) : newValue;
    // In a real implementation, this would trigger re-renders
    console.log('State updated:', value);
    return value;
  };
  return [() => value, setValue];
};

// Effect hook (simplified)
window.Coherent.useEffect = function(effect, dependencies) {
  // In a real implementation, this would handle side effects and cleanup
  console.log('Effect registered');
  try {
    return effect();
  } catch (error) {
    console.error('Effect error:', error);
  }
};

// Utility functions
window.Coherent.createElement = function(tag, props = {}, ...children) {
  const element = { [tag]: { ...props } };
  if (children.length > 0) {
    element[tag].children = children.flat();
  }
  return element;
};

window.Coherent.Fragment = function({ children }) {
  return Array.isArray(children) ? children : [children];
};

// Global aliases for convenience
window.renderToString = window.Coherent.renderToString;
window.renderToDOM = window.Coherent.renderToDOM;
window.component = window.Coherent.component;
window.useState = window.Coherent.useState;
window.useEffect = window.Coherent.useEffect;
window.createElement = window.Coherent.createElement;

console.log('Coherent.js browser runtime loaded - functions available globally');

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

// HTML escaping utilities
function escapeHtmlAttribute(value) {
  if (value == null) return '';
  return String(value)
    .replace(/&/g, '&amp;')
    .replace(/"/g, '&quot;')
    .replace(/'/g, '&#39;')
    .replace(/</g, '&lt;')
    .replace(/>/g, '&gt;');
}

function escapeHtmlText(value) {
  if (value == null) return '';
  return String(value)
    .replace(/&/g, '&amp;')
    .replace(/</g, '&lt;')
    .replace(/>/g, '&gt;');
}

// Simple browser-compatible renderToString function
function browserRenderToString(component) {
  if (!component) return '';
  if (typeof component === 'string') return escapeHtmlText(component);
  if (typeof component === 'number' || typeof component === 'boolean') return escapeHtmlText(String(component));
  if (Array.isArray(component)) return component.map(browserRenderToString).join('');
  
  if (typeof component === 'object') {
    const tagName = Object.keys(component)[0];
    const props = component[tagName] || {};
    
    if (typeof props === 'string') {
      return `<${tagName}>${escapeHtmlText(props)}</${tagName}>`;
    }
    
    let html = `<${tagName}`;
    
    // Add attributes
    Object.keys(props).forEach(key => {
      if (key !== 'children' && key !== 'text' && key !== 'html') {
        const value = props[key];
        if (value != null) {
          html += ` ${key}="${escapeHtmlAttribute(value)}"`;
        }
      }
    });
    
    html += '>';
    
    // Add text content (escaped)
    if (props.text) {
      html += escapeHtmlText(props.text);
    }
    
    // Add raw HTML content (not escaped - use with caution)
    if (props.html) {
      html += props.html;
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
  if (!container) {
    console.error('browserRenderToDOM: No container element provided');
    return;
  }
  
  try {
    const html = browserRenderToString(component);
    console.log('Generated HTML for DOM:', html);
    container.innerHTML = html;
  } catch (error) {
    console.error('browserRenderToDOM: Error rendering component to DOM:', error);
    container.innerHTML = `<div style="color: red; padding: 16px; border: 1px solid red; border-radius: 4px;">
      <strong>Rendering Error:</strong><br>
      ${escapeHtmlText(error.message)}
    </div>`;
  }
}

// Update run button based on content type
function updateRunButton(isJavaScript = false) {
  const runBtn = document.getElementById('run-btn');
  if (runBtn) {
    if (isJavaScript) {
      runBtn.textContent = '🚀 Execute Code';
      runBtn.title = 'Run JavaScript/Coherent.js code through playground API';
    } else {
      runBtn.textContent = '▶ Run Component';
      runBtn.title = 'Render JSON component definition';
    }
  }
}

// Function to run JavaScript code through the playground API
async function runJavaScriptCode(code) {
  const outputEl = document.getElementById('output');
  const previewEl = document.getElementById('preview');
  const sourceEl = document.getElementById('source');
  
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
    if (previewEl) previewEl.innerHTML = '<p style="color: #dc3545;">JavaScript execution failed. Check the error above.</p>';
    if (sourceEl) sourceEl.textContent = '';
  };

  const setSuccess = (stdout, stderr) => {
    // Check if stdout contains HTML (detect <html> specifically)
    const isHTML = stdout && stdout.trim().startsWith('<html') && stdout.trim().includes('</html>');
    
    console.log('JavaScript execution result analysis:', {
      stdout: stdout ? `${stdout.substring(0, 100)  }...` : '(no stdout)',
      isHTML: isHTML,
      startsWithHtml: stdout ? stdout.trim().startsWith('<html') : false,
      includesEndHtml: stdout ? stdout.trim().includes('</html>') : false
    });
    
    if (outputEl) {
      outputEl.innerHTML = `
        <strong>✅ JavaScript executed successfully!</strong><br>
        <span style="color: #28a745;">Code ran through Coherent.js playground API</span>
      `;
      outputEl.className = 'output-success';
    }
    
    // Show output in preview - detect HTML and render it
    if (previewEl) {
      if (isHTML) {
        // Render HTML directly in the preview (Live Preview mode)
        previewEl.innerHTML = stdout.trim();
      } else {
        // Show regular console output
        let output = '';
        
        if (stdout) {
          // Regular console output
          output += `<div style="background: #f8f9fa; padding: 12px; border-radius: 6px; margin-bottom: 8px;">
            <strong>📝 Console Output:</strong><br>
            <pre style="margin: 4px 0; font-family: monospace; white-space: pre-wrap;">${escapeHtml(stdout)}</pre>
          </div>`;
        }
        
        if (stderr) {
          output += `<div style="background: #fff3cd; padding: 12px; border-radius: 6px; border: 1px solid #ffeaa7;">
            <strong>⚠️ Warnings/Errors:</strong><br>
            <pre style="margin: 4px 0; font-family: monospace; white-space: pre-wrap; color: #856404;">${escapeHtml(stderr)}</pre>
          </div>`;
        }
        
        if (!output) {
          output = '<p style="color: #6c757d; font-style: italic;">Code executed but produced no output.</p>';
        }
        
        previewEl.innerHTML = output;
      }
    }
    
    // Show execution info in source panel
    if (sourceEl) {
      if (isHTML) {
        // For HTML output, show formatted HTML source
        sourceEl.textContent = stdout || '(no HTML output)';
      } else {
        // For regular console output, show execution info
        sourceEl.textContent = `// JavaScript Code Execution Results
// Executed via Coherent.js Playground API
// 
// STDOUT:
${stdout || '(no output)'}

// STDERR:
${stderr || '(no errors)'}`;
      }
    }
  };

  try {
    setStatus('Executing JavaScript code...');
    
    const response = await fetch('/__playground/run', {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json'
      },
      body: JSON.stringify({
        runtime: 'node',
        code: code
      })
    });
    
    if (!response.ok) {
      throw new Error(`Server error: ${response.statusText}`);
    }
    
    const result = await response.json();
    console.log('JavaScript execution result:', result);
    
    if (result.code !== 0) {
      setError(`Execution failed with exit code ${result.code}:\n${result.stderr || 'Unknown error'}`);
    } else {
      setSuccess(result.stdout, result.stderr);
    }
    
  } catch (error) {
    console.error('JavaScript execution error:', error);
    setError(error.message);
  }
}

function escapeHtml(text) {
  const div = document.createElement('div');
  div.textContent = text;
  return div.innerHTML;
}

// Try to execute JavaScript code locally as Coherent.js component
function tryLocalCoherentExecution(code) {
  const outputEl = document.getElementById('output');
  const previewEl = document.getElementById('preview');
  const sourceEl = document.getElementById('source');
  
  try {
    // Check if this looks like a component or contains imports/requires
    if (code.includes('import ') || code.includes('require(') || code.includes('export ')) {
      // Contains imports/exports - can't execute locally
      return false;
    }
    
    // Set status
    if (outputEl) {
      outputEl.textContent = 'Executing JavaScript locally...';
      outputEl.className = 'output-status';
    }
    
    // Capture console output
    const originalLog = console.log;
    const originalError = console.error;
    const logs = [];
    
    console.log = (...args) => {
      logs.push({ type: 'log', args });
      originalLog.apply(console, args);
    };
    
    console.error = (...args) => {
      logs.push({ type: 'error', args });
      originalError.apply(console, args);
    };
    
    let result = null;
    let component = null;
    
    try {
      // Execute the code in a controlled scope with Coherent.js functions available
      const wrappedCode = `
        (function() {
          ${code}
        }).call(window)
      `;
      
      result = eval(wrappedCode);
      
      // If result looks like a Coherent.js component, render it
      if (result && typeof result === 'object' && !Array.isArray(result)) {
        const firstKey = Object.keys(result)[0];
        // Check if this looks like a Coherent.js component object
        if (firstKey && typeof firstKey === 'string' && result[firstKey] && 
            (typeof result[firstKey] === 'object' || typeof result[firstKey] === 'string')) {
          component = result;
        }
      }
      
    } catch (evalError) {
      console.error('Local execution error:', evalError);
      return false; // Let server handle it
    } finally {
      // Restore console
      console.log = originalLog;
      console.error = originalError;
    }
    
    // Display results
    if (outputEl) {
      outputEl.innerHTML = `
        <strong>✅ JavaScript executed locally!</strong><br>
        <span style="color: #28a745;">Executed in browser with Coherent.js runtime</span>
      `;
      outputEl.className = 'output-success';
    }
    
    // Show component in preview
    if (component && previewEl) {
      try {
        browserRenderToDOM(component, previewEl);
        
        // Show generated HTML in source
        if (sourceEl) {
          const html = browserRenderToString(component);
          sourceEl.textContent = html;
        }
      } catch (renderError) {
        console.error('Component render error:', renderError);
        if (previewEl) {
          previewEl.innerHTML = `<div style="color: #dc3545; padding: 16px;">
            <strong>Render Error:</strong><br>
            ${escapeHtmlText(renderError.message)}
          </div>`;
        }
      }
    } else {
      // Show console output
      if (previewEl) {
        let output = '';
        
        if (logs.length > 0) {
          output += '<div style="background: #f8f9fa; padding: 12px; border-radius: 6px; margin-bottom: 8px;">';
          output += '<strong>📝 Console Output:</strong><br>';
          output += '<pre style="margin: 4px 0; font-family: monospace; white-space: pre-wrap;">';
          logs.forEach(log => {
            const text = log.args.map(arg => 
              typeof arg === 'object' ? JSON.stringify(arg, null, 2) : String(arg)
            ).join(' ');
            output += `${log.type === 'error' ? '❌' : '📄'} ${escapeHtmlText(text)}\n`;
          });
          output += '</pre></div>';
        }
        
        if (result !== null && result !== undefined) {
          output += '<div style="background: #e8f5e8; padding: 12px; border-radius: 6px;">';
          output += '<strong>↩️ Return Value:</strong><br>';
          output += '<pre style="margin: 4px 0; font-family: monospace; white-space: pre-wrap;">';
          output += escapeHtmlText(typeof result === 'object' ? JSON.stringify(result, null, 2) : String(result));
          output += '</pre></div>';
        }
        
        if (!output) {
          output = '<p style="color: #6c757d; font-style: italic;">Code executed successfully but produced no output.</p>';
        }
        
        previewEl.innerHTML = output;
      }
      
      // Show execution info in source
      if (sourceEl) {
        sourceEl.textContent = `// Local JavaScript Execution Results
// Executed in browser with Coherent.js runtime available
//
// Console logs: ${logs.length}
// Return value: ${result !== null && result !== undefined ? typeof result : 'undefined'}
//
${logs.length > 0 ? `// Console Output:\n${  logs.map(log => 
  `// ${  log.args.map(arg => typeof arg === 'object' ? JSON.stringify(arg) : String(arg)).join(' ')}`
).join('\n')}` : '// No console output'}`;
      }
    }
    
    return true; // Successfully executed locally
    
  } catch (error) {
    console.error('Local execution failed:', error);
    return false; // Let server handle it
  }
}

// Global playground function
window.runPlaygroundComponent = function() {
  console.log('runPlaygroundComponent called!');
  
  const outputEl = document.getElementById('output');
  const previewEl = document.getElementById('preview');
  const sourceEl = document.getElementById('source');
  
  console.log('Elements found:', { outputEl, previewEl, sourceEl });
  console.log('Editor available:', !!window.getEditorContent);
  
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
    console.log('setSuccess called with:', { component, html });
    
    if (outputEl) {
      outputEl.textContent = 'Component rendered successfully!';
      outputEl.className = 'output-success';
    }
    
    // Clear and render the preview
    if (previewEl) {
      console.log('Rendering to preview element:', previewEl);
      try {
        browserRenderToDOM(component, previewEl);
        console.log('Preview element after rendering:', previewEl.innerHTML);
      } catch (domError) {
        console.error('DOM render error, using HTML fallback:', domError);
        previewEl.innerHTML = html; // Fallback to HTML
      }
    } else {
      console.error('Preview element not found!');
    }
    
    // Show the generated HTML source
    if (sourceEl) {
      sourceEl.textContent = html;
      console.log('Source element updated with HTML');
    } else {
      console.error('Source element not found!');
    }
  };

  try {
    setStatus('Parsing component...');
    
    // Get content from CodeMirror editor or fallback to textarea
    const userInput = window.getEditorContent ? window.getEditorContent().trim() : '';
    if (!userInput) {
      setError('No component definition provided');
      return;
    }

    console.log('User input:', userInput);

    // Enhanced JavaScript detection and execution
    const isJavaScript = 
      userInput.includes('function ') || 
      userInput.includes('const ') || 
      userInput.includes('let ') || 
      userInput.includes('var ') ||
      userInput.includes('=>') ||
      userInput.includes('//') ||
      userInput.includes('/*') ||
      userInput.match(/^\s*\/\//m) || // Comments at start of line
      userInput.includes('import ') || 
      userInput.includes('require(') || 
      userInput.includes('export ');

    if (isJavaScript) {
      updateRunButton(true);
      
      // Try to execute as Coherent.js component locally first
      if (tryLocalCoherentExecution(userInput)) {
        return;
      }
      
      // Fallback to server-side execution
      runJavaScriptCode(userInput);
      return;
    }
    
    // This is JSON - reset button text
    updateRunButton(false);

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

// Handle URL parameters to load example files
function loadExampleFromURL() {
  const urlParams = new URLSearchParams(window.location.search);
  const fileName = urlParams.get('file');
  
  console.log('Current URL:', window.location.href);
  console.log('URL search params:', window.location.search);
  console.log('Parsed fileName:', fileName);
  
  if (fileName) {
    console.log('Loading example file:', fileName);
    loadExampleFile(fileName);
  } else {
    console.log('No file parameter found in URL');
  }
}

async function loadExampleFile(fileName) {
  const outputEl = document.getElementById('output');
  
  console.log('loadExampleFile called with:', fileName);
  console.log('Editor available:', !!window.setEditorContent);
  console.log('Output element found:', !!outputEl);
  
  if (!window.setEditorContent) {
    console.error('CodeMirror editor not available when loading example');
    return;
  }
  
  try {
    if (outputEl) {
      outputEl.textContent = `Loading example: ${fileName}...`;
      outputEl.className = 'output-status';
    }
    
    const apiUrl = `/api/example/${fileName}`;
    console.log('Fetching from URL:', apiUrl);
    
    let response = await fetch(apiUrl);
    console.log('Response status:', response.status);
    console.log('Response ok:', response.ok);
    
    // If API fails, try direct static file access as fallback
    if (!response.ok) {
      console.log('API failed, trying direct static file access...');
      const staticUrl = `/examples/${fileName}`;
      console.log('Trying static URL:', staticUrl);
      response = await fetch(staticUrl);
      console.log('Static response status:', response.status);
    }
    
    if (!response.ok) {
      const errorText = await response.text();
      console.log('Final error response text:', errorText);
      throw new Error(`Failed to load ${fileName}: ${response.statusText}. Make sure the server is running.`);
    }
    
    const exampleCode = await response.text();
    console.log('Loaded example code length:', exampleCode.length);
    
    // Paste the actual example code directly into the CodeMirror editor
    window.setEditorContent(exampleCode);
    
    // Detect if this is JavaScript code and update UI accordingly
    const isJavaScript = exampleCode.includes('import ') || exampleCode.includes('require(') || 
                        exampleCode.includes('export ') || exampleCode.includes('function ') || 
                        exampleCode.includes('const ') || exampleCode.includes('//');
    
    updateRunButton(isJavaScript);
    
    if (outputEl) {
      if (isJavaScript) {
        outputEl.innerHTML = `
          <strong>📄 Loaded ${fileName}</strong><br>
          <span style="color: #3b82f6;">🚀 JavaScript/Coherent.js code loaded!</span><br>
          <span style="color: #6b7280;">Click "<strong>🚀 Execute Code</strong>" to run this code in the playground, or run locally with: <code style="background: #000; color: #3bf77d; padding: 2px 4px; border-radius: 3px;">node examples/${fileName}</code></span>
        `;
      } else {
        outputEl.innerHTML = `
          <strong>📄 Loaded ${fileName}</strong><br>
          <span style="color: #059669;">📝 Code file loaded for editing</span><br>
          <span style="color: #6b7280;">You can edit this code and run it locally with: <code style="background: #000; color: #3bf77d; padding: 2px 4px; border-radius: 3px;">node examples/${fileName}</code></span>
        `;
      }
      outputEl.className = 'output-status';
    }
    
  } catch (error) {
    console.error('Error loading example file:', error);
    if (outputEl) {
      outputEl.textContent = `Error loading ${fileName}: ${error.message}`;
      outputEl.className = 'output-error';
    }
  }
}


// Initialize when DOM is ready (editor is initialized by codemirror-editor.js)
if (document.readyState === 'loading') {
  document.addEventListener('DOMContentLoaded', () => {
    // Just load example if needed (editor initializes itself)
    setTimeout(() => loadExampleFromURL(), 200);
  });
} else {
  // Just load example if needed (editor initializes itself)
  setTimeout(() => loadExampleFromURL(), 200);
}

console.log('Playground functionality loaded successfully!');

// Add dropdown close functionality when DOM is ready
setTimeout(() => {
  document.addEventListener('click', function(e) {
    const menu = document.getElementById('templates-menu');
    const btn = document.getElementById('templates-btn');
    if (menu && btn && !btn.contains(e.target) && !menu.contains(e.target)) {
      menu.style.display = 'none';
    }
  });
}, 1000);
