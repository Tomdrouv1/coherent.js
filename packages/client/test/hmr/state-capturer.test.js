/**
 * StateCapturer Tests for Coherent.js HMR
 *
 * Tests the form state capture/restore and scroll position preservation
 * functionality for HMR updates.
 */

import { describe, it, expect, vi, beforeEach, afterEach } from 'vitest';
import { StateCapturer, stateCapturer } from '../../src/hmr/state-capturer.js';

describe('StateCapturer', () => {
  let capturer;
  let mockDocument;
  let mockWindow;
  let originalDocument;
  let originalWindow;

  beforeEach(() => {
    capturer = new StateCapturer();

    // Save originals
    originalDocument = global.document;
    originalWindow = global.window;

    // Create mock document
    mockDocument = {
      body: {
        scrollHeight: 1000,
        scrollWidth: 800,
      },
      querySelectorAll: vi.fn(() => []),
      querySelector: vi.fn(() => null),
      getElementById: vi.fn(() => null),
      activeElement: null,
    };

    // Create mock window
    mockWindow = {
      scrollX: 0,
      scrollY: 0,
      scrollTo: vi.fn(),
      getComputedStyle: vi.fn(() => ({
        overflow: 'visible',
        overflowX: 'visible',
        overflowY: 'visible',
      })),
    };

    global.document = mockDocument;
    global.window = mockWindow;
  });

  afterEach(() => {
    global.document = originalDocument;
    global.window = originalWindow;
  });

  describe('getInputKey', () => {
    it('returns id-based key when input has id', () => {
      const input = {
        id: 'username',
        name: 'user',
        type: 'text',
      };

      const key = capturer.getInputKey(input);

      expect(key).toBe('#username');
    });

    it('returns name+type key when no id', () => {
      const input = {
        id: '',
        name: 'email',
        type: 'email',
      };

      const key = capturer.getInputKey(input);

      expect(key).toBe('[name="email"]:[type="email"]');
    });

    it('includes form context when input is in a form with id', () => {
      const input = {
        id: '',
        name: 'password',
        type: 'password',
        form: { id: 'login-form' },
      };

      const key = capturer.getInputKey(input);

      expect(key).toContain('[name="password"]');
      expect(key).toContain('[type="password"]');
      expect(key).toContain('form#login-form');
    });

    it('falls back to DOM path when no id, name, or type', () => {
      // Build a proper mock chain with querySelectorAll at each level
      const grandparent = {
        tagName: 'BODY',
        className: '',
        parentElement: null,
        querySelectorAll: vi.fn(() => []),
      };

      const mockParent = {
        tagName: 'DIV',
        className: '',
        parentElement: grandparent,
        querySelectorAll: vi.fn(() => []),
      };

      const input = {
        id: '',
        name: '',
        type: '', // No type either
        tagName: 'INPUT',
        className: '',
        parentElement: mockParent,
      };

      // Set up querySelectorAll to return the input as only sibling
      mockParent.querySelectorAll = vi.fn(() => [input]);
      grandparent.querySelectorAll = vi.fn(() => [mockParent]);

      // Make document.body be the grandparent
      mockDocument.body = grandparent;

      const key = capturer.getInputKey(input);

      // Should have DOM path since no id, name, or type
      expect(key).toContain('input');
    });

    it('uses type when no id or name', () => {
      const input = {
        id: '',
        name: '',
        type: 'text',
        tagName: 'INPUT',
      };

      const key = capturer.getInputKey(input);

      // When only type is available, it's used as the key
      expect(key).toBe('[type="text"]');
    });
  });

  describe('getElementPath', () => {
    it('builds path with tag names', () => {
      // Create a proper mock DOM chain
      const body = {
        tagName: 'BODY',
        className: '',
        parentElement: null,
        querySelectorAll: vi.fn(() => []),
      };

      const grandparent = {
        tagName: 'FORM',
        className: '',
        parentElement: body,
        querySelectorAll: vi.fn(() => []),
      };
      body.querySelectorAll = vi.fn(() => [grandparent]);

      const parent = {
        tagName: 'DIV',
        className: 'form-group',
        parentElement: grandparent,
        querySelectorAll: vi.fn(() => []),
      };
      grandparent.querySelectorAll = vi.fn(() => [parent]);

      const element = {
        tagName: 'INPUT',
        className: '',
        parentElement: parent,
        querySelectorAll: vi.fn(() => []),
      };
      parent.querySelectorAll = vi.fn(() => [element]);

      mockDocument.body = body;

      const path = capturer.getElementPath(element);

      expect(path).toContain('input');
      expect(path).toContain('div');
      expect(path).toContain('form');
    });

    it('adds nth-of-type for multiple siblings', () => {
      const body = {
        tagName: 'BODY',
        className: '',
        parentElement: null,
        querySelectorAll: vi.fn(() => []),
      };

      const sibling1 = {
        tagName: 'INPUT',
        className: '',
        querySelectorAll: vi.fn(() => []),
      };
      const sibling2 = {
        tagName: 'INPUT',
        className: '',
        querySelectorAll: vi.fn(() => []),
      };

      const parent = {
        tagName: 'DIV',
        className: '',
        parentElement: body,
        querySelectorAll: vi.fn(() => [sibling1, sibling2]),
      };
      body.querySelectorAll = vi.fn(() => [parent]);

      sibling1.parentElement = parent;
      sibling2.parentElement = parent;

      mockDocument.body = body;

      const path = capturer.getElementPath(sibling2);

      expect(path).toMatch(/nth-of-type\(2\)/);
    });
  });

  describe('captureFormState', () => {
    it('captures input values', () => {
      const mockInput = {
        id: 'email',
        value: 'test@example.com',
        type: 'email',
        tagName: 'INPUT',
      };

      mockDocument.querySelectorAll = vi.fn(() => [mockInput]);

      capturer.captureFormState();

      expect(capturer.capturedInputs.has('#email')).toBe(true);
      expect(capturer.capturedInputs.get('#email').value).toBe('test@example.com');
    });

    it('captures selection for text inputs', () => {
      const mockInput = {
        id: 'search',
        value: 'hello world',
        type: 'text',
        tagName: 'INPUT',
        selectionStart: 2,
        selectionEnd: 5,
      };

      mockDocument.querySelectorAll = vi.fn(() => [mockInput]);

      capturer.captureFormState();

      const state = capturer.capturedInputs.get('#search');
      expect(state.selectionStart).toBe(2);
      expect(state.selectionEnd).toBe(5);
    });

    it('captures checked state for checkboxes', () => {
      const mockCheckbox = {
        id: 'agree',
        value: 'on',
        type: 'checkbox',
        tagName: 'INPUT',
        checked: true,
      };

      mockDocument.querySelectorAll = vi.fn(() => [mockCheckbox]);

      capturer.captureFormState();

      const state = capturer.capturedInputs.get('#agree');
      expect(state.checked).toBe(true);
    });

    it('captures textarea values', () => {
      const mockTextarea = {
        id: 'message',
        value: 'Hello, this is a message',
        type: undefined,
        tagName: 'TEXTAREA',
        selectionStart: 0,
        selectionEnd: 0,
      };

      mockDocument.querySelectorAll = vi.fn(() => [mockTextarea]);

      capturer.captureFormState();

      const state = capturer.capturedInputs.get('#message');
      expect(state.value).toBe('Hello, this is a message');
      expect(state.type).toBe('textarea');
    });
  });

  describe('restoreFormState', () => {
    it('restores values to matching inputs', () => {
      const mockInput = {
        id: 'username',
        value: '',
        type: 'text',
        tagName: 'INPUT',
      };

      // Capture state
      capturer.capturedInputs.set('#username', {
        value: 'restored_value',
        type: 'text',
      });

      mockDocument.getElementById = vi.fn((id) => {
        if (id === 'username') return mockInput;
        return null;
      });

      capturer.restoreFormState();

      expect(mockInput.value).toBe('restored_value');
    });

    it('restores checkbox checked state', () => {
      const mockCheckbox = {
        id: 'remember',
        value: 'on',
        type: 'checkbox',
        tagName: 'INPUT',
        checked: false,
      };

      capturer.capturedInputs.set('#remember', {
        value: 'on',
        type: 'checkbox',
        checked: true,
      });

      mockDocument.getElementById = vi.fn((id) => {
        if (id === 'remember') return mockCheckbox;
        return null;
      });

      capturer.restoreFormState();

      expect(mockCheckbox.checked).toBe(true);
    });

    it('does not restore if type mismatch', () => {
      const mockInput = {
        id: 'field',
        value: '',
        type: 'number', // Different type
        tagName: 'INPUT',
      };

      capturer.capturedInputs.set('#field', {
        value: 'text_value',
        type: 'text', // Was text, now number
      });

      mockDocument.getElementById = vi.fn((id) => {
        if (id === 'field') return mockInput;
        return null;
      });

      capturer.restoreFormState();

      expect(mockInput.value).toBe(''); // Not restored
    });

    it('restores selection range when input is not focused', () => {
      const mockInput = {
        id: 'search',
        value: 'hello',
        type: 'text',
        tagName: 'INPUT',
        setSelectionRange: vi.fn(),
      };

      capturer.capturedInputs.set('#search', {
        value: 'hello',
        type: 'text',
        selectionStart: 1,
        selectionEnd: 3,
      });

      mockDocument.getElementById = vi.fn(() => mockInput);
      mockDocument.activeElement = { id: 'other-element' }; // Not focused

      capturer.restoreFormState();

      expect(mockInput.setSelectionRange).toHaveBeenCalledWith(1, 3);
    });
  });

  describe('captureScrollPositions', () => {
    it('captures window scroll position', () => {
      mockWindow.scrollX = 100;
      mockWindow.scrollY = 250;

      capturer.captureScrollPositions();

      const windowPos = capturer.scrollPositions.get('window');
      expect(windowPos.top).toBe(250);
      expect(windowPos.left).toBe(100);
    });

    it('captures marked scrollable containers', () => {
      const mockScrollable = {
        id: 'sidebar',
        scrollTop: 150,
        scrollLeft: 0,
        getAttribute: vi.fn((attr) => {
          if (attr === 'data-coherent-scroll-preserve') return 'true';
          return null;
        }),
      };

      mockDocument.querySelectorAll = vi.fn((selector) => {
        if (selector === '[data-coherent-scroll-preserve]') {
          return [mockScrollable];
        }
        return [];
      });

      capturer.captureScrollPositions();

      expect(capturer.scrollPositions.has('#sidebar')).toBe(true);
      expect(capturer.scrollPositions.get('#sidebar').top).toBe(150);
    });
  });

  describe('captureLayout', () => {
    it('captures body dimensions', () => {
      mockDocument.body.scrollHeight = 2000;
      mockDocument.body.scrollWidth = 1200;
      mockDocument.querySelectorAll = vi.fn(() => []);

      capturer.captureLayout();

      expect(capturer.layoutSnapshot.bodyHeight).toBe(2000);
      expect(capturer.layoutSnapshot.bodyWidth).toBe(1200);
    });

    it('captures component anchor positions', () => {
      const mockComponent = {
        id: 'main-content',
        getAttribute: vi.fn((attr) => {
          if (attr === 'data-coherent-component') return 'MainContent';
          return null;
        }),
        getBoundingClientRect: vi.fn(() => ({
          top: 100,
          left: 50,
          width: 800,
          height: 600,
        })),
      };

      mockDocument.querySelectorAll = vi.fn((selector) => {
        if (selector === '[data-coherent-component]') {
          return [mockComponent];
        }
        return [];
      });

      capturer.captureLayout();

      expect(capturer.layoutSnapshot.anchors.size).toBe(1);
      const anchor = capturer.layoutSnapshot.anchors.get('#main-content');
      expect(anchor.top).toBe(100);
      expect(anchor.left).toBe(50);
    });
  });

  describe('layoutChangedSignificantly', () => {
    it('returns false when no layout snapshot exists', () => {
      capturer.layoutSnapshot = null;

      const result = capturer.layoutChangedSignificantly();

      expect(result).toBe(false);
    });

    it('returns false for minor body height changes (<50px)', () => {
      capturer.layoutSnapshot = {
        bodyHeight: 1000,
        bodyWidth: 800,
        anchors: new Map(),
      };

      mockDocument.body.scrollHeight = 1030; // Only 30px change
      mockDocument.body.scrollWidth = 800;

      const result = capturer.layoutChangedSignificantly();

      expect(result).toBe(false);
    });

    it('returns true for significant body height changes (>50px)', () => {
      capturer.layoutSnapshot = {
        bodyHeight: 1000,
        bodyWidth: 800,
        anchors: new Map(),
      };

      mockDocument.body.scrollHeight = 1200; // 200px change
      mockDocument.body.scrollWidth = 800;

      const result = capturer.layoutChangedSignificantly();

      expect(result).toBe(true);
    });

    it('returns true for significant anchor position changes', () => {
      const mockComponent = {
        getBoundingClientRect: vi.fn(() => ({
          top: 200, // Was 100, now 200 - 100px change
          left: 50,
          width: 800,
          height: 600,
        })),
      };

      capturer.layoutSnapshot = {
        bodyHeight: 1000,
        bodyWidth: 800,
        anchors: new Map([
          ['#main', { top: 100, left: 50, width: 800, height: 600 }],
        ]),
      };

      mockDocument.body.scrollHeight = 1000;
      mockDocument.body.scrollWidth = 800;
      mockDocument.getElementById = vi.fn(() => mockComponent);

      const result = capturer.layoutChangedSignificantly();

      expect(result).toBe(true);
    });

    it('returns false when anchor moves less than 50px', () => {
      const mockComponent = {
        getBoundingClientRect: vi.fn(() => ({
          top: 130, // Only 30px change
          left: 50,
          width: 800,
          height: 600,
        })),
      };

      capturer.layoutSnapshot = {
        bodyHeight: 1000,
        bodyWidth: 800,
        anchors: new Map([
          ['#main', { top: 100, left: 50, width: 800, height: 600 }],
        ]),
      };

      mockDocument.body.scrollHeight = 1000;
      mockDocument.body.scrollWidth = 800;
      mockDocument.getElementById = vi.fn(() => mockComponent);

      const result = capturer.layoutChangedSignificantly();

      expect(result).toBe(false);
    });
  });

  describe('restoreScrollPositions', () => {
    it('restores window scroll position', () => {
      capturer.scrollPositions.set('window', { top: 500, left: 100 });
      capturer.layoutSnapshot = {
        bodyHeight: 1000,
        bodyWidth: 800,
        anchors: new Map(),
      };

      mockDocument.body.scrollHeight = 1000;
      mockDocument.body.scrollWidth = 800;

      capturer.restoreScrollPositions();

      expect(mockWindow.scrollTo).toHaveBeenCalledWith(100, 500);
    });

    it('skips restoration when layout changed significantly', () => {
      const consoleSpy = vi.spyOn(console, 'log').mockImplementation(() => {});

      capturer.scrollPositions.set('window', { top: 500, left: 0 });
      capturer.layoutSnapshot = {
        bodyHeight: 1000,
        bodyWidth: 800,
        anchors: new Map(),
      };

      mockDocument.body.scrollHeight = 2000; // Significant change

      capturer.restoreScrollPositions();

      expect(mockWindow.scrollTo).not.toHaveBeenCalled();
      expect(consoleSpy).toHaveBeenCalledWith(
        expect.stringContaining('[HMR] Layout changed significantly')
      );

      consoleSpy.mockRestore();
    });

    it('restores container scroll positions', () => {
      const mockContainer = {
        scrollTop: 0,
        scrollLeft: 0,
      };

      capturer.scrollPositions.set('window', { top: 0, left: 0 });
      capturer.scrollPositions.set('#sidebar', { top: 200, left: 0 });
      capturer.layoutSnapshot = {
        bodyHeight: 1000,
        bodyWidth: 800,
        anchors: new Map(),
      };

      mockDocument.body.scrollHeight = 1000;
      mockDocument.body.scrollWidth = 800;
      mockDocument.getElementById = vi.fn(() => mockContainer);

      capturer.restoreScrollPositions();

      expect(mockContainer.scrollTop).toBe(200);
    });
  });

  describe('captureAll', () => {
    it('calls all capture methods', () => {
      const captureFormSpy = vi.spyOn(capturer, 'captureFormState');
      const captureScrollSpy = vi.spyOn(capturer, 'captureScrollPositions');
      const captureLayoutSpy = vi.spyOn(capturer, 'captureLayout');

      mockDocument.querySelectorAll = vi.fn(() => []);

      capturer.captureAll();

      expect(captureFormSpy).toHaveBeenCalled();
      expect(captureScrollSpy).toHaveBeenCalled();
      expect(captureLayoutSpy).toHaveBeenCalled();
    });
  });

  describe('restoreAll', () => {
    it('calls all restore methods', () => {
      const restoreFormSpy = vi.spyOn(capturer, 'restoreFormState');
      const restoreScrollSpy = vi.spyOn(capturer, 'restoreScrollPositions');

      capturer.layoutSnapshot = {
        bodyHeight: 1000,
        bodyWidth: 800,
        anchors: new Map(),
      };
      mockDocument.body.scrollHeight = 1000;
      mockDocument.body.scrollWidth = 800;

      capturer.restoreAll();

      expect(restoreFormSpy).toHaveBeenCalled();
      expect(restoreScrollSpy).toHaveBeenCalled();
    });
  });

  describe('clear', () => {
    it('clears all captured state', () => {
      capturer.capturedInputs.set('test', { value: 'test' });
      capturer.scrollPositions.set('window', { top: 100, left: 0 });
      capturer.layoutSnapshot = { bodyHeight: 1000 };

      capturer.clear();

      expect(capturer.capturedInputs.size).toBe(0);
      expect(capturer.scrollPositions.size).toBe(0);
      expect(capturer.layoutSnapshot).toBeNull();
    });
  });

  describe('singleton export', () => {
    it('stateCapturer is a StateCapturer instance', () => {
      expect(stateCapturer).toBeInstanceOf(StateCapturer);
    });
  });
});
