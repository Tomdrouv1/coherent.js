/**
 * Virtual node helpers shared by hydration, mismatch detection and patching.
 *
 * A component's children are not a list of DOM nodes: they may contain null,
 * booleans, nested arrays, function components and adjacent strings that the
 * server merges into one text node. Everything that walks the virtual tree
 * next to the DOM must first reduce children to what the server actually
 * emitted, or indexes drift — a `null` before a button binds that button's
 * handler to the next element.
 *
 * @module @coherent.js/client/hydration/vnode
 */

/** Elements the server renders without content or a closing tag. */
export const VOID_ELEMENTS = new Set([
  'area', 'base', 'br', 'col', 'embed', 'hr', 'img', 'input',
  'link', 'meta', 'param', 'source', 'track', 'wbr',
]);

/**
 * Content marked with core's dangerouslySetInnerContent(), emitted verbatim.
 * @param {*} value
 * @returns {boolean}
 */
export function isTrustedContent(value) {
  // Same brand core's dangerouslySetInnerContent() sets: plain objects with
  // __trusted/__html keys (e.g. from JSON) are not trusted.
  return Boolean(value) &&
    typeof value === 'object' &&
    value[Symbol.for('coherent.js.trustedContent')] === true &&
    typeof value.__html === 'string';
}

/**
 * Call a function component the way core's renderer does: with no arguments,
 * following returned functions.
 * @returns {{ ok: boolean, value?: * }}
 */
function callFunctionComponent(fn) {
  let result = fn;
  for (let guard = 0; typeof result === 'function'; guard++) {
    if (guard > 100) {
      return { ok: false };
    }
    try {
      result = result();
    } catch {
      // On the server a throwing component either failed the render or was
      // replaced through render()'s onError; neither is reproducible here,
      // so treat it as an opaque region.
      return { ok: false };
    }
  }
  return { ok: true, value: result };
}

/**
 * Whether a value is an element virtual node (`{ tagName: props }`).
 * @param {*} vNode
 * @returns {boolean}
 */
export function isElementVNode(vNode) {
  return Boolean(vNode) &&
    typeof vNode === 'object' &&
    !Array.isArray(vNode) &&
    !isTrustedContent(vNode) &&
    Object.keys(vNode).length > 0;
}

/**
 * Split an element virtual node into its tag name and props, normalising the
 * shorthand forms core accepts (`{ span: 'text' }`, `{ br: null }`, function
 * content).
 * @param {Object} vNode - Element virtual node
 * @returns {{ tagName: string, props: Object }}
 */
export function readElement(vNode) {
  const tagName = Object.keys(vNode)[0];
  let content = vNode[tagName];

  if (typeof content === 'function') {
    const called = callFunctionComponent(content);
    content = called.ok ? called.value : null;
  }

  if (content === null || content === undefined) {
    return { tagName, props: {} };
  }
  if (typeof content !== 'object') {
    return { tagName, props: { text: content } };
  }
  return { tagName, props: content };
}

function flatten(node, out) {
  if (node === null || node === undefined || typeof node === 'boolean') {
    return;
  }
  if (typeof node === 'string' || typeof node === 'number') {
    out.push({ type: 'text', text: String(node) });
    return;
  }
  if (Array.isArray(node)) {
    for (const child of node) flatten(child, out);
    return;
  }
  if (typeof node === 'function') {
    const called = callFunctionComponent(node);
    if (called.ok) flatten(called.value, out);
    else out.push({ type: 'opaque' });
    return;
  }
  if (isTrustedContent(node)) {
    out.push({ type: 'opaque', html: node.__html });
    return;
  }
  if (isElementVNode(node)) {
    out.push({ type: 'element', vNode: node });
  }
}

/**
 * Evaluate an attribute value the way core's formatAttributes does: functions
 * are called with no arguments (a throwing one yields '').
 * @param {*} value
 * @returns {*}
 */
export function resolveAttributeValue(value) {
  if (typeof value !== 'function') return value;
  try {
    return value();
  } catch {
    return '';
  }
}

