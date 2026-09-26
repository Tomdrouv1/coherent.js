/**
 * Minimal DOM for client tests.
 *
 * The repository has no jsdom/happy-dom, so this implements just enough of
 * the DOM for hydration, patching and event delegation to be tested against
 * real tree semantics: an HTML parser for server output, parent/child links,
 * attributes versus live properties (value/checked/selected), a style
 * declaration backed by the style attribute, simple selectors, and event
 * dispatch with capture and bubble phases, stopPropagation and passive
 * listeners.
 *
 * Usage:
 *   const dom = installDom();          // sets globalThis.document/window
 *   const root = dom.mount(html);      // parse into <body>, return first element
 *   dom.fire(el, 'click');             // dispatch; returns the event
 *   dom.uninstall();
 */

const VOID_ELEMENTS = new Set([
  'area', 'base', 'br', 'col', 'embed', 'hr', 'img', 'input',
  'link', 'meta', 'param', 'source', 'track', 'wbr',
]);

const RAW_TEXT_ELEMENTS = new Set(['script', 'style', 'textarea', 'title']);

const NAMED_ENTITIES = { amp: '&', lt: '<', gt: '>', quot: '"', apos: "'", nbsp: ' ' };

function decodeEntities(text) {
  return text.replace(/&(#x[0-9a-f]+|#\d+|[a-z]+);/gi, (match, body) => {
    if (body[0] === '#') {
      const code = body[1] === 'x' || body[1] === 'X'
        ? parseInt(body.slice(2), 16)
        : parseInt(body.slice(1), 10);
      return String.fromCodePoint(code);
    }
    return NAMED_ENTITIES[body.toLowerCase()] ?? match;
  });
}

function escapeText(text) {
  return text.replace(/&/g, '&amp;').replace(/</g, '&lt;').replace(/>/g, '&gt;');
}

