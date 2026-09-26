/**
 * Coherent.js Custom Test Matchers
 *
 * Custom matchers for testing Coherent.js components
 * Compatible with Vitest, Jest, and other testing frameworks
 *
 * The matchers accept what this package's own helpers return: a render
 * result from `renderComponent()` (`{ html }`), a match from its query
 * helpers (`{ html, text, exists }`), or a plain HTML string. Element
 * matchers (`toHaveClass`, `toHaveAttribute`, `toHaveTagName`) look at the
 * first element in that HTML.
 *
 * None of them reuses the name of a matcher Vitest or Jest already ships:
 * `expect.extend()` would replace the built-in for the whole test run.
 * Snapshot with `expect(result.toSnapshot()).toMatchSnapshot()`, and assert
 * on mocks (`vi.fn()` or this package's `createMock()`) with the built-in
 * `toHaveBeenCalled*` matchers.
 *
 * @module testing/matchers
 */

/** Elements that never have a closing tag. */
const VOID_ELEMENTS = new Set([
  'area', 'base', 'br', 'col', 'embed', 'hr', 'img', 'input', 'keygen',
  'link', 'meta', 'param', 'source', 'track', 'wbr'
]);

/** Elements whose content is raw text, not markup. */
const RAW_TEXT_ELEMENTS = new Set(['script', 'style', 'textarea', 'title']);

const NAMED_ENTITIES = { amp: '&', lt: '<', gt: '>', quot: '"', apos: "'", nbsp: ' ' };

function decodeEntities(text) {
  return text.replace(/&(#x[0-9a-f]+|#\d+|[a-z]+);/gi, (entity, body) => {
    if (body[0] === '#') {
      const codePoint = body[1] === 'x' || body[1] === 'X'
        ? Number.parseInt(body.slice(2), 16)
        : Number.parseInt(body.slice(1), 10);
      return codePoint <= 0x10ffff ? String.fromCodePoint(codePoint) : entity;
    }
    return NAMED_ENTITIES[body.toLowerCase()] ?? entity;
  });
}

/** The HTML string behind a render result, a query match, or a string. */
function htmlOf(received) {
  if (typeof received === 'string') return received;
  if (received && typeof received.html === 'string') return received.html;
  return null;
}

/**
 * Text content: a query match's `text`, or the HTML with its tags removed.
 * Entities are decoded, so assertions use the text a reader sees.
 */
function textOf(received) {
  if (received && typeof received === 'object' && typeof received.text === 'string') {
    return decodeEntities(received.text);
  }
  const html = htmlOf(received);
  if (html === null) return null;
  return decodeEntities(stripTags(html));
}

/**
 * Remove tags (`<...>`) in one linear pass; a `<` with no `>` after it stays.
 * /<[^>]*>/g rescans the rest of the input from every `<` when no `>`
 * follows: seconds on '<<<<…' of 50 KB.
 */
function stripTags(html) {
  let out = '';
  let cursor = 0;
  while (cursor < html.length) {
    const open = html.indexOf('<', cursor);
    if (open === -1) break;
    const close = html.indexOf('>', open + 1);
    if (close === -1) break;
    out += html.slice(cursor, open);
    cursor = close + 1;
  }
  return out + html.slice(cursor);
}

const isSpace = (ch) => ch === ' ' || ch === '\n' || ch === '\t' || ch === '\r' || ch === '\f';

/**
 * Parse the first opening tag in `html` into its name and attributes.
 * Hand-rolled (no backtracking regex), so hostile input stays linear.
 *
 * @returns {{ tagName: string, attributes: Map<string, string> } | null}
 */
function parseOpeningTag(html) {
  const start = html.search(/<[a-zA-Z]/);
  if (start === -1) return null;

  let i = start + 1;
  let tagName = '';
  while (i < html.length && /[\w:-]/.test(html[i])) tagName += html[i++];

  const attributes = new Map();
  while (i < html.length) {
    while (i < html.length && isSpace(html[i])) i++;
    if (i >= html.length || html[i] === '>') break;
    if (html[i] === '/') {
      i++;
      continue;
    }

    let name = '';
    while (i < html.length && !isSpace(html[i]) && html[i] !== '=' && html[i] !== '>' && html[i] !== '/') {
      name += html[i++];
    }
    while (i < html.length && isSpace(html[i])) i++;

    let value = '';
    if (html[i] === '=') {
      i++;
      while (i < html.length && isSpace(html[i])) i++;
      const quote = html[i];
      if (quote === '"' || quote === "'") {
        const end = html.indexOf(quote, i + 1);
        if (end === -1) break;
        value = html.slice(i + 1, end);
        i = end + 1;
      } else {
        while (i < html.length && !isSpace(html[i]) && html[i] !== '>') value += html[i++];
      }
    }
    if (name) attributes.set(name.toLowerCase(), decodeEntities(value));
  }

  return { tagName: tagName.toLowerCase(), attributes };
}

