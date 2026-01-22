/**
 * Element attribute data for the Coherent.js Language Server
 *
 * This module provides runtime access to HTML element attribute information,
 * imported from the generated JSON file created by extract-attributes.ts.
 *
 * The data is extracted at build time from packages/core/types/elements.d.ts
 * to maintain a single source of truth for element definitions.
 */

import { createRequire } from 'module';

// Use createRequire to import JSON in ESM
const require = createRequire(import.meta.url);

export interface AttributeInfo {
  name: string;
  type: string;
  optional: boolean;
  description?: string;
}

export interface ElementInfo {
  tagName: string;
  attributes: AttributeInfo[];
  isVoidElement: boolean;
}

export interface ExtractedData {
  elements: Record<string, ElementInfo>;
  voidElements: string[];
  globalAttributes: AttributeInfo[];
  eventHandlers: AttributeInfo[];
  generatedAt: string;
}

// Load generated data or use fallback
let data: ExtractedData;

try {
  data = require('./element-attributes.generated.json') as ExtractedData;
} catch {
  // Fallback for development when generated file doesn't exist
  data = {
    elements: {},
    voidElements: ['area', 'base', 'br', 'col', 'embed', 'hr', 'img', 'input', 'link', 'meta', 'param', 'source', 'track', 'wbr'],
    globalAttributes: [
      { name: 'id', type: 'string', optional: true },
      { name: 'className', type: 'string', optional: true },
      { name: 'class', type: 'string', optional: true },
      { name: 'style', type: 'string | Record<string, string | number>', optional: true },
      { name: 'title', type: 'string', optional: true },
      { name: 'hidden', type: 'boolean', optional: true },
      { name: 'tabIndex', type: 'number', optional: true },
      { name: 'key', type: 'string | number', optional: true },
      { name: 'text', type: 'string | number', optional: true },
      { name: 'html', type: 'string', optional: true },
      { name: 'children', type: 'CoherentChild | CoherentChild[]', optional: true },
    ],
    eventHandlers: [
      { name: 'onClick', type: 'string | ((event: MouseEvent) => void)', optional: true },
      { name: 'onChange', type: 'string | ((event: Event) => void)', optional: true },
      { name: 'onSubmit', type: 'string | ((event: SubmitEvent) => void)', optional: true },
    ],
    generatedAt: 'fallback',
  };
}

/**
 * Set of all valid HTML element tag names.
 */
export const HTML_ELEMENTS: Set<string> = new Set([
  // Always include core elements
  'div', 'span', 'p', 'a', 'button', 'input', 'img', 'form',
  'ul', 'ol', 'li', 'table', 'tr', 'td', 'th', 'thead', 'tbody',
  'h1', 'h2', 'h3', 'h4', 'h5', 'h6',
  'section', 'article', 'header', 'footer', 'nav', 'main', 'aside',
  'label', 'select', 'option', 'textarea', 'fieldset', 'legend',
  'video', 'audio', 'source', 'canvas', 'iframe',
  'script', 'style', 'link', 'meta',
  'br', 'hr', 'pre', 'code', 'em', 'strong', 'small', 'mark',
  'figure', 'figcaption', 'blockquote', 'cite',
  'details', 'summary', 'dialog', 'menu',
  'time', 'progress', 'meter', 'output', 'datalist',
  'dl', 'dt', 'dd', 'address', 'abbr', 'dfn', 'sub', 'sup',
  'i', 'b', 'u', 's', 'kbd', 'samp', 'var', 'ruby', 'rt', 'rp',
  'bdi', 'bdo', 'wbr', 'data', 'embed', 'object', 'param',
  'map', 'area', 'track', 'picture', 'col', 'colgroup', 'caption',
  'tfoot', 'optgroup', 'html', 'head', 'body', 'title', 'base',
  'template', 'slot', 'noscript', 'hgroup', 'search',
  // Add any elements from generated data
  ...Object.keys(data.elements),
]);

/**
 * Set of void elements that cannot have children.
 */
export const VOID_ELEMENTS: Set<string> = new Set(data.voidElements);

/**
 * Coherent.js specific properties that can appear on any element.
 */
const COHERENT_PROPERTIES: AttributeInfo[] = [
  { name: 'text', type: 'string | number', optional: true, description: 'Text content (escaped during render)' },
  { name: 'html', type: 'string', optional: true, description: 'Raw HTML content (not escaped - use with caution)' },
  { name: 'children', type: 'CoherentChild | CoherentChild[]', optional: true, description: 'Child elements' },
  { name: 'key', type: 'string | number', optional: true, description: 'Unique key for list reconciliation' },
];

/**
 * Get all valid attributes for a given HTML element.
 *
 * Returns element-specific attributes combined with global attributes,
 * event handlers, and Coherent.js properties.
 *
 * @param tagName - The HTML element tag name (e.g., 'div', 'input')
 * @returns Array of attribute information
 */
