/**
 * HTML-specific utility functions
 */

export function escapeHtml(text) {
  if (typeof text !== 'string') return text;

  return text
    .replace(/&/g, '&amp;')
    .replace(/</g, '&lt;')
    .replace(/>/g, '&gt;')
    .replace(/"/g, '&quot;')
    .replace(/'/g, '&#39;');
}

/**
 * Brand for trusted-content markers. A symbol can't come out of JSON.parse,
 * so request data can't forge a marker the way `{ "__trusted": true,
 * "__html": "<img onerror=...>" }` could when the check read plain keys.
 * Symbol.for (not a module-private symbol) keeps markers valid across two
 * loaded copies of core, e.g. the ESM and CJS builds.
 */
const TRUSTED_CONTENT = Symbol.for('coherent.js.trustedContent');

/**
 * Create a trusted-content marker. Use `dangerouslySetInnerContent()`.
 *
 * @param {string} content - Markup to emit verbatim
 * @returns {{__html: string, __trusted: true}} Frozen marker
 */
export function createTrustedContent(content) {
  const marker = { __html: String(content), __trusted: true };
  // Non-enumerable, so spreading or merging a marker into another object
  // doesn't carry the brand along.
  Object.defineProperty(marker, TRUSTED_CONTENT, { value: true });
  return Object.freeze(marker);
}

/**
 * Detect content marked trusted by `dangerouslySetInnerContent()`.
 * Such values are emitted verbatim instead of being escaped.
 *
 * @param {*} value - Candidate value
 * @returns {boolean} True when the value is a trusted-content marker
 */
export function isTrustedContent(value) {
  return Boolean(value) &&
    typeof value === 'object' &&
    value[TRUSTED_CONTENT] === true &&
    typeof value.__html === 'string';
}

/**
 * Characters the HTML spec forbids in attribute names, plus whitespace and
 * controls. Everything else is allowed: data-*, aria-*, x-on:click, @click,
 * :class, xlink:href.
 */
const INVALID_ATTRIBUTE_NAME = /[\s"'<>/=\u0000-\u001F\u007F-\u009F]/;

/**
 * Check that a string can be emitted as an attribute name as-is.
 *
 * @param {string} name - Attribute name
 * @returns {boolean} True when the name can't break out of the tag
 */
export function isValidAttributeName(name) {
  return typeof name === 'string' && name.length > 0 && !INVALID_ATTRIBUTE_NAME.test(name);
}

export function unescapeHtml(text) {
  if (typeof text !== 'string') return text;

  return text
    .replace(/&quot;/g, '"')
    .replace(/&#39;/g, "'")
    .replace(/&gt;/g, '>')
    .replace(/&lt;/g, '<')
    .replace(/&amp;/g, '&');
}

export function isVoidElement(tagName) {
  // Ensure tagName is a string before processing
  if (typeof tagName !== 'string') {
    return false;
  }

  const voidElements = new Set([
    'area',
    'base',
    'br',
    'col',
    'embed',
    'hr',
    'img',
    'input',
    'link',
    'meta',
    'param',
    'source',
    'track',
    'wbr',
  ]);
  return voidElements.has(tagName.toLowerCase());
}

export function formatAttributes(props) {
  let formatted = '';
  for (const key in props) {
    if (props.hasOwnProperty(key)) {
      let value = props[key];

      // Convert className to class for HTML output
      const attributeName = key === 'className' ? 'class' : key;

      // Names are emitted unescaped: `{ 'onmouseover="alert(1)" x': 'y' }`
      // used to render a live handler, and a key containing `>` ended the tag.
      if (!isValidAttributeName(attributeName)) {
        throw new Error(`Invalid attribute name ${JSON.stringify(key)}: attribute names cannot contain whitespace, quotes, '<', '>', '/', '=' or control characters`);
      }

      // Function values: event handlers render nothing. The client's
      // hydrate() re-attaches them from the component tree; the server has
      // no way to ship a closure. They used to be stored in a process-wide
      // __coherentActionRegistry under a Date.now()+Math.random() id that
      // nothing ever read: every render leaked its handlers (and whatever
      // request data they closed over) and produced different HTML.
      if (typeof value === 'function') {
        if (attributeName.startsWith('on')) {
          continue;
        } else {
          // For other function attributes, call them to get the value
          try {
            value = value();
          } catch (_error) {
            console.warn(`Error executing function for attribute '${key}':`, {
              error: _error.message,
              stack: _error.stack,
              attributeKey: key,
            });
            // Consider different fallback strategies based on attribute type
            value = '';
          }
        }
      }

      // Handle style objects by converting to CSS string
      if (attributeName === 'style' && typeof value === 'object' && value !== null) {
        const cssString = Object.entries(value)
          .map(([prop, val]) => {
            // Convert camelCase to kebab-case
            const kebabProp = prop.replace(/[A-Z]/g, m => `-${m.toLowerCase()}`);
            return `${kebabProp}: ${val}`;
          })
          .join('; ');
        formatted += ` ${attributeName}="${escapeHtml(cssString)}"`;
      } else if (value === true) {
        formatted += ` ${attributeName}`;
      } else if (value !== false && value !== null && value !== undefined) {
        formatted += ` ${attributeName}="${escapeHtml(String(value))}"`;
      }
    }
  }
  return formatted.trim();
}

/**
 * Remove HTML comments.
 *
 * Scans with indexOf rather than /<!--[\s\S]*?-->/g. The lazy quantifier in
 * that pattern restarts at every position when no terminator follows, so a
 * run of unclosed `<!--` cost O(n^2) — 20,000 of them took 307ms. It also
 * left an unterminated comment in the output, `<!--` and all.
 *
 * An unterminated comment consumes the rest of the input, which is how the
 * HTML spec has parsers treat one.
 *
 * @param {string} html - Markup to strip comments from
 * @returns {string} Markup with comments removed
 */
function stripComments(html) {
  let out = '';
  let cursor = 0;

  for (;;) {
    const start = html.indexOf('<!--', cursor);
    if (start === -1) return out + html.slice(cursor);

    out += html.slice(cursor, start);

    const end = html.indexOf('-->', start + 4);
    if (end === -1) return out;

    cursor = end + 3;
  }
}

export function minifyHtml(html, options = {}) {
  if (!options.minify) return html;

  return (
    stripComments(html)
      // Remove extra whitespace
      .replace(/\s+/g, ' ')
      // Remove whitespace around tags
      .replace(/>\s+</g, '><')
      // Remove leading/trailing whitespace
      .trim()
  );
}

/**
 * HTML Void Elements - elements that cannot have children
 * These elements are self-closing and don't need closing tags
 */
export const voidElements = new Set([
  'area',
  'base',
  'br',
  'col',
  'embed',
  'hr',
  'img',
  'input',
  'link',
  'meta',
  'param',
  'source',
  'track',
  'wbr',
]);
