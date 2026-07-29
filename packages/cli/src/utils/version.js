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
  cachedVersion = env.COHERENT_CLI_VERSION || '1.0.0-rc.6';
  return cachedVersion;
}

/**
 * Build the dependency range scaffolded projects should depend on.
 *
 * A caret on a prerelease (^1.0.0-rc.6) also satisfies the eventual stable
 * 1.0.0 and every later 1.x, so a project scaffolded against an RC would
 * silently jump off the line it was generated for. Pin prereleases exactly
 * and keep the caret for stable releases.
 *
 * @param {string} [version] - Version to build a range for
 * @returns {string} A semver range
 */
export function getDependencyRange(version = getCLIVersion()) {
  return version.includes('-') ? version : `^${version}`;
}
