/**
 * ErrorOverlay Tests for Coherent.js HMR
 *
 * Tests the error overlay component that displays HMR errors.
 */

import { describe, it, expect, vi, beforeEach, afterEach } from 'vitest';
import {
  escapeHtml,
  formatCodeFrame
} from '../../src/hmr/overlay.js';

describe('escapeHtml', () => {
  it('escapes ampersand', () => {
    expect(escapeHtml('foo & bar')).toBe('foo &amp; bar');
  });

  it('escapes less than', () => {
    expect(escapeHtml('<script>')).toBe('&lt;script&gt;');
  });

  it('escapes greater than', () => {
    expect(escapeHtml('a > b')).toBe('a &gt; b');
  });

  it('escapes double quotes', () => {
    expect(escapeHtml('say "hello"')).toBe('say &quot;hello&quot;');
  });

  it('escapes multiple special characters', () => {
    expect(escapeHtml('<div class="test">&</div>'))
      .toBe('&lt;div class=&quot;test&quot;&gt;&amp;&lt;/div&gt;');
  });

  it('handles empty string', () => {
    expect(escapeHtml('')).toBe('');
  });

  it('converts non-strings to string', () => {
    expect(escapeHtml(123)).toBe('123');
    expect(escapeHtml(null)).toBe('null');
  });
});

describe('formatCodeFrame', () => {
  it('formats code with line numbers', () => {
    const frame = 'const x = 1;\nconst y = 2;';
    const result = formatCodeFrame(frame, 0);

    expect(result).toContain('line-number');
    expect(result).toContain('line-content');
    expect(result).toContain('1');
    expect(result).toContain('2');
    expect(result).toContain('const x = 1;');
    expect(result).toContain('const y = 2;');
  });

  it('adds highlight class to matching line', () => {
    const frame = 'line one\nline two\nline three';
    const result = formatCodeFrame(frame, 2);

    // Check that line 2 has highlight class
    expect(result).toContain('class="line highlight"');
  });

  it('uses custom start line', () => {
    const frame = 'some code\nmore code';
    const result = formatCodeFrame(frame, 10, 10);

    expect(result).toContain('>10<');
    expect(result).toContain('>11<');
  });

  it('escapes HTML in code content', () => {
    const frame = '<div>test</div>';
    const result = formatCodeFrame(frame, 1);

    expect(result).toContain('&lt;div&gt;');
    expect(result).not.toContain('<div>test</div>');
  });

  it('returns empty string for empty frame', () => {
    expect(formatCodeFrame('', 1)).toBe('');
    expect(formatCodeFrame(null, 1)).toBe('');
    expect(formatCodeFrame(undefined, 1)).toBe('');
  });
});

