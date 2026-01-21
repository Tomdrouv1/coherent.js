/**
 * HTML Nesting Validation Rules
 * Prevents invalid HTML structures that browsers will auto-correct,
 * which causes hydration mismatches between server and client.
 */

/**
 * Map of parent tags to their forbidden child tags.
 * Based on HTML spec content model rules.
 * See: https://html.spec.whatwg.org/multipage/dom.html#content-models
 */
export const FORBIDDEN_CHILDREN = {
    // Phrasing content only - cannot contain flow content
    p: new Set([
        'address', 'article', 'aside', 'blockquote', 'div', 'dl',
        'fieldset', 'footer', 'form', 'h1', 'h2', 'h3', 'h4', 'h5', 'h6',
        'header', 'hr', 'main', 'nav', 'ol', 'p', 'pre', 'section',
        'table', 'ul', 'figure', 'figcaption'
    ]),
    // Interactive content restrictions
    a: new Set(['a']),  // Links cannot nest
    button: new Set(['button', 'a', 'input', 'select', 'textarea', 'label']),
    label: new Set(['label']),
    // Table structure restrictions
    thead: new Set(['thead', 'tbody', 'tfoot', 'caption', 'colgroup', 'tr']),
    tbody: new Set(['thead', 'tbody', 'tfoot', 'caption', 'colgroup']),
    tfoot: new Set(['thead', 'tbody', 'tfoot', 'caption', 'colgroup']),
    tr: new Set(['tr', 'thead', 'tbody', 'tfoot', 'table']),
    td: new Set(['td', 'th', 'tr', 'thead', 'tbody', 'tfoot', 'table']),
    th: new Set(['td', 'th', 'tr', 'thead', 'tbody', 'tfoot', 'table']),
    // Other common restrictions
    select: new Set(['select', 'input', 'textarea']),
    option: new Set(['option', 'optgroup']),
};

/**
 * Validate that a child tag is allowed inside a parent tag.
 *
 * @param {string} parentTag - The parent element tag name
 * @param {string} childTag - The child element tag name
 * @param {string} path - The render path for error reporting
 * @param {Object} options - Validation options
 * @param {boolean} options.warn - Whether to emit console warnings (default: true in dev)
 * @param {boolean} options.throwOnError - Whether to throw instead of warn (default: false)
 * @returns {boolean} True if nesting is valid, false otherwise
 */
export function validateNesting(parentTag, childTag, path = '', options = {}) {
    if (!parentTag || !childTag) {
        return true;  // Can't validate without both tags
    }

    const parent = parentTag.toLowerCase();
    const child = childTag.toLowerCase();

    const forbidden = FORBIDDEN_CHILDREN[parent];
    if (!forbidden || !forbidden.has(child)) {
        return true;  // Nesting is valid
    }

    // Invalid nesting detected
    const pathSuffix = path ? ` at ${path}` : '';
    const message = `Invalid HTML nesting: <${child}> cannot be a child of <${parent}>${pathSuffix}. Browsers will auto-correct this, causing potential hydration mismatches.`;

    if (options.throwOnError) {
        throw new HTMLNestingError(message, { parent, child, path });
    }

    // Only warn in development mode by default
    const shouldWarn = options.warn !== false &&
        (typeof process === 'undefined' ||
         !process.env ||
         process.env.NODE_ENV !== 'production');

    if (shouldWarn) {
        console.warn(`[Coherent.js] ${message}`);
    }

    return false;
}

/**
 * Custom error class for HTML nesting violations
 */
export class HTMLNestingError extends Error {
    constructor(message, context = {}) {
        super(message);
        this.name = 'HTMLNestingError';
        this.parent = context.parent;
        this.child = context.child;
        this.path = context.path;
    }
}

/**
 * Check if a tag is a void element (self-closing, no children allowed)
 * Useful for validation - void elements can't have invalid children
 */
export const VOID_ELEMENTS = new Set([
    'area', 'base', 'br', 'col', 'embed', 'hr', 'img', 'input',
    'link', 'meta', 'param', 'source', 'track', 'wbr'
]);

export function isVoidElement(tagName) {
    return VOID_ELEMENTS.has(tagName?.toLowerCase());
}
