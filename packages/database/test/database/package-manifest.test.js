/**
 * Regression test: every driver the adapters import at runtime must be declared as an
 * optional peer dependency, so package managers can check the installed version.
 */

import { describe, it, expect } from 'vitest';
import { readFileSync, readdirSync } from 'node:fs';
import { dirname, join } from 'node:path';
import { fileURLToPath } from 'node:url';

const packageDir = join(dirname(fileURLToPath(import.meta.url)), '..', '..');
const manifest = JSON.parse(readFileSync(join(packageDir, 'package.json'), 'utf8'));

function dynamicallyImportedPackages() {
  const adaptersDir = join(packageDir, 'src', 'adapters');
  const names = new Set();
  for (const file of readdirSync(adaptersDir)) {
    const source = readFileSync(join(adaptersDir, file), 'utf8');
    for (const [, specifier] of source.matchAll(/import\(\s*'([^'.][^']*)'\s*\)/g)) {
      // mysql2/promise -> mysql2, @scope/name/sub -> @scope/name
      const parts = specifier.split('/');
      names.add(specifier.startsWith('@') ? parts.slice(0, 2).join('/') : parts[0]);
    }
  }
  return [...names].sort();
}

describe('package manifest', () => {
  it('declares every dynamically imported driver as an optional peer dependency', () => {
    const drivers = dynamicallyImportedPackages();
    expect(drivers).toEqual(['mongodb', 'mysql2', 'pg', 'sqlite3']);

    for (const driver of drivers) {
      expect(manifest.peerDependencies, driver).toHaveProperty(driver);
      expect(manifest.peerDependenciesMeta?.[driver], driver).toEqual({ optional: true });
      expect(manifest.dependencies?.[driver], driver).toBeUndefined();
    }
  });

  it('does not accept driver majors the adapters were not written for', () => {
    expect(manifest.peerDependencies).toMatchObject({
      mongodb: '>=5.0.0 <7.0.0',
      mysql2: '>=3.23.1 <4.0.0',
      pg: '>=8.8.0 <9.0.0',
      sqlite3: '>=5.1.0 <6.0.0'
    });
  });
});