function escapeAttr(text) {
  return escapeText(text).replace(/"/g, '&quot;');
}

// ---------------------------------------------------------------------------
// Events
// ---------------------------------------------------------------------------

export class ShimEvent {
  constructor(type, init = {}) {
    const { bubbles = true, cancelable = true, ...extra } = init;
    this.type = type;
    this.bubbles = bubbles;
    this.cancelable = cancelable;
    this.defaultPrevented = false;
    this.target = null;
    this.currentTarget = null;
    this.eventPhase = 0;
    this.propagationStopped = false;
    this.immediatePropagationStopped = false;
    this.inPassiveListener = false;
    this.path = [];
    Object.assign(this, extra);
  }

  preventDefault() {
    // Like browsers: ignored inside a passive listener.
    if (this.cancelable && !this.inPassiveListener) {
      this.defaultPrevented = true;
    }
  }

  stopPropagation() {
    this.propagationStopped = true;
  }

  stopImmediatePropagation() {
    this.propagationStopped = true;
    this.immediatePropagationStopped = true;
  }

  get cancelBubble() {
    return this.propagationStopped;
  }

  composedPath() {
    return this.path.slice();
  }
}

function normalizeListenerOptions(options) {
  if (typeof options === 'boolean') return { capture: options, passive: false, once: false };
  return {
    capture: Boolean(options?.capture),
    passive: Boolean(options?.passive),
    once: Boolean(options?.once),
  };
}

class ShimEventTarget {
  constructor() {
    this.listeners = [];
  }

  addEventListener(type, handler, options) {
    if (!handler) return;
    const opts = normalizeListenerOptions(options);
    const exists = this.listeners.some(
      (l) => l.type === type && l.handler === handler && l.capture === opts.capture
    );
    if (!exists) this.listeners.push({ type, handler, ...opts });
  }

  removeEventListener(type, handler, options) {
    const { capture } = normalizeListenerOptions(options);
    this.listeners = this.listeners.filter(
      (l) => !(l.type === type && l.handler === handler && l.capture === capture)
    );
  }

  /** Listener records for a type (test introspection). */
  listenersFor(type) {
    return this.listeners.filter((l) => l.type === type);
  }

  invokeListeners(event, phase) {
    for (const listener of this.listeners.slice()) {
      if (listener.type !== event.type) continue;
      if (phase === 'capture' && !listener.capture) continue;
      if (phase === 'bubble' && listener.capture) continue;
      if (listener.once) this.removeEventListener(listener.type, listener.handler, listener);
      event.currentTarget = this;
      event.inPassiveListener = listener.passive;
      try {
        if (typeof listener.handler === 'function') listener.handler.call(this, event);
        else listener.handler.handleEvent(event);
      } finally {
        event.inPassiveListener = false;
      }
      if (event.immediatePropagationStopped) return;
    }
  }

  dispatchEvent(event) {
    event.target = this;
    const path = [];
    for (let node = this; node; node = node.parentNode ?? (node.isDocument ? node.defaultView : null)) {
      path.push(node);
    }
    event.path = path;

    // Capture: window → parent of target
    for (let i = path.length - 1; i >= 1 && !event.propagationStopped; i--) {
      event.eventPhase = 1;
      path[i].invokeListeners(event, 'capture');
    }
    // At target: capture then bubble listeners
    if (!event.propagationStopped) {
      event.eventPhase = 2;
      this.invokeListeners(event, 'capture');
      if (!event.propagationStopped) this.invokeListeners(event, 'bubble');
    }
    // Bubble
    if (event.bubbles) {
      for (let i = 1; i < path.length && !event.propagationStopped; i++) {
        event.eventPhase = 3;
        path[i].invokeListeners(event, 'bubble');
      }
    }
    event.eventPhase = 0;
    event.currentTarget = null;
    return !event.defaultPrevented;
  }
}

// ---------------------------------------------------------------------------
// Nodes
// ---------------------------------------------------------------------------

class ShimNode extends ShimEventTarget {
  constructor(nodeType, ownerDocument) {
    super();
    this.nodeType = nodeType;
    this.ownerDocument = ownerDocument;
    this.parentNode = null;
    this.childNodes = [];
  }

  get parentElement() {
    return this.parentNode && this.parentNode.nodeType === 1 ? this.parentNode : null;
  }

  get firstChild() {
    return this.childNodes[0] ?? null;
  }

  get lastChild() {
    return this.childNodes[this.childNodes.length - 1] ?? null;
  }

  get nextSibling() {
    if (!this.parentNode) return null;
    const siblings = this.parentNode.childNodes;
    return siblings[siblings.indexOf(this) + 1] ?? null;
  }

  get previousSibling() {
    if (!this.parentNode) return null;
    const siblings = this.parentNode.childNodes;
    return siblings[siblings.indexOf(this) - 1] ?? null;
  }

  get isConnected() {
    let node = this;
    while (node.parentNode) node = node.parentNode;
    return Boolean(node.isDocument);
  }

  contains(other) {
    for (let node = other; node; node = node.parentNode) {
      if (node === this) return true;
    }
    return false;
  }

  hasChildNodes() {
    return this.childNodes.length > 0;
  }

  detach(child) {
    const index = this.childNodes.indexOf(child);
    if (index >= 0) this.childNodes.splice(index, 1);
    child.parentNode = null;
  }

  insertBefore(child, reference) {
    if (child.nodeType === 11) {
      for (const node of child.childNodes.slice()) this.insertBefore(node, reference);
      return child;
    }
    if (child.parentNode) child.parentNode.detach(child);
    const index = reference ? this.childNodes.indexOf(reference) : -1;
    if (reference && index < 0) throw new Error('NotFoundError: reference is not a child');
    if (index < 0) this.childNodes.push(child);
    else this.childNodes.splice(index, 0, child);
    child.parentNode = this;
    return child;
  }

  appendChild(child) {
    return this.insertBefore(child, null);
  }

  removeChild(child) {
    if (child.parentNode !== this) throw new Error('NotFoundError: not a child');
    this.detach(child);
    return child;
  }

  replaceChild(newChild, oldChild) {
    if (oldChild.parentNode !== this) throw new Error('NotFoundError: not a child');
    this.insertBefore(newChild, oldChild);
    this.detach(oldChild);
    return oldChild;
  }

  remove() {
    if (this.parentNode) this.parentNode.detach(this);
  }

  replaceWith(node) {
    if (this.parentNode) this.parentNode.replaceChild(node, this);
  }
}

export class ShimText extends ShimNode {
  constructor(data, ownerDocument) {
    super(3, ownerDocument);
    this.data = String(data);
    this.nodeName = '#text';
  }

  get textContent() {
    return this.data;
  }

  set textContent(value) {
    this.data = String(value);
  }

  get nodeValue() {
    return this.data;
  }

  set nodeValue(value) {
    this.data = String(value);
  }

  get outerHTML() {
    return escapeText(this.data);
  }
}

class ShimComment extends ShimNode {
  constructor(data, ownerDocument) {
    super(8, ownerDocument);
    this.data = String(data);
    this.nodeName = '#comment';
  }

  get textContent() {
    return this.data;
  }

  get outerHTML() {
    return `<!--${this.data}-->`;
  }
}

class ShimFragment extends ShimNode {
  constructor(ownerDocument) {
    super(11, ownerDocument);
    this.nodeName = '#document-fragment';
  }
}

function toKebab(prop) {
  return prop.startsWith('--') ? prop : prop.replace(/[A-Z]/g, (m) => `-${m.toLowerCase()}`);
}

function parseCss(cssText) {
  const entries = [];
  for (const decl of String(cssText || '').split(';')) {
    const colon = decl.indexOf(':');
    if (colon < 0) continue;
    const name = decl.slice(0, colon).trim();
    const value = decl.slice(colon + 1).trim();
    if (name) entries.push([name, value]);
  }
  return entries;
}

/** A CSSStyleDeclaration stand-in, stored in the element's style attribute. */
function createStyle(element) {
  const read = () => new Map(parseCss(element.getAttribute('style')));
  const write = (map) => {
    const text = [...map].map(([k, v]) => `${k}: ${v};`).join(' ');
    if (text) element.setAttribute('style', text);
    else element.removeAttribute('style');
  };
  const api = {
    get cssText() {
      return element.getAttribute('style') ?? '';
    },
    set cssText(value) {
      write(new Map(parseCss(value)));
    },
    getPropertyValue(name) {
      return read().get(name) ?? '';
    },
    setProperty(name, value) {
      const map = read();
      if (value === null || value === '') map.delete(name);
      else map.set(name, String(value));
      write(map);
    },
    removeProperty(name) {
      const map = read();
      const old = map.get(name) ?? '';
      map.delete(name);
      write(map);
      return old;
    },
    get length() {
      return read().size;
    },
  };
  return new Proxy(api, {
    get(target, prop) {
      if (prop in target) return target[prop];
      if (typeof prop !== 'string') return undefined;
      return read().get(toKebab(prop)) ?? '';
    },
    set(target, prop, value) {
      if (prop in target) {
        target[prop] = value;
        return true;
      }
      target.setProperty(toKebab(String(prop)), value);
      return true;
    },
  });
}

export class ShimElement extends ShimNode {
  constructor(tagName, ownerDocument) {
    super(1, ownerDocument);
    this.localName = tagName.toLowerCase();
    this.tagName = this.localName.toUpperCase();
    this.nodeName = this.tagName;
    this.attributeMap = new Map();
    this.style = createStyle(this);
    this.scrollTop = 0;
    this.scrollLeft = 0;
    // Live form state, separate from the attributes once touched.
    this.dirtyValue = undefined;
    this.dirtyChecked = undefined;
    this.dirtySelected = undefined;
  }

  // Attributes ------------------------------------------------------------

  getAttribute(name) {
    const value = this.attributeMap.get(String(name).toLowerCase());
    return value === undefined ? null : value;
  }

  setAttribute(name, value) {
    this.attributeMap.set(String(name).toLowerCase(), String(value));
  }

  removeAttribute(name) {
    this.attributeMap.delete(String(name).toLowerCase());
  }

  hasAttribute(name) {
    return this.attributeMap.has(String(name).toLowerCase());
  }

  getAttributeNames() {
    return [...this.attributeMap.keys()];
  }

  get attributes() {
    return [...this.attributeMap].map(([name, value]) => ({ name, value }));
  }

  get id() {
    return this.getAttribute('id') ?? '';
  }

  set id(value) {
    this.setAttribute('id', value);
  }

  get className() {
    return this.getAttribute('class') ?? '';
  }

  set className(value) {
    this.setAttribute('class', value);
  }

  get classList() {
    const element = this;
    const list = () => element.className.split(/\s+/).filter(Boolean);
    return {
      contains: (c) => list().includes(c),
      add: (...cs) => { element.className = [...new Set([...list(), ...cs])].join(' '); },
      remove: (...cs) => { element.className = list().filter((c) => !cs.includes(c)).join(' '); },
      toggle: (c) => {
        const has = list().includes(c);
        if (has) element.className = list().filter((x) => x !== c).join(' ');
        else element.className = [...list(), c].join(' ');
        return !has;
      },
    };
  }

  get name() {
    return this.getAttribute('name') ?? '';
  }

  get type() {
    if (this.localName === 'input') return (this.getAttribute('type') ?? 'text').toLowerCase();
    if (this.localName === 'button') return (this.getAttribute('type') ?? 'submit').toLowerCase();
    if (this.localName === 'select') return this.hasAttribute('multiple') ? 'select-multiple' : 'select-one';
    if (this.localName === 'textarea') return 'textarea';
    return undefined;
  }

  get disabled() {
    return this.hasAttribute('disabled');
  }

  set disabled(value) {
    if (value) this.setAttribute('disabled', '');
    else this.removeAttribute('disabled');
  }

  get href() {
    return this.getAttribute('href') ?? '';
  }

  // Live form properties -------------------------------------------------

  get value() {
    if (this.localName === 'select') {
      const options = this.querySelectorAll('option');
      const chosen = options.find((o) => o.selected) ?? options[0];
      return chosen ? chosen.value : '';
    }
    if (this.dirtyValue !== undefined) return this.dirtyValue;
    if (this.localName === 'textarea') return this.textContent;
    if (this.localName === 'option') return this.getAttribute('value') ?? this.textContent;
    return this.getAttribute('value') ?? '';
  }

  set value(value) {
    if (this.localName === 'select') {
      for (const option of this.querySelectorAll('option')) {
        option.selected = option.value === String(value);
      }
      return;
    }
    this.dirtyValue = String(value);
  }

  get checked() {
    return this.dirtyChecked !== undefined ? this.dirtyChecked : this.hasAttribute('checked');
  }

  set checked(value) {
    this.dirtyChecked = Boolean(value);
    if (value && this.type === 'radio' && this.name) {
      // Unchecking the rest of the group, like a browser.
      let root = this;
      while (root.parentNode) root = root.parentNode;
      for (const other of root.querySelectorAll(`input[type="radio"][name="${this.name}"]`)) {
        if (other !== this) other.dirtyChecked = false;
      }
    }
  }

  get selected() {
    return this.dirtySelected !== undefined ? this.dirtySelected : this.hasAttribute('selected');
  }

  set selected(value) {
    this.dirtySelected = Boolean(value);
  }

  // Tree ----------------------------------------------------------------

  get children() {
    return this.childNodes.filter((n) => n.nodeType === 1);
  }

  get firstElementChild() {
    return this.children[0] ?? null;
  }

  get childElementCount() {
    return this.children.length;
  }

  get textContent() {
    return this.childNodes
      .filter((n) => n.nodeType === 1 || n.nodeType === 3)
      .map((n) => n.textContent)
      .join('');
  }

  set textContent(value) {
    for (const child of this.childNodes.slice()) this.detach(child);
    if (value !== '' && value !== null && value !== undefined) {
      this.appendChild(new ShimText(String(value), this.ownerDocument));
    }
  }

  get innerHTML() {
    return this.childNodes.map((n) => n.outerHTML).join('');
  }

  set innerHTML(html) {
    for (const child of this.childNodes.slice()) this.detach(child);
    for (const node of parseHTML(String(html), this.ownerDocument)) this.appendChild(node);
  }

  get outerHTML() {
    const attrs = [...this.attributeMap]
      .map(([k, v]) => (v === '' ? ` ${k}` : ` ${k}="${escapeAttr(v)}"`))
      .join('');
    if (VOID_ELEMENTS.has(this.localName)) return `<${this.localName}${attrs}>`;
    return `<${this.localName}${attrs}>${this.innerHTML}</${this.localName}>`;
  }

  // Selectors -------------------------------------------------------------

  matches(selector) {
    return parseSelectorList(selector).some((complex) => matchComplex(this, complex, null));
  }

  closest(selector) {
    const list = parseSelectorList(selector);
    for (let el = this; el && el.nodeType === 1; el = el.parentElement) {
      if (list.some((complex) => matchComplex(el, complex, null))) return el;
    }
    return null;
  }

  querySelectorAll(selector) {
    const list = parseSelectorList(selector);
    const found = [];
    const visit = (node) => {
      for (const child of node.children) {
        if (list.some((complex) => matchComplex(child, complex, this))) found.push(child);
        visit(child);
      }
    };
    visit(this);
    return found;
  }

  querySelector(selector) {
    return this.querySelectorAll(selector)[0] ?? null;
  }

  // Misc ------------------------------------------------------------------

  focus() {
    this.ownerDocument.activeElement = this;
  }

  blur() {
    if (this.ownerDocument.activeElement === this) this.ownerDocument.activeElement = null;
  }

  click() {
    return this.dispatchEvent(new ShimEvent('click'));
  }

  setSelectionRange(start, end) {
    this.selectionStart = start;
    this.selectionEnd = end;
  }

  getBoundingClientRect() {
    return { top: 0, left: 0, width: 0, height: 0, right: 0, bottom: 0 };
  }

  /** A shadow root stand-in: a detached element that owns its own subtree. */
  attachShadow() {
    this.shadowRoot = new ShimElement('#shadow-root', this.ownerDocument);
    return this.shadowRoot;
  }

  get dataset() {
    const element = this;
    return new Proxy({}, {
      get(_target, prop) {
        if (typeof prop !== 'string') return undefined;
        const value = element.getAttribute(`data-${prop.replace(/[A-Z]/g, (m) => `-${m.toLowerCase()}`)}`);
        return value === null ? undefined : value;
      },
    });
  }
}

// ---------------------------------------------------------------------------
// Selectors: tag, #id, .class, [attr], [attr=v], [attr*=v], :scope,
// descendant ' ' and child '>' combinators, ',' lists.
// ---------------------------------------------------------------------------

function parseCompound(text) {
  const compound = { tag: null, ids: [], classes: [], attrs: [], scope: false };
  const re = /^(\*|[a-zA-Z][\w-]*)|#([\w-]+)|\.([\w-]+)|\[\s*([^\]=*^$~|\s]+)\s*(?:([*^$]?=)\s*("[^"]*"|'[^']*'|[^\]\s]*)\s*)?\]|:scope/g;
  let match;
  let consumed = 0;
  while ((match = re.exec(text))) {
    if (match.index !== consumed) break;
    consumed = re.lastIndex;
    if (match[1]) compound.tag = match[1] === '*' ? null : match[1].toLowerCase();
    else if (match[2]) compound.ids.push(match[2]);
    else if (match[3]) compound.classes.push(match[3]);
    else if (match[4]) {
      let value = match[6];
      if (value && (value[0] === '"' || value[0] === "'")) value = value.slice(1, -1);
      compound.attrs.push({ name: match[4].toLowerCase(), op: match[5] ?? null, value });
    } else compound.scope = true;
  }
  if (consumed !== text.length) throw new Error(`SyntaxError: unsupported selector "${text}"`);
  return compound;
}

function parseSelectorList(selector) {
  return String(selector)
    .split(',')
    .map((part) => {
      const tokens = part.trim().replace(/\s*>\s*/g, ' > ').split(/\s+/).filter(Boolean);
      const steps = [];
      let combinator = ' ';
      for (const token of tokens) {
        if (token === '>') {
          combinator = '>';
          continue;
        }
        steps.push({ combinator, compound: parseCompound(token) });
        combinator = ' ';
      }
      return steps;
    });
}

function matchCompound(el, compound, scope) {
  if (compound.scope && el !== scope) return false;
  if (compound.tag && el.localName !== compound.tag) return false;
  if (compound.ids.some((id) => el.id !== id)) return false;
  const classes = el.className.split(/\s+/);
  if (compound.classes.some((c) => !classes.includes(c))) return false;
  for (const { name, op, value } of compound.attrs) {
    const actual = el.getAttribute(name);
    if (actual === null) return false;
    if (op === '=' && actual !== value) return false;
    if (op === '*=' && !actual.includes(value)) return false;
    if (op === '^=' && !actual.startsWith(value)) return false;
    if (op === '$=' && !actual.endsWith(value)) return false;
  }
  return true;
}

function matchComplex(el, steps, scope, index = steps.length - 1) {
  const { compound, combinator } = steps[index];
  if (!matchCompound(el, compound, scope)) return false;
  if (index === 0) return true;
  if (combinator === '>') {
    const parent = el.parentElement ?? (el.parentNode === scope ? scope : null);
    return Boolean(parent) && matchComplex(parent, steps, scope, index - 1);
  }
  for (let anc = el.parentElement; anc; anc = anc.parentElement) {
    if (matchComplex(anc, steps, scope, index - 1)) return true;
  }
  return false;
}

// ---------------------------------------------------------------------------
// HTML parser (enough for server-rendered output)
// ---------------------------------------------------------------------------

export function parseHTML(html, doc) {
  const root = new ShimFragment(doc);
  const stack = [root];
  const current = () => stack[stack.length - 1];
  // `--!>` also ends a comment in HTML.
  const tagRe = /<!--([\s\S]*?)--!?>|<!doctype[^>]*>|<\/([a-zA-Z][\w-]*)\s*>|<([a-zA-Z][\w-]*)((?:\s+[^\s"'>/=]+(?:\s*=\s*(?:"[^"]*"|'[^']*'|[^\s"'=<>`]+))?)*)\s*(\/?)>/gi;
  const attrRe = /([^\s"'>/=]+)(?:\s*=\s*(?:"([^"]*)"|'([^']*)'|([^\s"'=<>`]+)))?/g;
  let last = 0;
  let match;

  const pushText = (text) => {
    if (text) current().appendChild(new ShimText(decodeEntities(text), doc));
  };

  while ((match = tagRe.exec(html))) {
    pushText(html.slice(last, match.index));
    last = tagRe.lastIndex;

    if (match[1] !== undefined) {
      current().appendChild(new ShimComment(match[1], doc));
    } else if (match[2]) {
      const name = match[2].toLowerCase();
      for (let i = stack.length - 1; i > 0; i--) {
        if (stack[i].localName === name) {
          stack.length = i;
          break;
        }
      }
    } else if (match[3]) {
      const name = match[3].toLowerCase();
      const el = new ShimElement(name, doc);
      let attr;
      attrRe.lastIndex = 0;
      while ((attr = attrRe.exec(match[4] || ''))) {
        const value = attr[2] ?? attr[3] ?? attr[4] ?? '';
        el.setAttribute(attr[1], decodeEntities(value));
      }
      current().appendChild(el);
      if (VOID_ELEMENTS.has(name) || match[5] === '/') continue;
      if (RAW_TEXT_ELEMENTS.has(name)) {
        const close = html.toLowerCase().indexOf(`</${name}`, last);
        const end = close < 0 ? html.length : close;
        const raw = html.slice(last, end);
        if (raw) el.appendChild(new ShimText(name === 'textarea' || name === 'title' ? decodeEntities(raw) : raw, doc));
        const closeEnd = close < 0 ? html.length : html.indexOf('>', close) + 1;
        tagRe.lastIndex = closeEnd;
        last = closeEnd;
        continue;
      }
      stack.push(el);
    }
  }
  pushText(html.slice(last));
  return root.childNodes.slice();
}

