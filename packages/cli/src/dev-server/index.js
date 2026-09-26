/**
 * Coherent Dev Server
 *
 * Orchestrator that boots:
 *   - An HTTP server serving static files under `root` (with HMR
 *     client injection on HTML responses)
 *   - A WebSocket server sharing the HTTP port, used to broadcast
 *     HMR messages to connected browser clients
 *   - A chokidar file watcher that emits HMR update messages on
 *     edits to files under `root`
 *
 * @module @coherent.js/cli/dev-server
 */

import { createServer } from 'node:http';
import { resolve } from 'node:path';
import picocolors from 'picocolors';
import { createHmrServer } from './hmr-server.js';
import { createFileWatcher } from './file-watcher.js';
import { createStaticHandler } from './static-handler.js';

/**
 * @typedef {Object} DevServerOptions
 * @property {string} root - Absolute path to the project root.
 * @property {number} [port=3000] - Port to listen on. `0` picks a random free port (useful for tests).
 * @property {string} [host='localhost'] - Host interface to bind.
 * @property {boolean} [open=false] - Open the default browser to the served URL after start.
 * @property {boolean} [log=true] - Emit startup / change log lines to stdout.
 * @property {boolean} [hmr=true] - Attach the HMR WebSocket server and file watcher.
 * @property {string[]} [fsAllow] - Extra directories files may be served from, beyond the
 *   project root, its workspace root and the real directories of node_modules entries.
 * @property {string[]|true} [allowedHosts] - Host names accepted besides localhost, IP
 *   addresses and `host` (a leading `.` accepts subdomains); `true` accepts any host.
 */

/**
 * @typedef {Object} DevServer
 * @property {number} port - The actual port the HTTP server is listening on.
 * @property {string} host - The host the HTTP server is bound to.
 * @property {() => Promise<void>} close - Shut down HTTP server, WS server, and file watcher.
 */

/** Replace the absolute project root in `text` so messages stay root-relative. */
function redactRoot(text, root) {
  if (typeof text !== 'string') return text;
  return text.split(resolve(root)).join('');
}

/**
 * Start the Coherent dev server and return a handle for graceful shutdown.
 *
 * Resolves once the HTTP server is listening AND the file watcher's
 * initial scan is complete — callers can immediately connect a WS
 * client and trust that touching a file will fire an HMR message.
 *
 * @param {DevServerOptions} options
 * @returns {Promise<DevServer>}
 */
export async function startDevServer(options) {
  const {
    root,
    port = 3000,
    host = 'localhost',
    open = false,
    log = true,
    hmr = true,
    fsAllow = [],
    allowedHosts = [],
  } = options;

  const handler = createStaticHandler({ root, hmr, fsAllow, host, allowedHosts });
  const httpServer = createServer(handler);

  await new Promise((resolve, reject) => {
    httpServer.once('error', reject);
    httpServer.listen(port, host, () => {
      httpServer.removeListener('error', reject);
      resolve();
    });
  });

  const actualPort = httpServer.address().port;

  let hmrServer = null;
  let watcher = null;
  if (hmr) {
    hmrServer = createHmrServer(httpServer, { host, allowedHosts });
    watcher = await createFileWatcher({
      root,
      onChange: (change) => {
        // Root-relative paths only: absolute paths reveal the developer's
        // file system layout (user name, home directory) to every client.
        hmrServer.broadcast({
          type: 'hmr-update',
          filePath: change.webPath,
          webPath: change.webPath,
          updateType: change.updateType,
        });
        if (log) {
          console.log(picocolors.cyan('[hmr]'), change.updateType, change.webPath);
        }
      },
      onError: (err) => {
        hmrServer.broadcast({
          type: 'hmr-error',
          error: {
            message: redactRoot(err.message, root),
            file: null,
            line: null,
            column: null,
            stack: redactRoot(err.stack, root),
          },
        });
        if (log) {
          console.warn(picocolors.yellow('[hmr] watcher error:'), err.message);
        }
      },
    });
  }

  if (log) {
    console.log(picocolors.green('✅ Coherent dev server ready'));
    console.log(picocolors.cyan('🌐 Local:'), `http://${host}:${actualPort}`);
    if (!hmr) {
      console.log(picocolors.gray('   HMR: disabled (--no-hmr)'));
    }
  }

  if (open) {
    try {
      const { default: openModule } = await import('open');
      await openModule(`http://${host}:${actualPort}`);
    } catch {
      // 'open' is optional (not a dependency of the CLI)
      if (log) {
        console.log(picocolors.yellow('⚠️  Could not open a browser (install the optional "open" package).'));
      }
    }
  }

  return {
    port: actualPort,
    host,
    async close() {
      if (watcher) await watcher.close();
      if (hmrServer) hmrServer.close();
      await new Promise((resolve) => httpServer.close(() => resolve()));
    },
  };
}
