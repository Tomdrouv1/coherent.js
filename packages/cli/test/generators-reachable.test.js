/**
 * Every generator module is part of the CLI.
 *
 * model-generator.js, middleware-generator.js and enhanced-model-templates.js
 * were never imported by any command (`coherent generate model` has its own
 * "not implemented yet" stub), so nothing kept their output in step with
 * @coherent.js/database: the soft-delete template still emitted a raw
 * `where: 'deleted_at IS NOT NULL'` string, which the query builder now
 * rejects. Unreachable generators rot unseen; this keeps them from coming back.
 */

import { describe, it, expect } from 'vitest';
import { readFileSync, readdirSync, existsSync } from 'node:fs';
import { dirname, join, resolve } from 'node:path';
import { fileURLToPath } from 'node:url';

const SRC = fileURLToPath(new URL('../src/', import.meta.url));
const IMPORT_RE = /(?:import|export)\s[^'"]*?from\s*['"](\.{1,2}\/[^'"]+)['"]|import\(\s*['"](\.{1,2}\/[^'"]+)['"]\s*\)/g;

function reachableFrom(entry) {
  const seen = new Set();
  const queue = [entry];
  while (queue.length > 0) {
    const file = queue.pop();
    if (seen.has(file) || !existsSync(file)) continue;
    seen.add(file);
    for (const match of readFileSync(file, 'utf8').matchAll(IMPORT_RE)) {
      queue.push(resolve(dirname(file), match[1] ?? match[2]));
    }
  }
  return seen;
}

describe('CLI generators', () => {
  it('are all reachable from the CLI entry point', () => {
    const reachable = reachableFrom(join(SRC, 'index.js'));
    const generators = readdirSync(join(SRC, 'generators'))
      .filter((name) => name.endsWith('.js'))
      .map((name) => join(SRC, 'generators', name));

    expect(generators.length).toBeGreaterThan(5);
    expect(generators.filter((file) => !reachable.has(file))).toEqual([]);
  });
});
