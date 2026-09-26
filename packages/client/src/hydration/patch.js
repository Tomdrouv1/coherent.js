/**
 * DOM patching for hydrated components.
 *
 * Diffs the previous virtual tree against the next one and applies the
 * difference to the DOM the previous tree produced: attributes and live form
 * properties, text, raw HTML, and children — added, removed, replaced, and
 * matched by `key` when every sibling has one.
 *
 * Attribute values follow core's renderer: functions are called, style
 * objects become `prop: value` declarations, `true` is a bare attribute and
 * `false`/`null`/`undefined` remove it. `key`, `children`, `text`, `html` and
 * `on*` handlers are never attributes.
 *
 * @module @coherent.js/client/hydration/patch
 */

import {
  isElementVNode,
  readElement,
  getRenderedChildren,
  getSignificantDOMChildren,
  resolveAttributeValue,
} from './vnode.js';

const SVG_NS = 'http://www.w3.org/2000/svg';

/** Props that are content or identity, never attributes. */
const NON_ATTRIBUTE_PROPS = new Set(['children', 'text', 'html', 'key']);

/** Prop names that differ from their attribute name. */
const ATTRIBUTE_NAMES = { className: 'class', htmlFor: 'for' };

/** Form state that lives in properties once the user has touched a field. */
const LIVE_PROPERTIES = new Set(['value', 'checked', 'selected']);

function isEventProp(name, value) {
  return name.startsWith('on') && typeof value === 'function';
}

function toKebabCase(property) {
  return property.startsWith('--')
    ? property
    : property.replace(/[A-Z]/g, (m) => `-${m.toLowerCase()}`);
}

/**
 * Serialise a style object like core's formatAttributes does.
 * @param {Object} style
 * @returns {string}
 */
export function styleToCss(style) {
  return Object.entries(style)
    .filter(([, value]) => value !== null && value !== undefined && value !== false)
    .map(([property, value]) => `${toKebabCase(property)}: ${value}`)
    .join('; ');
}

/**
 * The attributes a props object renders, as name → string ('' for a bare
 * attribute). Omitted names are absent.
 * @param {Object} props
 * @returns {Map<string, string>}
 */
function renderedAttributes(props) {
  const attributes = new Map();

  for (const [name, raw] of Object.entries(props)) {
    if (NON_ATTRIBUTE_PROPS.has(name) || isEventProp(name, raw)) continue;

    const value = resolveAttributeValue(raw);
    const attrName = ATTRIBUTE_NAMES[name] ?? name;

    if (attrName === 'style' && value && typeof value === 'object') {
      const css = styleToCss(value);
      if (css) attributes.set('style', css);
    } else if (value === true) {
      attributes.set(attrName, '');
    } else if (value !== false && value !== null && value !== undefined) {
      attributes.set(attrName, String(value));
    }
  }

  return attributes;
}

/**
 * Bring an element's live form properties in line with its props. Setting the
 * attribute alone does not change a field the user has edited.
 */
function applyLiveProperties(element, props) {
  for (const name of LIVE_PROPERTIES) {
    if (!(name in props) || !(name in element)) continue;

    const value = resolveAttributeValue(props[name]);
    if (name === 'value') {
      const next = value === null || value === undefined ? '' : String(value);
      if (element.value !== next) element.value = next;
    } else {
      const next = Boolean(value);
      if (element[name] !== next) element[name] = next;
    }
  }
}

function setAttributes(element, previous, next) {
  for (const name of previous.keys()) {
    if (!next.has(name)) element.removeAttribute(name);
  }
  for (const [name, value] of next) {
    if (element.getAttribute(name) !== value) element.setAttribute(name, value);
  }
}

function setRawHTML(element, html) {
  if (element.innerHTML !== html) element.innerHTML = html;
}

/**
 * Create DOM nodes for raw HTML.
 * @returns {Node[]}
 */
function nodesFromHTML(html, doc) {
  const holder = doc.createElement('div');
  holder.innerHTML = html;
  return Array.from(holder.childNodes);
}

