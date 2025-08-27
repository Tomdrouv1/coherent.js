// Playground.js - custom Node/Deno/Bun runner using local Coherent.js
import { makeHydratable, registerEventHandler } from "../../../src/client/hydration.js";

// Register the run handler
registerEventHandler('run', async function(event, state, setState) {
  const codeEl = document.getElementById('code');
  const outEl = document.getElementById('output');
  const runtimeEl = document.getElementById('runtime');
  
  const setOut = (text) => {
    outEl.textContent = text;
    // Auto-scroll to bottom
    outEl.scrollTop = outEl.scrollHeight;
  };

  try {
    setOut('Running...');
    
    const response = await fetch('/api/run-code', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({
        runtime: runtimeEl.value,
        code: codeEl.value
      })
    });

    if (!response.ok) {
      const error = await response.text();
      throw new Error(`Server error: ${response.status} - ${error}`);
    }

    // First try to get the response as text
    const responseText = await response.text();
    
    // Check if the response is HTML
    if (responseText.trim().startsWith('<')) {
      outEl.innerHTML = responseText;
      return;
    }
    
    // Otherwise, try to parse as JSON
    try {
      const result = JSON.parse(responseText);
      
      if (result.exitCode !== 0) {
        throw new Error(result.stderr || 'An error occurred during execution');
      }
      
      // Display the rendered HTML
      outEl.innerHTML = result.stdout || '';
    } catch (e) {
      // If parsing as JSON fails, show the raw output
      console.error('Failed to parse response as JSON:', e);
      outEl.textContent = responseText;
    }
  } catch (error) {
    setOut(`Error: ${error.message}`);
    console.error('Execution error:', error);
  }
});

export function Playground() {
  // Define the run function in component scope
  const run = `
    const codeEl = document.getElementById('code');
    const outEl = document.getElementById('output');
    const runtimeEl = document.getElementById('runtime');
    
    const setOut = (text) => {
      outEl.textContent = text;
      outEl.scrollTop = outEl.scrollHeight;
    };

    async function execute() {
      try {
        setOut('Running...');
        
        // Use relative path for API requests
        const response = await fetch('http://localhost:3000/api/run-code', {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({
            runtime: runtimeEl.value,
            code: codeEl.value
          })
        });

        if (!response.ok) {
          const error = await response.text();
          throw new Error(\`Server error: \${response.status} - \${error}\`);
        }

        const result = await response.json();
        const output = [
          \`Exit code: \${result.exitCode} | Runtime: \${runtimeEl.value}\`,
          '='.repeat(40),
          result.stdout || '',
          result.stderr ? \`\\n[stderr]\\n\${result.stderr}\` : ''
        ].join('\\n');
        
        setOut(output);
      } catch (error) {
        setOut(\`Error: \${error.message}\`);
        console.error('Execution error:', error);
      }
    }

    execute();
  `;

  return {
    section: {
      children: [
        { h1: { text: 'Playground' } },
        { p: { text: 'Edit the code and run it with your preferred runtime. Coherent.js is pre-imported for you.' } },
        { div: { className: 'playground-controls', style: 'display:flex; gap:8px; align-items:center; flex-wrap:wrap; margin: 8px 0 12px;', children: [
          { label: { for: 'runtime', text: 'Runtime:' } },
          { select: { id: 'runtime', className: 'select', children: [
            { option: { value: 'node', text: 'Node.js' } },
            { option: { value: 'deno', text: 'Deno' } },
            { option: { value: 'bun', text: 'Bun' } }
          ] } },
          { button: makeHydratable(() => ({ 
            id: 'run-btn', 
            className: 'button', 
            type: 'button', 
            onclick: run,
            text: '▶ Run' 
          })) }
        ] } },
        { div: { className: 'editor-wrap', children: [
          { textarea: { id: 'code', style: 'width:100%; min-height: 280px; font-family: ui-monospace, SFMono-Regular, Menlo, Monaco, Consolas, \'Liberation Mono\', \'Courier New\', monospace; font-size: 13px; line-height: 1.5; padding: 12px; border:1px solid var(--border-color,#ddd); border-radius:8px;', text: `// Import Coherent.js renderer
import { renderToString } from '@coherentjs/core';

// Simple component following Coherent.js structure
const App = () => ({
  html: {
    children: [
      {
        body: {
          children: [
            {
              div: {
                style: 'padding: 20px; font-family: sans-serif;',
                children: [
                  { h1: { text: 'Welcome to Coherent.js Playground! 👋' } },
                  { p: { text: 'Edit this code and click Run to see the result.' } },
                  {
                    div: {
                      style: 'margin-top: 20px; padding: 15px; background: #f5f5f5; border-radius: 4px;',
                      children: [
                        { h3: { text: 'Example Component' } },
                        { p: { text: 'This is a properly structured Coherent.js component.' } }
                      ]
                    }
                  }
                ]
              }
            }
          ]
        }
      }
    ]
  }
});

// Render the component to HTML
const html = renderToString(App());
console.log(html);
` } }
        ] } },
        { h3: { text: 'Output' } },
        makeHydratable(() => ({
          pre: { 
            id: 'output',
            style: 'background:#0b1020; color:#d7e1f8; padding:12px; border-radius:8px; min-height: 100px; max-height: 400px; overflow:auto; white-space: pre-wrap; word-break: break-word; font-family: ui-monospace, SFMono-Regular, Menlo, Monaco, Consolas, monospace; font-size: 13px; line-height: 1.5;',
            text: 'Output will appear here...',
            oncreate: (element) => {
              // Add Ctrl+Enter shortcut to run code
              const codeEl = document.getElementById('code');
              if (codeEl) {
                codeEl.addEventListener('keydown', (e) => {
                  if ((e.ctrlKey || e.metaKey) && e.key === 'Enter') {
                    // Execute the run function directly
                    try {
                      // Create a new function from the run string and execute it
                      // This ensures we have access to the component's scope
                      const executeRun = new Function(run);
                      executeRun();
                    } catch (error) {
                      console.error('Error executing run function:', error);
                      const outEl = document.getElementById('output');
                      if (outEl) {
                        outEl.textContent = `Error: ${error.message}`;
                      }
                    }
                  }
                });
              }
            }
          }
        })),
      ]
    }
  };
}
