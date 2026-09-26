/**
 * Helpers for driving a real framework server in-process: listen on an
 * ephemeral port, issue requests with fetch, and close it afterwards.
 */

/**
 * Start a Node HTTP server (anything with `listen(port, cb)` returning a
 * net.Server, e.g. an Express app or `http.createServer(koa.callback())`) on
 * port 0 and resolve with its base URL and a close function.
 *
 * @param {{ listen: Function }} listenable
 * @returns {Promise<{ url: string, close: () => Promise<void> }>}
 */
export function listen(listenable) {
  return new Promise((resolve, reject) => {
    const server = listenable.listen(0, '127.0.0.1', () => {
      const { port } = server.address();
      resolve({
        url: `http://127.0.0.1:${port}`,
        close: () => new Promise((done) => {
          server.closeAllConnections?.();
          server.close(() => done());
        })
      });
    });
    server.once('error', reject);
  });
}

/**
 * GET (or other method) a path and return status, content type and body.
 *
 * @param {string} url - Base URL
 * @param {string} path - Request path
 * @param {RequestInit} [init] - fetch options
 */
export async function hit(url, path, init = {}) {
  const response = await fetch(`${url}${path}`, { redirect: 'manual', ...init });
  return {
    status: response.status,
    type: response.headers.get('content-type') ?? '',
    headers: response.headers,
    body: await response.text()
  };
}
