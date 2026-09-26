/**
 * HMR WebSocket Server
 *
 * Attaches a WebSocket server to an existing HTTP server (sharing the
 * same port), tracks connected dev clients, and exposes a broadcast()
 * helper that serializes a message once and fan-outs to every live
 * client. Used by the Coherent dev server to push hot-update events
 * to browser-side HMR clients.
 *
 * Wire protocol matches packages/client/src/hmr/client.js — server
 * sends `{type, filePath?, webPath?, error?, updateType?}` objects;
 * client switches on `type` and handles updates, reloads, errors.
 *
 * @module @coherent.js/cli/dev-server/hmr-server
 */

import { WebSocketServer } from 'ws';
import { isHostAllowed, isOriginAllowed } from './access.js';

/**
 * @typedef {Object} HmrServer
 * @property {(message: object) => void} broadcast - Serialize and send a JSON message to every live client.
 * @property {() => void} close - Close the WebSocket server and drop all clients.
 * @property {() => number} clientCount - Current number of live clients (for tests / diagnostics).
 */

/**
 * Create and attach an HMR WebSocket server to an existing HTTP server.
 *
 * The WS server shares the HTTP server's port — clients connect to
 * `ws://host:port` (no separate port to manage). New clients receive
 * a `{type: 'connected'}` ack on open. Dead clients are pruned on
 * the next broadcast.
 *
 * Upgrades are refused (403) when the Host header does not name this
 * server or when a browser Origin belongs to another site: without that,
 * any page the developer visits could subscribe to the change feed.
 *
 * @param {import('node:http').Server} httpServer - HTTP server to attach to.
 * @param {import('./access.js').HostOptions} [options] - Accepted hosts (see access.js).
 * @returns {HmrServer}
 */
export function createHmrServer(httpServer, options = {}) {
  const hostOptions = { host: options.host, allowedHosts: options.allowedHosts ?? [] };
  const wss = new WebSocketServer({
    server: httpServer,
    verifyClient: ({ origin, req }, done) => {
      if (isHostAllowed(req.headers.host, hostOptions) && isOriginAllowed(origin, hostOptions)) {
        done(true);
      } else {
        done(false, 403, 'Forbidden');
      }
    },
  });

  wss.on('connection', (socket) => {
    // Defer the initial ack by one event-loop turn so the client-side
    // 'open' event has time to resolve before the message arrives.
    // Without this, the 'message' event fires synchronously during the
    // WS handshake — before the client can attach its first listener.
    setTimeout(() => {
      if (socket.readyState === socket.OPEN) {
        try {
          socket.send(JSON.stringify({ type: 'connected' }));
        } catch {
          // Client may have disconnected mid-handshake; ignore.
        }
      }
    }, 0);
  });

  // Surface listener errors instead of crashing the dev server.
  wss.on('error', (err) => {
    console.warn('[coherent dev] HMR server error:', err.message);
  });

  return {
    broadcast(message) {
      const frame = JSON.stringify(message); // throws on circular — surfaces caller bug loudly
      for (const client of wss.clients) {
        if (client.readyState === client.OPEN) {
          try {
            client.send(frame);
          } catch {
            // Dead socket — let `ws` clean it up on its own close event.
          }
        }
      }
    },
    close() {
      // terminate(), not close(): close() waits up to 30s for the browser to
      // answer the closing handshake, and a tab that doesn't (busy, or
      // already reconnecting) held the dev server's shutdown that long.
      for (const client of wss.clients) {
        try { client.terminate(); } catch { /* ignore */ }
      }
      wss.close();
    },
    clientCount() {
      let n = 0;
      for (const c of wss.clients) if (c.readyState === c.OPEN) n++;
      return n;
    },
  };
}
