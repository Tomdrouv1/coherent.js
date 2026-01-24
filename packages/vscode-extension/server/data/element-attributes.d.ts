/**
 * Element attribute data for the Coherent.js Language Server
 *
 * This module provides runtime access to HTML element attribute information,
 * imported from the generated JSON file created by extract-attributes.ts.
 *
 * The data is extracted at build time from packages/core/types/elements.d.ts
 * to maintain a single source of truth for element definitions.
 */
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
/**
 * Set of all valid HTML element tag names.
 */
export declare const HTML_ELEMENTS: Set<string>;
/**
 * Set of void elements that cannot have children.
 */
export declare const VOID_ELEMENTS: Set<string>;
/**
 * Get all valid attributes for a given HTML element.
 *
 * Returns element-specific attributes combined with global attributes,
 * event handlers, and Coherent.js properties.
 *
 * @param tagName - The HTML element tag name (e.g., 'div', 'input')
 * @returns Array of attribute information
 */
export declare function getAttributesForElement(tagName: string): AttributeInfo[];
/**
 * Check if an element is a void element (cannot have children).
 *
 * @param tagName - The HTML element tag name
 * @returns true if the element is a void element
 */
export declare function isVoidElement(tagName: string): boolean;
/**
 * Check if an attribute is valid for a given element.
 *
 * @param tagName - The HTML element tag name
 * @param attributeName - The attribute name to check
 * @returns true if the attribute is valid for the element
 */
export declare function isValidAttribute(tagName: string, attributeName: string): boolean;
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
export declare function getSuggestions(tagName: string, attributeName: string, maxDistance?: number): string[];
/**
 * Get the type description for an attribute.
 *
 * @param tagName - The HTML element tag name
 * @param attributeName - The attribute name
 * @returns Type string or undefined if attribute not found
 */
export declare function getAttributeType(tagName: string, attributeName: string): string | undefined;
/**
 * Get the description for an attribute.
 *
 * @param tagName - The HTML element tag name
 * @param attributeName - The attribute name
 * @returns Description string or undefined if not available
 */
export declare function getAttributeDescription(tagName: string, attributeName: string): string | undefined;
/**
 * Get element-specific description for hover documentation.
 */
export declare function getElementDescription(tagName: string): string;
//# sourceMappingURL=element-attributes.d.ts.map