/**
 * Create DOM nodes for one rendered child (see getRenderedChildren).
 * @returns {Node[]}
 */
function createNodes(item, doc, namespace) {
  if (item.type === 'text') return [doc.createTextNode(item.text)];
  if (item.type === 'element') return [createElement(item.vNode, doc, namespace)];
  // A component taking arguments cannot be run here; it renders nothing.
  return item.html === undefined ? [] : nodesFromHTML(item.html, doc);
}

/**
 * Create a DOM element (and its subtree) from an element virtual node.
 * @param {Object} vNode
 * @param {Document} [doc=document]
 * @param {string|null} [namespace]
 * @returns {Element}
 */
export function createElement(vNode, doc = document, namespace = null) {
  const { tagName, props } = readElement(vNode);
  const ns = tagName.toLowerCase() === 'svg' ? SVG_NS : namespace;
  const element = ns && typeof doc.createElementNS === 'function'
    ? doc.createElementNS(ns, tagName)
    : doc.createElement(tagName);

  setAttributes(element, new Map(), renderedAttributes(props));
  applyLiveProperties(element, props);

  const childNs = tagName.toLowerCase() === 'foreignobject' ? null : ns;
  for (const item of getRenderedChildren(tagName, props)) {
    for (const node of createNodes(item, doc, childNs)) element.appendChild(node);
  }
  return element;
}

function namespaceOf(element) {
  return element.namespaceURI === SVG_NS && element.localName !== 'foreignObject' ? SVG_NS : null;
}

function keyOf(item) {
  if (item.type !== 'element') return undefined;
  const { props } = readElement(item.vNode);
  return props.key;
}

function allKeyed(list) {
  if (list.length === 0) return false;
  const keys = new Set();
  for (const item of list) {
    const key = keyOf(item);
    if (key === undefined || key === null || keys.has(key)) return false;
    keys.add(key);
  }
  return true;
}

function sameTag(a, b) {
  return Object.keys(a)[0].toLowerCase() === Object.keys(b)[0].toLowerCase();
}

function isInsignificant(node) {
  return node.nodeType === 8 || (node.nodeType === 3 && node.textContent.trim() === '');
}

/** The first sibling from `node` on that is an element or non-blank text. */
function significantFrom(node) {
  let current = node;
  while (current && isInsignificant(current)) current = current.nextSibling;
  return current;
}

/**
 * Put `nodes` in order as the element's significant children, moving only
 * the nodes that are out of place (a moved field loses focus).
 */
function placeInOrder(parent, nodes) {
  let previous = null;
  for (const node of nodes) {
    const expected = significantFrom(previous ? previous.nextSibling : parent.firstChild);
    if (node !== expected) {
      parent.insertBefore(node, previous ? previous.nextSibling : parent.firstChild);
    }
    previous = node;
  }
}

/**
 * Patch one child: reuse the DOM node when the kind (and tag) matches,
 * otherwise create a replacement. Returns the node now representing `next`.
 */
function patchChild(parent, node, previous, next) {
  const doc = parent.ownerDocument ?? globalThis.document;

  if (previous.type === 'text' && next.type === 'text' && node.nodeType === 3) {
    if (node.textContent !== next.text) node.textContent = next.text;
    return [node];
  }

  if (
    previous.type === 'element' &&
    next.type === 'element' &&
    node.nodeType === 1 &&
    sameTag(previous.vNode, next.vNode)
  ) {
    patchElement(node, previous.vNode, next.vNode);
    return [node];
  }

  return createNodes(next, doc, namespaceOf(parent));
}

