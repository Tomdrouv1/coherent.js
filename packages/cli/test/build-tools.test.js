/**
 * Build tools (@coherent.js/cli/build-tools)
 *
 * Regression coverage for: the Rollup plugin's resolveId returning raw
 * relative ids ("Could not load ./components/Button.coherent.js"), the
 * vite/webpack/loader placeholders pretending to do something, and
 * generateManifest() hard-coding version '1.1.1'.
 */

import { describe, it, expect, beforeAll, afterAll, afterEach, vi } from 'vitest';
import { mkdtemp, rm, mkdir, writeFile } from 'node:fs/promises';
import { readFileSync } from 'node:fs';
import { join } from 'node:path';
import { tmpdir } from 'node:os';
import { rollup } from 'rollup';
import {
  createRollupPlugin,
  createVitePlugin,
  createWebpackPlugin,
  coherentLoader,
  generateManifest
} from '../src/build-tools/index.js';

let project;

beforeAll(async () => {
  project = await mkdtemp(join(tmpdir(), 'coherent-build-tools-'));
  await mkdir(join(project, 'src', 'components'), { recursive: true });
  await writeFile(
    join(project, 'src', 'components', 'Button.coherent.js'),
    "export const Button = (text) => ({ button: { className: 'btn', text } });\n"
  );
  await writeFile(
    join(project, 'src', 'main.js'),
    "import { Button } from './components/Button.coherent.js';\nexport const page = Button('Go');\n"
  );
});

afterAll(async () => {
  await rm(project, { recursive: true, force: true });
});

afterEach(() => {
  vi.restoreAllMocks();
});

describe('createRollupPlugin', () => {
  it('lets Rollup bundle modules that import *.coherent.js files', async () => {
    const bundle = await rollup({
      input: join(project, 'src', 'main.js'),
      plugins: [createRollupPlugin({ silent: true })],
      logLevel: 'silent'
    });
    const { output } = await bundle.generate({ format: 'esm', sourcemap: true });
    await bundle.close();

    expect(output[0].moduleIds).toContain(join(project, 'src', 'components', 'Button.coherent.js'));
    expect(output[0].code).toContain("className: 'btn'");
    // A pass-through must not break the source map chain
    expect(output[0].map.sources.some((source) => source.endsWith('Button.coherent.js'))).toBe(true);
  });
});

describe('experimental integrations', () => {
  it('say once that they are pass-throughs, unless silenced', () => {
    const warn = vi.spyOn(console, 'warn').mockImplementation(() => {});
    createVitePlugin();
    createVitePlugin();
    createWebpackPlugin({ silent: true });
    expect(warn).toHaveBeenCalledTimes(1);
    expect(warn.mock.calls[0][0]).toMatch(/createVitePlugin\(\) is experimental/);
  });

  it('the loader passes source and source map through unchanged', () => {
    const callback = vi.fn();
    const map = { version: 3, sources: ['x.coherent.js'], mappings: '' };
    const result = coherentLoader.call({ callback, getOptions: () => ({ silent: true }) }, 'export const x = 1;', map);
    expect(result).toBeUndefined();
    expect(callback).toHaveBeenCalledWith(null, 'export const x = 1;', map);
  });
});

describe('generateManifest', () => {
  it('records the installed package version', () => {
    const { version } = JSON.parse(readFileSync(new URL('../package.json', import.meta.url), 'utf8'));
    const manifest = generateManifest({ Button: {}, Card: {} });
    expect(manifest.version).toBe(version);
    expect(manifest.components).toEqual(['Button', 'Card']);
  });
});
