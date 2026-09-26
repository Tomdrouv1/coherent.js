import * as path from 'path';
import { ExtensionContext, workspace } from 'vscode';
import {
  LanguageClient,
  LanguageClientOptions,
  ServerOptions,
  TransportKind,
} from 'vscode-languageclient/node';

let client: LanguageClient | undefined;

export function activate(context: ExtensionContext): void {
  // Server is BUNDLED with extension in server/ directory
  // This avoids npm dependency resolution issues and works offline
  const serverModule = context.asAbsolutePath(path.join('server', 'server.js'));

  // Server options - use IPC for better performance
  const serverOptions: ServerOptions = {
    run: {
      module: serverModule,
      transport: TransportKind.ipc,
    },
    debug: {
      module: serverModule,
      transport: TransportKind.ipc,
      options: {
        execArgv: ['--nolazy', '--inspect=6009'],
      },
    },
  };

  // Client options
  const clientOptions: LanguageClientOptions = {
    // Register for JavaScript and TypeScript files
    documentSelector: [
      { scheme: 'file', language: 'javascript' },
      { scheme: 'file', language: 'typescript' },
      { scheme: 'file', language: 'javascriptreact' },
      { scheme: 'file', language: 'typescriptreact' },
    ],
    synchronize: {
      // Synchronize the setting section 'coherent' to the server
      configurationSection: 'coherent',
      // Notify the server about file changes
      fileEvents: workspace.createFileSystemWatcher('**/*.{js,ts,jsx,tsx}'),
    },
  };

  // Create and start the language client
  // The id is the settings prefix: `coherent.trace.server` (contributed in
  // package.json) only takes effect when the client id is 'coherent'.
  client = new LanguageClient(
    'coherent',
    'Coherent.js Language Server',
    serverOptions,
    clientOptions
  );

  // Start the client (also launches the server)
  client.start();

  // Push client to subscriptions for cleanup on deactivation
  context.subscriptions.push({
    dispose: () => {
      if (client) {
        client.stop();
      }
    },
  });
}

export function deactivate(): Thenable<void> | undefined {
  if (!client) {
    return undefined;
  }
  return client.stop();
}