describe('ErrorOverlay', () => {
  let overlay;
  let mockBody;
  let mockShadow;
  let mockLocalStorage;
  let mockElements;
  let keydownHandler;

  // Create mock DOM elements
  function createMockElement(tagName = 'div') {
    const listeners = {};
    const children = [];
    const style = {};
    const dataset = {};

    const el = {
      tagName: tagName.toUpperCase(),
      id: '',
      className: '',
      innerHTML: '',
      textContent: '',
      parentNode: null,
      style,
      dataset,
      children,
      addEventListener: vi.fn((event, handler) => {
        listeners[event] = handler;
      }),
      removeEventListener: vi.fn((event, handler) => {
        if (listeners[event] === handler) {
          delete listeners[event];
        }
      }),
      click: vi.fn(function() {
        if (listeners.click) listeners.click({ target: el });
      }),
      appendChild: vi.fn((child) => {
        children.push(child);
        child.parentNode = el;
        return child;
      }),
      removeChild: vi.fn((child) => {
        const idx = children.indexOf(child);
        if (idx >= 0) children.splice(idx, 1);
        child.parentNode = null;
        return child;
      }),
      remove: vi.fn(function() {
        el.parentNode = null;
      }),
      querySelector: vi.fn((selector) => mockElements.get(selector)),
      querySelectorAll: vi.fn((selector) => {
        const found = mockElements.get(selector);
        return found ? [found] : [];
      }),
      attachShadow: vi.fn(() => mockShadow),
      _listeners: listeners
    };
    return el;
  }

  beforeEach(async () => {
    // Create mock elements registry
    mockElements = new Map();

    // Create mock Shadow DOM
    mockShadow = {
      mode: 'open',
      appendChild: vi.fn(),
      querySelector: vi.fn((selector) => mockElements.get(selector)),
      querySelectorAll: vi.fn((selector) => {
        const el = mockElements.get(selector);
        return el ? [el] : [];
      })
    };

    // Create mock body
    mockBody = createMockElement('body');

    // Create mock localStorage
    mockLocalStorage = {
      store: {},
      getItem: vi.fn((key) => mockLocalStorage.store[key] || null),
      setItem: vi.fn((key, value) => { mockLocalStorage.store[key] = value; }),
      removeItem: vi.fn((key) => { delete mockLocalStorage.store[key]; }),
      clear: vi.fn(() => { mockLocalStorage.store = {}; })
    };

    // Setup global mocks
    global.localStorage = mockLocalStorage;
    global.window = { open: vi.fn() };
    global.document = {
      createElement: vi.fn((tag) => {
        if (tag === 'div') return createMockElement('div');
        if (tag === 'style') return createMockElement('style');
        return createMockElement(tag);
      }),
      getElementById: vi.fn(() => null),
      body: mockBody,
      addEventListener: vi.fn((event, handler) => {
        if (event === 'keydown') {
          keydownHandler = handler;
        }
      }),
      removeEventListener: vi.fn((event, handler) => {
        if (event === 'keydown' && keydownHandler === handler) {
          keydownHandler = null;
        }
      }),
      dispatchEvent: vi.fn((event) => {
        if (event.type === 'keydown' && keydownHandler) {
          keydownHandler(event);
        }
      })
    };

    // Dynamically import ErrorOverlay after mocks are set up
    const module = await import('../../src/hmr/overlay.js');
    const ErrorOverlay = module.ErrorOverlay;
    overlay = new ErrorOverlay();
  });

  afterEach(() => {
    overlay?.hide?.();
    delete global.localStorage;
    delete global.window;
    delete global.document;
    keydownHandler = null;
  });

  describe('createOverlay', () => {
    it('creates element with Shadow DOM', () => {
      const result = overlay.createOverlay();

      expect(result.host).toBeTruthy();
      expect(result.host.id).toBe('coherent-error-overlay');
      expect(result.shadow).toBeTruthy();
      expect(result.shadow.mode).toBe('open');
    });

    it('returns same overlay on subsequent calls', () => {
      const first = overlay.createOverlay();
      const second = overlay.createOverlay();

      expect(first).toBe(second);
    });

    it('attaches shadow DOM with open mode', () => {
      overlay.createOverlay();

      // Verify attachShadow was called (in the actual implementation)
      expect(overlay.overlay.shadow).toBeTruthy();
    });
  });

  describe('show', () => {
    beforeEach(() => {
      // Setup mock elements that show() will create
      const mockCloseBtn = createMockElement('button');
      mockCloseBtn.className = 'close-btn';
      mockElements.set('.close-btn', mockCloseBtn);

      const mockBackdrop = createMockElement('div');
      mockBackdrop.className = 'backdrop';
      mockElements.set('.backdrop', mockBackdrop);

      const mockMessage = createMockElement('div');
      mockMessage.className = 'message';
      mockElements.set('.message', mockMessage);

      const mockWrapper = createMockElement('div');
      mockWrapper.className = 'wrapper';
      mockElements.set('.wrapper', mockWrapper);
    });

    it('appends host to document body', () => {
      overlay.show({ message: 'Test error' });

      expect(mockBody.appendChild).toHaveBeenCalled();
    });

    it('adds keydown listener for Escape key', () => {
      overlay.show({ message: 'Test error' });

      expect(global.document.addEventListener).toHaveBeenCalledWith('keydown', expect.any(Function));
      expect(overlay.escapeHandler).toBeTruthy();
    });

    it('stores error info in overlay', () => {
      overlay.show({ message: 'Test error', file: '/src/app.js', line: 10 });

      expect(overlay.overlay).toBeTruthy();
    });
  });

  describe('hide', () => {
    it('removes element from DOM', () => {
      overlay.show({ message: 'Error' });
      const host = overlay.overlay.host;
      host.parentNode = mockBody;

      overlay.hide();

      expect(host.parentNode).toBeNull();
    });

    it('removes escape key listener', () => {
      overlay.show({ message: 'Error' });

      overlay.hide();

      expect(global.document.removeEventListener).toHaveBeenCalledWith('keydown', expect.any(Function));
      expect(overlay.escapeHandler).toBeNull();
    });

    it('is safe to call when not showing', () => {
      expect(() => overlay.hide()).not.toThrow();
    });

    it('resets overlay reference for recreation', () => {
      overlay.show({ message: 'Error' });

      overlay.hide();

      expect(overlay.overlay).toBeNull();
    });
  });

  describe('dismissal', () => {
    beforeEach(() => {
      const mockCloseBtn = createMockElement('button');
      mockElements.set('.close-btn', mockCloseBtn);

      const mockBackdrop = createMockElement('div');
      mockElements.set('.backdrop', mockBackdrop);
    });

    it('Escape key hides overlay', () => {
      overlay.show({ message: 'Error' });
      overlay.overlay.host.parentNode = mockBody;

      // Simulate Escape key
      const event = { key: 'Escape', type: 'keydown' };
      keydownHandler(event);

      expect(overlay.overlay).toBeNull();
    });

    it('other keys do not hide overlay', () => {
      overlay.show({ message: 'Error' });
      const overlayRef = overlay.overlay;

      // Simulate Enter key
      const event = { key: 'Enter', type: 'keydown' };
      keydownHandler(event);

      expect(overlay.overlay).toBe(overlayRef);
    });
  });

  describe('setEditor', () => {
    it('stores editor preference in localStorage', () => {
      overlay.setEditor('cursor');

      expect(mockLocalStorage.setItem).toHaveBeenCalledWith('coherent-editor', 'cursor');
    });

    it('updates instance editor property', () => {
      overlay.setEditor('webstorm');

      expect(overlay.editor).toBe('webstorm');
    });
  });

  describe('openInEditor', () => {
    it('opens vscode URL by default', () => {
      overlay.openInEditor('/src/app.js', 10);

      expect(global.window.open).toHaveBeenCalledWith('vscode://file//src/app.js:10', '_self');
    });

    it('opens cursor URL when editor is cursor', () => {
      overlay.setEditor('cursor');
      overlay.openInEditor('/src/app.js', 15);

      expect(global.window.open).toHaveBeenCalledWith('cursor://file//src/app.js:15', '_self');
    });

    it('opens atom URL with correct format', () => {
      overlay.setEditor('atom');
      overlay.openInEditor('/src/app.js', 20);

      expect(global.window.open).toHaveBeenCalledWith(
        'atom://core/open/file?filename=/src/app.js&line=20',
        '_self'
      );
    });

    it('opens vscode-insiders URL', () => {
      overlay.setEditor('vscode-insiders');
      overlay.openInEditor('/src/app.js', 5);

      expect(global.window.open).toHaveBeenCalledWith(
        'vscode-insiders://file//src/app.js:5',
        '_self'
      );
    });

    it('opens sublime URL', () => {
      overlay.setEditor('sublime');
      overlay.openInEditor('/src/app.js', 5);

      expect(global.window.open).toHaveBeenCalledWith(
        'subl://open?url=file:///src/app.js&line=5',
        '_self'
      );
    });

    it('opens webstorm URL', () => {
      overlay.setEditor('webstorm');
      overlay.openInEditor('/src/app.js', 5);

      expect(global.window.open).toHaveBeenCalledWith(
        'webstorm://open?file=/src/app.js&line=5',
        '_self'
      );
    });

    it('opens idea URL', () => {
      overlay.setEditor('idea');
      overlay.openInEditor('/src/app.js', 5);

      expect(global.window.open).toHaveBeenCalledWith(
        'idea://open?file=/src/app.js&line=5',
        '_self'
      );
    });

    it('uses line 1 as default', () => {
      overlay.openInEditor('/src/app.js');

      expect(global.window.open).toHaveBeenCalledWith('vscode://file//src/app.js:1', '_self');
    });

    it('falls back to vscode for unknown editor', () => {
      overlay.setEditor('unknown-editor');
      overlay.openInEditor('/src/app.js', 5);

      expect(global.window.open).toHaveBeenCalledWith('vscode://file//src/app.js:5', '_self');
    });
  });
});

describe('errorOverlay singleton', () => {
  beforeEach(() => {
    global.localStorage = {
      getItem: vi.fn(() => null),
      setItem: vi.fn()
    };
  });

  afterEach(() => {
    delete global.localStorage;
  });

  it('is exported', async () => {
    const { errorOverlay, ErrorOverlay } = await import('../../src/hmr/overlay.js');
    expect(errorOverlay).toBeInstanceOf(ErrorOverlay);
  });
});
