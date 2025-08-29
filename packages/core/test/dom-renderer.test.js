import { test, afterAll } from 'vitest';
import { strictEqual, ok } from 'node:assert';
import { DOMRenderer } from '../../../src/rendering/dom-renderer.js';

// Minimal DOM mock to run DOMRenderer without jsdom
class MockNode {
  constructor() {
    this.childNodes = [];
  }
  appendChild(node) {
    this.childNodes.push(node);
    return node;
  }
  replaceChildren() {
    this.childNodes = [];
  }
}

class MockTextNode extends MockNode {
  constructor(text) {
    super();
    this.nodeType = 3;
    this.textContent = String(text);
  }
}

class MockElement extends MockNode {
  constructor(tagName) {
    super();
    this.nodeType = 1;
    this.tagName = tagName.toUpperCase();
    this.attributes = {};
    this.className = '';
    this._listeners = [];
    this.style = '';
  }
  setAttribute(name, value) {
    this.attributes[name] = String(value);
  }
  removeAttribute(name) {
    delete this.attributes[name];
  }
  addEventListener(type, handler) {
    // Just record; DOMRenderer also records to _listeners
    this._listeners.push({ type, handler, via: 'addEventListener' });
  }
}

class MockDocumentFragment extends MockNode {
  constructor() {
    super();
    this.isFragment = true;
  }
}

const mockDocument = {
  createElement: (tag) => new MockElement(tag),
  createElementNS: (_ns, tag) => new MockElement(tag),
  createTextNode: (text) => new MockTextNode(text),
  createDocumentFragment: () => new MockDocumentFragment(),
};

// Patch global document for tests
const realDocument = globalThis.document;
/** @type {any} */
(globalThis).document = mockDocument;

// Tests

test('DOMRenderer renders children array', () => {
  const renderer = new DOMRenderer();
  const tree = {
    div: {
      children: [
        { span: { text: 'A' } },
        { span: { text: 'B' } },
      ],
    },
  };
  const el = renderer.render(tree);
  strictEqual(el.tagName, 'DIV');
  strictEqual(el.childNodes.length, 2);
  strictEqual(el.childNodes[0].tagName, 'SPAN');
  // DOMRenderer sets element.textContent for text nodes; assert on span.textContent
  strictEqual(el.childNodes[0].textContent, 'A');
});

test('DOMRenderer renders single child when not array', () => {
  const renderer = new DOMRenderer();
  const tree = {
    div: {
      children: { span: { text: 'Only' } },
    },
  };
  const el = renderer.render(tree);
  strictEqual(el.childNodes.length, 1);
  strictEqual(el.childNodes[0].tagName, 'SPAN');
});

test('DOMRenderer supports class and className', () => {
  const renderer = new DOMRenderer();
  const withClass = renderer.render({ div: { class: 'foo' } });
  strictEqual(withClass.className, 'foo');

  const withClassName = renderer.render({ div: { className: 'bar' } });
  strictEqual(withClassName.className, 'bar');
});

test('DOMRenderer normalizes event names and records listeners', () => {
  const renderer = new DOMRenderer();
  let clicked = 0;
  const el = renderer.render({ button: { onClick: () => { clicked++; } } });
  // Listener should be recorded with lowercase type 'click'
  ok(Array.isArray(el._listeners));
  const types = el._listeners.map(l => l.type);
  ok(types.includes('click'));
  // Simulate triggering
  el._listeners.find(l => l.type === 'click').handler();
  strictEqual(clicked, 1);
});

test('DOMRenderer boolean attributes', () => {
  const renderer = new DOMRenderer();
  const el = renderer.render({ input: { disabled: true } });
  ok('disabled' in el.attributes);
  // Turning false should remove attribute
  const el2 = renderer.render({ input: { disabled: false } });
  ok(!('disabled' in el2.attributes));
});

// Restore real document after all tests complete
afterAll(() => {
  if (realDocument) {
    (globalThis).document = realDocument;
  }
});
