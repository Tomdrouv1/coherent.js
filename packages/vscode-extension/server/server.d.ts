#!/usr/bin/env node
/**
 * Coherent.js Language Server
 *
 * Provides Language Server Protocol (LSP) support for Coherent.js components:
 * - Autocomplete for tag names and attributes
 * - Validation of attributes and HTML nesting
 * - Hover documentation for elements and attributes
 * - Quick fix code actions for common issues
 *
 * @see https://microsoft.github.io/language-server-protocol/
 */
import { TextDocuments } from 'vscode-languageserver/node';
import { TextDocument } from 'vscode-languageserver-textdocument';
export declare const connection: import("vscode-languageserver/node")._Connection<import("vscode-languageserver/node")._, import("vscode-languageserver/node")._, import("vscode-languageserver/node")._, import("vscode-languageserver/node")._, import("vscode-languageserver/node")._, import("vscode-languageserver/node")._, import("vscode-languageserver/node")._, import("vscode-languageserver/node")._>;
export declare const documents: TextDocuments<TextDocument>;
//# sourceMappingURL=server.d.ts.map