import { describe, it, expect, beforeEach, afterEach, vi } from 'vitest';

// Mock @coherent.js/core before importing our module
vi.mock('@coherent.js/core', () => ({
  render: vi.fn((component) => `<div>rendered</div>`)
}));

// Helper to create a minimal HTMLElement stub
function stubBrowserGlobals(defineMock) {
  globalThis.HTMLElement = class HTMLElement {
    constructor() {}
    connectedCallback() {}
    disconnectedCallback() {}
    attributeChangedCallback() {}
    hasAttribute() { return false; }
    getAttribute() { return null; }
    attachShadow() {
      const shadow = { innerHTML: '', querySelectorAll: () => [] };
      this.shadowRoot = shadow;
      return shadow;
    }
    dispatchEvent() {}
  };
  // Stub innerHTML and querySelectorAll
  Object.defineProperty(globalThis.HTMLElement.prototype, 'innerHTML', {
    get() { return this._innerHTML || ''; },
    set(val) { this._innerHTML = val; },
    configurable: true
  });
  globalThis.HTMLElement.prototype.querySelectorAll = () => [];

  globalThis.window = {
    customElements: { define: defineMock || vi.fn() }
  };
  globalThis.CustomEvent = class CustomEvent {
    constructor(type, opts) {
      this.type = type;
      this.detail = opts?.detail;
      this.bubbles = opts?.bubbles;
    }
  };
}

function cleanupBrowserGlobals(originalWindow) {
  delete globalThis.HTMLElement;
  delete globalThis.CustomEvent;
  if (originalWindow === undefined) {
    delete globalThis.window;
  } else {
    globalThis.window = originalWindow;
  }
}

describe('defineComponent', () => {
  let originalWindow;

  beforeEach(() => {
    originalWindow = globalThis.window;
  });

  afterEach(() => {
    cleanupBrowserGlobals(originalWindow);
    vi.resetModules();
  });

  it('returns placeholder on server (no window)', async () => {
    delete globalThis.window;
    const { defineComponent } = await import('../src/index.js');

    const result = defineComponent('my-element', { div: { text: 'hello' } });
    expect(result).toEqual({
      name: 'my-element',
      component: { div: { text: 'hello' } },
      options: {}
    });
  });

  it('throws when Custom Elements API not supported', async () => {
    globalThis.window = {};
    const { defineComponent } = await import('../src/index.js');

    expect(() => {
      defineComponent('my-element', { div: { text: 'test' } });
    }).toThrow('Custom Elements API not supported');
  });

  it('registers custom element with customElements.define', async () => {
    const defineMock = vi.fn();
    stubBrowserGlobals(defineMock);
    const { defineComponent } = await import('../src/index.js');

    const result = defineComponent('my-element', { div: { text: 'hello' } });
    expect(defineMock).toHaveBeenCalledWith('my-element', expect.any(Function));
    expect(result).toBeDefined();
  });

  it('registers custom element with shadow DOM option', async () => {
    const defineMock = vi.fn();
    stubBrowserGlobals(defineMock);
    const { defineComponent } = await import('../src/index.js');

    defineComponent('shadow-el', { div: { text: 'shadow' } }, { shadow: true });
    expect(defineMock).toHaveBeenCalledWith('shadow-el', expect.any(Function));
  });

  it('passes observedAttributes to the custom element class', async () => {
    const defineMock = vi.fn();
    stubBrowserGlobals(defineMock);
    const { defineComponent } = await import('../src/index.js');

    defineComponent('attr-el', () => ({ div: {} }), {
      observedAttributes: ['color', 'size']
    });

    const ElementClass = defineMock.mock.calls[0][1];
    expect(ElementClass.observedAttributes).toEqual(['color', 'size']);
  });

  it('element renders on connectedCallback', async () => {
    const defineMock = vi.fn();
    stubBrowserGlobals(defineMock);
    const { defineComponent } = await import('../src/index.js');

    defineComponent('render-el', (props) => ({ span: { text: props.label || 'default' } }), {
      defaults: { label: 'test' }
    });

    const ElementClass = defineMock.mock.calls[0][1];
    const el = new ElementClass();
    el.connectedCallback();
    // render was called, innerHTML was set
    expect(el.innerHTML).toBe('<div>rendered</div>');
  });

  it('element clears content on disconnectedCallback', async () => {
    const defineMock = vi.fn();
    stubBrowserGlobals(defineMock);
    const { defineComponent } = await import('../src/index.js');

    defineComponent('cleanup-el', { div: { text: 'hi' } });
    const ElementClass = defineMock.mock.calls[0][1];
    const el = new ElementClass();
    el.connectedCallback();
    el.disconnectedCallback();
    expect(el.innerHTML).toBe('');
  });

  it('element re-renders on attributeChangedCallback', async () => {
    const defineMock = vi.fn();
    stubBrowserGlobals(defineMock);
    const { render } = await import('@coherent.js/core');
    const { defineComponent } = await import('../src/index.js');

    defineComponent('reactive-el', (props) => ({ div: { text: props.color } }), {
      observedAttributes: ['color']
    });

    const ElementClass = defineMock.mock.calls[0][1];
    const el = new ElementClass();
    el.connectedCallback();
    const callsBefore = render.mock.calls.length;
    el.attributeChangedCallback('color', 'red', 'blue');
    expect(render.mock.calls.length).toBe(callsBefore + 1);
  });

  it('setProperty updates props and re-renders', async () => {
    const defineMock = vi.fn();
    stubBrowserGlobals(defineMock);
    const { render } = await import('@coherent.js/core');
    const { defineComponent } = await import('../src/index.js');

    defineComponent('prop-el', (props) => ({ div: { text: props.name } }), {
      defaults: { name: 'initial' }
    });

    const ElementClass = defineMock.mock.calls[0][1];
    const el = new ElementClass();
    el.connectedCallback();
    const callsBefore = render.mock.calls.length;
    el.setProperty('name', 'updated');
    expect(el.getProperties().name).toBe('updated');
    expect(render.mock.calls.length).toBe(callsBefore + 1);
  });

  it('skips attributeChangedCallback when values unchanged', async () => {
    const defineMock = vi.fn();
    stubBrowserGlobals(defineMock);
    const { render } = await import('@coherent.js/core');
    const { defineComponent } = await import('../src/index.js');

    defineComponent('skip-el', () => ({ div: {} }), {
      observedAttributes: ['x']
    });

    const ElementClass = defineMock.mock.calls[0][1];
    const el = new ElementClass();
    el.connectedCallback();
    const callsBefore = render.mock.calls.length;
    el.attributeChangedCallback('x', 'same', 'same');
    expect(render.mock.calls.length).toBe(callsBefore); // no re-render
  });
});

describe('integrateWithWebComponents', () => {
  afterEach(() => {
    delete globalThis.window;
    vi.resetModules();
  });

  it('returns object with defineComponent method', async () => {
    delete globalThis.window;
    const { integrateWithWebComponents } = await import('../src/index.js');

    const integration = integrateWithWebComponents({});
    expect(integration.defineComponent).toBeInstanceOf(Function);
  });
});

describe('defineCoherentElement', () => {
  afterEach(() => {
    delete globalThis.window;
    vi.resetModules();
  });

  it('delegates to defineComponent', async () => {
    delete globalThis.window;
    const { defineCoherentElement } = await import('../src/index.js');

    const result = defineCoherentElement('my-el', { div: { text: 'test' } });
    expect(result.name).toBe('my-el');
  });
});
