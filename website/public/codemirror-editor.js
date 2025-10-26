// Real CodeMirror 6 editor with JavaScript language support and autocomplete
// Loads CodeMirror 6 via dynamic imports for better compatibility

let codeMirrorLoaded = false;

// Global variable to hold the editor instance
window.playgroundEditor = null;

// Coherent.js-specific autocomplete completions
function coherentJsCompletions(context) {
  const word = context.matchBefore(/\w*/);
  if (!word) return null;
  
  const coherentCompletions = [
    // Component structure
    { label: 'div', type: 'keyword', info: 'HTML div element with Coherent.js structure' },
    { label: 'span', type: 'keyword', info: 'HTML span element' },
    { label: 'p', type: 'keyword', info: 'HTML paragraph element' },
    { label: 'h1', type: 'keyword', info: 'HTML heading 1 element' },
    { label: 'h2', type: 'keyword', info: 'HTML heading 2 element' },
    { label: 'h3', type: 'keyword', info: 'HTML heading 3 element' },
    { label: 'button', type: 'keyword', info: 'HTML button element' },
    { label: 'input', type: 'keyword', info: 'HTML input element' },
    { label: 'ul', type: 'keyword', info: 'HTML unordered list element' },
    { label: 'li', type: 'keyword', info: 'HTML list item element' },
    
    // Common properties
    { label: 'children', type: 'property', info: 'Array of child components' },
    { label: 'text', type: 'property', info: 'Text content of the element' },
    { label: 'className', type: 'property', info: 'CSS class name(s)' },
    { label: 'style', type: 'property', info: 'Inline CSS styles' },
    { label: 'onclick', type: 'property', info: 'Click event handler' },
    { label: 'href', type: 'property', info: 'Link destination' },
    { label: 'src', type: 'property', info: 'Source URL for images/media' },
    { label: 'alt', type: 'property', info: 'Alternative text for images' },
    
    // Coherent.js functions (when browser runtime is available)
    { label: 'renderToString', type: 'function', info: 'Render component to HTML string' },
    { label: 'renderToDOM', type: 'function', info: 'Render component to DOM element' },
    { label: 'useState', type: 'function', info: 'Create stateful component' },
    { label: 'useEffect', type: 'function', info: 'Add side effects to component' },
  ];
  
  return {
    from: word.from,
    options: coherentCompletions.filter(comp => 
      comp.label.toLowerCase().includes(word.text.toLowerCase())
    )
  };
}

// Component structure snippets
function coherentJsSnippets() {
  return [
    {
      label: 'component',
      detail: 'Basic component structure',
      type: 'snippet',
      apply: `const Component = () => ({
  div: {
    className: 'container',
    children: [
      { h1: { text: 'Hello World' } },
      { p: { text: 'Component content here' } }
    ]
  }
});`
    },
    {
      label: 'page',
      detail: 'Full page component',
      type: 'snippet', 
      apply: `const Page = () => ({
  html: {
    children: [
      {
        head: {
          children: [
            { title: { text: 'Page Title' } },
            { style: { text: 'body { font-family: system-ui; }' } }
          ]
        }
      },
      {
        body: {
          children: [
            { h1: { text: 'Page Heading' } },
            { main: { 
              children: [
                { p: { text: 'Page content here' } }
              ]
            }}
          ]
        }
      }
    ]
  }
});`
    }
  ];
}

