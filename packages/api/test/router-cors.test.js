/**
 * Tests for CORS header handling in the object router.
 */

import { describe, it, expect } from 'vitest';
import { createRouter } from '../src/router.js';

function createMockRes() {
  const headers = {};
  return {
    headers,
    setHeader(name, value) { headers[name] = value; },
    getHeader(name) { return headers[name]; },
    writeHead() {},
    end() {},
  };
}

function createMockReq(origin) {
  return {
    method: 'GET',
    url: '/ping',
    headers: origin ? { origin } : {},
    query: {},
    connection: { remoteAddress: '127.0.0.1' },
  };
}

/** Handle one GET /ping and return the response headers that were set. */
async function headersFor(routerOptions, requestOrigin) {
  const router = createRouter(
    { ping: { get: { path: '/ping', handler: () => ({ ok: true }) } } },
    routerOptions
  );
  const res = createMockRes();
  await router.handle(createMockReq(requestOrigin), res, routerOptions);
  return res.headers;
}

describe('router CORS headers', () => {
  describe('without a configured corsOrigin', () => {
    it('serves the development default without credentials', async () => {
      const headers = await headersFor({});

      expect(headers['Access-Control-Allow-Origin']).toBe('http://localhost:3000');
      expect(headers['Access-Control-Allow-Credentials']).toBeUndefined();
    });

    it('does not vary on Origin, since the value is fixed', async () => {
      const headers = await headersFor({}, 'https://evil.example');

      expect(headers['Access-Control-Allow-Origin']).toBe('http://localhost:3000');
      expect(headers['Access-Control-Allow-Credentials']).toBeUndefined();
      expect(headers.Vary).toBeUndefined();
    });
  });

  describe('with a single configured origin', () => {
    const options = { corsOrigin: 'https://app.example' };

    it('allows credentials for the configured origin', async () => {
      const headers = await headersFor(options, 'https://app.example');

      expect(headers['Access-Control-Allow-Origin']).toBe('https://app.example');
      expect(headers['Access-Control-Allow-Credentials']).toBe('true');
      expect(headers.Vary).toBe('Origin');
    });

    it('advertises the configured origin when the request has no Origin', async () => {
      const headers = await headersFor(options);

      expect(headers['Access-Control-Allow-Origin']).toBe('https://app.example');
      expect(headers['Access-Control-Allow-Credentials']).toBe('true');
    });

    it('sends no CORS headers to an untrusted origin', async () => {
      const headers = await headersFor(options, 'https://evil.example');

      expect(headers['Access-Control-Allow-Origin']).toBeUndefined();
      expect(headers['Access-Control-Allow-Credentials']).toBeUndefined();
      expect(headers['Access-Control-Allow-Methods']).toBeUndefined();
    });

    it('still varies on Origin when the origin is rejected, for cache safety', async () => {
      const headers = await headersFor(options, 'https://evil.example');

      expect(headers.Vary).toBe('Origin');
    });
  });

  describe('with an allowlist of origins', () => {
    const options = { corsOrigin: ['https://app.example', 'https://admin.app.example'] };

    it('echoes back whichever listed origin made the request', async () => {
      const headers = await headersFor(options, 'https://admin.app.example');

      expect(headers['Access-Control-Allow-Origin']).toBe('https://admin.app.example');
      expect(headers['Access-Control-Allow-Credentials']).toBe('true');
      expect(headers.Vary).toBe('Origin');
    });

    it('matches the first entry too', async () => {
      const headers = await headersFor(options, 'https://app.example');

      expect(headers['Access-Control-Allow-Origin']).toBe('https://app.example');
    });

    it('rejects an origin that only shares a prefix with a listed one', async () => {
      const headers = await headersFor(options, 'https://app.example.evil.com');

      expect(headers['Access-Control-Allow-Origin']).toBeUndefined();
      expect(headers['Access-Control-Allow-Credentials']).toBeUndefined();
    });
  });

  describe('security headers', () => {
    it('are sent alongside CORS headers', async () => {
      const headers = await headersFor({});

      expect(headers['X-Content-Type-Options']).toBe('nosniff');
      expect(headers['X-Frame-Options']).toBe('DENY');
    });

    it('are still sent when the origin is rejected', async () => {
      const headers = await headersFor({ corsOrigin: 'https://app.example' }, 'https://evil.example');

      expect(headers['X-Content-Type-Options']).toBe('nosniff');
    });
  });

  describe('invalid corsOrigin', () => {
    const build = (corsOrigin) => () => createRouter({}, { corsOrigin });

    it("rejects '*' because it cannot carry credentials", () => {
      expect(build('*')).toThrow(TypeError);
      expect(build('*')).toThrow(/cannot be combined with credentialed CORS/);
    });

    it("rejects '*' inside an allowlist", () => {
      expect(build(['https://app.example', '*'])).toThrow(TypeError);
    });

    it('rejects an empty allowlist', () => {
      expect(build([])).toThrow(/must not be an empty array/);
    });

    it('rejects non-string entries', () => {
      expect(build(42)).toThrow(/non-empty strings/);
      expect(build([null])).toThrow(/non-empty strings/);
    });

    it('rejects an empty string', () => {
      expect(build('')).toThrow(/non-empty strings/);
    });

    it('fails at construction, not on the first request', () => {
      expect(build('*')).toThrow();
    });
  });

  describe('per-request corsOrigin override', () => {
    it('takes precedence over the router configuration', async () => {
      const router = createRouter(
        { ping: { get: { path: '/ping', handler: () => ({ ok: true }) } } },
        { corsOrigin: 'https://app.example' }
      );
      const res = createMockRes();

      await router.handle(createMockReq('https://other.example'), res, {
        corsOrigin: 'https://other.example',
      });

      expect(res.headers['Access-Control-Allow-Origin']).toBe('https://other.example');
      expect(res.headers['Access-Control-Allow-Credentials']).toBe('true');
    });
  });
});
