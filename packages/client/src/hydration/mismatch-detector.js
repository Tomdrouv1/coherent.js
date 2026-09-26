/**
 * Mismatch detection for Coherent.js hydration
 *
 * Compares server-rendered DOM against client virtual DOM to detect
 * hydration mismatches in development mode.
 */

import {
  isElementVNode,
  readElement,
  getRenderedChildren,
  getSignificantDOMChildren,
  alignChildren,
  resolveAttributeValue,
} from './vnode.js';

/**
 * Format path segments into readable string
 * @param {Array} segments - Path segments
 * @returns {string} - Formatted path
 */
export function formatPath(segments) {
  if (!segments || segments.length === 0) return 'root';
  return segments.join('.');
}

/** Attributes compared between the virtual node and the DOM. */
const ATTRIBUTE_CHECKS = [
  { virtual: 'className', dom: 'class' },
  { virtual: 'id', dom: 'id' },
  { virtual: 'type', dom: 'type' },
  { virtual: 'value', dom: 'value' },
  { virtual: 'checked', dom: 'checked' },
  { virtual: 'disabled', dom: 'disabled' },
  { virtual: 'href', dom: 'href' },
  { virtual: 'src', dom: 'src' }
];

function textOf(node) {
  return (node?.textContent ?? '').trim();
}

/**
 * Compare a list of rendered children (see getRenderedChildren) with the
 * significant DOM children of `parent`.
 * @private
 */
function compareChildren(parent, vList, path, mismatches, childSegment) {
  const dList = getSignificantDOMChildren(parent);
  const { pairs, exact } = alignChildren(vList, dList);

  if (exact && vList.length !== dList.length) {
    mismatches.push({
      path: formatPath([...path, 'children']),
      type: 'children_count',
      expected: vList.length,
      actual: dList.length,
      domPath: getDOMPath(parent)
    });
  }

  for (const [item, node, index] of pairs) {
    const childPath = [...path, childSegment(index)];

    if (item.type === 'element') {
      mismatches.push(...detectMismatch(node, item.vNode, childPath));
    } else if (item.type === 'text') {
      const expected = item.text.trim();
      if (node.nodeType !== 3) {
        mismatches.push({
          path: formatPath(childPath),
          type: 'text',
          expected,
          actual: describeNode(node),
          domPath: getDOMPath(parent)
        });
      } else if (textOf(node) !== expected) {
        mismatches.push({
          path: formatPath(childPath),
          type: 'text',
          expected,
          actual: textOf(node),
          domPath: getDOMPath(parent)
        });
      }
    }
  }

  if (!exact) return;

  for (let i = dList.length; i < vList.length; i++) {
    mismatches.push({
      path: formatPath([...path, childSegment(i)]),
      type: 'missing_dom_child',
      expected: describeRendered(vList[i]),
      actual: null,
      domPath: getDOMPath(parent)
    });
  }
  for (let i = vList.length; i < dList.length; i++) {
    mismatches.push({
      path: formatPath([...path, childSegment(i)]),
      type: 'extra_dom_child',
      expected: null,
      actual: describeNode(dList[i]),
      domPath: getDOMPath(parent)
    });
  }
}

/**
 * Detect mismatches between DOM and virtual DOM
 *
 * Children are compared as the server rendered them: null, undefined and
 * booleans produce nothing, nested arrays are flattened, adjacent strings form
 * one text node and whitespace-only text is ignored on both sides.
 *
 * @param {Element} domElement - Real DOM element
 * @param {Object|string|number|Array} virtualNode - Virtual DOM node; an array
 *   is compared against the children of `domElement`
 * @param {Array} path - Current path for error reporting
 * @returns {Array} - Array of mismatch objects
 */
