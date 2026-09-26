/**
 * The published declarations must describe the runtime API: type-check fixtures that use
 * it the way the runtime works (and that must reject what the runtime does not have).
 *
 * The workspace typecheck runs with skipLibCheck, so it never looks inside types/*.d.ts.
 */

import { describe, it, expect } from 'vitest';
import { execFileSync } from 'node:child_process';
import { readFileSync } from 'node:fs';
import { createRequire } from 'node:module';
import { dirname, join } from 'node:path';
import { fileURLToPath } from 'node:url';
import * as runtime from '../../src/index.js';

const here = dirname(fileURLToPath(import.meta.url));
const tsc = join(dirname(createRequire(import.meta.url).resolve('typescript/package.json')), 'bin', 'tsc');

function typecheck(...files) {
  try {
    execFileSync(process.execPath, [
      tsc, '--ignoreConfig', '--noEmit', '--strict', '--skipLibCheck', 'false',
      '--target', 'es2022', '--module', 'es2022', '--moduleResolution', 'bundler',
      ...files.map(file => join(here, file))
    ], { stdio: 'pipe', timeout: 60000 });
    return '';
  } catch (error) {
    return `${error.stdout}${error.stderr}` || error.message;
  }
}

describe('type declarations', () => {
  it('match the runtime API of the manager, models, migrations, middleware and adapters', () => {
    expect(typecheck('usage.ts')).toBe('');
  });

  it('match the query builder API', () => {
    expect(typecheck('query-usage.ts')).toBe('');
  });

  it('do not declare a default export, which does not exist at runtime', () => {
    expect(runtime.default).toBeUndefined();
    expect(readFileSync(join(here, '../../types/index.d.ts'), 'utf8')).not.toMatch(/^export default/m);
  });
});