// ---------------------------------------------------------------------------
// Document / window
// ---------------------------------------------------------------------------

export class ShimDocument extends ShimNode {
  constructor() {
    super(9, null);
    this.isDocument = true;
    this.nodeName = '#document';
    this.ownerDocument = null;
    this.activeElement = null;
    this.documentElement = new ShimElement('html', this);
    this.head = new ShimElement('head', this);
    this.body = new ShimElement('body', this);
    this.appendChild(this.documentElement);
    this.documentElement.appendChild(this.head);
    this.documentElement.appendChild(this.body);
    this.defaultView = null;
  }

  get children() {
    return [this.documentElement];
  }

  createElement(tag) {
    return new ShimElement(tag, this);
  }

  createTextNode(text) {
    return new ShimText(text, this);
  }

  createComment(text) {
    return new ShimComment(text, this);
  }

  createDocumentFragment() {
    return new ShimFragment(this);
  }

  getElementById(id) {
    return this.documentElement.querySelector(`#${id}`);
  }

  querySelectorAll(selector) {
    const list = parseSelectorList(selector);
    const html = this.documentElement;
    const own = list.some((c) => matchComplex(html, c, null)) ? [html] : [];
    return [...own, ...html.querySelectorAll(selector)];
  }

  querySelector(selector) {
    return this.querySelectorAll(selector)[0] ?? null;
  }
}

