// Playground.js - Client-side Coherent.js component playground
import { makeHydratable, registerEventHandler } from "../../../src/client/hydration.js";
import { renderToDOM } from "../../../src/rendering/dom-renderer.js";
import { renderToString } from "../../../src/rendering/html-renderer.js";

console.log('Playground.js loaded, registering event handlers...');

// Global function to be called by button - this ensures it's always available
// Only define in browser environment (not during server-side build)
if (typeof window !== 'undefined') {
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
      previewEl.innerHTML = '';
      try {
        // Import the required functions dynamically
        import('../../../src/rendering/dom-renderer.js').then(({ renderToDOM }) => {
          renderToDOM(component, previewEl);
        }).catch(error => {
          console.error('Failed to import renderToDOM:', error);
          previewEl.innerHTML = html; // Fallback
        });
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
    
    // Render to HTML string
    import('../../../src/rendering/html-renderer.js').then(({ renderToString }) => {
      const html = renderToString(component);
      console.log('Generated HTML:', html);
      setSuccess(component, html);
    }).catch(error => {
      console.error('Failed to import renderToString:', error);
      setError('Failed to load rendering engine');
    });
    
  } catch (error) {
    console.error('Playground execution error:', error);
    setError(error.message);
  }
  };
}

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

// Old event handler removed - now using direct onclick handlers for better reliability

