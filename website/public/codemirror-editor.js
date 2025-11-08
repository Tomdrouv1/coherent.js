// Coherent.js Playground Editor - Enhanced with Syntax Highlighting
// Textarea-based JavaScript editor with syntax highlighting, autocomplete, and auto-formatting

// Global variable to hold the editor instance
window.playgroundEditor = null;

// Main playground editor with syntax highlighting
function createPlaygroundEditor(container, initialContent = '') {
  if (!container) {
    return null;
  }

  // Default initial content
  const defaultCode = `// 🎯 Coherent.js Interactive Playground
// Try editing this code and click Execute (Ctrl+Enter) to see the result!

// Component: User Card with Avatar
const UserCard = ({ name, role, avatar }) => ({
  div: {
    className: 'user-card',
    style: 'display: flex; align-items: center; padding: 20px; background: linear-gradient(135deg, #667eea 0%, #764ba2 100%); border-radius: 12px; color: white; margin-bottom: 20px; box-shadow: 0 4px 6px rgba(0,0,0,0.1);',
    children: [
      {
        div: {
          style: 'width: 60px; height: 60px; background: rgba(255,255,255,0.9); border-radius: 50%; display: flex; align-items: center; justify-content: center; font-size: 24px; margin-right: 16px;',
          text: avatar
        }
      },
      {
        div: {
          children: [
            {
              h2: {
                text: name,
                style: 'margin: 0 0 4px 0; font-size: 20px; font-weight: 600;'
              }
            },
            {
              p: {
                text: role,
                style: 'margin: 0; opacity: 0.9; font-size: 14px;'
              }
            }
          ]
        }
      }
    ]
  }
});

// Component: Feature Card
const FeatureCard = ({ icon, title, description }) => ({
  div: {
    style: 'background: rgba(102, 126, 234, 0.08); padding: 24px; border-radius: 8px; border: 1px solid rgba(102, 126, 234, 0.3); margin-bottom: 16px;',
    children: [
      {
        div: {
          style: 'font-size: 32px; margin-bottom: 12px;',
          text: icon
        }
      },
      {
        h3: {
          text: title,
          style: 'margin: 0 0 8px 0; color: #667eea; font-size: 18px; font-weight: 600;'
        }
      },
      {
        p: {
          text: description,
          style: 'margin: 0; opacity: 0.8; line-height: 1.6;'
        }
      }
    ]
  }
});

// Main Application
const App = () => ({
  div: {
    style: 'font-family: system-ui, -apple-system, sans-serif; max-width: 800px; margin: 0 auto; padding: 20px;',
    children: [
      {
        h1: {
          text: '🚀 Welcome to Coherent.js',
          style: 'margin-bottom: 8px; font-size: 32px;'
        }
      },
      {
        p: {
          text: 'Build beautiful UIs with pure JavaScript objects',
          style: 'opacity: 0.7; margin-bottom: 32px; font-size: 16px;'
        }
      },
      UserCard({
        name: 'Alice Johnson',
        role: 'Senior Developer',
        avatar: '👩‍💻'
      }),
      UserCard({
        name: 'Bob Smith',
        role: 'UX Designer',
        avatar: '🎨'
      }),
      {
        h2: {
          text: '✨ Key Features',
          style: 'margin: 32px 0 16px 0; font-size: 24px;'
        }
      },
      FeatureCard({
        icon: '⚡',
        title: 'Fast & Lightweight',
        description: 'No virtual DOM overhead. Pure JavaScript object rendering for maximum performance.'
      }),
      FeatureCard({
        icon: '🎨',
        title: 'Component-Based',
        description: 'Build reusable components with simple function calls and object composition.'
      }),
      FeatureCard({
        icon: '🔧',
        title: 'No Build Step Required',
        description: 'Works directly in the browser. No compilation, no transpilation needed.'
      })
    ]
  }
});

return App();`;

  const code = initialContent || defaultCode;

  // Create the editor wrapper
  const editorWrapper = document.createElement('div');
  editorWrapper.style.cssText = `
    position: relative;
    width: 100%;
    height: 100%;
    min-height: 400px;
    border: 1px solid var(--border-color, #ddd);
    border-radius: 8px;
    background: #1e1e1e;
    font-family: ui-monospace, SFMono-Regular, Menlo, Monaco, Consolas, Liberation Mono, Courier New, monospace;
    overflow: hidden;
  `;

  // Create line numbers div
  const lineNumbers = document.createElement('div');
  lineNumbers.style.cssText = `
    position: absolute;
    left: 0;
    top: 0;
    width: 50px;
    height: 100%;
    background: #252526;
    border-right: 1px solid #3e3e42;
    padding: 20px 8px;
    font-size: 13px;
    line-height: 1.6;
    color: #858585;
    text-align: right;
    white-space: pre;
    user-select: none;
    pointer-events: none;
    overflow: hidden;
    box-sizing: border-box;
    font-family: ui-monospace, 'SF Mono', 'Monaco', 'Inconsolata', 'Fira Code', 'Droid Sans Mono', monospace;
  `;

  // Create syntax highlighting layer (rendered behind textarea)
  const highlightLayer = document.createElement('pre');
  highlightLayer.className = 'highlight-layer';
  highlightLayer.style.cssText = `
    position: absolute;
    left: 50px;
    top: 0;
    right: 0;
    bottom: 0;
    margin: 0;
    border: none;
    background: transparent;
    color: #d4d4d4;
    white-space: pre;
    pointer-events: none;
    user-select: none;
    z-index: 1;
  `;

  // Create error tooltip
  const errorTooltip = document.createElement('div');
  errorTooltip.style.cssText = `
    position: absolute;
    display: none;
    background: #f44336;
    color: white;
    padding: 8px 12px;
    border-radius: 4px;
    font-size: 12px;
    z-index: 1000;
    max-width: 300px;
    box-shadow: 0 4px 12px rgba(0,0,0,0.3);
    pointer-events: none;
  `;
  errorTooltip.id = 'error-tooltip';

  // Create the textarea (transparent text, visible caret)
  const textarea = document.createElement('textarea');
  textarea.id = 'js-code-editor';
  textarea.className = 'syntax-editor-textarea';
  textarea.spellcheck = false;
  textarea.autocomplete = 'off';
  textarea.autocorrect = 'off';
  textarea.autocapitalize = 'off';
  textarea.value = code;

  // Sync scrolling between textarea, highlight layer, and line numbers
  function syncScroll() {
    highlightLayer.scrollTop = textarea.scrollTop;
    highlightLayer.scrollLeft = textarea.scrollLeft;
    lineNumbers.scrollTop = textarea.scrollTop;
  }

  textarea.addEventListener('scroll', syncScroll);

  // Syntax highlighting function
  function highlightSyntax(code) {
    // Store strings and comments to protect them during highlighting
    const strings = [];
    const comments = [];

    // Extract and protect strings
    let protectedStrings = code.replace(/(["'`])(?:(?=(\\?))\2.)*?\1/g, (match) => {
      strings.push(match);
      return `___STRING_${strings.length - 1}___`;
    });

    // Extract and protect comments
    protectedStrings = protectedStrings.replace(/\/\/.*$/gm, (match) => {
      comments.push(match);
      return `___COMMENT_${comments.length - 1}___`;
    });

    protectedStrings = protectedStrings.replace(/\/\*[\s\S]*?\*\//g, (match) => {
      comments.push(match);
      return `___COMMENT_${comments.length - 1}___`;
    });

    // Escape HTML
    const escapeHtml = (str) => str
      .replace(/&/g, '&amp;')
      .replace(/</g, '&lt;')
      .replace(/>/g, '&gt;');

    let highlighted = escapeHtml(protectedStrings);

    // Keywords
    highlighted = highlighted.replace(
      /\b(const|let|var|function|return|if|else|for|while|do|switch|case|break|continue|try|catch|finally|throw|new|class|extends|import|export|from|default|async|await|typeof|instanceof|delete|void|in|of|this|super|static|get|set|yield|null|undefined|true|false)\b/g,
      '<span style="color: #569cd6;">$1</span>'
    );

    // Numbers
    highlighted = highlighted.replace(
      /\b(\d+\.?\d*)\b/g,
      '<span style="color: #b5cea8;">$1</span>'
    );

    // Function names and method calls
    highlighted = highlighted.replace(
      /\b([a-zA-Z_$][a-zA-Z0-9_$]*)\s*\(/g,
      '<span style="color: #dcdcaa;">$1</span>('
    );

    // Arrow functions
    highlighted = highlighted.replace(
      /=&gt;/g,
      '<span style="color: #c586c0;">=&gt;</span>'
    );

    // HTML/Coherent.js element names (div, h1, etc.) - but NOT span to avoid conflicts
    highlighted = highlighted.replace(
      /\b(div|p|h1|h2|h3|h4|h5|h6|button|input|select|textarea|a|img|ul|ol|li|table|tr|td|th|form|label|section|article|header|footer|nav|main|aside|html|head|body|title|meta|link|script)\s*:/g,
      '<span style="color: #4ec9b0;">$1</span>:'
    );

    // Common properties (text, children, className, style, etc.)
    highlighted = highlighted.replace(
      /\b(children|text|className|style|onclick|href|src|alt|id|key|value|placeholder|type|name)\s*:/g,
      '<span style="color: #9cdcfe;">$1</span>:'
    );

    // Restore strings with highlighting
    highlighted = highlighted.replace(/___STRING_(\d+)___/g, (match, index) => {
      return `<span style="color: #ce9178;">${escapeHtml(strings[index])}</span>`;
    });

    // Restore comments with highlighting
    highlighted = highlighted.replace(/___COMMENT_(\d+)___/g, (match, index) => {
      return `<span style="color: #6a9955;">${escapeHtml(comments[index])}</span>`;
    });

    return highlighted;
  }

  // Check for syntax errors and common JavaScript issues
  function checkSyntaxErrors(code) {
    const errors = [];

    // Check for syntax errors first (parsing only)
    try {
      // First check syntax without execution
      const wrappedCode = `(function() { ${code}\n })`;
      const fn = new Function(wrappedCode);

      // Now try to execute it to catch runtime errors like undefined variables
      // This is safe because it's wrapped in a function that doesn't modify global scope
      try {
        fn();
      } catch (runtimeError) {
        // This catches ReferenceError, TypeError, etc.
        throw runtimeError;
      }
    } catch (error) {
      // Extract line and column information
      let line = null;
      let column = null;

      // Firefox provides lineNumber and columnNumber
      if (error.lineNumber !== undefined) {
        line = error.lineNumber;
        // Adjust for wrapper function
        if (line > 0) line = line - 1;
      }
      if (error.columnNumber !== undefined) {
        column = error.columnNumber;
      }

      // For Chrome/Edge, try parsing stack trace
      // Since errors come from new Function(), we can't extract line numbers from the stack
      // The stack only shows "at new Function (<anonymous>)" without line info
      // We need a different approach - parse the code manually to find the error location
      if (!line) {
        // Try to find the error by re-parsing the code line by line
        const codeLines = code.split('\n');
        for (let i = 0; i < codeLines.length; i++) {
          try {
            const testCode = `(function() { ${codeLines.slice(0, i + 1).join('\n')}\n })`;
            new Function(testCode);
          } catch (testError) {
            // If this throws the same error message, we found the line
            if (testError.message === error.message) {
              line = i + 1;

              // Try to find the exact column by testing progressively shorter versions of the line
              const currentLine = codeLines[i];
              column = currentLine.length;

              // Binary search to find the exact column where the error occurs
              for (let col = 0; col < currentLine.length; col++) {
                try {
                  const testLines = [...codeLines.slice(0, i), currentLine.substring(0, col + 1)];
                  const testCode2 = `(function() { ${testLines.join('\n')}\n })`;
                  new Function(testCode2);
                } catch (colError) {
                  if (colError.message === error.message) {
                    column = col + 1;
                    break;
                  }
                }
              }

              break;
            }
          }
        }
      }

      // If still no line number, try to parse it from the error message itself
      if (!line) {
        // Some errors include position info like "Unexpected token '}' at position 42"
        const posMatch = error.message.match(/position (\d+)/);
        if (posMatch) {
          const pos = parseInt(posMatch[1], 10);
          // Convert position to line/column
          const beforeError = code.substring(0, pos);
          line = (beforeError.match(/\n/g) || []).length + 1;
          const lastNewline = beforeError.lastIndexOf('\n');
          column = pos - lastNewline;
        }
      }

      // Build error message with location
      let message = error.message;

      // Always show line/column if we have them
      const locationPrefix = line && column
        ? `[Line ${line}, Col ${column}] `
        : line
        ? `[Line ${line}] `
        : '';

      errors.push({
        message: locationPrefix + message,
        line,
        column,
        type: error.name.toLowerCase(),
        original: error.message
      });
    }

    // Static analysis for common issues
    const lines = code.split('\n');
    lines.forEach((line, index) => {
      const lineNum = index + 1;

      // Check for variable assignment without const/let/var (only at start of line or after {)
      const assignmentMatch = line.match(/^(\s*|\s*\{[\s\S]*?)\b([a-zA-Z_$][a-zA-Z0-9_$]*)\s*=\s*[^=]/);
      if (assignmentMatch) {
        const varName = assignmentMatch[2];
        // Skip if it's a property assignment (has . before it) or destructuring
        if (!line.includes('.') && !line.includes(':') &&
            !['const', 'let', 'var', 'function', 'class', 'return', 'if', 'for', 'while'].some(kw => line.includes(kw))) {
          const column = line.indexOf(varName) + 1;
          errors.push({
            message: `[Line ${lineNum}, Col ${column}] Variable '${varName}' used without declaration (missing const/let/var)`,
            line: lineNum,
            column,
            type: 'undeclared'
          });
        }
      }

      // Check for missing semicolons on return/const/let/var statements
      if (/^\s*(return|const|let|var)\s+.*[^;{}\s]$/.test(line) && !line.trim().endsWith(',')) {
        const column = line.length;
        errors.push({
          message: `[Line ${lineNum}, Col ${column}] Missing semicolon`,
          line: lineNum,
          column,
          type: 'semicolon'
        });
      }
    });

    return errors.length > 0 ? errors[0] : null; // Return first error
  }

  // Highlight errors in the code
  function highlightWithErrors(code) {
    const error = checkSyntaxErrors(code);
    let highlighted = highlightSyntax(code);

    if (error && error.line) {
      // Highlight the error line with a red background
      const lines = highlighted.split('\n');
      if (lines[error.line - 1]) {
        lines[error.line - 1] = `<span style="background: rgba(244, 67, 54, 0.1); border-bottom: 2px wave #f44336; display: inline-block; width: 100%;">${lines[error.line - 1]}</span>`;
      }
      highlighted = lines.join('\n');
    }

    return { highlighted, error };
  }

  // Update syntax highlighting
  function updateHighlighting() {
    const result = highlightWithErrors(textarea.value);
    highlightLayer.innerHTML = result.highlighted;

    // Show/hide error tooltip
    if (result.error) {
      errorTooltip.textContent = `⚠️ ${result.error.message}`;
      errorTooltip.style.display = 'block';
      errorTooltip.style.top = '10px';
      errorTooltip.style.right = '10px';
    } else {
      errorTooltip.style.display = 'none';
    }
  }

  // Update line numbers
  function updateLineNumbers() {
    const lines = textarea.value.split('\n');
    const lineNumbersText = lines.map((_, i) => i + 1).join('\n');
    lineNumbers.textContent = lineNumbersText;
  }

  // Update both highlighting and line numbers
  function updateEditor() {
    updateHighlighting();
    updateLineNumbers();
    syncScroll();
  }

  // Auto-formatting function (basic prettifier)
  function formatCode() {
    const code = textarea.value;
    let formatted = code;
    let indent = 0;
    const lines = code.split('\n');
    const formattedLines = [];

    for (let line of lines) {
      const trimmed = line.trim();

      // Decrease indent for closing brackets
      if (trimmed.startsWith('}') || trimmed.startsWith(']') || trimmed.startsWith(')')) {
        indent = Math.max(0, indent - 1);
      }

      // Add indentation
      const spaces = '  '.repeat(indent);
      formattedLines.push(spaces + trimmed);

      // Increase indent for opening brackets
      if (trimmed.endsWith('{') || trimmed.endsWith('[') || trimmed.endsWith('(')) {
        indent++;
      }
      // Decrease indent after closing bracket on same line
      if ((trimmed.includes('{') && trimmed.includes('}')) ||
          (trimmed.includes('[') && trimmed.includes(']')) ||
          (trimmed.includes('(') && trimmed.includes(')'))) {
        // Don't change indent for complete single-line blocks
      }
    }

    formatted = formattedLines.join('\n');
    textarea.value = formatted;
    updateEditor();
  }

  // Autocomplete dropdown
  let autocompleteDropdown = null;
  let selectedIndex = -1;

  // Comprehensive Coherent.js completions
  const coherentCompletions = [
    // HTML elements
    { label: 'div', type: 'element', info: 'Container element' },
    { label: 'span', type: 'element', info: 'Inline element' },
    { label: 'p', type: 'element', info: 'Paragraph' },
    { label: 'h1', type: 'element', info: 'Heading 1' },
    { label: 'h2', type: 'element', info: 'Heading 2' },
    { label: 'h3', type: 'element', info: 'Heading 3' },
    { label: 'h4', type: 'element', info: 'Heading 4' },
    { label: 'h5', type: 'element', info: 'Heading 5' },
    { label: 'h6', type: 'element', info: 'Heading 6' },
    { label: 'button', type: 'element', info: 'Button element' },
    { label: 'input', type: 'element', info: 'Input field' },
    { label: 'textarea', type: 'element', info: 'Multi-line text input' },
    { label: 'select', type: 'element', info: 'Dropdown selector' },
    { label: 'a', type: 'element', info: 'Link element' },
    { label: 'img', type: 'element', info: 'Image element' },
    { label: 'ul', type: 'element', info: 'Unordered list' },
    { label: 'ol', type: 'element', info: 'Ordered list' },
    { label: 'li', type: 'element', info: 'List item' },
    { label: 'table', type: 'element', info: 'Table element' },
    { label: 'tr', type: 'element', info: 'Table row' },
    { label: 'td', type: 'element', info: 'Table cell' },
    { label: 'th', type: 'element', info: 'Table header cell' },
    { label: 'section', type: 'element', info: 'Section element' },
    { label: 'article', type: 'element', info: 'Article element' },
    { label: 'header', type: 'element', info: 'Header element' },
    { label: 'footer', type: 'element', info: 'Footer element' },
    { label: 'nav', type: 'element', info: 'Navigation element' },
    { label: 'main', type: 'element', info: 'Main content element' },

    // Properties
    { label: 'children', type: 'property', info: 'Array of child elements' },
    { label: 'text', type: 'property', info: 'Text content (escaped)' },
    { label: 'html', type: 'property', info: 'Raw HTML content' },
    { label: 'className', type: 'property', info: 'CSS class name' },
    { label: 'style', type: 'property', info: 'Inline CSS styles' },
    { label: 'id', type: 'property', info: 'Element ID' },
    { label: 'onclick', type: 'property', info: 'Click event handler' },
    { label: 'onchange', type: 'property', info: 'Change event handler' },
    { label: 'onsubmit', type: 'property', info: 'Submit event handler' },
    { label: 'href', type: 'property', info: 'Link destination' },
    { label: 'src', type: 'property', info: 'Source URL' },
    { label: 'alt', type: 'property', info: 'Alternative text' },
    { label: 'placeholder', type: 'property', info: 'Placeholder text' },
    { label: 'value', type: 'property', info: 'Input value' },
    { label: 'type', type: 'property', info: 'Input type' },
    { label: 'name', type: 'property', info: 'Input name' },
    { label: 'key', type: 'property', info: 'Unique key for lists' },

    // JavaScript keywords
    { label: 'const', type: 'keyword', info: 'Constant declaration' },
    { label: 'let', type: 'keyword', info: 'Variable declaration' },
    { label: 'var', type: 'keyword', info: 'Variable declaration (legacy)' },
    { label: 'function', type: 'keyword', info: 'Function declaration' },
    { label: 'return', type: 'keyword', info: 'Return statement' },
    { label: 'if', type: 'keyword', info: 'Conditional statement' },
    { label: 'else', type: 'keyword', info: 'Else clause' },
    { label: 'for', type: 'keyword', info: 'For loop' },
    { label: 'map', type: 'method', info: 'Array map method' },
    { label: 'filter', type: 'method', info: 'Array filter method' },
    { label: 'reduce', type: 'method', info: 'Array reduce method' },

    // Coherent.js functions
    { label: 'render', type: 'function', info: 'Render component to HTML' },
    { label: 'renderToDOM', type: 'function', info: 'Render to DOM element' },
  ];

  // Show autocomplete dropdown
  function showAutocompleteSuggestions() {
    const cursorPos = textarea.selectionStart;
    const textBeforeCursor = textarea.value.substring(0, cursorPos);
    const lastWord = textBeforeCursor.split(/[\s:,\(\)\{\}]+/).pop();

    if (lastWord.length === 0) return;

    const matchingSuggestions = coherentCompletions.filter(item =>
      item.label.toLowerCase().startsWith(lastWord.toLowerCase())
    );

    if (matchingSuggestions.length === 0) {
      hideAutocomplete();
      return;
    }

    // Create dropdown if doesn't exist
    if (!autocompleteDropdown) {
      autocompleteDropdown = document.createElement('div');
      autocompleteDropdown.style.cssText = `
        position: fixed;
        background: #1e1e1e;
        border: 1px solid #3e3e42;
        border-radius: 4px;
        box-shadow: 0 4px 12px rgba(0, 0, 0, 0.4);
        max-height: 200px;
        overflow-y: auto;
        z-index: 1000;
        font-family: inherit;
        font-size: 13px;
      `;
      document.body.appendChild(autocompleteDropdown);
    }

    // Populate dropdown
    autocompleteDropdown.innerHTML = '';
    selectedIndex = 0;

    matchingSuggestions.forEach((item, index) => {
      const option = document.createElement('div');
      option.className = 'autocomplete-option';
      option.style.cssText = `
        padding: 6px 12px;
        cursor: pointer;
        display: flex;
        align-items: center;
        gap: 8px;
        background: ${index === 0 ? '#094771' : 'transparent'};
      `;

      const typeColor = {
        element: '#4ec9b0',
        property: '#9cdcfe',
        keyword: '#569cd6',
        function: '#dcdcaa',
        method: '#dcdcaa',
      }[item.type] || '#d4d4d4';

      option.innerHTML = `
        <span style="color: ${typeColor}; font-weight: 500;">${item.label}</span>
        <span style="color: #858585; font-size: 11px;">${item.type}</span>
        <span style="color: #858585; margin-left: auto; font-size: 11px; max-width: 150px; text-overflow: ellipsis; overflow: hidden; white-space: nowrap;">${item.info}</span>
      `;

      option.addEventListener('mouseenter', () => {
        selectedIndex = index;
        updateSelection();
      });

      option.addEventListener('click', () => {
        insertSuggestion(item.label, lastWord, cursorPos);
      });

      autocompleteDropdown.appendChild(option);
    });

    // Position dropdown
    const rect = textarea.getBoundingClientRect();
    const lineHeight = 21;
    const lines = textarea.value.substring(0, cursorPos).split('\n');
    const currentLine = lines.length - 1;
    const currentColumn = lines[lines.length - 1].length;

    const top = rect.top + (currentLine * lineHeight) + 32;
    const left = rect.left + 50 + (currentColumn * 8.4);

    autocompleteDropdown.style.top = `${top}px`;
    autocompleteDropdown.style.left = `${left}px`;
    autocompleteDropdown.style.display = 'block';
  }

  function updateSelection() {
    const options = autocompleteDropdown?.querySelectorAll('.autocomplete-option');
    if (!options) return;

    options.forEach((option, index) => {
      option.style.background = index === selectedIndex ? '#094771' : 'transparent';
    });

    // Scroll selected item into view
    if (options[selectedIndex]) {
      options[selectedIndex].scrollIntoView({ block: 'nearest' });
    }
  }

  function insertSuggestion(suggestion, word, cursorPos) {
    const beforeWord = textarea.value.substring(0, cursorPos - word.length);
    const afterCursor = textarea.value.substring(cursorPos);

    textarea.value = beforeWord + suggestion + afterCursor;
    textarea.selectionStart = textarea.selectionEnd = cursorPos - word.length + suggestion.length;

    hideAutocomplete();
    updateEditor();
    textarea.focus();
  }

  function hideAutocomplete() {
    if (autocompleteDropdown) {
      autocompleteDropdown.style.display = 'none';
    }
    selectedIndex = -1;
  }

  // Event listeners
  textarea.addEventListener('input', (e) => {
    updateEditor();
  });

  textarea.addEventListener('keydown', (e) => {
    // Handle autocomplete navigation
    if (autocompleteDropdown && autocompleteDropdown.style.display === 'block') {
      if (e.key === 'ArrowDown') {
        e.preventDefault();
        const options = autocompleteDropdown.querySelectorAll('.autocomplete-option');
        selectedIndex = Math.min(selectedIndex + 1, options.length - 1);
        updateSelection();
        return;
      } else if (e.key === 'ArrowUp') {
        e.preventDefault();
        selectedIndex = Math.max(selectedIndex - 1, 0);
        updateSelection();
        return;
      } else if (e.key === 'Enter' || e.key === 'Tab') {
        e.preventDefault();
        const options = autocompleteDropdown.querySelectorAll('.autocomplete-option');
        if (options[selectedIndex]) {
          const cursorPos = textarea.selectionStart;
          const textBeforeCursor = textarea.value.substring(0, cursorPos);
          const lastWord = textBeforeCursor.split(/[\s:,\(\)\{\}]+/).pop();
          const label = options[selectedIndex].querySelector('span').textContent;
          insertSuggestion(label, lastWord, cursorPos);
        }
        return;
      } else if (e.key === 'Escape') {
        e.preventDefault();
        hideAutocomplete();
        return;
      }
    }

    // Tab handling
    if (e.key === 'Tab') {
      e.preventDefault();
      const start = textarea.selectionStart;
      const end = textarea.selectionEnd;
      const value = textarea.value;

      if (e.shiftKey) {
        // Unindent
        const lineStart = value.lastIndexOf('\n', start - 1) + 1;
        const line = value.substring(lineStart, value.indexOf('\n', start) === -1 ? value.length : value.indexOf('\n', start));
        if (line.startsWith('  ')) {
          textarea.value = value.substring(0, lineStart) + line.substring(2) + value.substring(lineStart + line.length);
          textarea.selectionStart = Math.max(lineStart, start - 2);
          textarea.selectionEnd = end - 2;
        }
      } else {
        // Indent
        textarea.value = value.substring(0, start) + '  ' + value.substring(end);
        textarea.selectionStart = textarea.selectionEnd = start + 2;
      }
      updateEditor();
    }
    // Auto-indent on Enter
    else if (e.key === 'Enter') {
      setTimeout(() => {
        const cursorPos = textarea.selectionStart;
        const lineStart = textarea.value.lastIndexOf('\n', cursorPos - 1) + 1;
        const prevLine = textarea.value.substring(lineStart, Math.max(lineStart, cursorPos - 1));
        const indentMatch = prevLine.match(/^\s*/);
        const indent = indentMatch ? indentMatch[0] : '';

        if (prevLine.trim().endsWith('{') || prevLine.trim().endsWith('[') || prevLine.trim().endsWith('(')) {
          textarea.value = textarea.value.substring(0, cursorPos) + indent + '  ' + textarea.value.substring(cursorPos);
          textarea.selectionStart = textarea.selectionEnd = cursorPos + indent.length + 2;
        } else if (indent.length > 0) {
          textarea.value = textarea.value.substring(0, cursorPos) + indent + textarea.value.substring(cursorPos);
          textarea.selectionStart = textarea.selectionEnd = cursorPos + indent.length;
        }
        updateEditor();
      }, 0);
    }
    // Ctrl/Cmd+Enter to run
    else if ((e.ctrlKey || e.metaKey) && e.key === 'Enter') {
      e.preventDefault();
      if (window.runPlaygroundComponent) {
        window.runPlaygroundComponent();
      }
    }
    // Ctrl/Cmd+Space for autocomplete
    else if ((e.ctrlKey || e.metaKey) && e.key === ' ') {
      e.preventDefault();
      showAutocompleteSuggestions();
    }
    // Shift+Alt+F to format
    else if (e.shiftKey && e.altKey && e.key === 'f') {
      e.preventDefault();
      formatCode();
    }
  });

  // Close autocomplete when clicking outside
  document.addEventListener('click', (e) => {
    if (autocompleteDropdown && !textarea.contains(e.target) && !autocompleteDropdown.contains(e.target)) {
      hideAutocomplete();
    }
  });

  // Assemble editor - order matters! Highlight layer MUST come before textarea
  editorWrapper.appendChild(lineNumbers);
  editorWrapper.appendChild(highlightLayer);
  editorWrapper.appendChild(textarea);
  editorWrapper.appendChild(errorTooltip);
  container.appendChild(editorWrapper);

  // Force initial render to ensure highlight layer has content
  highlightLayer.innerHTML = highlightSyntax(textarea.value);

  // Initial update
  updateEditor();

  // Global functions for external access
  window.getEditorContent = () => textarea.value;
  window.setEditorContent = (content) => {
    textarea.value = content;
    updateEditor();
  };
  window.formatEditorCode = formatCode;

  // Store editor instance
  window.playgroundEditor = {
    getValue: () => textarea.value,
    setValue: (value) => {
      textarea.value = value;
      updateEditor();
    },
    format: formatCode,
    focus: () => textarea.focus(),
  };

  return window.playgroundEditor;
}

// Auto-initialize when DOM is ready
if (document.readyState === 'loading') {
  document.addEventListener('DOMContentLoaded', () => {
    const container = document.getElementById('editor-container');
    if (container) {
      createPlaygroundEditor(container);
    }
  });
} else {
  // DOM already loaded
  setTimeout(() => {
    const container = document.getElementById('editor-container');
    if (container) {
      createPlaygroundEditor(container);
    }
  }, 100);
}
