/**
 * Real-socket helpers for router tests.
 *
 * Mock `res` objects never set `headersSent`, so behaviour that depends on
 * the response state (stopping a middleware chain, HEAD bodies, aborts) has to
 * be exercised through an actual node:http server.
 */

import { once } from 'node:events';

/**
 * Start `router` on an ephemeral port.
 *
 * @param {Object} router - A SimpleRouter
 * @param {Object} [options] - Options forwarded to router.createServer()
 * @returns {Promise<{ base: string, port: number, server: import('node:http').Server, close: () => Promise<void> }>}
 */
export async function startServer(router, options) {
  const server = router.createServer(options);
  server.listen(0, '127.0.0.1');
  await once(server, 'listening');
  const { port } = server.address();
  return {
    base: `http://127.0.0.1:${port}`,
    port,
    server,
    close: () =>
      new Promise((resolve) => {
        server.closeAllConnections?.();
        server.close(() => resolve());
      })
  };
}

/**
 * fetch() wrapper returning status, headers and the parsed body.
 *
 * @param {string} url - Absolute URL
 * @param {RequestInit} [init] - fetch options
 */
export async function request(url, init) {
  const response = await fetch(url, init);
  const text = await response.text();
  let json;
  try {
    json = text ? JSON.parse(text) : undefined;
  } catch {
    json = undefined;
  }
  return { status: response.status, headers: response.headers, text, json };
}

/** JSON POST/PUT/PATCH/DELETE init object. */
export function jsonInit(method, body, headers = {}) {
  return {
    method,
    headers: { 'content-type': 'application/json', ...headers },
    body: typeof body === 'string' ? body : JSON.stringify(body)
  };
}