/** Class tokens of the first element (or a match's `className`), or null. */
function classesOf(received) {
  const html = htmlOf(received);
  const tag = html === null ? null : parseOpeningTag(html);
  let value = tag?.attributes.get('class');
  if (value === undefined && typeof received?.className === 'string') value = received.className;
  return value === undefined ? null : value.split(/\s+/).filter(Boolean);
}

/**
 * Check tag balance with a stack, skipping comments, doctypes, void
 * elements and raw-text content. Linear: every '<' is visited once.
 *
 * @returns {string|null} Why the HTML is invalid, or null when it is valid.
 */
function findHTMLError(html) {
  const stack = [];
  let lower = null;
  let i = 0;

  while ((i = html.indexOf('<', i)) !== -1) {
    if (html.startsWith('<!--', i)) {
      const end = html.indexOf('-->', i + 4);
      if (end === -1) return 'unterminated comment';
      i = end + 3;
      continue;
    }

    const close = html.indexOf('>', i);
    if (close === -1) return 'unterminated tag';
    const tag = html.slice(i + 1, close);
    i = close + 1;

    if (tag[0] === '!' || tag[0] === '?') continue; // <!DOCTYPE …>, <?xml …?>
    const match = /^(\/?)([a-zA-Z][\w:-]*)/.exec(tag);
    if (!match) continue;
    const name = match[2].toLowerCase();

    if (match[1]) {
      if (VOID_ELEMENTS.has(name)) return `</${name}> closes a void element`;
      const open = stack.pop();
      if (open !== name) return open ? `</${name}> does not close <${open}>` : `</${name}> has no opening tag`;
    } else if (!VOID_ELEMENTS.has(name) && !tag.endsWith('/')) {
      stack.push(name);
      if (RAW_TEXT_ELEMENTS.has(name)) {
        lower ??= html.toLowerCase();
        const end = lower.indexOf(`</${name}`, i);
        if (end === -1) return `<${name}> is never closed`;
        i = end;
      }
    }
  }

  return stack.length > 0 ? `<${stack[stack.length - 1]}> is never closed` : null;
}

const show = (value) => (value === null || value === undefined ? 'nothing' : JSON.stringify(value));

/**
 * Custom matchers for Coherent.js testing
 */