export function Playground() {

  return {
    section: {
      className: 'playground-container',
      children: [
        { h1: { text: 'Coherent.js Playground' } },
        { p: { text: 'Create and test Coherent.js components safely using JSON syntax. Define your component structure and see the live preview and generated HTML.' } },
        
        { div: { className: 'playground-controls', style: 'display:flex; gap:8px; align-items:center; flex-wrap:wrap; margin: 16px 0;', children: [
          { button: makeHydratable(() => ({ 
            id: 'run-btn', 
            className: 'button primary', 
            type: 'button', 
            'data-event': 'run',
            onclick: "window.runPlaygroundComponent && window.runPlaygroundComponent()",
            text: '▶ Run Component' 
          })) },
          { span: { style: 'margin-left: 12px; font-size: 14px; color: #666;', text: 'Tip: Press Ctrl+Enter to run' } }
        ] } },

        { div: { className: 'playground-grid', style: 'display: grid; grid-template-columns: 1fr 1fr; gap: 16px; margin-top: 16px;', children: [
          
          // Left column: Code editor
          { div: { className: 'editor-section', children: [
            { h3: { text: 'Component JSON', style: 'margin-bottom: 8px;' } },
            makeHydratable(() => ({
              textarea: { 
                id: 'code', 
                style: 'width:100%; height: 400px; font-family: ui-monospace, SFMono-Regular, Menlo, Monaco, Consolas, Liberation Mono, Courier New, monospace; font-size: 14px; line-height: 1.5; padding: 16px; border:1px solid var(--border-color,#ddd); border-radius:8px; resize: vertical;', 
                text: `{
  "div": {
    "style": "padding: 24px; font-family: system-ui, sans-serif; max-width: 600px;",
    "children": [
      { 
        "h1": { 
          "text": "Welcome to Coherent.js! 🚀",
          "style": "color: #7cc4ff; margin-bottom: 16px; font-weight: 700;"
        } 
      },
      { 
        "p": { 
          "text": "This is a safe component playground using JSON syntax. Edit and click Run!",
          "style": "color: #e6edf3; margin-bottom: 20px; line-height: 1.6;"
        } 
      },
      {
        "div": {
          "style": "background: linear-gradient(135deg, #667eea 0%, #764ba2 100%); color: white; padding: 20px; border-radius: 12px; text-align: center; margin-bottom: 20px;",
          "children": [
            { "h3": { "text": "Safe JSON Syntax", "style": "margin-bottom: 8px; font-weight: 600;" } },
            { "p": { "text": "No code execution - pure data-driven components" } }
          ]
        }
      },
      {
        "div": {
          "style": "padding: 20px; background: rgba(59, 247, 125, 0.1); border: 1px solid rgba(59, 247, 125, 0.3); border-radius: 12px; backdrop-filter: blur(12px);",
          "children": [
            { "strong": { "text": "Security Features:", "style": "color: #3bf77d; font-size: 16px;" } },
            { "ul": {
              "style": "margin: 12px 0 0 0; padding-left: 20px; color: #e6edf3;",
              "children": [
                { "li": { "text": "No arbitrary code execution", "style": "margin-bottom: 8px;" } },
                { "li": { "text": "Whitelisted HTML elements and properties", "style": "margin-bottom: 8px;" } },
                { "li": { "text": "Safe JSON parsing with validation" } }
              ]
            } }
          ]
        }
      }
    ]
  }
}`,
                oncreate: (element) => {
                  // Add Ctrl+Enter keyboard shortcut
                  element.addEventListener('keydown', (e) => {
                    if ((e.ctrlKey || e.metaKey) && e.key === 'Enter') {
                      e.preventDefault();
                      if (window.runPlaygroundComponent) {
                        window.runPlaygroundComponent();
                      }
                    }
                  });
                }
              }
            }))
          ] } },

          // Right column: Output sections
          { div: { className: 'output-section', children: [
            // Status
            { div: { className: 'status-section', style: 'margin-bottom: 16px;', children: [
              { h3: { text: 'Status', style: 'margin-bottom: 8px;' } },
              { div: { 
                id: 'output',
                className: 'output-status',
                style: 'padding: 12px; border-radius: 6px; background: #f3f4f6; color: #374151; font-size: 14px;',
                text: 'Ready to run your component...'
              } }
            ] } },

            // Tabbed Output
            makeHydratable(() => ({
              div: { 
                className: 'tabbed-output',
                style: 'flex: 1; display: flex; flex-direction: column;',
                children: [
                  // Tab buttons
                  { div: { 
                    className: 'tab-buttons',
                    style: 'display: flex; gap: 8px; margin-bottom: 16px;',
                    children: [
                      { button: { 
                        id: 'tab-preview',
                        className: 'tab-button active',
                        onclick: `
                          document.getElementById('tab-preview').classList.add('active');
                          document.getElementById('tab-html').classList.remove('active');
                          document.getElementById('panel-preview').style.display = 'block';
                          document.getElementById('panel-html').style.display = 'none';
                        `,
                        text: 'Live Preview'
                      } },
                      { button: { 
                        id: 'tab-html',
                        className: 'tab-button',
                        onclick: `
                          document.getElementById('tab-html').classList.add('active');
                          document.getElementById('tab-preview').classList.remove('active');
                          document.getElementById('panel-html').style.display = 'block';
                          document.getElementById('panel-preview').style.display = 'none';
                        `,
                        text: 'Generated HTML'
                      } }
                    ]
                  } },
                  
                  // Tab panels
                  { div: {
                    className: 'tab-panels',
                    style: 'flex: 1; position: relative;',
                    children: [
                      // Live Preview panel
                      { div: { 
                        id: 'panel-preview',
                        className: 'tab-panel',
                        style: 'display: block; height: 100%;',
                        children: [
                          { div: { 
                            id: 'preview',
                            style: 'border: 1px solid #e5e7eb; border-radius: 8px; padding: 16px; background: white; height: 100%; overflow: auto;',
                            text: 'Component preview will appear here...'
                          } }
                        ]
                      } },
                      
                      // Generated HTML panel
                      { div: { 
                        id: 'panel-html',
                        className: 'tab-panel',
                        style: 'display: none; height: 100%;',
                        children: [
                          { pre: { 
                            id: 'source',
                            style: 'background: #1f2937; color: #e5e7eb; padding: 16px; border-radius: 8px; height: 100%; overflow: auto; font-family: ui-monospace, monospace; font-size: 13px; line-height: 1.4; white-space: pre-wrap; margin: 0;',
                            text: 'Generated HTML will appear here...'
                          } }
                        ]
                      } }
                    ]
                  } }
                ]
              }
            }))

          ] } }

        ] } }
      ]
    }
  };
}
