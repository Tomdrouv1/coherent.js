/**
 * Every published subpath must ship type declarations: a subpath without a
 * `types` condition is TS7016 ("could not find a declaration file") in every
 * TypeScript project that imports it. scripts/check-type-surface.mjs then
 * checks each declaration file against the runtime exports.
 */

import { describe, it, expect } from 'vitest';
import { existsSync, readFileSync } from 'node:fs';
import { join } from 'node:path';
import { fileURLToPath } from 'node:url';

const pkgDir = fileURLToPath(new URL('../', import.meta.url));
const pkg = JSON.parse(readFileSync(join(pkgDir, 'package.json'), 'utf8'));

describe('@coherent.js/integrations package exports', () => {
  const subpaths = Object.entries(pkg.exports);

  it.each(subpaths)('%s has a types condition, listed first, that exists', (_subpath, entry) => {
    expect(typeof entry).toBe('object');
    expect(Object.keys(entry)[0]).toBe('types');
    expect(existsSync(join(pkgDir, entry.types))).toBe(true);
    expect(existsSync(join(pkgDir, entry.default))).toBe(true);
  });

  it('keeps the framework peers optional', () => {
    for (const name of Object.keys(pkg.peerDependencies)) {
      if (name === '@coherent.js/core') continue;
      expect(pkg.peerDependenciesMeta?.[name]?.optional, `${name} should be an optional peer`).toBe(true);
    }
  });
});
