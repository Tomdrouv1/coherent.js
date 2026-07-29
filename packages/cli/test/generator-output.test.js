/**
 * Generator output tests
 *
 * Regression coverage for `coherent generate component` emitting code that
 * cannot run:
 *  - the component was built with createComponent(), which used to return a
 *    bare Component instance, so calling it threw "X is not a function";
 *  - the generated *.test.js carried a stray `});` and did not parse.
 */

import { describe, it, expect, afterEach } from 'vitest';
import { execFileSync } from 'child_process';
import { mkdtemp, rm } from 'fs/promises';
import { readFileSync, writeFileSync } from 'fs';
import { join } from 'path';
import { tmpdir } from 'os';
import { fileURLToPath } from 'url';
import { generateComponent } from '../src/generators/component-generator.js';

const TEMPLATES = ['basic', 'functional', 'interactive', 'layout'];

const CORE_SRC = fileURLToPath(new URL('../../core/src/index.js', import.meta.url));

const tempDirs = [];

async function generateInto(name, template) {
  const dir = await mkdtemp(join(tmpdir(), 'coherent-generator-output-'));
  tempDirs.push(dir);

  const originalCwd = process.cwd();
  try {
    process.chdir(dir);
    const result = await generateComponent(name, { path: 'src', template });
    return { dir, files: result.files };
  } finally {
    process.chdir(originalCwd);
  }
}

/** Parse a generated file as ESM, returning null on success or the error text. */
function parseError(file) {
  // node --check infers CommonJS for .js, so check a .mjs copy instead.
  const moduleCopy = `${file.replace(/\.js$/, '')}.parse-check.mjs`;
  writeFileSync(moduleCopy, readFileSync(file, 'utf-8'));

  try {
    execFileSync(process.execPath, ['--check', moduleCopy], { stdio: 'pipe' });
    return null;
  } catch (error) {
    return String(error.stderr);
  }
}

afterEach(async () => {
  while (tempDirs.length) {
    await rm(tempDirs.pop(), { recursive: true, force: true });
  }
});

describe('generated component output', () => {
  it.each(TEMPLATES)('emits parseable files for the %s template', async template => {
    const { files } = await generateInto('Eyebrow', template);

    expect(files.length).toBe(3);
    for (const file of files) {
      expect(parseError(file), `${file} failed to parse`).toBeNull();
    }
  });

  it('emits a test file whose describe block is balanced', async () => {
    const { dir } = await generateInto('Eyebrow', 'basic');
    const source = readFileSync(join(dir, 'src/Eyebrow.test.js'), 'utf-8');

    // The stray `});` regression put the third case outside the describe.
    expect(source.match(/\bit\(/g)).toHaveLength(3);
    expect(source.match(/\bdescribe\(/g)).toHaveLength(1);
    expect(source.trimEnd().endsWith('});')).toBe(true);
    expect(source).not.toMatch(/\n\}\);\s*\n\s*it\(/);
  });

  it('emits a component that is callable and renders', async () => {
    const { dir } = await generateInto('Eyebrow', 'basic');

    // Point the generated import at core source so it can be imported here.
    const componentFile = join(dir, 'src/Eyebrow.mjs');
    writeFileSync(
      componentFile,
      readFileSync(join(dir, 'src/Eyebrow.js'), 'utf-8')
        .replace("'@coherent.js/core'", JSON.stringify(CORE_SRC))
    );

    const { Eyebrow } = await import(componentFile);
    const { render } = await import(CORE_SRC);

    expect(typeof Eyebrow).toBe('function');

    const html = render(Eyebrow({
      className: 'lead',
      children: [{ span: { text: 'hi' } }]
    }));

    expect(html).toBe('<div class="eyebrow lead"><span>hi</span></div>');
    expect(html).not.toContain('<definition');
  });
});
