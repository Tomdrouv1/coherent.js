/**
 * HTML Nesting Validator
 *
 * Validates parent/child relationships of Coherent.js elements
 * against HTML5 content model rules.
 */

import { Range } from 'vscode-languageserver';
import { CoherentElementInfo } from './coherent-analyzer.js';
import { validateNesting as checkNesting, ValidationError } from '../data/nesting-rules.js';

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
export function validateElementNesting(element: CoherentElementInfo): NestingValidationError[] {
  const errors: NestingValidationError[] = [];

  // Check this element against its parent
  const parentTag = element.parent?.tagName || null;
  const nestingErrors = checkNesting(element.tagName, parentTag);

  for (const error of nestingErrors) {
    errors.push({
      message: error.message,
      range: element.tagNameRange,
      code: error.code as NestingValidationError['code'],
      severity: error.severity,
      childTag: element.tagName,
      parentTag: parentTag || 'root',
      data: {
        childTag: element.tagName,
        parentTag: parentTag || 'root',
      },
    });
  }

  return errors;
}

/**
 * Validate nesting for multiple elements.
 *
 * @param elements - Array of Coherent elements to validate
 * @returns Array of all nesting validation errors
 */
export function validateAllNesting(elements: CoherentElementInfo[]): NestingValidationError[] {
  const errors: NestingValidationError[] = [];

  for (const element of elements) {
    errors.push(...validateElementNesting(element));
  }

  return errors;
}

/**
 * Get suggestions for fixing nesting errors.
 *
 * @param error - The nesting validation error
 * @returns Suggested fix description or null
 */
export function getNestingFixSuggestion(error: NestingValidationError): string | null {
  switch (error.code) {
    case 'invalid-parent':
      return `Move <${error.childTag}> to be a child of the correct parent element`;

    case 'invalid-nesting':
      return `Remove <${error.childTag}> from <${error.parentTag}> or restructure the component`;

    case 'block-in-inline':
      return `Consider using a block-level container instead of <${error.parentTag}>`;

    case 'invalid-child':
      return `<${error.parentTag}> should not contain <${error.childTag}>`;

    default:
      return null;
  }
}
