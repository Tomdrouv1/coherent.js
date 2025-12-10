/**
 * CLI Version Utility
 * Provides consistent version detection across all generators
 */

import { readFileSync } from 'fs';
import { join, dirname } from 'path';
import { fileURLToPath } from 'url';

let cachedVersion = null;

/**
 * Get the current CLI package version
 * @returns {string} The CLI version string
 */
export function getCLIVersion() {
  // Return cached version if already loaded
  if (cachedVersion) {
    return cachedVersion;
  }

  try {
    // Try to get the path of this module to determine CLI root
    const __filename = fileURLToPath(import.meta.url);
    const __dirname = dirname(__filename);

    // Look for package.json in CLI directory
    const packagePath = join(__dirname, '..', '..', 'package.json');
    const packageJson = JSON.parse(readFileSync(packagePath, 'utf-8'));
    cachedVersion = packageJson.version;
    return cachedVersion;
  } catch {
    // Fallback to environment variable or default
    cachedVersion = process.env.COHERENT_CLI_VERSION || '1.0.0-beta.5';
    return cachedVersion;
  }
}