export function detectMismatch(domElement, virtualNode, path = []) {
  const mismatches = [];

  if (virtualNode === null || virtualNode === undefined || typeof virtualNode === 'boolean') {
    return mismatches;
  }

  // Handle text nodes (string or number in virtual DOM)
  if (typeof virtualNode === 'string' || typeof virtualNode === 'number') {
    const expectedText = String(virtualNode).trim();
    const actualText = textOf(domElement);

    if (actualText !== expectedText) {
      mismatches.push({
        path: formatPath(path),
        type: 'text',
        expected: expectedText,
        actual: actualText,
        domPath: getDOMPath(domElement)
      });
    }
    return mismatches;
  }

  // A fragment (array or function component): compare against the children
  if (Array.isArray(virtualNode) || typeof virtualNode === 'function') {
    const vList = getRenderedChildren('fragment', { children: virtualNode });
    compareChildren(domElement, vList, path, mismatches, (i) => `[${i}]`);
    return mismatches;
  }

  if (!isElementVNode(virtualNode)) {
    return mismatches;
  }

  const { tagName, props } = readElement(virtualNode);

  // Check tag name
  const domTagName = domElement.tagName?.toLowerCase();
  if (domTagName !== tagName.toLowerCase()) {
    mismatches.push({
      path: formatPath(path),
      type: 'tagName',
      expected: tagName,
      actual: domTagName,
      domPath: getDOMPath(domElement)
    });
    // Can't continue comparing if tag is different
    return mismatches;
  }

  // Check critical attributes, evaluated the way core renders them
  for (const { virtual, dom } of ATTRIBUTE_CHECKS) {
    if (props[virtual] === undefined) continue;

    const expectedValue = resolveAttributeValue(props[virtual]);
    const actualValue = domElement.getAttribute(dom);

    // true renders a bare attribute; false and null render none
    if (typeof expectedValue === 'boolean' || expectedValue === null || expectedValue === undefined) {
      const expectedPresent = expectedValue === true;
      const actualPresent = actualValue !== null && actualValue !== undefined;
      if (expectedPresent !== actualPresent) {
        mismatches.push({
          path: formatPath([...path, `@${dom}`]),
          type: 'attribute',
          expected: expectedPresent,
          actual: actualPresent,
          domPath: getDOMPath(domElement)
        });
      }
      continue;
    }

    const expectedStr = String(expectedValue);
    if (expectedStr !== actualValue) {
      mismatches.push({
        path: formatPath([...path, `@${dom}`]),
        type: 'attribute',
        expected: expectedStr,
        actual: actualValue,
        domPath: getDOMPath(domElement)
      });
    }
  }

  // Recursively check children
  compareChildren(
    domElement,
    getRenderedChildren(tagName, props),
    path,
    mismatches,
    (i) => `children[${i}]`
  );

  return mismatches;
}

/**
 * Report mismatches to console with detailed information
 *
 * @param {Array} mismatches - Array of mismatch objects
 * @param {Object} options - Reporting options
 */
export function reportMismatches(mismatches, options = {}) {
  if (!mismatches || mismatches.length === 0) return;

  const { componentName = 'Unknown', strict = false } = options;

  const header = `[Coherent.js] Hydration mismatch detected in "${componentName}"!\n` +
    `Found ${mismatches.length} difference(s) between server and client:\n`;

  const details = mismatches.map((m, i) => {
    return `\n${i + 1}. ${m.type} at ${m.path}\n` +
      `   DOM path: ${m.domPath}\n` +
      `   Expected: ${JSON.stringify(m.expected)}\n` +
      `   Actual:   ${JSON.stringify(m.actual)}`;
  }).join('');

  const advice = '\n\nThis usually happens when:\n' +
    '  - Server renders with different data than client\n' +
    '  - Using Date.now(), Math.random(), or browser-only APIs during render\n' +
    '  - Component is not pure (has side effects during render)\n';

  console.warn(header + details + advice);

  if (strict) {
    throw new Error(`Hydration failed: ${mismatches.length} mismatch(es) found. See console for details.`);
  }
}


/**
 * Get a readable DOM path for debugging
 * @private
 */
function getDOMPath(element) {
  if (!element || !element.tagName) return '(unknown)';

  const parts = [];
  let current = element;

  while (current && current.tagName) {
    let selector = current.tagName.toLowerCase();

    if (current.id) {
      selector += `#${current.id}`;
    } else if (current.className && typeof current.className === 'string') {
      const classes = current.className.trim().split(/\s+/).slice(0, 2);
      if (classes.length > 0 && classes[0]) {
        selector += `.${classes.join('.')}`;
      }
    }

    parts.unshift(selector);
    current = current.parentElement;

    // Limit depth
    if (parts.length > 5) {
      parts.unshift('...');
      break;
    }
  }

  return parts.join(' > ');
}

/**
 * Describe a rendered child (see getRenderedChildren) for error messages
 * @private
 */
function describeRendered(item) {
  if (item.type === 'text') {
    return `text: "${item.text.trim().substring(0, 50)}"`;
  }
  if (item.type === 'element') {
    return `<${Object.keys(item.vNode)[0]}>`;
  }
  return 'raw content';
}

/**
 * Describe a DOM node for error messages
 * @private
 */
function describeNode(node) {
  if (!node) return '(null)';
  if (node.nodeType === 3) { // Text node
    return `text: "${(node.textContent || '').substring(0, 50)}"`;
  }
  if (node.nodeType === 1) { // Element
    return `<${node.tagName.toLowerCase()}>`;
  }
  return `node(type=${node.nodeType})`;
}
