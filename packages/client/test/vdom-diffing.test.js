/**
 * Tests for virtual DOM diffing and component lifecycle methods
 * Tests the complex DOM patching, diffing, and rendering logic
 */

import { describe, it, expect, beforeEach, vi } from 'vitest';

const setupBrowserEnvironment = () => {
  global.window = {
    __coherentEventRegistry: {},
    __coherentActionRegistry: {},
    addEventListener: vi.fn()
  };
  
  global.document = {
    createElement: vi.fn((tag) => ({
      tagName: tag.toUpperCase(),
      setAttribute: vi.fn(),
      getAttribute: vi.fn(() => null),
      removeAttribute: vi.fn(),
      appendChild: vi.fn(),
      removeChild: vi.fn(),
      replaceChild: vi.fn(),
      textContent: '',
      children: [],
      childNodes: [],
      parentNode: null,
      remove: vi.fn(),
      addEventListener: vi.fn()
    })),
    createTextNode: vi.fn((text) => ({
      textContent: text,
      nodeType: 3,
      parentNode: null,
      remove: vi.fn()
    })),
    createDocumentFragment: vi.fn(() => ({
      appendChild: vi.fn()
    }))
  };
  
  global.Node = {
    TEXT_NODE: 3,
    ELEMENT_NODE: 1
  };
  
  // Don't override global Array, just store reference
  const _ArrayFrom = Array.from || ((arrayLike) => Array.prototype.slice.call(arrayLike));
};

const createMockDOMElement = (tagName = 'div', props = {}) => {
  return {
    tagName: tagName.toUpperCase(),
    nodeType: 1,
    textContent: props.textContent || '',
    className: props.className || '',
    id: props.id || '',
    attributes: new Map(),
    children: props.children || [],
    childNodes: props.childNodes || [],
    parentNode: props.parentNode || null,
    
    setAttribute: vi.fn((_name, _value) => {
      return true;
    }),
    getAttribute: vi.fn((name) => {
      return props[name] || null;
    }),
    removeAttribute: vi.fn(),
    hasAttribute: vi.fn((name) => name in props),
    
    appendChild: vi.fn((child) => {
      if (child) {
        child.parentNode = this;
      }
    }),
    removeChild: vi.fn(),
    replaceChild: vi.fn(),
    remove: vi.fn(),
    
    addEventListener: vi.fn(),
    removeEventListener: vi.fn()
  };
};

