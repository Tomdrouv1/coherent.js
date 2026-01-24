/**
 * HTML Nesting Validator
 *
 * Validates parent/child relationships of Coherent.js elements
 * against HTML5 content model rules.
 */
import { Range } from 'vscode-languageserver';
import { CoherentElementInfo } from './coherent-analyzer.js';
/**
 * Nesting validation error.
 */
export interface NestingValidationError {
    /** Error message */
    message: string;
    /** Source range of the error */
    range: Range;
    /** Error code for categorization */
    code: 'invalid-nesting' | 'invalid-parent' | 'block-in-inline' | 'invalid-child';
    /** Severity of the error */
    severity: 'error' | 'warning';
    /** The child element tag name */
    childTag: string;
    /** The parent element tag name */
    parentTag: string;
    /** Additional data for code actions */
    data?: Record<string, unknown>;
}
/**
 * Validate nesting of an element within its parent.
 *
 * @param element - The Coherent element to validate
 * @returns Array of nesting validation errors
 */
export declare function validateElementNesting(element: CoherentElementInfo): NestingValidationError[];
/**
 * Validate nesting for multiple elements.
 *
 * @param elements - Array of Coherent elements to validate
 * @returns Array of all nesting validation errors
 */
export declare function validateAllNesting(elements: CoherentElementInfo[]): NestingValidationError[];
/**
 * Get suggestions for fixing nesting errors.
 *
 * @param error - The nesting validation error
 * @returns Suggested fix description or null
 */
export declare function getNestingFixSuggestion(error: NestingValidationError): string | null;
//# sourceMappingURL=nesting-validator.d.ts.map