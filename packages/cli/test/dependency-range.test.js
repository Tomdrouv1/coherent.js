/**
 * Scaffolded dependency range tests
 *
 * Regression coverage for scaffolds emitting `^1.0.0-rc.6`. A caret on a
 * prerelease also satisfies the eventual stable 1.0.0 and every later 1.x, so
 * a project generated against an RC would silently move off that line on a
 * fresh install.
 */

import { describe, it, expect, afterEach } from 'vitest';
import { mkdtemp, rm, readFile } from 'fs/promises';
import { join } from 'path';
import { tmpdir } from 'os';
import { scaffoldProject } from '../src/generators/project-scaffold.js';
import { getCLIVersion, getDependencyRange } from '../src/utils/version.js';

const tempDirs = [];

afterEach(async () => {
  while (tempDirs.length) {
    await rm(tempDirs.pop(), { recursive: true, force: true });
  }
});

describe('getDependencyRange', () => {
  it('pins prereleases exactly', () => {
    expect(getDependencyRange('1.0.0-rc.6')).toBe('1.0.0-rc.6');
    expect(getDependencyRange('2.1.0-beta.3')).toBe('2.1.0-beta.3');
  });

  it('keeps the caret for stable releases', () => {
    expect(getDependencyRange('1.0.0')).toBe('^1.0.0');
    expect(getDependencyRange('2.3.4')).toBe('^2.3.4');
  });

  it('never carets a prerelease', () => {
    expect(getDependencyRange('1.0.0-rc.6').startsWith('^')).toBe(false);
  });
});

describe('scaffolded package.json', () => {
  it('pins every coherent dependency to the CLI prerelease', async () => {
    const dir = await mkdtemp(join(tmpdir(), 'coherent-dependency-range-'));
    tempDirs.push(dir);

    await scaffoldProject(dir, {
      name: 'range-app',
      template: 'basic',
      runtime: 'express',
      skipInstall: true,
      skipGit: true
    });

    const manifest = JSON.parse(await readFile(join(dir, 'package.json'), 'utf-8'));
    const version = getCLIVersion();
    const expected = getDependencyRange(version);

    const coherentDeps = Object.entries({
      ...manifest.dependencies,
      ...manifest.devDependencies
    }).filter(([name]) => name.startsWith('@coherent.js/'));

    expect(coherentDeps.length).toBeGreaterThan(0);

    for (const [name, range] of coherentDeps) {
      expect(range, `${name} should be pinned`).toBe(expected);

      if (version.includes('-')) {
        // `^1.0.0-rc.6` would also match the eventual stable 1.0.0.
        expect(range, `${name} must not caret a prerelease`).not.toMatch(/^\^.*-/);
      }
    }
  });
});