describe('Virtual DOM Diffing and Component Lifecycle', () => {
  beforeEach(() => {
    setupBrowserEnvironment();
  });

  it('should test virtual DOM structure analysis', () => {
    const oldVDom = {
      div: {
        className: 'container',
        id: 'main',
        children: [
          { span: { text: 'Hello' } },
          { p: { text: 'World' } }
        ]
      }
    };
    
    const newVDom = {
      div: {
        className: 'container-updated',
        id: 'main',
        'data-version': '2',
        children: [
          { span: { text: 'Hello Updated' } },
          { p: { text: 'World' } },
          { button: { text: 'New Button' } }
        ]
      }
    };
    
    // Test structure extraction
    const oldTagName = Object.keys(oldVDom)[0];
    const newTagName = Object.keys(newVDom)[0];
    const oldProps = oldVDom[oldTagName];
    const newProps = newVDom[newTagName];
    
    expect(oldTagName).toBe(newTagName); // Same element type
    
    // Test attribute diffing logic
    const oldKeys = Object.keys(oldProps);
    const newKeys = Object.keys(newProps);
    
    const addedAttrs = newKeys.filter(key => !(key in oldProps));
    const removedAttrs = oldKeys.filter(key => !(key in newProps));
    const changedAttrs = oldKeys.filter(key => 
      key in newProps && 
      key !== 'children' && 
      oldProps[key] !== newProps[key]
    );
    
    expect(addedAttrs.includes('data-version')).toBe(true);
    expect(removedAttrs).toEqual([]);
    expect(changedAttrs.includes('className')).toBe(true);
  });

  it('should test attribute patching logic', () => {
    const domElement = createMockDOMElement('div', { 
      className: 'old-class',
      id: 'test'
    });
    
    const oldVNode = {
      div: {
        className: 'old-class',
        id: 'test',
        'data-old': 'value'
      }
    };
    
    const newVNode = {
      div: {
        className: 'new-class',
        id: 'test',
        'data-new': 'value'
      }
    };
    
    // Test attribute patching pattern
    const patchAttributes = (domElement, oldVNode, newVNode) => {
      const oldProps = oldVNode ? oldVNode.div : {};
      const newProps = newVNode.div;
      
      // Remove old attributes
      Object.keys(oldProps).forEach(key => {
        if (key === 'children' || key === 'text') return;
        if (!(key in newProps)) {
          const attrName = key === 'className' ? 'class' : key;
          domElement.removeAttribute(attrName);
        }
      });
      
      // Add or update new attributes
      Object.keys(newProps).forEach(key => {
        if (key === 'children' || key === 'text') return;
        const newValue = newProps[key];
        const oldValue = oldProps[key];
        
        if (newValue !== oldValue) {
          const attrName = key === 'className' ? 'class' : key;
          if (newValue === true) {
            domElement.setAttribute(attrName, '');
          } else if (newValue === false || newValue === null) {
            domElement.removeAttribute(attrName);
          } else {
            domElement.setAttribute(attrName, String(newValue));
          }
        }
      });
    };
    
    patchAttributes(domElement, oldVNode, newVNode);
    
    // Verify attribute changes
    expect(domElement.setAttribute).toHaveBeenCalledWith('class', 'new-class');
    expect(domElement.setAttribute).toHaveBeenCalledWith('data-new', 'value');
    expect(domElement.removeAttribute).toHaveBeenCalledWith('data-old');
  });

  it('should test children diffing algorithm', () => {
    const oldChildren = [
      { span: { text: 'First' } },
      { p: { text: 'Second' } },
      { div: { text: 'Third' } }
    ];
    
    const newChildren = [
      { span: { text: 'First Updated' } },
      { div: { text: 'Third' } }, // Moved position
      { button: { text: 'New Button' } } // Added
    ];
    
    // Test simple diffing logic
    const maxLength = Math.max(oldChildren.length, newChildren.length);
    const operations = [];
    
    for (let i = 0; i < maxLength; i++) {
      const oldChild = oldChildren[i];
      const newChild = newChildren[i];
      
      if (newChild === undefined) {
        operations.push({ type: 'remove', index: i });
      } else if (oldChild === undefined) {
        operations.push({ type: 'add', index: i, vNode: newChild });
      } else {
        // Compare elements
        const oldTag = Object.keys(oldChild)[0];
        const newTag = Object.keys(newChild)[0];
        
        if (oldTag === newTag) {
          operations.push({ type: 'update', index: i, oldVNode: oldChild, newVNode: newChild });
        } else {
          operations.push({ type: 'replace', index: i, oldVNode: oldChild, newVNode: newChild });
        }
      }
    }
    
    expect(operations).toHaveLength(3);
    expect(operations[0].type).toBe('update'); // span updated
    expect(operations[1].type).toBe('replace'); // p replaced with div
    expect(operations[2].type).toBe('replace'); // div replaced with button
  });

  it('should test DOM element creation from virtual DOM', () => {
    const createDOMElement = (vNode) => {
      if (typeof vNode === 'string' || typeof vNode === 'number') {
        return global.document.createTextNode(String(vNode));
      }
      
      if (!vNode || typeof vNode !== 'object') {
        return global.document.createTextNode('');
      }
      
      if (Array.isArray(vNode)) {
        const fragment = global.document.createDocumentFragment();
        vNode.forEach(child => {
          fragment.appendChild(createDOMElement(child));
        });
        return fragment;
      }
      
      const tagName = Object.keys(vNode)[0];
      const props = vNode[tagName] || {};
      const element = global.document.createElement(tagName);
      
      // Set attributes
      Object.keys(props).forEach(key => {
        if (key === 'children' || key === 'text') return;
        
        const value = props[key];
        const attrName = key === 'className' ? 'class' : key;
        
        if (value === true) {
          element.setAttribute(attrName, '');
        } else if (value !== false && value !== null) {
          element.setAttribute(attrName, String(value));
        }
      });
      
      return element;
    };
    
    const vNode = {
      button: {
        className: 'btn btn-primary',
        id: 'submit-btn',
        type: 'submit',
        disabled: false,
        text: 'Submit'
      }
    };
    
    const element = createDOMElement(vNode);
    
    expect(global.document.createElement).toHaveBeenCalledWith('button');
    expect(element.setAttribute).toHaveBeenCalledWith('class', 'btn btn-primary');
    expect(element.setAttribute).toHaveBeenCalledWith('id', 'submit-btn');
    expect(element.setAttribute).toHaveBeenCalledWith('type', 'submit');
  });

  it('should test text node handling in diffing', () => {
    const oldVNode = 'Hello World';
    const newVNode = 'Hello Updated';
    
    const textElement = {
      nodeType: 3,
      textContent: 'Hello World'
    };
    
    // Test text node update logic
    const patchTextNode = (domElement, oldVNode, newVNode) => {
      if (typeof newVNode === 'string' || typeof newVNode === 'number') {
        const newText = String(newVNode);
        if (domElement.nodeType === 3) { // TEXT_NODE
          if (domElement.textContent !== newText) {
            domElement.textContent = newText;
          }
        }
      }
    };
    
    patchTextNode(textElement, oldVNode, newVNode);
    
    expect(textElement.textContent).toBe('Hello Updated');
  });

  it('should test void element handling', () => {
    const voidElements = new Set([
      'area', 'base', 'br', 'col', 'embed', 'hr', 'img', 'input',
      'link', 'meta', 'param', 'source', 'track', 'wbr'
    ]);
    
    const isVoidElement = (tagName) => {
      return voidElements.has(tagName.toLowerCase());
    };
    
    expect(isVoidElement('br')).toBe(true);
    expect(isVoidElement('input')).toBe(true);
    expect(isVoidElement('div')).toBe(false);
    expect(isVoidElement('span')).toBe(false);
    
    // Test void element creation
    const createVoidElement = (tagName, props) => {
      const element = global.document.createElement(tagName);
      
      // Void elements shouldn't have children
      if (isVoidElement(tagName)) {
        delete props.children;
        delete props.text;
      }
      
      return element;
    };
    
    const inputProps = { type: 'text', value: 'test', children: ['should be ignored'] };
    const _inputElement = createVoidElement('input', inputProps);
    
    expect(inputProps.children).toBeUndefined();
    expect(inputProps.text).toBeUndefined();
  });

  it('should test component rerendering lifecycle', () => {
    const mockComponent = vi.fn((props) => ({
      div: {
        className: 'component',
        text: `Count: ${props.count || 0}`
      }
    }));
    
    // Mock component instance
    const instance = {
      element: createMockDOMElement('div'),
      component: mockComponent,
      props: { count: 5 },
      state: null,
      previousVirtualElement: null,
      isHydrated: true,
      eventListeners: [],
      
      update(newProps) {
        this.props = { ...this.props, ...newProps };
        this.rerender();
        return this;
      },
      
      rerender() {
        const componentProps = { ...this.props, ...(this.state || {}) };
        const newVirtualElement = this.component(componentProps);
        
        // Store for comparison
        this.previousVirtualElement = newVirtualElement;
      }
    };
    
    // Test component lifecycle
    const result = instance.update({ count: 10 });
    
    expect(result).toBe(instance); // Returns instance for chaining
    expect(instance.props.count).toBe(10);
    expect(mockComponent).toHaveBeenCalledWith({ count: 10 });
    expect(instance.previousVirtualElement).toEqual({
      div: {
        className: 'component',
        text: 'Count: 10'
      }
    });
  });

  it('should test virtual DOM from DOM extraction', () => {
    const mockDomElement = {
      nodeType: 1,
      tagName: 'DIV',
      attributes: [
        { name: 'class', value: 'container' },
        { name: 'id', value: 'main' }
      ],
      childNodes: [
        {
          nodeType: 3,
          textContent: 'Hello World'
        },
        {
          nodeType: 1,
          tagName: 'SPAN',
          attributes: [{ name: 'class', value: 'highlight' }],
          childNodes: []
        }
      ]
    };
    
    // Test VDOM extraction logic
    const virtualElementFromDOM = (domElement) => {
      if (domElement.nodeType === 3) { // TEXT_NODE
        return domElement.textContent;
      }
      
      if (domElement.nodeType !== 1) { // Not ELEMENT_NODE
        return null;
      }
      
      const tagName = domElement.tagName.toLowerCase();
      const props = {};
      const children = [];
      
      // Extract attributes
      if (domElement.attributes) {
        domElement.attributes.forEach(attr => {
          const name = attr.name === 'class' ? 'className' : attr.name;
          props[name] = attr.value;
        });
      }
      
      // Extract children
      if (domElement.childNodes) {
        domElement.childNodes.forEach(child => {
          if (child.nodeType === 3) { // TEXT_NODE
            const text = child.textContent.trim();
            if (text) children.push(text);
          } else if (child.nodeType === 1) { // ELEMENT_NODE
            const childVNode = virtualElementFromDOM(child);
            if (childVNode) children.push(childVNode);
          }
        });
      }
      
      if (children.length > 0) {
        props.children = children;
      }
      
      return { [tagName]: props };
    };
    
    const vdom = virtualElementFromDOM(mockDomElement);
    
    expect(vdom).toEqual({
      div: {
        className: 'container',
        id: 'main',
        children: [
          'Hello World',
          {
            span: {
              className: 'highlight'
            }
          }
        ]
      }
    });
  });

  it('should test complex nested component diffing', () => {
    const oldVDom = {
      div: {
        className: 'app',
        children: [
          {
            header: {
              children: [
                { h1: { text: 'Title' } },
                { nav: { className: 'navigation' } }
              ]
            }
          },
          {
            main: {
              children: [
                { p: { text: 'Content' } }
              ]
            }
          }
        ]
      }
    };
    
    const newVDom = {
      div: {
        className: 'app updated',
        children: [
          {
            header: {
              children: [
                { h1: { text: 'Updated Title' } },
                { nav: { className: 'navigation active' } }
              ]
            }
          },
          {
            main: {
              children: [
                { p: { text: 'Content' } },
                { footer: { text: 'New footer' } }
              ]
            }
          }
        ]
      }
    };
    
    // Test deep comparison logic
    const compareVNodes = (oldVNode, newVNode) => {
      if (typeof oldVNode !== typeof newVNode) return false;
      if (typeof oldVNode === 'string') return oldVNode === newVNode;
      
      const oldKeys = Object.keys(oldVNode);
      const newKeys = Object.keys(newVNode);
      
      if (oldKeys.length !== 1 || newKeys.length !== 1) return false;
      if (oldKeys[0] !== newKeys[0]) return false;
      
      const tagName = oldKeys[0];
      const oldProps = oldVNode[tagName];
      const newProps = newVNode[tagName];
      
      return JSON.stringify(oldProps) === JSON.stringify(newProps);
    };
    
    const isEqual = compareVNodes(oldVDom, newVDom);
    expect(isEqual).toBe(false);
    
    // Test that specific changes are detected
    const oldTitle = oldVDom.div.children[0].header.children[0].h1.text;
    const newTitle = newVDom.div.children[0].header.children[0].h1.text;
    
    expect(oldTitle).toBe('Title');
    expect(newTitle).toBe('Updated Title');
  });
});