/**
 * WebSocket test helpers for the dev server suite.
 *
 * Shared so both hmr-server.test.js and integration.test.js observe sockets
 * the same way — the listen-after-await race below is easy to reintroduce by
 * hand-rolling a one-off waiter.
 */

/**
 * Attach a message buffer to a WebSocket the moment it is created so we never
 * miss messages that arrive before a later `await` returns. Returns a
 * `next(predicate)` helper that resolves with the next — or already buffered —
 * matching message.
 *
 * This avoids the classic listen-after-await race. `ws` emits 'message' on an
 * EventEmitter, which does not buffer, and the server sends its `connected`
 * ack on setTimeout(0) right after the handshake. When the handshake response
 * and the ack land in the same client-side read, `ws` emits 'open' and then
 * 'message' within one macrotask — before the continuation of
 * `await waitForOpen(ws)` has run to attach a listener. The ack is dropped and
 * the test waits for a message that already came and went. Subscribing at
 * construction removes the race rather than narrowing it; no server-side
 * deferral can close it, because the server cannot know when the client
 * subscribes.
 *
 * @param {object} ws - Socket to observe, freshly constructed.
 * @returns {{ next: (predicate: (data: any) => boolean, timeoutMs?: number) => Promise<any> }}
 */
export function bufferMessages(ws) {
  const buffer = [];
  const waiters = [];
  const seenTypes = [];

  ws.on('message', (buf) => {
    let data;
    try { data = JSON.parse(buf.toString()); } catch { return; }
    seenTypes.push(data?.type ?? '(untyped)');

    for (let i = waiters.length - 1; i >= 0; i--) {
      const waiter = waiters[i];
      if (waiter.predicate(data)) {
        waiters.splice(i, 1);
        clearTimeout(waiter.timer);
        waiter.resolve(data);
        return;
      }
    }
    buffer.push(data);
  });

  return {
    next(predicate, timeoutMs = 4000) {
      const match = buffer.findIndex(predicate);
      if (match >= 0) {
        const [data] = buffer.splice(match, 1);
        return Promise.resolve(data);
      }

      return new Promise((resolve, reject) => {
        const timer = setTimeout(() => {
          const i = waiters.indexOf(entry);
          if (i >= 0) waiters.splice(i, 1);
          reject(new Error(
            `timeout waiting for message after ${timeoutMs}ms ` +
            `(received: ${seenTypes.length ? seenTypes.join(', ') : 'nothing'})`
          ));
        }, timeoutMs);
        const entry = { predicate, resolve, timer };
        waiters.push(entry);
      });
    },
  };
}

/**
 * Resolve once the socket is open, reject if it errors first.
 *
 * @param {object} ws - Socket to await.
 * @returns {Promise<void>}
 */
export function waitForOpen(ws) {
  return new Promise((resolve, reject) => {
    ws.once('open', resolve);
    ws.once('error', reject);
  });
}
