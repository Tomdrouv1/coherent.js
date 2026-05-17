/**
 * Test helper: copy a fixture to a tmp dir and boot the dev server.
 *
 * Tests own server lifecycle so:
 *   - Each test gets a private root (no file-mutation cross-talk)
 *   - Random port (no collision with the user's running dev server)
 *   - Cleanup is deterministic (close + rm in afterEach)
 *
 * @module e2e/helpers/server
 */

import { cpSync, mkdtempSync, rmSync, symlinkSync, existsSync, mkdirSync } from 'node:fs';
import { tmpdir } from 'node:os';
import { join, resolve, dirname } from 'node:path';
import { fileURLToPath } from 'node:url';
import { startDevServer } from '../../packages/cli/src/dev-server/index.js';

const __dirname = dirname(fileURLToPath(import.meta.url));
const REPO_ROOT = resolve(__dirname, '..', '..');

/**
 * Boot the dev server against a tmp copy of the named fixture.
 *
 * @param {string} fixtureName - Subdirectory under e2e/fixtures/
 * @param {object} [options]
 * @param {boolean} [options.hmr=true] - Pass-through to startDevServer.
 * @returns {Promise<{root: string, baseURL: string, close: () => Promise<void>}>}
 */
export async function bootFixture(fixtureName, options = {}) {
  const source = join(REPO_ROOT, 'e2e', 'fixtures', fixtureName);
  if (!existsSync(source)) {
    throw new Error(`Fixture not found: ${source}`);
  }

  const root = mkdtempSync(join(tmpdir(), `coherent-e2e-${fixtureName}-`));

  // Copy fixture content EXCLUDING node_modules — we'll wire that as a
  // direct symlink to the real packages/client, which makes the served
  // /node_modules/@coherent.js/client/dist/index.js path resolve.
  cpSync(source, root, {
    recursive: true,
    filter: (src) => !src.includes(`${join('', 'node_modules')}`),
  });

  // Wire @coherent.js/client as a symlink under root/node_modules.
  const realClient = resolve(REPO_ROOT, 'packages', 'client');
  const nm = join(root, 'node_modules', '@coherent.js');
  mkdirSync(nm, { recursive: true });
  const dest = join(nm, 'client');
  try {
    symlinkSync(realClient, dest, 'dir');
  } catch (err) {
    if (err.code !== 'EEXIST') throw err;
  }

  const server = await startDevServer({
    root,
    port: 0,
    host: '127.0.0.1',
    open: false,
    log: false,
    hmr: options.hmr !== false,
  });

  return {
    root,
    baseURL: `http://127.0.0.1:${server.port}`,
    async close() {
      await server.close();
      rmSync(root, { recursive: true, force: true });
    },
  };
}
