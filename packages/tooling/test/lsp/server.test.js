/**
 * The LSP module as a library and as the coherent-language-server binary.
 *
 * Regression coverage for server.ts creating and listening on a connection
 * at import time: importing `@coherent.js/tooling/lsp` as a library threw
 * "Connection input stream is not set" (the package also declares
 * sideEffects: false).
 */

import { describe, it, expect, afterEach } from 'vitest';
import { spawn } from 'node:child_process';
import { PassThrough } from 'node:stream';
import { fileURLToPath } from 'node:url';
import {
  createConnection,
  createMessageConnection,
  StreamMessageReader,
  StreamMessageWriter
} from 'vscode-languageserver/node';

const TOOLING_DIR = fileURLToPath(new URL('../..', import.meta.url));
const BIN = fileURLToPath(new URL('../../src/lsp/bin.ts', import.meta.url));

const INITIALIZE_PARAMS = { processId: process.pid, rootUri: null, capabilities: {} };

const children = [];
afterEach(() => {
  while (children.length) children.pop().kill();
});

/** Minimal LSP client over a child's stdio: Content-Length framed JSON-RPC. */
function lspClient(child) {
  let buffer = Buffer.alloc(0);
  const waiters = new Map();
  child.stdout.on('data', (chunk) => {
    buffer = Buffer.concat([buffer, chunk]);
    for (;;) {
      const headerEnd = buffer.indexOf('\r\n\r\n');
      if (headerEnd === -1) return;
      const length = Number(/Content-Length: (\d+)/i.exec(buffer.subarray(0, headerEnd).toString())[1]);
      if (buffer.length < headerEnd + 4 + length) return;
      const message = JSON.parse(buffer.subarray(headerEnd + 4, headerEnd + 4 + length).toString());
      buffer = buffer.subarray(headerEnd + 4 + length);
      waiters.get(message.id)?.(message);
    }
  });
  return {
    request(id, method, params) {
      const body = Buffer.from(JSON.stringify({ jsonrpc: '2.0', id, method, params }));
      child.stdin.write(`Content-Length: ${body.length}\r\n\r\n`);
      child.stdin.write(body);
      return new Promise((resolve, reject) => {
        const timer = setTimeout(() => reject(new Error(`no response to ${method}`)), 15_000);
        waiters.set(id, (message) => { clearTimeout(timer); resolve(message); });
      });
    }
  };
}

describe('@coherent.js/tooling/lsp', () => {
  it('can be imported as a library without starting a server', async () => {
    const lsp = await import('../../src/lsp/server.ts');
    expect(lsp.startServer).toBeTypeOf('function');
    expect(lsp).not.toHaveProperty('connection');
  });

  it('startServer() serves the connection it is given', async () => {
    const { startServer } = await import('../../src/lsp/server.ts');
    const toServer = new PassThrough();
    const toClient = new PassThrough();

    const { connection } = startServer(
      createConnection(new StreamMessageReader(toServer), new StreamMessageWriter(toClient))
    );
    const client = createMessageConnection(new StreamMessageReader(toClient), new StreamMessageWriter(toServer));
    client.listen();

    try {
      const result = await client.sendRequest('initialize', INITIALIZE_PARAMS);
      expect(result.capabilities.hoverProvider).toBe(true);
      expect(result.capabilities.completionProvider.triggerCharacters).toContain('{');
    } finally {
      client.dispose();
      connection.dispose();
    }
  });

  it('the coherent-language-server binary answers initialize over --stdio', async () => {
    const child = spawn(process.execPath, ['--import', 'tsx', BIN, '--stdio'], {
      cwd: TOOLING_DIR,
      stdio: ['pipe', 'pipe', 'pipe']
    });
    children.push(child);
    let stderr = '';
    child.stderr.on('data', (d) => { stderr += d; });

    const client = lspClient(child);
    const response = await client.request(1, 'initialize', INITIALIZE_PARAMS).catch((error) => {
      throw new Error(`${error.message}\n${stderr}`);
    });
    expect(response.error).toBeUndefined();
    expect(response.result.capabilities.hoverProvider).toBe(true);
  }, 30_000);
});
