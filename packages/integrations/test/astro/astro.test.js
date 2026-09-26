/**
 * Astro integration: the renderer Astro loads from `serverEntrypoint`, and a
 * real `astro build` of a one-page project using the integration.
 */

import { describe, it, expect, beforeAll, afterAll } from 'vitest';
import { execFile } from 'node:child_process';
import { mkdtempSync, mkdirSync, writeFileSync, readFileSync, rmSync, symlinkSync, realpathSync } from 'node:fs';
import { tmpdir } from 'node:os';
import { join } from 'node:path';
import { fileURLToPath, pathToFileURL } from 'node:url';
import { promisify } from 'node:util';
import { createAstroIntegration } from '../../src/astro/index.js';

const run = promisify(execFile);

const pkgDir = fileURLToPath(new URL('../../', import.meta.url));
const pkgJson = JSON.parse(readFileSync(join(pkgDir, 'package.json'), 'utf8'));
const coreSrc = fileURLToPath(new URL('../../../core/src/index.js', import.meta.url));

/** Run the integration's config hook and capture what it registers. */
function registeredRenderers(options) {
  const renderers = [];
  createAstroIntegration(options).hooks['astro:config:setup']({
    addRenderer: (renderer) => renderers.push(renderer),
    updateConfig: () => {}
  });
  return renderers;
}

/** Map a `@coherent.js/integrations/...` specifier to its published file. */
function resolvePublished(specifier) {
  const subpath = `.${specifier.slice(pkgJson.name.length)}`;
  const entry = pkgJson.exports[subpath];
  expect(entry, `package.json exports has no "${subpath}"`).toBeDefined();
  return join(pkgDir, typeof entry === 'string' ? entry : entry.default);
}

describe('Astro: server entrypoint', () => {
  it('points at a published module whose default export is a renderer', async () => {
    const [renderer] = registeredRenderers();
    const file = resolvePublished(renderer.serverEntrypoint);
    const mod = await import(pathToFileURL(file).href);

    expect(mod.default).toBeTypeOf('object');
    expect(mod.default.check).toBeTypeOf('function');
    expect(mod.default.renderToStaticMarkup).toBeTypeOf('function');

    const Hello = ({ name }) => ({ h1: { text: `Hello ${name}` } });
    expect(await mod.default.check(Hello, { name: 'x' })).toBe(true);
    expect(await mod.default.renderToStaticMarkup(Hello, { name: '<b>' }))
      .toEqual({ html: '<h1>Hello &lt;b&gt;</h1>' });
  });
});

describe('Astro: astro build', () => {
  let root;

  beforeAll(() => {
    root = mkdtempSync(join(tmpdir(), 'coherent-astro-'));
    const modules = join(root, 'node_modules');
    mkdirSync(join(modules, '@coherent.js', 'core'), { recursive: true });
    mkdirSync(join(root, 'src', 'pages'), { recursive: true });

    symlinkSync(realpathSync(join(pkgDir, 'node_modules', 'astro')), join(modules, 'astro'), 'dir');
    symlinkSync(realpathSync(pkgDir), join(modules, '@coherent.js', 'integrations'), 'dir');
    // Point @coherent.js/core at its source so the test does not need a build.
    writeFileSync(join(modules, '@coherent.js', 'core', 'package.json'), JSON.stringify({
      name: '@coherent.js/core', type: 'module', exports: { '.': './index.js' }
    }));
    writeFileSync(join(modules, '@coherent.js', 'core', 'index.js'),
      `export * from ${JSON.stringify(pathToFileURL(coreSrc).href)};\n`);

    writeFileSync(join(root, 'package.json'), JSON.stringify({ name: 'astro-fixture', type: 'module', private: true }));
    writeFileSync(join(root, 'astro.config.mjs'), [
      "import { createAstroIntegration } from '@coherent.js/integrations/astro';",
      'export default { integrations: [createAstroIntegration()] };',
      ''
    ].join('\n'));
    writeFileSync(join(root, 'src', 'pages', 'index.astro'), [
      '---',
      "const Hello = (props) => ({ h1: { text: 'Hello ' + props.name } });",
      '---',
      '<html><body><Hello name="<astro>" /></body></html>',
      ''
    ].join('\n'));
  });

  afterAll(() => {
    if (root) rmSync(root, { recursive: true, force: true });
  });

  it('builds a page that renders a Coherent.js component', async () => {
    const astroBin = join(root, 'node_modules', 'astro', 'bin', 'astro.mjs');
    try {
      await run(process.execPath, [astroBin, 'build'], {
        cwd: root,
        env: { ...process.env, ASTRO_TELEMETRY_DISABLED: '1', NODE_ENV: 'production' },
        timeout: 90_000
      });
    } catch (error) {
      throw new Error(`astro build failed:\n${error.stdout}\n${error.stderr}`);
    }

    const html = readFileSync(join(root, 'dist', 'index.html'), 'utf8');
    expect(html).toContain('<h1>Hello &lt;astro&gt;</h1>');
  }, 120_000);
});
