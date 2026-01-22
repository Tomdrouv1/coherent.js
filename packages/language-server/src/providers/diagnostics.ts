/**
 * Diagnostics Provider
 *
 * Validates documents and publishes diagnostics (errors/warnings)
 * to the LSP client for display in the IDE.
 */

import {
  Connection,
  TextDocuments,
  Diagnostic,
  DiagnosticSeverity,
} from 'vscode-languageserver';
import { TextDocument } from 'vscode-languageserver-textdocument';
import { findCoherentElements, createSourceFile } from '../analysis/coherent-analyzer.js';
import { validateAllAttributes, AttributeValidationError } from '../analysis/element-validator.js';
import { validateAllNesting, NestingValidationError } from '../analysis/nesting-validator.js';

/**
 * Debounce timeout for validation (ms).
 * Prevents excessive validation during rapid typing.
 */
const VALIDATION_DEBOUNCE_MS = 300;

/**
 * Map of document URIs to debounce timers.
 */
const validationTimers = new Map<string, NodeJS.Timeout>();

/**
 * Convert an attribute validation error to an LSP diagnostic.
 */
function attributeErrorToDiagnostic(error: AttributeValidationError): Diagnostic {
  return {
    severity: error.severity === 'error' ? DiagnosticSeverity.Error : DiagnosticSeverity.Warning,
    range: error.range,
    message: error.message,
    source: 'coherent',
    code: error.code,
    data: {
      ...error.data,
      suggestion: error.suggestion,
    },
  };
}

/**
 * Convert a nesting validation error to an LSP diagnostic.
 */
function nestingErrorToDiagnostic(error: NestingValidationError): Diagnostic {
  return {
    severity: error.severity === 'error' ? DiagnosticSeverity.Error : DiagnosticSeverity.Warning,
    range: error.range,
    message: error.message,
    source: 'coherent',
    code: error.code,
    data: error.data,
  };
}

/**
 * Validate a single document and return diagnostics.
 *
 * @param document - Text document to validate
 * @returns Array of diagnostics
 */
export function validateDocument(document: TextDocument): Diagnostic[] {
  const diagnostics: Diagnostic[] = [];

  try {
    const content = document.getText();
    const uri = document.uri;

    // Determine file type for proper parsing
    const isTypeScript = uri.endsWith('.ts') || uri.endsWith('.tsx');
    const isJavaScript = uri.endsWith('.js') || uri.endsWith('.jsx') || uri.endsWith('.mjs');

    // Skip non-JS/TS files
    if (!isTypeScript && !isJavaScript) {
      return diagnostics;
    }

    // Parse the document
    const sourceFile = createSourceFile(content, uri);

    // Find all Coherent elements
    const elements = findCoherentElements(sourceFile);

    if (elements.length === 0) {
      // No Coherent elements found, nothing to validate
      return diagnostics;
    }

    // Validate attributes
    const attributeErrors = validateAllAttributes(elements);
    for (const error of attributeErrors) {
      diagnostics.push(attributeErrorToDiagnostic(error));
    }

    // Validate nesting
    const nestingErrors = validateAllNesting(elements);
    for (const error of nestingErrors) {
      diagnostics.push(nestingErrorToDiagnostic(error));
    }
  } catch (error) {
    // Log error but don't crash - malformed documents are expected during editing
    console.error('[coherent-lsp] Validation error:', error);
  }

  return diagnostics;
}

/**
 * Register the diagnostics provider.
 *
 * Sets up document change listeners to trigger validation
 * with debouncing.
 *
 * @param connection - LSP connection
 * @param documents - Text document manager
 */
export function registerDiagnosticProvider(
  connection: Connection,
  documents: TextDocuments<TextDocument>
): void {
  // Validate on document open
  documents.onDidOpen((event) => {
    scheduleValidation(connection, event.document);
  });

  // Validate on document change (debounced)
  documents.onDidChangeContent((event) => {
    scheduleValidation(connection, event.document);
  });

  // Clear diagnostics when document closes
  documents.onDidClose((event) => {
    // Cancel any pending validation
    const timer = validationTimers.get(event.document.uri);
    if (timer) {
      clearTimeout(timer);
      validationTimers.delete(event.document.uri);
    }

    // Clear diagnostics
    connection.sendDiagnostics({ uri: event.document.uri, diagnostics: [] });
  });
}

/**
 * Schedule document validation with debouncing.
 *
 * @param connection - LSP connection
 * @param document - Document to validate
 */
function scheduleValidation(
  connection: Connection,
  document: TextDocument
): void {
  const uri = document.uri;

  // Cancel existing timer
  const existingTimer = validationTimers.get(uri);
  if (existingTimer) {
    clearTimeout(existingTimer);
  }

  // Schedule new validation
  const timer = setTimeout(() => {
    validationTimers.delete(uri);
    const diagnostics = validateDocument(document);
    connection.sendDiagnostics({ uri, diagnostics });
  }, VALIDATION_DEBOUNCE_MS);

  validationTimers.set(uri, timer);
}
