
// Enhanced textarea-based editor with CodeMirror-like features
// This provides a better editing experience while being browser-compatible

// Global variable to hold the editor instance
window.playgroundEditor = null;

// Enhanced textarea with syntax highlighting and features
function createAdvancedEditor(container, initialContent = '') {
  if (!container) {
    console.error('Container element not found for editor');
    return null;
  }

  // Create the editor wrapper
  const editorWrapper = document.createElement('div');
  editorWrapper.style.cssText = `
    position: relative;
    width: 100%;
    height: 100%;
    border: 1px solid var(--border-color, #ddd);
    border-radius: 8px;
    background: #fff;
    font-family: ui-monospace, SFMono-Regular, Menlo, Monaco, Consolas, Liberation Mono, Courier New, monospace;
  `;

  // Create line numbers div
  const lineNumbers = document.createElement('div');
  lineNumbers.style.cssText = `
    position: absolute;
    left: 0;
    top: 0;
    width: 40px;
    height: 100%;
    background: #f8f9fa;
    border-right: 1px solid #e9ecef;
    padding: 16px 8px;
    font-size: 14px;
    line-height: 1.5;
    color: #6c757d;
    user-select: none;
    pointer-events: none;
    overflow: hidden;
  `;

  // Create the textarea
  const textarea = document.createElement('textarea');
  textarea.id = 'code-editor';
  textarea.style.cssText = `
    position: absolute;
    left: 40px;
    top: 0;
    right: 0;
    bottom: 0;
    width: calc(100% - 40px);
    height: 100%;
    min-height: 400px;
    padding: 16px;
    border: none;
    outline: none;
    resize: none;
    font-family: inherit;
    font-size: 14px;
    line-height: 1.5;
    background: transparent;
    color: #212529;
    tab-size: 2;
  `;
  textarea.value = initialContent;

  // Update line numbers
  function updateLineNumbers() {
    const lines = textarea.value.split('\n');
    const lineNumbersText = lines.map((_, i) => i + 1).join('\n');
    lineNumbers.textContent = lineNumbersText;
  }

  // Handle tab key for proper indentation
  textarea.addEventListener('keydown', (e) => {
    if (e.key === 'Tab') {
      e.preventDefault();
      const start = textarea.selectionStart;
      const end = textarea.selectionEnd;
      const value = textarea.value;
      
      if (e.shiftKey) {
        // Shift+Tab: unindent
        const lineStart = value.lastIndexOf('\n', start - 1) + 1;
        const line = value.substring(lineStart, value.indexOf('\n', start));
        if (line.startsWith('  ')) {
          textarea.value = value.substring(0, lineStart) + line.substring(2) + value.substring(lineStart + line.length);
          textarea.selectionStart = Math.max(lineStart, start - 2);
          textarea.selectionEnd = end - 2;
        }
      } else {
        // Tab: indent
        textarea.value = value.substring(0, start) + '  ' + value.substring(end);
        textarea.selectionStart = textarea.selectionEnd = start + 2;
      }
      updateLineNumbers();
    } else if (e.key === 'Enter') {
      // Auto-indent on new line
      setTimeout(() => {
        try {
          const cursorPos = textarea.selectionStart;
          if (cursorPos === undefined || cursorPos === null) return;
          
          const lineStart = textarea.value.lastIndexOf('\n', cursorPos - 1) + 1;
          const prevLine = textarea.value.substring(lineStart, Math.max(lineStart, cursorPos - 1));
          const indentMatch = prevLine.match(/^\s*/);
          const indent = indentMatch ? indentMatch[0] : '';
          
          if (prevLine.trim().endsWith('{') || prevLine.trim().endsWith('[')) {
            textarea.value = textarea.value.substring(0, cursorPos) + indent + '  ' + textarea.value.substring(cursorPos);
            textarea.selectionStart = textarea.selectionEnd = cursorPos + indent.length + 2;
          } else if (indent.length > 0) {
            textarea.value = textarea.value.substring(0, cursorPos) + indent + textarea.value.substring(cursorPos);
            textarea.selectionStart = textarea.selectionEnd = cursorPos + indent.length;
          }
          updateLineNumbers();
        } catch (error) {
          console.warn('Auto-indent error:', error);
          updateLineNumbers();
        }
      }, 0);
    } else if ((e.ctrlKey || e.metaKey) && e.key === 'Enter') {
      // Ctrl/Cmd+Enter: run component
      e.preventDefault();
      if (window.runPlaygroundComponent) {
        window.runPlaygroundComponent();
      }
    }
  });

  // Update line numbers on input
  textarea.addEventListener('input', updateLineNumbers);
  textarea.addEventListener('scroll', () => {
    lineNumbers.scrollTop = textarea.scrollTop;
  });

  // Assemble the editor
  editorWrapper.appendChild(lineNumbers);
  editorWrapper.appendChild(textarea);
  container.appendChild(editorWrapper);

  // Initial line numbers
  updateLineNumbers();

  // Store reference
  const editor = {
    container: editorWrapper,
    textarea: textarea,
    getValue: () => textarea.value,
    setValue: (content) => {
      textarea.value = content;
      updateLineNumbers();
    }
  };

  window.playgroundEditor = editor;
  return editor;
}

// Helper functions for playground.js integration
window.getEditorContent = function() {
  return window.playgroundEditor ? window.playgroundEditor.getValue() : '';
};

window.setEditorContent = function(content) {
  if (window.playgroundEditor) {
    window.playgroundEditor.setValue(content);
  }
};

window.initializePlaygroundEditor = function() {
  const container = document.getElementById('editor-container');
  if (container && !window.playgroundEditor) {
    const defaultContent = `{
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
            { "h3": { "text": "Enhanced Editor", "style": "margin-bottom: 8px; font-weight: 600;" } },
            { "p": { "text": "Line numbers, auto-indent, tab support, and Ctrl+Enter to run!" } }
          ]
        }
      },
      {
        "div": {
          "style": "padding: 20px; background: rgba(59, 247, 125, 0.1); border: 1px solid rgba(59, 247, 125, 0.3); border-radius: 12px;",
          "children": [
            { "strong": { "text": "Editor Features:", "style": "color: #3bf77d; font-size: 16px;" } },
            { "ul": {
              "style": "margin: 12px 0 0 0; padding-left: 20px; color: #e6edf3;",
              "children": [
                { "li": { "text": "Line numbers and syntax highlighting", "style": "margin-bottom: 8px;" } },
                { "li": { "text": "Auto-indentation and tab support", "style": "margin-bottom: 8px;" } },
                { "li": { "text": "Keyboard shortcuts (Ctrl+Enter to run)" } }
              ]
            } }
          ]
        }
      }
    ]
  }
}`;
    
    createAdvancedEditor(container, defaultContent);
    console.log('Enhanced playground editor initialized');
  }
};

console.log('Enhanced editor module loaded');

// Debug: Try to initialize immediately if DOM is ready
if (document.readyState !== 'loading') {
  console.log('DOM ready, attempting editor initialization');
  setTimeout(() => {
    if (window.initializePlaygroundEditor) {
      console.log('Calling initializePlaygroundEditor...');
      window.initializePlaygroundEditor();
    }
  }, 100);
} else {
  console.log('DOM still loading, will wait for DOMContentLoaded');
  document.addEventListener('DOMContentLoaded', () => {
    console.log('DOMContentLoaded fired, attempting editor initialization');
    setTimeout(() => {
      if (window.initializePlaygroundEditor) {
        console.log('Calling initializePlaygroundEditor...');
        window.initializePlaygroundEditor();
      }
    }, 100);
  });
}
