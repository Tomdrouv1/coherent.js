/**
 * Element Attribute Validator
 *
 * Validates attributes on Coherent.js elements against the allowed
 * attributes for each HTML element type.
 */

import { Range } from 'vscode-languageserver';
import { AttributeInfo, CoherentElementInfo } from './coherent-analyzer.js';
import {
  isValidAttribute,
  isVoidElement,
  getSuggestions,
} from '../data/element-attributes.js';

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
export function validateAttributes(element: CoherentElementInfo): AttributeValidationError[] {
  const errors: AttributeValidationError[] = [];
  const tagName = element.tagName;

  for (const attr of element.attributes) {
    // Skip Coherent-specific properties that we handle separately
    if (attr.name === 'children' || attr.name === 'text' || attr.name === 'html' || attr.name === 'key') {
      // Check for children on void elements
      if (attr.name === 'children' && isVoidElement(tagName)) {
        errors.push({
          message: `<${tagName}> is a void element and cannot have children`,
          range: attr.range,
          code: 'void-children',
          severity: 'error',
          data: { tagName, attributeName: attr.name },
        });
      }
      continue;
    }

    // Check if attribute is valid for this element
    if (!isValidAttribute(tagName, attr.name)) {
      // Check for typo suggestions
      const suggestions = getSuggestions(tagName, attr.name);

      if (suggestions.length > 0) {
        errors.push({
          message: `Unknown attribute '${attr.name}' on <${tagName}>. Did you mean '${suggestions[0]}'?`,
          range: attr.nameRange,
          code: 'typo-attribute',
          severity: 'error',
          suggestion: suggestions[0],
          data: {
            tagName,
            attributeName: attr.name,
            suggestions,
          },
        });
      } else {
        errors.push({
          message: `Attribute '${attr.name}' is not valid for <${tagName}>`,
          range: attr.nameRange,
          code: 'invalid-attribute',
          severity: 'error',
          data: {
            tagName,
            attributeName: attr.name,
          },
        });
      }
    }
  }

  return errors;
}

/**
 * Validate multiple elements at once.
 *
 * @param elements - Array of Coherent elements to validate
 * @returns Array of all validation errors
 */
export function validateAllAttributes(elements: CoherentElementInfo[]): AttributeValidationError[] {
  const errors: AttributeValidationError[] = [];

  for (const element of elements) {
    errors.push(...validateAttributes(element));
  }

  return errors;
}
