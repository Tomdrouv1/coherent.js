/**
 * Hover Provider
 *
 * Provides hover information (documentation) for Coherent.js elements and attributes.
 */
import { Connection, TextDocuments } from 'vscode-languageserver';
import { TextDocument } from 'vscode-languageserver-textdocument';
/**
 * Register the hover provider.
 *
 * @param connection - LSP connection
 * @param documents - Text document manager
 */
export declare function registerHoverProvider(connection: Connection, documents: TextDocuments<TextDocument>): void;
//# sourceMappingURL=hover.d.ts.map