function patchChildren(element, previousProps, nextProps, tagName) {
  const doc = element.ownerDocument ?? globalThis.document;
  const previousList = getRenderedChildren(tagName, previousProps);
  const nextList = getRenderedChildren(tagName, nextProps);
  const domList = getSignificantDOMChildren(element);
  const namespace = namespaceOf(element);

  // Raw HTML: set it when it changed, leave it alone otherwise.
  const previousHTML = previousList.length === 1 && previousList[0].type === 'opaque' ? previousList[0].html : undefined;
  const nextHTML = nextList.length === 1 && nextList[0].type === 'opaque' ? nextList[0].html : undefined;
  if (nextProps.html !== undefined && nextHTML !== undefined) {
    if (previousProps.html === undefined || previousHTML !== nextHTML) setRawHTML(element, nextHTML);
    return;
  }

  // Positions are only reliable when the DOM holds what the previous tree
  // rendered, one node per child; otherwise rebuild the children.
  const reliable =
    previousList.length === domList.length &&
    !previousList.some((item) => item.type === 'opaque') &&
    !nextList.some((item) => item.type === 'opaque');

  if (!reliable) {
    // Text-only content needs no node creation
    if (nextList.length === 0 || (nextList.length === 1 && nextList[0].type === 'text')) {
      const text = nextList.length === 0 ? '' : nextList[0].text;
      if (element.textContent !== text || domList.length !== nextList.length) {
        element.textContent = text;
      }
      return;
    }
    for (const node of Array.from(element.childNodes)) element.removeChild(node);
    for (const item of nextList) {
      for (const node of createNodes(item, doc, namespace)) element.appendChild(node);
    }
    return;
  }

  const nextNodes = [];

  if (allKeyed(previousList) && allKeyed(nextList)) {
    const byKey = new Map(previousList.map((item, i) => [keyOf(item), { item, node: domList[i] }]));
    for (const item of nextList) {
      const match = byKey.get(keyOf(item));
      if (match && sameTag(match.item.vNode, item.vNode)) {
        byKey.delete(keyOf(item));
        patchElement(match.node, match.item.vNode, item.vNode);
        nextNodes.push(match.node);
      } else {
        nextNodes.push(...createNodes(item, doc, namespace));
      }
    }
    for (const { node } of byKey.values()) element.removeChild(node);
  } else {
    const common = Math.min(previousList.length, nextList.length);
    for (let i = 0; i < common; i++) {
      const nodes = patchChild(element, domList[i], previousList[i], nextList[i]);
      if (nodes[0] !== domList[i]) element.removeChild(domList[i]);
      nextNodes.push(...nodes);
    }
    for (let i = common; i < domList.length; i++) element.removeChild(domList[i]);
    for (let i = common; i < nextList.length; i++) {
      nextNodes.push(...createNodes(nextList[i], doc, namespace));
    }
  }

  placeInOrder(element, nextNodes);
}

/**
 * Patch `element`, which the server or a previous patch rendered from
 * `previousVNode`, to match `nextVNode`. Tags must match; see patchRoot().
 * @param {Element} element
 * @param {Object} previousVNode
 * @param {Object} nextVNode
 */
export function patchElement(element, previousVNode, nextVNode) {
  const previous = readElement(previousVNode);
  const next = readElement(nextVNode);

  setAttributes(element, renderedAttributes(previous.props), renderedAttributes(next.props));
  applyLiveProperties(element, next.props);
  patchChildren(element, previous.props, next.props, next.tagName);
}

/**
 * Patch a component's root element, replacing it when the tag changed.
 * @param {Element} element - Current root element
 * @param {*} previousVNode - Tree `element` was rendered from
 * @param {*} nextVNode - Tree to render
 * @returns {Element} The root element afterwards (a new one if replaced)
 */
export function patchRoot(element, previousVNode, nextVNode) {
  if (!isElementVNode(nextVNode)) {
    return element;
  }

  if (
    isElementVNode(previousVNode) &&
    element.tagName?.toLowerCase() === Object.keys(nextVNode)[0].toLowerCase()
  ) {
    patchElement(element, previousVNode, nextVNode);
    return element;
  }

  const replacement = createElement(nextVNode, element.ownerDocument ?? document, namespaceOf(element.parentNode ?? element));
  element.parentNode?.replaceChild(replacement, element);
  return replacement;
}
