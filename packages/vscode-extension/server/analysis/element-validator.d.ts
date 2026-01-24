/**
 * Element Attribute Validator
 *
 * Validates attributes on Coherent.js elements against the allowed
 * attributes for each HTML element type.
 */
import { Range } from 'vscode-languageserver';
import { CoherentElementInfo } from './coherent-analyzer.js';
/**
 * Validation error for an attribute.
 */
export interface AttributeValidationError {
    /** Error message */
    message: string;
    /** Source range of the error */
    range: Range;
    /** Error code for categorization */
    code: 'invalid-attribute' | 'typo-attribute' | 'void-children';
    /** Severity of the error */
    severity: 'error' | 'warning';
    /** Suggestion for fix (for typos) */
    suggestion?: string;
    /** Additional data for code actions */
    data?: Record<string, unknown>;
}
/**
 * Validate attributes on a Coherent element.
 *
 * Checks for:
 * - Invalid attribute names for the element
 * - Typos in attribute names (with suggestions)
 * - Children on void elements
 *
 * @param element - The Coherent element to validate
 * @returns Array of validation errors
 */
export declare function validateAttributes(element: CoherentElementInfo): AttributeValidationError[];
/**
 * Validate multiple elements at once.
 *
 * @param elements - Array of Coherent elements to validate
 * @returns Array of all validation errors
 */
export declare function validateAllAttributes(elements: CoherentElementInfo[]): AttributeValidationError[];
//# sourceMappingURL=element-validator.d.ts.map