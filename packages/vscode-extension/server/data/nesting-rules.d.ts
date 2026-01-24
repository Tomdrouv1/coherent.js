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
export declare const BLOCK_ELEMENTS: Set<string>;
/**
 * Inline elements that cannot contain block-level elements.
 */
export declare const INLINE_ELEMENTS: Set<string>;
/**
 * HTML5 nesting rules for specific elements.
 */
export declare const NESTING_RULES: Record<string, NestingRule>;
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
export declare function validateNesting(childTag: string, parentTag: string | null): ValidationError[];
/**
 * Get all valid parent elements for a given element.
 *
 * @param tagName - The element tag name
 * @returns Array of valid parent tag names, or null if any parent is valid
 */
export declare function getValidParents(tagName: string): string[] | null;
/**
 * Check if an element has nesting restrictions.
 *
 * @param tagName - The element tag name
 * @returns true if the element has specific nesting rules
 */
export declare function hasNestingRestrictions(tagName: string): boolean;
//# sourceMappingURL=nesting-rules.d.ts.map