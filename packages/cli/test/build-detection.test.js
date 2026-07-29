/**
 * Build command detection tests
 *
 * Regression coverage for `coherent build`:
 *  - workspace projects were rejected because only the local package.json's
 *    `dependencies` was consulted, so hoisted deps were invisible;
 *  - a `"build": "coherent build"` script (what `coherent create` emits) made
 *    the command shell back into itself forever, always via npm;
 *  - the esbuild fallback bundled server deps, producing an artifact that
 *    exits 0 at build time but dies at startup on `require('tty')`.
 */

import { describe, it, expect, afterEach } from 'vitest';
import { mkdtemp, rm } from 'fs/promises';
import { mkdirSync, writeFileSync } from 'fs';
import { join } from 'path';
import { tmpdir } from 'os';
import {
  ESBUILD_FALLBACK_COMMAND,
  hasCoherentDependency,
  detectPackageManager,
  isSelfReferential
} from '../src/commands/build.js';

const tempDirs = [];

async function makeTree(files) {
  const root = await mkdtemp(join(tmpdir(), 'coherent-build-detection-'));
  tempDirs.push(root);

  for (const [relative, contents] of Object.entries(files)) {
    const target = join(root, relative);
    mkdirSync(join(target, '..'), { recursive: true });
    writeFileSync(target, typeof contents === 'string' ? contents : JSON.stringify(contents));
  }

  return root;
}

afterEach(async () => {
  while (tempDirs.length) {
    await rm(tempDirs.pop(), { recursive: true, force: true });
  }
});

describe('hasCoherentDependency', () => {
  it('finds a direct dependency', async () => {
    const root = await makeTree({
      'package.json': { dependencies: { '@coherent.js/core': '1.0.0' } }
    });

    expect(hasCoherentDependency(root)).toBe(true);
  });

  it('finds a devDependency', async () => {
    const root = await makeTree({
      'package.json': { devDependencies: { '@coherent.js/core': '1.0.0' } }
    });

    expect(hasCoherentDependency(root)).toBe(true);
  });

  it('finds a dependency hoisted to the workspace root', async () => {
    const root = await makeTree({
      'package.json': {
        workspaces: ['packages/*'],
        dependencies: { '@coherent.js/core': '1.0.0' }
      },
      'packages/site/package.json': { name: 'site' }
    });

    expect(hasCoherentDependency(join(root, 'packages/site'))).toBe(true);
  });

  it('accepts an installed copy under an ancestor node_modules', async () => {
    const root = await makeTree({
      'package.json': { name: 'root' },
      'node_modules/@coherent.js/core/package.json': { name: '@coherent.js/core' },
      'packages/site/package.json': { name: 'site' }
    });

    expect(hasCoherentDependency(join(root, 'packages/site'))).toBe(true);
  });

  it('still rejects an unrelated project', async () => {
    const root = await makeTree({
      'package.json': { dependencies: { express: '4.0.0' } }
    });

    expect(hasCoherentDependency(root)).toBe(false);
  });
});

describe('detectPackageManager', () => {
  it.each([
    ['pnpm-lock.yaml', 'pnpm'],
    ['yarn.lock', 'yarn'],
    ['bun.lockb', 'bun'],
    ['package-lock.json', 'npm']
  ])('detects %s as %s', async (lockfile, expected) => {
    const root = await makeTree({ 'package.json': { name: 'app' }, [lockfile]: '' });

    expect(detectPackageManager(root)).toBe(expected);
  });

  it('prefers the packageManager field', async () => {
    const root = await makeTree({
      'package.json': { name: 'app', packageManager: 'yarn@4.1.0' },
      'package-lock.json': ''
    });

    expect(detectPackageManager(root)).toBe('yarn');
  });

  it('finds a lockfile at the workspace root', async () => {
    const root = await makeTree({
      'package.json': { name: 'root' },
      'pnpm-lock.yaml': '',
      'packages/site/package.json': { name: 'site' }
    });

    expect(detectPackageManager(join(root, 'packages/site'))).toBe('pnpm');
  });

  it('falls back to npm', async () => {
    const root = await makeTree({ 'package.json': { name: 'app' } });

    expect(detectPackageManager(root)).toBe('npm');
  });
});

describe('isSelfReferential', () => {
  it.each([
    'coherent build',
    'coherent build --analyze',
    'rimraf dist && coherent build',
    'npm run clean; coherent build'
  ])('detects %s', script => {
    expect(isSelfReferential(script)).toBe(true);
  });

  it.each([
    'vite build',
    'tsc -p tsconfig.json',
    'echo coherent-builder',
    'node scripts/build-coherent.js'
  ])('leaves %s alone', script => {
    expect(isSelfReferential(script)).toBe(false);
  });

  it('ignores non-strings', () => {
    expect(isSelfReferential(undefined)).toBe(false);
  });
});

describe('esbuild fallback', () => {
  // Without --packages=external, express' CJS deps (debug -> require('tty'))
  // are inlined into an ESM bundle and the artifact dies at startup.
  it('keeps dependencies external', () => {
    expect(ESBUILD_FALLBACK_COMMAND).toContain('--packages=external');
  });

  it('still targets node as ESM', () => {
    expect(ESBUILD_FALLBACK_COMMAND).toContain('--platform=node');
    expect(ESBUILD_FALLBACK_COMMAND).toContain('--format=esm');
  });
});
