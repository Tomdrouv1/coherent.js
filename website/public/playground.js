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
    if (outputEl) {
      outputEl.innerHTML = `
        <strong>✅ JavaScript executed successfully!</strong><br>
        <span style="color: #28a745;">Code ran through Coherent.js playground API</span>
      `;
      outputEl.className = 'output-success';
    }
    
    // Show output in preview - detect HTML and render it
    if (previewEl) {
      let output = '';
      
      // Check if stdout contains HTML (starts with < and ends with >)
      const htmlPattern = /^<[^>]+>.*<\/[^>]+>$/s;
      const isHTML = stdout && stdout.trim().match(htmlPattern);
      
      if (isHTML) {
        // Render HTML directly with a label
        output += `<div style="background: #e8f5e8; padding: 12px; border-radius: 6px; border: 1px solid #4CAF50; margin-bottom: 8px;">
          <strong>🎨 Rendered HTML:</strong><br>
          <div style="margin: 8px 0; padding: 12px; background: white; border: 1px solid #ddd; border-radius: 4px;">
            ${stdout.trim()}
          </div>
        </div>`;
        
        // Also show the raw HTML source
        output += `<div style="background: #f8f9fa; padding: 12px; border-radius: 6px; margin-bottom: 8px;">
          <strong>📄 HTML Source:</strong><br>
          <pre style="margin: 4px 0; font-family: monospace; white-space: pre-wrap; font-size: 12px; color: #666;">${escapeHtml(stdout)}</pre>
        </div>`;
      } else if (stdout) {
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
    
    // Show execution info in source panel
    if (sourceEl) {
      sourceEl.textContent = `// JavaScript Code Execution Results
// Executed via Coherent.js Playground API
// 
// STDOUT:
${stdout || '(no output)'}

// STDERR:
${stderr || '(no errors)'}`;
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
    
    // Get content from CodeMirror editor or fallback to textarea
    const userInput = window.getEditorContent ? window.getEditorContent().trim() : '';
    if (!userInput) {
      setError('No component definition provided');
      return;
    }

    console.log('User input:', userInput);

    // Check if this looks like JavaScript code and handle accordingly
    if (userInput.includes('import ') || userInput.includes('require(') || userInput.includes('export ') || userInput.includes('function ') || userInput.includes('const ') || userInput.includes('//')) {
      // This is JavaScript code - run it through the playground API
      updateRunButton(true);
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


// Initialize when DOM is ready
if (document.readyState === 'loading') {
  document.addEventListener('DOMContentLoaded', () => {
    // Initialize CodeMirror editor first
    if (window.initializePlaygroundEditor) {
      window.initializePlaygroundEditor();
    }
    // Then load example if needed
    loadExampleFromURL();
  });
} else {
  // Initialize CodeMirror editor first
  if (window.initializePlaygroundEditor) {
    window.initializePlaygroundEditor();
  }
  // Then load example if needed
  loadExampleFromURL();
}

console.log('Playground functionality loaded successfully!');