export function getAttributesForElement(tagName: string): AttributeInfo[] {
  const elementInfo = data.elements[tagName];
  const attributes: AttributeInfo[] = [];
  const seenNames = new Set<string>();

  // Add element-specific attributes first
  if (elementInfo) {
    for (const attr of elementInfo.attributes) {
      if (!seenNames.has(attr.name)) {
        attributes.push(attr);
        seenNames.add(attr.name);
      }
    }
  }

  // Add global HTML attributes
  for (const attr of data.globalAttributes) {
    if (!seenNames.has(attr.name)) {
      attributes.push(attr);
      seenNames.add(attr.name);
    }
  }

  // Add event handlers
  for (const attr of data.eventHandlers) {
    if (!seenNames.has(attr.name)) {
      attributes.push(attr);
      seenNames.add(attr.name);
    }
  }

  // Add Coherent-specific properties (unless void element)
  if (!isVoidElement(tagName)) {
    for (const attr of COHERENT_PROPERTIES) {
      if (!seenNames.has(attr.name)) {
        attributes.push(attr);
        seenNames.add(attr.name);
      }
    }
  } else {
    // Void elements can still have text/html but not children
    for (const attr of COHERENT_PROPERTIES) {
      if (attr.name !== 'children' && !seenNames.has(attr.name)) {
        attributes.push(attr);
        seenNames.add(attr.name);
      }
    }
  }

  return attributes;
}

/**
 * Check if an element is a void element (cannot have children).
 *
 * @param tagName - The HTML element tag name
 * @returns true if the element is a void element
 */
export function isVoidElement(tagName: string): boolean {
  return VOID_ELEMENTS.has(tagName);
}

/**
 * Check if an attribute is valid for a given element.
 *
 * @param tagName - The HTML element tag name
 * @param attributeName - The attribute name to check
 * @returns true if the attribute is valid for the element
 */
export function isValidAttribute(tagName: string, attributeName: string): boolean {
  // Always allow data-* attributes
  if (attributeName.startsWith('data-')) {
    return true;
  }

  // Always allow aria-* attributes
  if (attributeName.startsWith('aria-')) {
    return true;
  }

  const validAttrs = getAttributesForElement(tagName);
  return validAttrs.some(attr => attr.name === attributeName);
}

/**
 * Get suggestions for a potentially misspelled attribute name.
 *
 * Uses Levenshtein distance to find similar attribute names.
 *
 * @param tagName - The HTML element tag name
 * @param attributeName - The potentially misspelled attribute name
 * @param maxDistance - Maximum edit distance for suggestions (default: 3)
 * @returns Array of suggested attribute names, sorted by distance
 */
export function getSuggestions(tagName: string, attributeName: string, maxDistance = 3): string[] {
  const validAttrs = getAttributesForElement(tagName);
  const suggestions: Array<{ name: string; distance: number }> = [];

  for (const attr of validAttrs) {
    const distance = levenshteinDistance(attributeName.toLowerCase(), attr.name.toLowerCase());
    if (distance <= maxDistance && distance > 0) {
      suggestions.push({ name: attr.name, distance });
    }
  }

  return suggestions
    .sort((a, b) => a.distance - b.distance)
    .slice(0, 3)
    .map(s => s.name);
}

/**
 * Calculate Levenshtein distance between two strings.
 */
function levenshteinDistance(a: string, b: string): number {
  if (a.length === 0) return b.length;
  if (b.length === 0) return a.length;

  const matrix: number[][] = [];

  for (let i = 0; i <= b.length; i++) {
    matrix[i] = [i];
  }

  for (let j = 0; j <= a.length; j++) {
    matrix[0][j] = j;
  }

  for (let i = 1; i <= b.length; i++) {
    for (let j = 1; j <= a.length; j++) {
      if (b.charAt(i - 1) === a.charAt(j - 1)) {
        matrix[i][j] = matrix[i - 1][j - 1];
      } else {
        matrix[i][j] = Math.min(
          matrix[i - 1][j - 1] + 1, // substitution
          matrix[i][j - 1] + 1,     // insertion
          matrix[i - 1][j] + 1      // deletion
        );
      }
    }
  }

  return matrix[b.length][a.length];
}

/**
 * Get the type description for an attribute.
 *
 * @param tagName - The HTML element tag name
 * @param attributeName - The attribute name
 * @returns Type string or undefined if attribute not found
 */
export function getAttributeType(tagName: string, attributeName: string): string | undefined {
  const validAttrs = getAttributesForElement(tagName);
  const attr = validAttrs.find(a => a.name === attributeName);
  return attr?.type;
}

/**
 * Get the description for an attribute.
 *
 * @param tagName - The HTML element tag name
 * @param attributeName - The attribute name
 * @returns Description string or undefined if not available
 */
export function getAttributeDescription(tagName: string, attributeName: string): string | undefined {
  const validAttrs = getAttributesForElement(tagName);
  const attr = validAttrs.find(a => a.name === attributeName);
  return attr?.description;
}

/**
 * Get element-specific description for hover documentation.
 */
export function getElementDescription(tagName: string): string {
  const descriptions: Record<string, string> = {
    div: 'Generic container element for flow content',
    span: 'Generic inline container for phrasing content',
    p: 'Paragraph element for text content',
    a: 'Anchor element for creating hyperlinks',
    button: 'Clickable button for forms and actions',
    input: 'Input control for forms (void element)',
    img: 'Image embedding element (void element)',
    form: 'Form container for submitting user data',
    ul: 'Unordered list container',
    ol: 'Ordered list container',
    li: 'List item element',
    table: 'Table container for tabular data',
    section: 'Generic section of a document',
    article: 'Self-contained composition in a document',
    header: 'Introductory content or navigational aids',
    footer: 'Footer for nearest sectioning content',
    nav: 'Navigation links section',
    main: 'Main content of the document body',
    aside: 'Content tangentially related to surrounding content',
  };

  return descriptions[tagName] || `HTML <${tagName}> element`;
}
