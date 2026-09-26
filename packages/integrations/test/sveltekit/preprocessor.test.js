/**
 * SvelteKit preprocessor: the code it generates must be self-contained, i.e.
 * the `{@html ...}` expression it emits has to resolve to Coherent.js's
 * renderer inside the compiled component.
 */

import { describe, it, expect, beforeAll, afterAll } from 'vitest';
import { execFile } from 'node:child_process';
import { existsSync, mkdtempSync, mkdirSync, realpathSync, rmSync, symlinkSync, writeFileSync } from 'node:fs';
import { tmpdir } from 'node:os';
import { dirname, join } from 'node:path';
import { fileURLToPath, pathToFileURL } from 'node:url';
import { promisify } from 'node:util';
import { createPreprocessor } from '../../src/sveltekit/index.js';

const run = promisify(execFile);
const IMPORT = "import { render as __coherentRender } from '@coherent.js/core';";

function preprocessMarkup(content, options) {
  return createPreprocessor(options).markup({ content, filename: 'Test.svelte' }).code;
}

describe('SvelteKit preprocessor output', () => {
  it('imports the renderer into the instance script it references', () => {
    const code = preprocessMarkup([
      '<script lang="ts">',
      "  let name = 'x';",
      '</script>',
      "<coherent>{ p: { text: 'hi' } }</coherent>"
    ].join('\n'));

    expect(code).toBe([
      `<script lang="ts">${IMPORT}`,
      "  let name = 'x';",
      '</script>',
      "{@html __coherentRender({ p: { text: 'hi' } })}"
    ].join('\n'));
  });

  it('adds an instance script when the component has none (or only a module script)', () => {
    expect(preprocessMarkup('<coherent>{ p: {} }</coherent>'))
      .toBe(`<script>${IMPORT}</script>{@html __coherentRender({ p: {} })}`);

    const withModule = preprocessMarkup('<script module>export const x = 1;</script>\n<coherent>{ p: {} }</coherent>');
    expect(withModule.startsWith(`<script>${IMPORT}</script><script module>export const x = 1;</script>`)).toBe(true);

    const withContextModule = preprocessMarkup('<script context="module">export const x = 1;</script><coherent>{ p: {} }</coherent>');
    expect(withContextModule.startsWith(`<script>${IMPORT}</script><script context="module">`)).toBe(true);
  });

  it('leaves components without blocks untouched', () => {
    const source = '<script>let a = 1;</script><p>{a}</p>';
    expect(preprocessMarkup(source)).toBe(source);
  });

  it('keeps $-sequences in blocks literal and honours a custom tag', () => {
    const code = preprocessMarkup("<cj>{ p: { text: 'Pay $$5 $& more' } }</cj>", { tag: 'cj' });
    expect(code).toContain("{@html __coherentRender({ p: { text: 'Pay $$5 $& more' } })}");
  });
});

// svelte is installed as a dependency of the @sveltejs/kit peer.
const kitDir = fileURLToPath(new URL('../../node_modules/@sveltejs/kit', import.meta.url));
const svelteDir = existsSync(kitDir) ? join(dirname(dirname(realpathSync(kitDir))), 'svelte') : null;
const coreSrc = fileURLToPath(new URL('../../../core/src/index.js', import.meta.url));

describe('SvelteKit preprocessor with the Svelte compiler', () => {
  let root;

  beforeAll(() => {
    root = mkdtempSync(join(tmpdir(), 'coherent-svelte-'));
    mkdirSync(join(root, 'node_modules', '@coherent.js', 'core'), { recursive: true });
    symlinkSync(svelteDir, join(root, 'node_modules', 'svelte'), 'dir');
    // Point @coherent.js/core at its source so the test does not need a build.
    writeFileSync(join(root, 'node_modules', '@coherent.js', 'core', 'package.json'), JSON.stringify({
      name: '@coherent.js/core', type: 'module', exports: { '.': './index.js' }
    }));
    writeFileSync(join(root, 'node_modules', '@coherent.js', 'core', 'index.js'),
      `export * from ${JSON.stringify(pathToFileURL(coreSrc).href)};\n`);
    writeFileSync(join(root, 'package.json'), JSON.stringify({ type: 'module', private: true }));
  });

  afterAll(() => {
    if (root) rmSync(root, { recursive: true, force: true });
  });

  it('compiles and server-renders the generated component', async () => {
    expect(svelteDir && existsSync(svelteDir), 'svelte (via @sveltejs/kit) must be installed').toBe(true);
    const { preprocess, compile } = await import(pathToFileURL(join(svelteDir, 'src', 'compiler', 'index.js')).href);

    const source = [
      '<script>',
      "  let { name = 'world' } = $props();",
      '</script>',
      "<main><coherent>{ div: { className: 'greeting', text: 'Hi ' + name } }</coherent></main>"
    ].join('\n');

    const { code: preprocessed } = await preprocess(source, [createPreprocessor()], { filename: 'Greeting.svelte' });
    const { js } = compile(preprocessed, { generate: 'server', filename: 'Greeting.svelte' });

    writeFileSync(join(root, 'Greeting.js'), js.code);
    writeFileSync(join(root, 'render.js'), [
      "import { render } from 'svelte/server';",
      "import Greeting from './Greeting.js';",
      "process.stdout.write(render(Greeting, { props: { name: '<b>' } }).body);",
      ''
    ].join('\n'));

    let stdout;
    try {
      ({ stdout } = await run(process.execPath, [join(root, 'render.js')], { cwd: root, timeout: 30_000 }));
    } catch (error) {
      throw new Error(`rendering the compiled component failed:\n${error.stderr}`);
    }

    // Drop Svelte's hydration markers (<!--[-->, <!--hash-->, ...).
    const html = stdout.replace(/<!--.*?-->/g, '');
    expect(html).toBe('<main><div class="greeting">Hi &lt;b&gt;</div></main>');
  }, 60_000);
});
