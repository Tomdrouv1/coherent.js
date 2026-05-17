/**
 * HTML5 Nesting Validation Rules
 *
 * Based on the HTML5 specification content model requirements.
 * These rules detect invalid parent/child relationships before runtime.
 */

export interface NestingRule {
  /**
   * Parent elements that are forbidden for this element.
   * If the element appears inside any of these parents, it's an error.
   */
  forbiddenParents?: string[];

  /**
   * Parent elements that are required for this element.
   * If specified, the element MUST be a direct child of one of these.
   */
  allowedParents?: string[];

  /**
   * Whether this element can contain block-level elements.
   * If false, block elements inside will produce warnings.
   */
  canContainBlocks?: boolean;

  /**
   * Additional error message context.
   */
  message?: string;
}

/**
 * Block-level elements that should not appear inside inline elements.
 */
export const BLOCK_ELEMENTS = new Set([
  'div', 'p', 'h1', 'h2', 'h3', 'h4', 'h5', 'h6',
  'ul', 'ol', 'li', 'dl', 'dt', 'dd',
  'table', 'thead', 'tbody', 'tfoot', 'tr', 'td', 'th',
  'form', 'fieldset', 'legend',
  'section', 'article', 'aside', 'header', 'footer', 'nav', 'main',
  'figure', 'figcaption', 'blockquote', 'pre', 'address',
  'details', 'dialog', 'menu', 'hgroup', 'search',
]);

/**
 * Inline elements that cannot contain block-level elements.
 */
export const INLINE_ELEMENTS = new Set([
  'span', 'a', 'em', 'strong', 'b', 'i', 'u', 's', 'small',
  'mark', 'abbr', 'cite', 'code', 'dfn', 'kbd', 'samp', 'var',
  'sub', 'sup', 'q', 'time', 'data', 'bdi', 'bdo', 'ruby', 'rt', 'rp',
  'label',
]);

/**
 * HTML5 nesting rules for specific elements.
 */
export const NESTING_RULES: Record<string, NestingRule> = {
  // Block elements cannot be inside inline elements
  div: {
    forbiddenParents: ['p', 'span', 'a', 'em', 'strong', 'b', 'i', 'u', 's', 'small', 'label'],
    message: 'Block-level element cannot be nested inside inline element',
  },
  section: {
    forbiddenParents: ['p', 'span', 'a', 'em', 'strong', 'b', 'i', 'u', 's', 'small', 'label'],
    message: 'Block-level element cannot be nested inside inline element',
  },
  article: {
    forbiddenParents: ['p', 'span', 'a', 'em', 'strong', 'b', 'i', 'u', 's', 'small', 'label'],
    message: 'Block-level element cannot be nested inside inline element',
  },
  aside: {
    forbiddenParents: ['p', 'span', 'a', 'em', 'strong', 'b', 'i', 'u', 's', 'small', 'label'],
    message: 'Block-level element cannot be nested inside inline element',
  },
  header: {
    forbiddenParents: ['p', 'span', 'a', 'em', 'strong', 'b', 'i', 'u', 's', 'small', 'label', 'header', 'footer'],
    message: 'Block-level element cannot be nested inside inline element; header cannot be inside header/footer',
  },
  footer: {
    forbiddenParents: ['p', 'span', 'a', 'em', 'strong', 'b', 'i', 'u', 's', 'small', 'label', 'header', 'footer'],
    message: 'Block-level element cannot be nested inside inline element; footer cannot be inside header/footer',
  },
  nav: {
    forbiddenParents: ['p', 'span', 'a', 'em', 'strong', 'b', 'i', 'u', 's', 'small', 'label'],
    message: 'Block-level element cannot be nested inside inline element',
  },
  main: {
    forbiddenParents: ['p', 'span', 'a', 'em', 'strong', 'b', 'i', 'u', 's', 'small', 'label', 'article', 'aside', 'footer', 'header', 'nav'],
    message: 'main element cannot be nested inside sectioning content',
  },

  // <p> cannot nest inside <p> (auto-closes)
  p: {
    forbiddenParents: ['p'],
    canContainBlocks: false,
    message: '<p> cannot be nested inside another <p> element',
  },

  // List items must be in lists
  li: {
    allowedParents: ['ul', 'ol', 'menu'],
    message: '<li> must be a direct child of <ul>, <ol>, or <menu>',
  },
  dt: {
    allowedParents: ['dl'],
    message: '<dt> must be a direct child of <dl>',
  },
  dd: {
    allowedParents: ['dl'],
    message: '<dd> must be a direct child of <dl>',
  },

  // Table structure
  tr: {
    allowedParents: ['table', 'thead', 'tbody', 'tfoot'],
    message: '<tr> must be a direct child of <table>, <thead>, <tbody>, or <tfoot>',
  },
  td: {
    allowedParents: ['tr'],
    message: '<td> must be a direct child of <tr>',
  },
  th: {
    allowedParents: ['tr'],
    message: '<th> must be a direct child of <tr>',
  },
  thead: {
    allowedParents: ['table'],
    message: '<thead> must be a direct child of <table>',
  },
  tbody: {
    allowedParents: ['table'],
    message: '<tbody> must be a direct child of <table>',
  },
  tfoot: {
    allowedParents: ['table'],
    message: '<tfoot> must be a direct child of <table>',
  },
  caption: {
    allowedParents: ['table'],
    message: '<caption> must be a direct child of <table>',
  },
  colgroup: {
    allowedParents: ['table'],
    message: '<colgroup> must be a direct child of <table>',
  },
  col: {
    allowedParents: ['colgroup', 'table'],
    message: '<col> must be a direct child of <colgroup> or <table>',
  },

  // Form elements
  option: {
    allowedParents: ['select', 'optgroup', 'datalist'],
    message: '<option> must be a direct child of <select>, <optgroup>, or <datalist>',
  },
  optgroup: {
    allowedParents: ['select'],
    message: '<optgroup> must be a direct child of <select>',
  },
  legend: {
    allowedParents: ['fieldset'],
    message: '<legend> must be a direct child of <fieldset>',
  },

  // Details/Summary
  summary: {
    allowedParents: ['details'],
    message: '<summary> must be a direct child of <details>',
  },

  // Ruby annotations
  rt: {
    allowedParents: ['ruby'],
    message: '<rt> must be a direct child of <ruby>',
  },
  rp: {
    allowedParents: ['ruby'],
    message: '<rp> must be a direct child of <ruby>',
  },

  // Figure
  figcaption: {
    allowedParents: ['figure'],
    message: '<figcaption> must be a direct child of <figure>',
  },

  // Source and track
  source: {
    allowedParents: ['audio', 'video', 'picture'],
    message: '<source> must be a direct child of <audio>, <video>, or <picture>',
  },
  track: {
    allowedParents: ['audio', 'video'],
    message: '<track> must be a direct child of <audio> or <video>',
  },

  // Area
  area: {
    allowedParents: ['map'],
    message: '<area> must be a direct child of <map>',
  },

  // Param (deprecated but still supported)
  param: {
    allowedParents: ['object'],
    message: '<param> must be a direct child of <object>',
  },
};