/**
 * The children an element's server output contains, in order: element nodes,
 * text nodes (adjacent strings merged, whitespace-only dropped) and opaque
 * regions (raw HTML or components whose output cannot be reproduced).
 *
 * Null, undefined and booleans render nothing; nested arrays are flattened;
 * `text` precedes `children`; an `html` prop replaces both.
 *
 * @param {string} tagName
 * @param {Object} props
 * @returns {Array<{type: 'element', vNode: Object}|{type: 'text', text: string}|{type: 'opaque', html?: string}>}
 *   an opaque region carries its `html` when it is raw HTML rather than a
 *   component this module cannot run
 */
export function getRenderedChildren(tagName, props) {
  if (!props || VOID_ELEMENTS.has(String(tagName).toLowerCase())) {
    return [];
  }
  if (props.html !== undefined) {
    const html = resolveAttributeValue(props.html);
    return [{ type: 'opaque', html: isTrustedContent(html) ? html.__html : String(html) }];
  }
  if (isTrustedContent(props.text)) {
    return [{ type: 'opaque', html: props.text.__html }];
  }

  const raw = [];
  if (props.text !== undefined) {
    const text = resolveAttributeValue(props.text);
    raw.push({ type: 'text', text: String(text) });
  }
  flatten(props.children, raw);

  // Merge adjacent text the way the HTML parser does.
  const merged = [];
  for (const item of raw) {
    const last = merged[merged.length - 1];
    if (item.type === 'text' && last?.type === 'text') {
      last.text += item.text;
    } else {
      merged.push(item.type === 'text' ? { ...item } : item);
    }
  }

  return merged.filter((item) => item.type !== 'text' || item.text.trim() !== '');
}

/**
 * DOM children that correspond to rendered children: elements and text nodes
 * that are not whitespace-only.
 * @param {Node} element
 * @returns {Node[]}
 */
export function getSignificantDOMChildren(element) {
  if (!element || !element.childNodes) return [];

  return Array.from(element.childNodes).filter((node) => {
    if (node.nodeType === 1) return true;
    if (node.nodeType === 3) {
      return typeof node.textContent === 'string' && node.textContent.trim().length > 0;
    }
    return false;
  });
}

/**
 * Pair virtual children with DOM children.
 *
 * Without opaque regions the lists pair by position. Around opaque regions
 * only the children before the first one (from the start) and after the last
 * one (from the end) can be paired.
 *
 * @template V, D
 * @param {Array<V & {type: string}>} vList
 * @param {D[]} dList
 * @returns {{ pairs: Array<[V, D, number]>, exact: boolean }} `exact` is false
 *   when opaque regions made the lengths incomparable
 */
export function alignChildren(vList, dList) {
  const firstOpaque = vList.findIndex((item) => item.type === 'opaque');
  const pairs = [];

  if (firstOpaque === -1) {
    const length = Math.min(vList.length, dList.length);
    for (let i = 0; i < length; i++) pairs.push([vList[i], dList[i], i]);
    return { pairs, exact: true };
  }

  let lastOpaque = firstOpaque;
  for (let i = vList.length - 1; i > firstOpaque; i--) {
    if (vList[i].type === 'opaque') {
      lastOpaque = i;
      break;
    }
  }

  for (let i = 0; i < firstOpaque && i < dList.length; i++) {
    pairs.push([vList[i], dList[i], i]);
  }
  const tail = vList.length - 1 - lastOpaque;
  for (let k = 1; k <= tail && dList.length - k >= firstOpaque; k++) {
    const vIndex = vList.length - k;
    pairs.push([vList[vIndex], dList[dList.length - k], vIndex]);
  }
  return { pairs, exact: false };
}

/**
 * Pair an element's virtual element children with its DOM element children,
 * ignoring text entirely — what handler binding needs.
 * @param {string} tagName
 * @param {Object} props
 * @param {Element} domElement
 * @returns {Array<[Object, Element]>} [child vNode, DOM element] pairs
 */
export function pairElementChildren(tagName, props, domElement) {
  const vElements = getRenderedChildren(tagName, props).filter((item) => item.type !== 'text');
  const dElements = Array.from(domElement?.childNodes ?? []).filter((node) => node.nodeType === 1);
  return alignChildren(vElements, dElements).pairs
    .filter(([item]) => item.type === 'element')
    .map(([item, node]) => [item.vNode, node]);
}
