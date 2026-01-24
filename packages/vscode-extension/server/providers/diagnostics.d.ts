/**
 * Diagnostics Provider
 *
 * Validates documents and publishes diagnostics (errors/warnings)
 * to the LSP client for display in the IDE.
 */
import { Connection, TextDocuments, Diagnostic } from 'vscode-languageserver';
import { TextDocument } from 'vscode-languageserver-textdocument';
/**
 * Validate a single document and return diagnostics.
 *
 * @param document - Text document to validate
 * @returns Array of diagnostics
 */
export declare function validateDocument(document: TextDocument): Diagnostic[];
/**
 * Register the diagnostics provider.
 *
 * Sets up document change listeners to trigger validation
 * with debouncing.
 *
 * @param connection - LSP connection
 * @param documents - Text document manager
 */
export declare function registerDiagnosticProvider(connection: Connection, documents: TextDocuments<TextDocument>): void;
//# sourceMappingURL=diagnostics.d.ts.map