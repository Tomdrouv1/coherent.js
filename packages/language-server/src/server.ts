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

import {
  createConnection,
  TextDocuments,
  ProposedFeatures,
  InitializeParams,
  TextDocumentSyncKind,
  InitializeResult,
  CodeActionKind,
  DidChangeConfigurationNotification,
} from 'vscode-languageserver/node.js';
import { TextDocument } from 'vscode-languageserver-textdocument';

// Import providers
import { registerDiagnosticProvider } from './providers/diagnostics.js';

// Create connection using all proposed features
export const connection = createConnection(ProposedFeatures.all);

// Text document manager for syncing documents
export const documents: TextDocuments<TextDocument> = new TextDocuments(TextDocument);

// Server capabilities
let hasConfigurationCapability = false;
let hasWorkspaceFolderCapability = false;

connection.onInitialize((params: InitializeParams): InitializeResult => {
  const capabilities = params.capabilities;

  // Check client capabilities
  hasConfigurationCapability = !!(
    capabilities.workspace && !!capabilities.workspace.configuration
  );
  hasWorkspaceFolderCapability = !!(
    capabilities.workspace && !!capabilities.workspace.workspaceFolders
  );

  const result: InitializeResult = {
    capabilities: {
      // Incremental document sync for performance
      textDocumentSync: TextDocumentSyncKind.Incremental,

      // Autocomplete provider
      completionProvider: {
        resolveProvider: true,
        triggerCharacters: ['{', ':', '"', "'"],
      },

      // Hover provider for documentation
      hoverProvider: true,

      // Code action provider for quick fixes
      codeActionProvider: {
        codeActionKinds: [CodeActionKind.QuickFix],
      },
    },
  };

  // Add workspace folder support if available
  if (hasWorkspaceFolderCapability) {
    result.capabilities.workspace = {
      workspaceFolders: {
        supported: true,
      },
    };
  }

  // Log capabilities for debugging
  console.error('[coherent-lsp] Initialized with capabilities:', JSON.stringify(result.capabilities, null, 2));

  return result;
});

connection.onInitialized(() => {
  if (hasConfigurationCapability) {
    // Register for configuration changes
    connection.client.register(DidChangeConfigurationNotification.type, undefined);
  }

  if (hasWorkspaceFolderCapability) {
    connection.workspace.onDidChangeWorkspaceFolders((_event) => {
      console.error('[coherent-lsp] Workspace folder change event received');
    });
  }

  // Register providers
  registerDiagnosticProvider(connection, documents);

  console.error('[coherent-lsp] Server initialized successfully');
});

// Start listening for document events
documents.listen(connection);

// Start the connection
connection.listen();