export interface ValidationError {
  message: string;
  severity: 'error' | 'warning';
  code: string;
}

/**
 * Validate nesting of an element within a parent.
 *
 * @param childTag - The child element tag name
 * @param parentTag - The parent element tag name (or null for root)
 * @returns Array of validation errors (empty if valid)
 */
export function validateNesting(childTag: string, parentTag: string | null): ValidationError[] {
  const errors: ValidationError[] = [];

  if (!parentTag) {
    return errors; // Root elements have no parent to check
  }

  const rules = NESTING_RULES[childTag];

  // Check forbidden parents
  if (rules?.forbiddenParents?.includes(parentTag)) {
    errors.push({
      message: rules.message || `<${childTag}> cannot be nested inside <${parentTag}>`,
      severity: 'error',
      code: 'invalid-nesting',
    });
  }

  // Check required parents
  if (rules?.allowedParents && !rules.allowedParents.includes(parentTag)) {
    errors.push({
      message: rules.message || `<${childTag}> must be a direct child of ${rules.allowedParents.map(p => `<${p}>`).join(', ')}`,
      severity: 'error',
      code: 'invalid-parent',
    });
  }

  // Check block-in-inline (if not already caught by forbiddenParents)
  if (!rules && BLOCK_ELEMENTS.has(childTag) && INLINE_ELEMENTS.has(parentTag)) {
    errors.push({
      message: `Block-level element <${childTag}> should not be nested inside inline element <${parentTag}>`,
      severity: 'warning',
      code: 'block-in-inline',
    });
  }

  // Check canContainBlocks rule for parent
  const parentRules = NESTING_RULES[parentTag];
  if (parentRules?.canContainBlocks === false && BLOCK_ELEMENTS.has(childTag)) {
    errors.push({
      message: `<${parentTag}> should not contain block-level element <${childTag}>`,
      severity: 'warning',
      code: 'invalid-child',
    });
  }

  return errors;
}

/**
 * Get all valid parent elements for a given element.
 *
 * @param tagName - The element tag name
 * @returns Array of valid parent tag names, or null if any parent is valid
 */
export function getValidParents(tagName: string): string[] | null {
  const rules = NESTING_RULES[tagName];
  return rules?.allowedParents || null;
}

/**
 * Check if an element has nesting restrictions.
 *
 * @param tagName - The element tag name
 * @returns true if the element has specific nesting rules
 */
export function hasNestingRestrictions(tagName: string): boolean {
  return tagName in NESTING_RULES;
}
