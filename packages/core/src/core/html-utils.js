/**
 * HTML-specific utility functions
 */

const HTML_ESCAPE_TEST = /[&<>"']/;
const HTML_ESCAPE = /[&<>"']/g;
const HTML_ESCAPES = { '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;', "'": '&#39;' };

export function escapeHtml(text) {
  if (typeof text !== 'string') return text;
  // Most text needs no escaping: return it without allocating.
  if (!HTML_ESCAPE_TEST.test(text)) return text;
  return text.replace(HTML_ESCAPE, (ch) => HTML_ESCAPES[ch]);
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

  // The module-level set below (this allocated a new Set on every call).
  return voidElements.has(tagName) || voidElements.has(tagName.toLowerCase());
}

/**
 * Enumerated attributes whose "false" is meaningful and must be written out
 * (a bare or missing attribute means something else).
 */
const ENUMERATED_BOOLEAN_ATTRIBUTES = new Set(['spellcheck', 'draggable', 'contenteditable']);

/**
 * Normalize a class value: strings as-is, arrays flattened with falsy
 * entries dropped, objects as the keys whose values are truthy (clsx-style).
 */
function normalizeClassValue(value) {
  if (Array.isArray(value)) {
    return value.map(normalizeClassValue).filter(Boolean).join(' ');
  }
  if (value && typeof value === 'object') {
    return Object.keys(value).filter((name) => value[name]).join(' ');
  }
  if (value === null || value === undefined || value === false) return '';
  return String(value);
}

/**
 * Serialize props into an HTML attribute string.
 *
 * @param {Object} props - Element props
 * @param {Set<string>} [skip] - Prop names not rendered as attributes
 * @returns {string} Attributes separated by spaces
 */
/**
 * Call a function-valued attribute. A throwing one renders as ''.
 */
function callAttribute(key, value) {
  try {
    return value();
  } catch (_error) {
    console.warn(`Error executing function for attribute '${key}':`, {
      error: _error.message,
      stack: _error.stack,
      attributeKey: key,
    });
    return '';
  }
}

/** Prop names written under another attribute name. */
const ATTRIBUTE_NAMES = {
  className: 'class',
  // Written as is, browsers read `htmlFor` as an unknown `htmlfor`
  // attribute: the label was not associated with its control.
  htmlFor: 'for'
};

/**
 * Serialize a style object. Null, undefined and false values are left out
 * (`{ color: active && 'red' }` rendered "color: false"); custom properties
 * keep their case, since `--mainColor` and `--main-color` are different
 * properties.
 */
function styleToCss(style) {
  return Object.entries(style)
    .filter(([, val]) => val !== null && val !== undefined && val !== false)
    .map(([prop, val]) => {
      const name = prop.startsWith('--') ? prop : prop.replace(/[A-Z]/g, m => `-${m.toLowerCase()}`);
      return `${name}: ${val}`;
    })
    .join('; ');
}

export function formatAttributes(props, skip) {
  // `class` and `className` together used to produce two class attributes.
  // Function values are called first: they were joined as source code.
  if (props && props.class !== undefined && props.className !== undefined) {
    const { className, ...rest } = props;
    const resolve = (key, value) => normalizeClassValue(typeof value === 'function' ? callAttribute(key, value) : value);
    props = { ...rest, class: [resolve('class', props.class), resolve('className', className)].filter(Boolean).join(' ') };
  }

  let formatted = '';
  for (const key in props) {
    if (Object.prototype.hasOwnProperty.call(props, key) && !(skip && skip.has(key))) {
      let value = props[key];

      const attributeName = ATTRIBUTE_NAMES[key] ?? key;

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
          value = callAttribute(key, value);
        }
      }

      if (attributeName === 'class' && typeof value === 'object' && value !== null) {
        // ['a', cond && 'b'] or { a: true, b: false } — was "a,b" / "[object Object]"
        value = normalizeClassValue(value);
      }

      if (typeof value === 'boolean' && (attributeName.startsWith('aria-') || ENUMERATED_BOOLEAN_ATTRIBUTES.has(attributeName.toLowerCase()))) {
        // aria-hidden="false", spellcheck="false": false is a value here, not absence
        value = String(value);
      }

      // Handle style objects by converting to CSS string
      if (attributeName === 'style' && typeof value === 'object' && value !== null) {
        const cssString = styleToCss(value);
        if (cssString) formatted += ` ${attributeName}="${escapeHtml(cssString)}"`;
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

/**
 * Whether `html` ends inside a comment, or with the `>` that closes one
 * (the same scan as stripComments).
 */
function endsInComment(html) {
  let cursor = 0;
  for (;;) {
    const start = html.indexOf('<!--', cursor);
    if (start === -1) return false;
    const end = html.indexOf('-->', start + 4);
    if (end === -1 || end + 3 === html.length) return true;
    cursor = end + 3;
  }
}

/**
 * Incremental minifyHtml() for streamed markup: the concatenation of what
 * `push()` and `end()` return equals minifyHtml() of the concatenated input.
 *
 * Input is held back until a `>` that minification keeps (not inside or
 * closing a comment), and output is cut right after it. No whitespace run or
 * comment then spans a cut, and the next piece is minified with that `>` in
 * front, so a `>`, whitespace, `<` sequence across the cut collapses as it
 * does in the whole document.
 *
 * @returns {{ push(chunk: string): string, end(): string }}
 */
export function createStreamMinifier() {
  let pending = '';
  let started = false;

  const minifyPiece = (text, last) => {
    let out = stripComments(started ? `>${text}` : text)
      .replace(/\s+/g, ' ')
      .replace(/>\s+</g, '><');
    if (started) {
      out = out.slice(1);
    } else {
      out = out.trimStart();
    }
    if (last) out = out.trimEnd();
    started = true;
    return out;
  };

  return {
    push(chunk) {
      pending += chunk;
      let cut = pending.lastIndexOf('>');
      while (cut !== -1 && endsInComment(pending.slice(0, cut + 1))) {
        cut = cut === 0 ? -1 : pending.lastIndexOf('>', cut - 1);
      }
      if (cut === -1) return '';

      const head = pending.slice(0, cut + 1);
      pending = pending.slice(cut + 1);
      return minifyPiece(head, false);
    },
    end() {
      const rest = pending;
      pending = '';
      return rest || !started ? minifyPiece(rest, true) : '';
    }
  };
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