// Enhanced textarea editor with JavaScript support for Coherent.js (Original Working Version)
function createAdvancedJavaScriptEditor(container, initialContent = '') {
  if (!container) {
    console.error('Container element not found for JavaScript editor');
    return null;
  }

  console.log('Creating enhanced JavaScript editor');

  // Create the editor wrapper
  const editorWrapper = document.createElement('div');
  editorWrapper.style.cssText = `
    position: relative;
    width: 100%;
    height: 100%;
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
    padding: 16px 8px;
    font-size: 14px;
    line-height: 1.5;
    color: #858585;
    user-select: none;
    pointer-events: none;
    overflow: hidden;
    box-sizing: border-box;
  `;

  // Create the textarea
  const textarea = document.createElement('textarea');
  textarea.id = 'js-code-editor';
  textarea.style.cssText = `
    position: absolute;
    left: 50px;
    top: 0;
    right: 0;
    bottom: 0;
    width: calc(100% - 50px);
    height: 100%;
    min-height: 300px;
    padding: 16px;
    border: none;
    outline: none;
    resize: none;
    font-family: inherit;
    font-size: 14px;
    line-height: 1.5;
    background: #1e1e1e;
    color: #d4d4d4;
    tab-size: 2;
    white-space: pre;
    overflow: auto;
    box-sizing: border-box;
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
    // Handle autocomplete dropdown navigation first
    if (autocompleteDropdown) {
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
          insertSuggestion(options[selectedIndex].querySelector('span').textContent, lastWord, cursorPos);
        }
        return;
      } else if (e.key === 'Escape') {
        e.preventDefault();
        hideAutocomplete();
        return;
      }
    }
    
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
        textarea.value = `${value.substring(0, start)  }  ${  value.substring(end)}`;
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
          
          if (prevLine.trim().endsWith('{') || prevLine.trim().endsWith('[') || prevLine.trim().endsWith('(')) {
            textarea.value = `${textarea.value.substring(0, cursorPos) + indent  }  ${  textarea.value.substring(cursorPos)}`;
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
    } else if ((e.ctrlKey || e.metaKey) && e.key === ' ') {
      // Ctrl/Cmd+Space: show autocomplete suggestions
      e.preventDefault();
      showAutocompleteSuggestions();
    } else if (autocompleteDropdown) {
      // Handle autocomplete dropdown navigation
      if (e.key === 'ArrowDown') {
        e.preventDefault();
        const options = autocompleteDropdown.querySelectorAll('.autocomplete-option');
        selectedIndex = Math.min(selectedIndex + 1, options.length - 1);
        updateSelection();
      } else if (e.key === 'ArrowUp') {
        e.preventDefault();
        selectedIndex = Math.max(selectedIndex - 1, 0);
        updateSelection();
      } else if (e.key === 'Enter' || e.key === 'Tab') {
        e.preventDefault();
        const options = autocompleteDropdown.querySelectorAll('.autocomplete-option');
        if (options[selectedIndex]) {
          const selectedItem = coherentCompletions.find((_, index) => index === selectedIndex);
          const cursorPos = textarea.selectionStart;
          const textBeforeCursor = textarea.value.substring(0, cursorPos);
          const lastWord = textBeforeCursor.split(/[\s:,\(\)\{\}]+/).pop();
          insertSuggestion(options[selectedIndex].querySelector('span').textContent, lastWord, cursorPos);
        }
      } else if (e.key === 'Escape') {
        e.preventDefault();
        hideAutocomplete();
      }
    }
  });

  // Autocomplete dropdown element
  let autocompleteDropdown = null;
  let selectedIndex = -1;

  // Comprehensive Coherent.js completions
  const coherentCompletions = [
    // HTML tags
    { label: 'div', type: 'element', info: 'HTML div container element' },
    { label: 'span', type: 'element', info: 'HTML inline span element' },
    { label: 'p', type: 'element', info: 'HTML paragraph element' },
    { label: 'h1', type: 'element', info: 'HTML heading 1 element' },
    { label: 'h2', type: 'element', info: 'HTML heading 2 element' },
    { label: 'h3', type: 'element', info: 'HTML heading 3 element' },
    { label: 'h4', type: 'element', info: 'HTML heading 4 element' },
    { label: 'h5', type: 'element', info: 'HTML heading 5 element' },
    { label: 'h6', type: 'element', info: 'HTML heading 6 element' },
    { label: 'button', type: 'element', info: 'HTML button element' },
    { label: 'input', type: 'element', info: 'HTML input element' },
    { label: 'textarea', type: 'element', info: 'HTML textarea element' },
    { label: 'select', type: 'element', info: 'HTML select dropdown element' },
    { label: 'option', type: 'element', info: 'HTML option element for select' },
    { label: 'ul', type: 'element', info: 'HTML unordered list' },
    { label: 'ol', type: 'element', info: 'HTML ordered list' },
    { label: 'li', type: 'element', info: 'HTML list item' },
    { label: 'a', type: 'element', info: 'HTML anchor/link element' },
    { label: 'img', type: 'element', info: 'HTML image element' },
    { label: 'form', type: 'element', info: 'HTML form element' },
    { label: 'header', type: 'element', info: 'HTML header element' },
    { label: 'main', type: 'element', info: 'HTML main content element' },
    { label: 'footer', type: 'element', info: 'HTML footer element' },
    { label: 'section', type: 'element', info: 'HTML section element' },
    { label: 'article', type: 'element', info: 'HTML article element' },
    { label: 'nav', type: 'element', info: 'HTML navigation element' },
    { label: 'aside', type: 'element', info: 'HTML aside element' },
    { label: 'table', type: 'element', info: 'HTML table element' },
    { label: 'tr', type: 'element', info: 'HTML table row' },
    { label: 'td', type: 'element', info: 'HTML table cell' },
    { label: 'th', type: 'element', info: 'HTML table header cell' },
    
    // Common properties
    { label: 'children', type: 'property', info: 'Array of child components' },
    { label: 'text', type: 'property', info: 'Text content of element' },
    { label: 'html', type: 'property', info: 'Raw HTML content (use carefully)' },
    { label: 'className', type: 'property', info: 'CSS class name(s)' },
    { label: 'style', type: 'property', info: 'Inline CSS styles' },
    { label: 'id', type: 'property', info: 'Element ID attribute' },
    
    // Event handlers
    { label: 'onclick', type: 'event', info: 'Click event handler function' },
    { label: 'onchange', type: 'event', info: 'Change event handler function' },
    { label: 'onsubmit', type: 'event', info: 'Form submit event handler' },
    { label: 'onload', type: 'event', info: 'Load event handler' },
    { label: 'onmouseover', type: 'event', info: 'Mouse over event handler' },
    { label: 'onmouseout', type: 'event', info: 'Mouse out event handler' },
    
    // Form attributes
    { label: 'href', type: 'attribute', info: 'Link destination URL' },
    { label: 'src', type: 'attribute', info: 'Source URL for images/media' },
    { label: 'alt', type: 'attribute', info: 'Alternative text for images' },
    { label: 'title', type: 'attribute', info: 'Tooltip text' },
    { label: 'type', type: 'attribute', info: 'Input type attribute' },
    { label: 'name', type: 'attribute', info: 'Form element name' },
    { label: 'value', type: 'attribute', info: 'Input/form element value' },
    { label: 'placeholder', type: 'attribute', info: 'Input placeholder text' },
    { label: 'disabled', type: 'attribute', info: 'Disable form element' },
    { label: 'required', type: 'attribute', info: 'Mark field as required' },
    
    // Coherent.js functions
    { label: 'renderToString', type: 'function', info: 'Render component to HTML string' },
    { label: 'renderToDOM', type: 'function', info: 'Render component to DOM element' },
    
    // JavaScript patterns
    { label: 'const', type: 'keyword', info: 'Declare constant variable' },
    { label: 'function', type: 'keyword', info: 'Function declaration' },
    { label: 'return', type: 'keyword', info: 'Return statement' },
    { label: '() => ({', type: 'snippet', info: 'Arrow function returning object' },
    { label: 'const Component = () => ({', type: 'snippet', info: 'Component function pattern' },
    { label: 'return Component();', type: 'snippet', info: 'Return component call' }
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
    
    createAutocompleteDropdown(matchingSuggestions, lastWord, cursorPos);
  }

  // Create autocomplete dropdown
  function createAutocompleteDropdown(suggestions, word, cursorPos) {
    hideAutocomplete();
    
    autocompleteDropdown = document.createElement('div');
    autocompleteDropdown.className = 'autocomplete-dropdown';
    autocompleteDropdown.style.cssText = `
      position: absolute;
      background: #2d2d30;
      border: 1px solid #3e3e42;
      border-radius: 6px;
      box-shadow: 0 4px 12px rgba(0, 0, 0, 0.3);
      max-height: 200px;
      overflow-y: auto;
      z-index: 1000;
      font-family: inherit;
      font-size: 13px;
    `;
    
    // Calculate position
    const rect = textarea.getBoundingClientRect();
    const lineHeight = 21; // Approximate line height
    const lines = textarea.value.substring(0, cursorPos).split('\n');
    const currentLine = lines.length - 1;
    const currentColumn = lines[lines.length - 1].length;
    
    const top = rect.top + (currentLine * lineHeight) + 32;
    const left = rect.left + 50 + (currentColumn * 8.4); // Approximate char width
    
    autocompleteDropdown.style.top = `${Math.min(top, window.innerHeight - 250)}px`;
    autocompleteDropdown.style.left = `${Math.min(left, window.innerWidth - 300)}px`;
    
    suggestions.forEach((item, index) => {
      const option = document.createElement('div');
      option.className = 'autocomplete-option';
      option.style.cssText = `
        padding: 8px 12px;
        cursor: pointer;
        display: flex;
        align-items: center;
        gap: 8px;
        border-bottom: 1px solid #3e3e42;
        color: #d4d4d4;
      `;
      
      if (index === suggestions.length - 1) {
        option.style.borderBottom = 'none';
      }
      
      const typeColor = {
        'element': '#569cd6',
        'property': '#9cdcfe', 
        'event': '#dcdcaa',
        'attribute': '#92c5f7',
        'function': '#c586c0',
        'keyword': '#569cd6',
        'snippet': '#ce9178'
      }[item.type] || '#d4d4d4';
      
      option.innerHTML = `
        <span style="color: ${typeColor}; font-weight: 500; min-width: 100px;">${item.label}</span>
        <span style="color: #6a9955; font-size: 11px; opacity: 0.8;">${item.info}</span>
      `;
      
      option.addEventListener('mouseenter', () => {
        selectedIndex = index;
        updateSelection();
      });
      
      option.addEventListener('click', () => {
        insertSuggestion(item.label, word, cursorPos);
      });
      
      autocompleteDropdown.appendChild(option);
    });
    
    document.body.appendChild(autocompleteDropdown);
    selectedIndex = 0;
    updateSelection();
  }

  // Update selection highlighting
  function updateSelection() {
    if (!autocompleteDropdown) return;
    
    const options = autocompleteDropdown.querySelectorAll('.autocomplete-option');
    options.forEach((option, index) => {
      if (index === selectedIndex) {
        option.style.background = '#094771';
      } else {
        option.style.background = 'transparent';
      }
    });
  }

  // Insert selected suggestion
  function insertSuggestion(suggestion, word, cursorPos) {
    const beforeWord = textarea.value.substring(0, cursorPos - word.length);
    const afterCursor = textarea.value.substring(cursorPos);
    
    textarea.value = beforeWord + suggestion + afterCursor;
    textarea.selectionStart = textarea.selectionEnd = cursorPos - word.length + suggestion.length;
    
    hideAutocomplete();
    updateLineNumbers();
    textarea.focus();
  }

  // Hide autocomplete dropdown
  function hideAutocomplete() {
    if (autocompleteDropdown) {
      autocompleteDropdown.remove();
      autocompleteDropdown = null;
      selectedIndex = -1;
    }
  }

  // Update line numbers on input and trigger autocomplete
  textarea.addEventListener('input', (e) => {
    updateLineNumbers();
    
    // Auto-trigger autocomplete when typing letters
    const char = e.inputType === 'insertText' ? e.data : '';
    if (char && /[a-zA-Z]/.test(char)) {
      setTimeout(() => {
        const cursorPos = textarea.selectionStart;
        const textBeforeCursor = textarea.value.substring(0, cursorPos);
        const lastWord = textBeforeCursor.split(/[\s:,\(\)\{\}]+/).pop();
        
        if (lastWord.length >= 2) { // Start suggesting after 2 characters
          showAutocompleteSuggestions();
        }
      }, 100); // Small delay to let the input settle
    } else if (e.inputType === 'deleteContentBackward') {
      // Hide autocomplete when deleting
      hideAutocomplete();
    }
  });
  textarea.addEventListener('scroll', () => {
    lineNumbers.scrollTop = textarea.scrollTop;
  });

  // Assemble the editor
  editorWrapper.appendChild(lineNumbers);
  editorWrapper.appendChild(textarea);
  container.appendChild(editorWrapper);

  // Initial line numbers
  updateLineNumbers();

  // Hide autocomplete when clicking outside
  document.addEventListener('click', (e) => {
    if (autocompleteDropdown && !autocompleteDropdown.contains(e.target) && e.target !== textarea) {
      hideAutocomplete();
    }
  });

  // Hide autocomplete when textarea loses focus
  textarea.addEventListener('blur', () => {
    setTimeout(() => hideAutocomplete(), 150); // Small delay to allow clicking on suggestions
  });

  // Store reference and create API
  const editor = {
    container: editorWrapper,
    textarea: textarea,
    getValue: () => textarea.value,
    setValue: (content) => {
      textarea.value = content;
      updateLineNumbers();
    },
    focus: () => textarea.focus(),
    getSelection: () => {
      const start = textarea.selectionStart;
      const end = textarea.selectionEnd;
      return textarea.value.substring(start, end);
    }
  };

  window.playgroundEditor = editor;
  console.log('Enhanced JavaScript editor initialized');
  return editor;
}

// Load CodeMirror 6 dynamically and create editor with autocomplete (DISABLED)
async function createCodeMirror6Editor(container, initialContent = '') {
  if (!container) {
    console.error('Container element not found for CodeMirror editor');
    return null;
  }

  console.log('Creating CodeMirror 6 editor with autocomplete...');

  try {
    // Load CodeMirror modules via dynamic import from ESM CDN
    const [
      viewModule,
      { EditorState },
      { javascript },
      { autocompletion, completionKeymap },
      { oneDark },
      { lineNumbers }
    ] = await Promise.all([
      import('https://esm.sh/@codemirror/view@6'),
      import('https://esm.sh/@codemirror/state@6'),
      import('https://esm.sh/@codemirror/lang-javascript@6'),
      import('https://esm.sh/@codemirror/autocomplete@6'),
      import('https://esm.sh/@codemirror/theme-one-dark@6'),
      import('https://esm.sh/@codemirror/view@6')
    ]);

    const { EditorView, basicSetup, keymap } = viewModule;

    console.log('CodeMirror modules loaded successfully');

    // Coherent.js specific autocompletion source
    const coherentCompletions = (context) => {
      const word = context.matchBefore(/\w*/);
      if (word.from === word.to && !context.explicit) return null;

      const options = [
        // HTML tags
        { label: 'div', type: 'keyword', info: 'HTML div element' },
        { label: 'span', type: 'keyword', info: 'HTML span element' }, 
        { label: 'p', type: 'keyword', info: 'HTML paragraph element' },
        { label: 'h1', type: 'keyword', info: 'HTML heading 1' },
        { label: 'h2', type: 'keyword', info: 'HTML heading 2' },
        { label: 'h3', type: 'keyword', info: 'HTML heading 3' },
        { label: 'button', type: 'keyword', info: 'HTML button element' },
        { label: 'input', type: 'keyword', info: 'HTML input element' },
        { label: 'ul', type: 'keyword', info: 'HTML unordered list' },
        { label: 'li', type: 'keyword', info: 'HTML list item' },
        { label: 'a', type: 'keyword', info: 'HTML anchor/link element' },
        { label: 'img', type: 'keyword', info: 'HTML image element' },
        { label: 'form', type: 'keyword', info: 'HTML form element' },
        { label: 'header', type: 'keyword', info: 'HTML header element' },
        { label: 'main', type: 'keyword', info: 'HTML main element' },
        { label: 'footer', type: 'keyword', info: 'HTML footer element' },
        { label: 'section', type: 'keyword', info: 'HTML section element' },
        { label: 'article', type: 'keyword', info: 'HTML article element' },
        
        // Common properties
        { label: 'children', type: 'property', info: 'Array of child components' },
        { label: 'text', type: 'property', info: 'Text content of element' },
        { label: 'className', type: 'property', info: 'CSS class name(s)' },
        { label: 'style', type: 'property', info: 'Inline CSS styles' },
        { label: 'onclick', type: 'property', info: 'Click event handler' },
        { label: 'href', type: 'property', info: 'Link destination' },
        { label: 'src', type: 'property', info: 'Source URL for images/media' },
        { label: 'alt', type: 'property', info: 'Alternative text for images' },
        { label: 'id', type: 'property', info: 'Element ID attribute' },
        { label: 'type', type: 'property', info: 'Input type attribute' },
        { label: 'placeholder', type: 'property', info: 'Input placeholder text' },
        { label: 'value', type: 'property', info: 'Input value' },
        
        // Coherent.js functions
        { label: 'renderToString', type: 'function', info: 'Render component to HTML string' },
        { label: 'renderToDOM', type: 'function', info: 'Render component to DOM element' },
        
        // JavaScript patterns
        { label: 'const Component = () => ({', type: 'snippet', info: 'Component function pattern' },
        { label: '() => ({', type: 'snippet', info: 'Arrow function returning object' },
        { label: 'return Component();', type: 'snippet', info: 'Return component call' }
      ];

      return {
        from: word.from,
        options: options.filter(option => 
          option.label.toLowerCase().includes(word.text.toLowerCase())
        )
      };
    };

    // Log what we have available for debugging
    console.log('Available CodeMirror modules:', { 
      EditorView: !!EditorView, 
      basicSetup: !!basicSetup, 
      javascript: !!javascript, 
      autocompletion: !!autocompletion, 
      completionKeymap: !!completionKeymap,
      oneDark: !!oneDark,
      keymap: !!keymap
    });

    // Build extensions array with error checking
    const extensions = [];
    
    if (basicSetup) extensions.push(basicSetup);
    if (javascript) extensions.push(javascript());
    if (autocompletion) {
      extensions.push(autocompletion({
        override: [coherentCompletions],
        activateOnTyping: true,
        maxRenderedOptions: 20
      }));
    }
    if (oneDark) extensions.push(oneDark);
    if (lineNumbers) extensions.push(lineNumbers());
    
    // Add theme with strict containment
    extensions.push(EditorView.theme({
      '&': {
        height: '100% !important',
        width: '100% !important',
        maxWidth: '100% !important',
        minWidth: '0 !important',
        fontSize: '14px',
        fontFamily: 'ui-monospace, SFMono-Regular, Menlo, Monaco, Consolas, Liberation Mono, Courier New, monospace',
        boxSizing: 'border-box !important',
        overflow: 'hidden !important',
        position: 'relative !important'
      },
      '.cm-editor': {
        height: '100% !important',
        width: '100% !important',
        maxWidth: '100% !important',
        minWidth: '0 !important',
        boxSizing: 'border-box !important',
        overflow: 'hidden !important',
        position: 'relative !important'
      },
      '.cm-scroller': {
        height: '100% !important',
        maxHeight: '100% !important',
        width: '100% !important',
        maxWidth: '100% !important',
        minWidth: '0 !important',
        boxSizing: 'border-box !important',
        overflow: 'auto !important'
      },
      '.cm-content': {
        width: '100% !important',
        maxWidth: '100% !important',
        minWidth: '0 !important',
        boxSizing: 'border-box !important',
        padding: '16px !important'
      },
      '.cm-focused': {
        outline: 'none !important'
      },
      '&.cm-focused .cm-selectionBackground': {
        backgroundColor: '#094771 !important'
      }
    }));
    
    // Add keyboard shortcuts if available
    if (keymap && completionKeymap) {
      extensions.push(keymap.of([
        ...completionKeymap,
        {
          key: 'Ctrl-Enter',
          mac: 'Cmd-Enter',
          run: () => {
            if (window.runPlaygroundComponent) {
              window.runPlaygroundComponent();
            }
            return true;
          }
        }
      ]));
    }

    console.log('Extensions to be loaded:', extensions.length);

    // Create the editor state
    const state = EditorState.create({
      doc: initialContent,
      extensions: extensions
    });

    // Create the editor view
    const view = new EditorView({
      state,
      parent: container
    });

    // Create editor API
    const editor = {
      container: container,
      view: view,
      getValue: () => view.state.doc.toString(),
      setValue: (content) => {
        view.dispatch({
          changes: {
            from: 0,
            to: view.state.doc.length,
            insert: content
          }
        });
      },
      focus: () => view.focus(),
      getSelection: () => {
        const { from, to } = view.state.selection.main;
        return view.state.doc.sliceString(from, to);
      }
    };

    window.playgroundEditor = editor;
    codeMirrorLoaded = true;
    console.log('CodeMirror 6 editor with autocomplete initialized successfully');
    return editor;

  } catch (error) {
    console.error('Failed to load CodeMirror:', error);
    throw error;
  }
}

// Fallback textarea editor if CodeMirror fails to load
function createFallbackTextarea(container, initialContent) {
  console.warn('Using fallback textarea editor');
  
  const textarea = document.createElement('textarea');
  textarea.id = 'code-editor-fallback';
  textarea.style.cssText = `
    width: 100%;
    height: 400px;
    min-height: 400px;
    padding: 16px;
    border: 1px solid var(--border-color, #ddd);
    border-radius: 8px;
    font-family: ui-monospace, SFMono-Regular, Menlo, Monaco, Consolas, Liberation Mono, Courier New, monospace;
    font-size: 14px;
    line-height: 1.5;
    resize: vertical;
    outline: none;
  `;
  textarea.value = initialContent;
  
  // Basic keyboard shortcuts
  textarea.addEventListener('keydown', (e) => {
    if ((e.ctrlKey || e.metaKey) && e.key === 'Enter') {
      e.preventDefault();
      if (window.runPlaygroundComponent) {
        window.runPlaygroundComponent();
      }
    }
  });
  
  container.appendChild(textarea);
  
  const editor = {
    textarea: textarea,
    getValue: () => textarea.value,
    setValue: (content) => textarea.value = content,
    focus: () => textarea.focus()
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

window.initializePlaygroundEditor = async function() {
  // Prevent multiple initialization attempts
  if (window.playgroundEditorInitialized || window.playgroundEditor) {
    console.log('Editor already initialized, skipping...');
    return;
  }
  
  console.log('Initializing playground editor (first time)...');
  window.playgroundEditorInitialized = true;
  
  const container = document.getElementById('editor-container');
  
  // Clear container first to avoid duplicates
  if (container) {
    container.innerHTML = '';
  }
  
  if (container) {
    // Default JavaScript component instead of JSON
    const defaultContent = `// Welcome to Coherent.js Playground! 🚀
// Write Coherent.js components using pure JavaScript objects

const WelcomeComponent = () => ({
  div: {
    style: 'padding: 24px; font-family: system-ui, sans-serif; max-width: 600px;',
    children: [
      { 
        h1: { 
          text: 'Welcome to Coherent.js! 🚀',
          style: 'color: #7cc4ff; margin-bottom: 16px; font-weight: 700;'
        } 
      },
      { 
        p: { 
          text: 'This is a JavaScript playground for Coherent.js components. Edit this code and click Run!',
          style: 'color: #e6edf3; margin-bottom: 20px; line-height: 1.6;'
        } 
      },
      {
        div: {
          style: 'background: linear-gradient(135deg, #667eea 0%, #764ba2 100%); color: white; padding: 20px; border-radius: 12px; text-align: center; margin-bottom: 20px;',
          children: [
            { h3: { text: 'JavaScript Editor', style: 'margin-bottom: 8px; font-weight: 600;' } },
            { p: { text: 'Full IDE features: autocomplete, syntax highlighting, and Ctrl+Enter to run!' } }
          ]
        }
      },
      {
        div: {
          style: 'padding: 20px; background: rgba(59, 247, 125, 0.1); border: 1px solid rgba(59, 247, 125, 0.3); border-radius: 12px;',
          children: [
            { strong: { text: 'Editor Features:', style: 'color: #3bf77d; font-size: 16px;' } },
            { ul: {
              style: 'margin: 12px 0 0 0; padding-left: 20px; color: #e6edf3;',
              children: [
                { li: { text: 'Real CodeMirror 6 with JavaScript support', style: 'margin-bottom: 8px;' } },
                { li: { text: 'Coherent.js-specific autocomplete and snippets', style: 'margin-bottom: 8px;' } },
                { li: { text: 'Live preview and HTML generation' } }
              ]
            } }
          ]
        }
      }
    ]
  }
});

// Export or render the component
console.log('Component ready!');
return WelcomeComponent();`;
    
    try {
      await createCodeMirror6Editor(container, defaultContent);
      console.log('CodeMirror 6 playground editor with autocomplete initialized');
    } catch (error) {
      console.error('Failed to initialize CodeMirror 6 editor:', error);
      // Fallback to working textarea
      createAdvancedJavaScriptEditor(container, defaultContent);
    }
  }
};

console.log('CodeMirror editor module loaded');

// Initialize when DOM is ready (single initialization)
function initializeOnce() {
  if (window.playgroundEditorInitialized) {
    return; // Already initialized
  }
  
  setTimeout(async () => {
    if (window.initializePlaygroundEditor && !window.playgroundEditorInitialized) {
      console.log('Calling initializePlaygroundEditor...');
      await window.initializePlaygroundEditor();
    }
  }, 100);
}

if (document.readyState !== 'loading') {
  console.log('DOM ready, attempting editor initialization');
  initializeOnce();
} else {
  console.log('DOM still loading, will wait for DOMContentLoaded');
  document.addEventListener('DOMContentLoaded', () => {
    console.log('DOMContentLoaded fired, attempting editor initialization');
    initializeOnce();
  });
}