class ShimWindow extends ShimEventTarget {
  constructor(document) {
    super();
    this.document = document;
    this.scrollX = 0;
    this.scrollY = 0;
  }

  scrollTo(x, y) {
    this.scrollX = x;
    this.scrollY = y;
  }

  getComputedStyle(el) {
    return el.style;
  }
}

/**
 * Install a fresh document and window on globalThis.
 * @returns {{ document: ShimDocument, window: ShimWindow, mount: Function, fire: Function, uninstall: Function }}
 */
export function installDom() {
  const previous = {
    document: Object.getOwnPropertyDescriptor(globalThis, 'document'),
    window: Object.getOwnPropertyDescriptor(globalThis, 'window'),
  };

  const document = new ShimDocument();
  const window = new ShimWindow(document);
  document.defaultView = window;

  Object.defineProperty(globalThis, 'document', { value: document, configurable: true, writable: true });
  Object.defineProperty(globalThis, 'window', { value: window, configurable: true, writable: true });

  return {
    document,
    window,
    /** Parse `html` into <body> and return its first element. */
    mount(html) {
      document.body.innerHTML = html;
      return document.body.firstElementChild;
    },
    /** Dispatch a bubbling, cancelable event on `target`; returns it. */
    fire(target, type, init) {
      const event = new ShimEvent(type, init);
      target.dispatchEvent(event);
      return event;
    },
    uninstall() {
      for (const key of ['document', 'window']) {
        if (previous[key]) Object.defineProperty(globalThis, key, previous[key]);
        else delete globalThis[key];
      }
    },
  };
}
