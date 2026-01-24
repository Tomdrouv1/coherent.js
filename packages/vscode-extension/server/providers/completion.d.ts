/**
 * Completion Provider
 *
 * Provides autocomplete suggestions for Coherent.js elements and attributes.
 */
import { Connection, TextDocuments } from 'vscode-languageserver';
import { TextDocument } from 'vscode-languageserver-textdocument';
/**
 * Register the completion provider.
 *
 * @param connection - LSP connection
 * @param documents - Text document manager
 */
export declare function registerCompletionProvider(connection: Connection, documents: TextDocuments<TextDocument>): void;
//# sourceMappingURL=completion.d.ts.map