export const customMatchers = {
  /**
   * Check if element (or a render result) has exactly this text content
   */
  toHaveText(received, expected) {
    const text = textOf(received);
    const pass = text === expected;

    return {
      pass,
      message: () => pass
        ? `Expected element not to have text "${expected}"`
        : `Expected element to have text "${expected}", but got ${show(text)}`
    };
  },

  /**
   * Check if element (or a render result) contains text
   */
  toContainText(received, expected) {
    const text = textOf(received);
    const pass = typeof text === 'string' && text.includes(expected);

    return {
      pass,
      message: () => pass
        ? `Expected element not to contain text "${expected}"`
        : `Expected element to contain text "${expected}", but got ${show(text)}`
    };
  },

  /**
   * Check if the element has every given class (whole class tokens:
   * 'btn' does not match 'btn-primary')
   */
  toHaveClass(received, expected) {
    const classes = classesOf(received) ?? [];
    const wanted = String(expected).split(/\s+/).filter(Boolean);
    const pass = wanted.length > 0 && wanted.every((name) => classes.includes(name));

    return {
      pass,
      message: () => pass
        ? `Expected element not to have class "${expected}"`
        : `Expected element to have class "${expected}", but its classes are ${show(classes.join(' '))}`
    };
  },

  /**
   * Check if element exists
   */
  toBeInTheDocument(received) {
    const pass = Boolean(received && received.exists === true);

    return {
      pass,
      message: () => pass
        ? 'Expected element not to be in the document'
        : 'Expected element to be in the document'
    };
  },

  /**
   * Check if element is visible (has text content)
   */
  toBeVisible(received) {
    const text = textOf(received);
    const pass = typeof text === 'string' && text.trim().length > 0;

    return {
      pass,
      message: () => pass
        ? 'Expected element not to be visible'
        : 'Expected element to be visible (have text content)'
    };
  },

  /**
   * Check if element is empty (no text content)
   */
  toBeEmpty(received) {
    const text = textOf(received);
    const pass = !text || text.trim().length === 0;

    return {
      pass,
      message: () => pass
        ? 'Expected element not to be empty'
        : `Expected element to be empty, but it has text ${show(text)}`
    };
  },

  /**
   * Check if HTML contains specific string
   */
  toContainHTML(received, expected) {
    const html = htmlOf(received);
    const pass = typeof html === 'string' && html.includes(expected);

    return {
      pass,
      message: () => pass
        ? `Expected HTML not to contain "${expected}"`
        : `Expected HTML to contain "${expected}"`
    };
  },

  /**
   * Check if the element has an attribute (optionally with this value)
   */
  toHaveAttribute(received, attribute, value) {
    const html = htmlOf(received);
    const tag = html === null ? null : parseOpeningTag(html);
    const name = String(attribute).toLowerCase();
    const has = Boolean(tag?.attributes.has(name));
    const actual = has ? tag.attributes.get(name) : undefined;
    const pass = value !== undefined ? has && actual === String(value) : has;

    return {
      pass,
      message: () => {
        if (value !== undefined) {
          return pass
            ? `Expected element not to have attribute ${attribute}="${value}"`
            : `Expected element to have attribute ${attribute}="${value}", but got ${has ? show(actual) : 'none'}`;
        }
        return pass
          ? `Expected element not to have attribute ${attribute}`
          : `Expected element to have attribute ${attribute}`;
      }
    };
  },

  /**
   * Check if the element has this tag name
   */
  toHaveTagName(received, tagName) {
    const html = htmlOf(received);
    const tag = html === null ? null : parseOpeningTag(html);
    const pass = Boolean(tag) && tag.tagName === String(tagName).toLowerCase();

    return {
      pass,
      message: () => pass
        ? `Expected element not to have tag name "${tagName}"`
        : `Expected element to have tag name "${tagName}", but got ${show(tag?.tagName)}`
    };
  },

  /**
   * Check if render result contains element
   */
  toContainElement(received, element) {
    const html = htmlOf(received);
    const elementHtml = htmlOf(element);
    const pass = typeof html === 'string' && typeof elementHtml === 'string' && html.includes(elementHtml);

    return {
      pass,
      message: () => pass
        ? 'Expected not to contain element'
        : 'Expected to contain element'
    };
  },

  /**
   * Check if component rendered successfully
   */
  toRenderSuccessfully(received) {
    const html = htmlOf(received);
    const pass = typeof html === 'string' && html.length > 0;

    return {
      pass,
      message: () => pass
        ? 'Expected component not to render successfully'
        : 'Expected component to render successfully'
    };
  },

  /**
   * Check that every tag is closed in order. Void elements (<input>, <br>,
   * <img>, …) need no closing tag.
   */
  toBeValidHTML(received) {
    const html = htmlOf(received);
    const error = typeof html === 'string' ? findHTMLError(html) : 'received no HTML';
    const pass = error === null;

    return {
      pass,
      message: () => pass
        ? 'Expected HTML not to be valid'
        : `Expected HTML to be valid, but ${error}`
    };
  }
};

/**
 * Extend expect with custom matchers
 *
 * @param {Object} expect - Expect function from testing framework
 *
 * @example
 * import { expect } from 'vitest';
 * import { extendExpect } from '@coherent.js/tooling/testing/matchers';
 *
 * extendExpect(expect);
 *
 * // Now you can use custom matchers
 * expect(element).toHaveText('Hello');
 */
export function extendExpect(expect) {
  if (expect && expect.extend) {
    expect.extend(customMatchers);
  } else {
    console.warn('Could not extend expect - expect.extend not available');
  }
}

/**
 * Create assertion helpers
 */
export const assertions = {
  /**
   * Assert element has text
   */
  assertHasText(element, text) {
    const actual = textOf(element);
    if (actual !== text) {
      throw new Error(`Expected element to have text "${text}", but got ${show(actual)}`);
    }
  },

  /**
   * Assert element exists
   */
  assertExists(element) {
    if (!element || !element.exists) {
      throw new Error('Expected element to exist');
    }
  },

  /**
   * Assert element has class (a whole class token)
   */
  assertHasClass(element, className) {
    if (!(classesOf(element) ?? []).includes(className)) {
      throw new Error(`Expected element to have class "${className}"`);
    }
  },

  /**
   * Assert HTML contains string
   */
  assertContainsHTML(html, substring) {
    const htmlString = htmlOf(html);
    if (!htmlString || !htmlString.includes(substring)) {
      throw new Error(`Expected HTML to contain "${substring}"`);
    }
  },

  /**
   * Assert component rendered
   */
  assertRendered(result) {
    if (!result || !result.html || result.html.length === 0) {
      throw new Error('Expected component to render');
    }
  }
};

/**
 * Export all matchers and utilities
 */
export default {
  customMatchers,
  extendExpect,
  assertions
};
