/**
 * Mismatch detection for Coherent.js hydration
 *
 * Compares server-rendered DOM against client virtual DOM to detect
 * hydration mismatches in development mode.
 */

/**
 * Format path segments into readable string
 * @param {Array} segments - Path segments
 * @returns {string} - Formatted path
 */
export function formatPath(segments) {
  if (!segments || segments.length === 0) return 'root';
  return segments.join('.');
}

/**
 * Get children from virtual node
 * @private
 */
function getVNodeChildren(vNode) {
  if (!vNode || typeof vNode !== 'object' || Array.isArray(vNode)) {
    return [];
  }
  const tagName = Object.keys(vNode)[0];
  const props = vNode[tagName];
  if (!props || typeof props !== 'object') {
    return [];
  }
  if (props.children) {
    return Array.isArray(props.children) ? props.children : [props.children];
  }
  if (props.text !== undefined) {
    return [String(props.text)];
  }
  return [];
}

/**
 * Detect mismatches between DOM and virtual DOM
 *
 * @param {Element} domElement - Real DOM element
 * @param {Object|string|number} virtualNode - Virtual DOM node
 * @param {Array} path - Current path for error reporting
 * @returns {Array} - Array of mismatch objects
 */
export function detectMismatch(domElement, virtualNode, path = []) {
  const mismatches = [];

  // Handle null/undefined virtual node
  if (virtualNode === null || virtualNode === undefined) {
    return mismatches;
  }

  // Handle text nodes (string or number in virtual DOM)
  if (typeof virtualNode === 'string' || typeof virtualNode === 'number') {
    const expectedText = String(virtualNode).trim();

    // DOM might be a text node or element containing text
    let actualText;
    if (domElement.nodeType === 3) { // Node.TEXT_NODE
      actualText = domElement.textContent?.trim() || '';
    } else {
      // For element nodes, get direct text content
      actualText = domElement.textContent?.trim() || '';
    }

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

  // Handle arrays
  if (Array.isArray(virtualNode)) {
    virtualNode.forEach((child, index) => {
      const domChild = getDOMChildAtIndex(domElement, index);
      if (domChild) {
        const childMismatches = detectMismatch(
          domChild,
          child,
          [...path, `[${index}]`]
        );
        mismatches.push(...childMismatches);
      } else {
        mismatches.push({
          path: formatPath([...path, `[${index}]`]),
          type: 'missing_element',
          expected: describeVNode(child),
          actual: null,
          domPath: `${getDOMPath(domElement)} > child[${index}]`
        });
      }
    });
    return mismatches;
  }

  // Handle element nodes
  if (typeof virtualNode !== 'object') {
    return mismatches;
  }

  const tagName = Object.keys(virtualNode)[0];
  const props = virtualNode[tagName] || {};

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

  // Check critical attributes
  const attributeChecks = [
    { virtual: 'className', dom: 'class' },
    { virtual: 'id', dom: 'id' },
    { virtual: 'type', dom: 'type' },
    { virtual: 'value', dom: 'value' },
    { virtual: 'checked', dom: 'checked' },
    { virtual: 'disabled', dom: 'disabled' },
    { virtual: 'href', dom: 'href' },
    { virtual: 'src', dom: 'src' }
  ];

  attributeChecks.forEach(({ virtual, dom }) => {
    const expectedValue = props[virtual];
    if (expectedValue === undefined) return;

    const actualValue = domElement.getAttribute(dom);
    const expectedStr = String(expectedValue);

    // Handle boolean attributes
    if (typeof expectedValue === 'boolean') {
      const actualBool = actualValue !== null;
      if (expectedValue !== actualBool) {
        mismatches.push({
          path: formatPath([...path, `@${dom}`]),
          type: 'attribute',
          expected: expectedValue,
          actual: actualBool,
          domPath: getDOMPath(domElement)
        });
      }
      return;
    }

    if (expectedStr !== actualValue) {
      mismatches.push({
        path: formatPath([...path, `@${dom}`]),
        type: 'attribute',
        expected: expectedStr,
        actual: actualValue,
        domPath: getDOMPath(domElement)
      });
    }
  });

  // Recursively check children
  const vChildren = getVNodeChildren({ [tagName]: props });
  const dChildren = getSignificantDOMChildren(domElement);

  // Check for child count mismatch
  if (vChildren.length !== dChildren.length) {
    mismatches.push({
      path: formatPath([...path, 'children']),
      type: 'children_count',
      expected: vChildren.length,
      actual: dChildren.length,
      domPath: getDOMPath(domElement)
    });
  }

  // Compare each child
  const maxChildren = Math.max(vChildren.length, dChildren.length);
  for (let i = 0; i < maxChildren; i++) {
    const vChild = vChildren[i];
    const dChild = dChildren[i];

    if (vChild && dChild) {
      const childMismatches = detectMismatch(
        dChild,
        vChild,
        [...path, `children[${i}]`]
      );
      mismatches.push(...childMismatches);
    } else if (vChild && !dChild) {
      mismatches.push({
        path: formatPath([...path, `children[${i}]`]),
        type: 'missing_dom_child',
        expected: describeVNode(vChild),
        actual: null,
        domPath: getDOMPath(domElement)
      });
    } else if (!vChild && dChild) {
      mismatches.push({
        path: formatPath([...path, `children[${i}]`]),
        type: 'extra_dom_child',
        expected: null,
        actual: describeNode(dChild),
        domPath: getDOMPath(domElement)
      });
    }
  }

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
 * Get significant DOM children (elements and non-empty text nodes)
 * @private
 */
function getSignificantDOMChildren(element) {
  if (!element || !element.childNodes) return [];

  return Array.from(element.childNodes).filter(node => {
    if (node.nodeType === 1) return true; // Element node
    if (node.nodeType === 3) { // Text node
      return node.textContent && node.textContent.trim().length > 0;
    }
    return false;
  });
}

/**
 * Get DOM child at specific index (considering only significant children)
 * @private
 */
function getDOMChildAtIndex(parent, index) {
  const children = getSignificantDOMChildren(parent);
  return children[index] || null;
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
 * Describe a virtual node for error messages
 * @private
 */
function describeVNode(vNode) {
  if (typeof vNode === 'string' || typeof vNode === 'number') {
    return `text: "${String(vNode).substring(0, 50)}"`;
  }
  if (Array.isArray(vNode)) {
    return `array[${vNode.length}]`;
  }
  if (typeof vNode === 'object' && vNode !== null) {
    const tagName = Object.keys(vNode)[0];
    return `<${tagName}>`;
  }
  return String(vNode);
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
