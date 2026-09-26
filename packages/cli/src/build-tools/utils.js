/**
 * Build Utilities for Coherent.js
 */

import { readFileSync } from 'fs';

let packageVersion = null;

/**
 * Version of the installed @coherent.js/cli. build-tools ships as source
 * next to package.json (src/build-tools/ → ../../package.json).
 */
function getPackageVersion() {
  if (packageVersion === null) {
    try {
      packageVersion = JSON.parse(readFileSync(new URL('../../package.json', import.meta.url), 'utf8')).version ?? 'unknown';
    } catch {
      packageVersion = 'unknown';
    }
  }
  return packageVersion;
}

export function optimizeComponents(components) {
  // Component optimization logic
  return components;
}

export function generateManifest(components) {
  return {
    components: Object.keys(components),
    version: getPackageVersion(),
    build: Date.now()
  };
}

export function createAssetMap(assets) {
  const map = new Map();
  for (const asset of assets) {
    map.set(asset.id, asset);
  }
  return map;
}
