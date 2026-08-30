/**
 * Minimal fixed-window rate limiter for the website's Express routes.
 *
 * Deliberately dependency-free and in-process: this server is the dev and
 * preview host, so the goal is to stop one client from monopolising a route
 * that touches the filesystem or spawns a process, not to coordinate limits
 * across a cluster.
 *
 * @module website/rate-limit
 */

/** Entries are swept once the map grows past this, to bound memory. */
const SWEEP_THRESHOLD = 10_000;

/**
 * Build an Express middleware allowing `max` requests per `windowMs` per client.
 *
 * @param {Object} options
 * @param {number} options.windowMs - Window length in milliseconds
 * @param {number} options.max - Requests allowed per window
 * @param {() => number} [options.now] - Clock, for tests
 * @returns {(req: Object, res: Object, next: Function) => void} Middleware
 */
export function rateLimit({ windowMs, max, now = Date.now }) {
  if (!(windowMs > 0)) throw new TypeError('windowMs must be a positive number');
  if (!(max > 0)) throw new TypeError('max must be a positive number');

  const clients = new Map();

  return function rateLimitMiddleware(req, res, next) {
    const timestamp = now();
    const key = req.ip || req.socket?.remoteAddress || 'unknown';
    const entry = clients.get(key);

    if (!entry || timestamp >= entry.resetAt) {
      clients.set(key, { count: 1, resetAt: timestamp + windowMs });
    } else if (entry.count >= max) {
      const retryAfter = Math.ceil((entry.resetAt - timestamp) / 1000);
      res.setHeader('Retry-After', String(retryAfter));
      res.status(429).json({ error: 'Too many requests' });
      return;
    } else {
      entry.count += 1;
    }

    if (clients.size > SWEEP_THRESHOLD) {
      for (const [client, seen] of clients) {
        if (timestamp >= seen.resetAt) clients.delete(client);
      }
    }

    next();
  };
}
