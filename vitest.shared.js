/**
 * Test settings shared by the root vitest.config.js and every package's
 * vitest.config.js, so `pnpm vitest run <path>` at the root and
 * `pnpm --filter <package> test` exercise the same code.
 */

import { existsSync } from 'node:fs';
import { fileURLToPath } from 'node:url';

const packagesDir = fileURLToPath(new URL('./packages/', import.meta.url));

/**
 * Resolve `@coherent.js/<pkg>` and `@coherent.js/<pkg>/<subpath>` to package
 * sources (`src/index.js`, `src/<subpath>.js` or `src/<subpath>/index.js`)
 * instead of the built `dist/` that the package.json `exports` point at.
 * Tests then run without a build and never against a stale one — the
 * package configs used to have no aliases at all, and the root config only
 * covered five packages.
 *
 * @returns {import('vite').Plugin}
 */
export function coherentSources() {
  return {
    name: 'coherent-sources',
    enforce: 'pre',
    resolveId(id) {
      const match = /^@coherent\.js\/([a-z-]+)(?:\/(.+))?$/.exec(id);
      if (!match) return null;

      const [, pkg, subpath] = match;
      const base = `${packagesDir}${pkg}/src/`;
      const candidates = subpath
        ? [`${base}${subpath}.js`, `${base}${subpath}/index.js`, `${base}${subpath}`]
        : [`${base}index.js`];
      return candidates.find((file) => existsSync(file) && file.endsWith('.js')) ?? null;
    }
  };
}

/** Test options every config shares. */
export const sharedTestOptions = {
  globals: true,
  environment: 'node',
  testTimeout: 10000,
  hookTimeout: 10000,
  teardownTimeout: 10000,
  // See the root vitest.config.js for why there are no retries.
  retry: 0,
  pool: 'forks',
  isolate: true,
  clearMocks: true,
  restoreMocks: true
};
