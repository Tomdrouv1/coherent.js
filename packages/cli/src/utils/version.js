/**
 * CLI Version Utility
 * Provides consistent version detection across all generators
 */

import { readFileSync } from 'fs';
import { join, dirname } from 'path';
import { fileURLToPath } from 'url';
import { env } from 'node:process';

let cachedVersion = null;

/**
 * Get the current CLI package version
 * @returns {string} The CLI version string
 */
export function getCLIVersion() {
  if (cachedVersion) {
    return cachedVersion;
  }

  try {
    const __filename = fileURLToPath(import.meta.url);
    let dir = dirname(__filename);
    // Walk up looking for the @coherent.js/cli package.json. Works from both
    // src/utils (depth 2) and dist/index.js (depth 1), and survives future
    // bundling moves.
    while (dir && dir !== dirname(dir)) {
      try {
        const pkg = JSON.parse(readFileSync(join(dir, 'package.json'), 'utf-8'));
        if (pkg.name === '@coherent.js/cli' && typeof pkg.version === 'string') {
          cachedVersion = pkg.version;
          return cachedVersion;
        }
      } catch {
        // not this dir; keep walking
      }
      dir = dirname(dir);
    }
  } catch {
    // fall through to env/default
  }
  cachedVersion = env.COHERENT_CLI_VERSION || '1.0.0-rc.3';
  return cachedVersion;
}
