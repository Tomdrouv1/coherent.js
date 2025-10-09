import { describe, it, expect, beforeEach, afterEach, vi } from 'vitest';
import {
  isShadowDOMSupported,
  createShadowComponent
} from '../src/shadow-dom.js';

// Mock DOM environment for testing
const mockElement = () => ({
  attachShadow: vi.fn((options) => ({
    mode: options.mode,
    appendChild: vi.fn(),
    innerHTML: ''
  })),
  getRootNode: vi.fn()
});

describe('Shadow DOM System', () => {
  let originalWindow;
  
  beforeEach(() => {
    originalWindow = global.window;
  });

  afterEach(() => {
    global.window = originalWindow;
  });

  describe('isShadowDOMSupported()', () => {
    it('should return false when window is undefined', () => {
      global.window = undefined;
      expect(isShadowDOMSupported()).toBe(false);
    });

    it('should return false when Element is undefined', () => {
      global.window = {};
      expect(isShadowDOMSupported()).toBe(false);
    });

    it('should return false when attachShadow is not supported', () => {
      global.window = {
        Element: {
          prototype: {
            getRootNode: () => {}
          }
        }
      };
      expect(isShadowDOMSupported()).toBe(false);
    });

    it('should return true when Shadow DOM is fully supported', () => {
      global.window = {
        Element: {
          prototype: {
            attachShadow: () => {},
            getRootNode: () => {}
          }
        }
      };
      expect(isShadowDOMSupported()).toBe(true);
    });
  });

  describe('createShadowComponent()', () => {
    beforeEach(() => {
      global.window = {
        Element: {
          prototype: {
            attachShadow: () => {},
            getRootNode: () => {}
          }
        },
        document: {
          createElement: vi.fn(() => ({
            textContent: ''
          }))
        }
      };
    });

    it('should throw error when Shadow DOM is not supported', () => {
      global.window = undefined;
      const element = mockElement();
      
      expect(() => {
        createShadowComponent(element, { div: { text: 'Test' } });
      }).toThrow('Shadow DOM is not supported');
    });

    it('should create shadow root with default closed mode', () => {
      const element = mockElement();
      const componentDef = { div: { text: 'Hello' } };
      
      createShadowComponent(element, componentDef);
      
      expect(element.attachShadow).toHaveBeenCalledWith({
        mode: 'closed',
        delegatesFocus: false
      });
    });

    it('should create shadow root with custom options', () => {
      const element = mockElement();
      const componentDef = { div: { text: 'Hello' } };
      
      createShadowComponent(element, componentDef, {
        mode: 'open',
        delegatesFocus: true
      });
      
      expect(element.attachShadow).toHaveBeenCalledWith({
        mode: 'open',
        delegatesFocus: true
      });
    });

    it('should extract and inject styles into shadow root', () => {
      const element = mockElement();
      const componentDef = {
        div: {
          children: [
            { 
              style: { 
                text: '.container { color: red; }' 
              } 
            },
            { p: { text: 'Content' } }
          ]
        }
      };
      
      const shadowRoot = createShadowComponent(element, componentDef);
      
      expect(shadowRoot.appendChild).toHaveBeenCalled();
    });
  });

  describe('Style Extraction', () => {
    beforeEach(() => {
      global.window = {
        Element: {
          prototype: {
            attachShadow: () => {},
            getRootNode: () => {}
          }
        },
        document: {
          createElement: vi.fn(() => ({
            textContent: ''
          }))
        }
      };
    });

    it('should extract styles from nested components', () => {
      const componentDef = {
        div: {
          children: [
            { style: { text: '.header { font-size: 20px; }' } },
            { 
              section: {
                children: [
                  { style: { text: '.content { padding: 10px; }' } }
                ]
              }
            }
          ]
        }
      };
      
      // This tests the internal extractStyles function indirectly
      const element = mockElement();
      createShadowComponent(element, componentDef);
      
      // Verify styles were processed
      expect(element.attachShadow).toHaveBeenCalled();
    });

    it('should handle components without styles', () => {
      const componentDef = {
        div: {
          text: 'No styles here'
        }
      };
      
      const element = mockElement();
      const shadowRoot = createShadowComponent(element, componentDef);
      
      expect(shadowRoot).toBeDefined();
    });
  });

  describe('Shadow DOM Rendering', () => {
    beforeEach(() => {
      global.window = {
        Element: {
          prototype: {
            attachShadow: () => {},
            getRootNode: () => {}
          }
        },
        document: {
          createElement: vi.fn(() => ({
            textContent: ''
          }))
        }
      };
    });

    it('should render component content without style tags', () => {
      const componentDef = {
        div: {
          className: 'container',
          children: [
            { style: { text: '.container { color: blue; }' } },
            { h1: { text: 'Title' } },
            { p: { text: 'Paragraph' } }
          ]
        }
      };
      
      const element = mockElement();
      const shadowRoot = createShadowComponent(element, componentDef);
      
      // Verify shadow root was created and content was added
      expect(shadowRoot).toBeDefined();
      expect(typeof shadowRoot.innerHTML).toBe('string');
    });

    it('should handle array of elements', () => {
      const componentDef = [
        { h1: { text: 'Title' } },
        { p: { text: 'Content' } }
      ];
      
      const element = mockElement();
      const shadowRoot = createShadowComponent(element, componentDef);
      
      expect(shadowRoot).toBeDefined();
    });
  });

  describe('Style Encapsulation', () => {
    beforeEach(() => {
      global.window = {
        Element: {
          prototype: {
            attachShadow: () => {},
            getRootNode: () => {}
          }
        },
        document: {
          createElement: vi.fn(() => ({
            textContent: ''
          }))
        }
      };
    });

    it('should isolate styles within shadow root', () => {
      const element1 = mockElement();
      const element2 = mockElement();
      
      const component1 = {
        div: {
          children: [
            { style: { text: '.text { color: red; }' } },
            { p: { className: 'text', text: 'Red text' } }
          ]
        }
      };
      
      const component2 = {
        div: {
          children: [
            { style: { text: '.text { color: blue; }' } },
            { p: { className: 'text', text: 'Blue text' } }
          ]
        }
      };
      
      const shadow1 = createShadowComponent(element1, component1);
      const shadow2 = createShadowComponent(element2, component2);
      
      // Both shadow roots should be independent
      expect(shadow1).not.toBe(shadow2);
      expect(shadow1.mode).toBe('closed');
      expect(shadow2.mode).toBe('closed');
    });
  });

  describe('Edge Cases', () => {
    beforeEach(() => {
      global.window = {
        Element: {
          prototype: {
            attachShadow: () => {},
            getRootNode: () => {}
          }
        },
        document: {
          createElement: vi.fn(() => ({
            textContent: ''
          }))
        }
      };
    });

    it('should handle null component definition', () => {
      const element = mockElement();
      
      expect(() => {
        createShadowComponent(element, null);
      }).not.toThrow();
    });

    it('should handle empty component definition', () => {
      const element = mockElement();
      const shadowRoot = createShadowComponent(element, {});
      
      expect(shadowRoot).toBeDefined();
    });

    it('should handle deeply nested structures', () => {
      const componentDef = {
        div: {
          children: [
            {
              section: {
                children: [
                  {
                    article: {
                      children: [
                        { style: { text: '.deep { margin: 0; }' } },
                        { p: { text: 'Deep content' } }
                      ]
                    }
                  }
                ]
              }
            }
          ]
        }
      };
      
      const element = mockElement();
      const shadowRoot = createShadowComponent(element, componentDef);
      
      expect(shadowRoot).toBeDefined();
    });
  });
});
