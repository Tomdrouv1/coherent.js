/**
 * Code Action Provider
 *
 * Provides quick fix code actions for validation errors.
 */
import { Connection, TextDocuments } from 'vscode-languageserver';
import { TextDocument } from 'vscode-languageserver-textdocument';
/**
 * Register the code action provider.
 *
 * @param connection - LSP connection
 * @param documents - Text document manager
 */
export declare function registerCodeActionProvider(connection: Connection, documents: TextDocuments<TextDocument>): void;
//# sourceMappingURL=code-actions.d.ts.map