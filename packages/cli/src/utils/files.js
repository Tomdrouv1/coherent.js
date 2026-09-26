/**
 * File-writing helpers shared by the generators.
 */

import { existsSync, mkdirSync, writeFileSync } from 'fs';
import { dirname, relative } from 'path';

/**
 * Write generated files, refusing to overwrite anything unless `force` is
 * set. Every target is checked before the first write, so a refusal leaves
 * the project untouched.
 *
 * @param {Array<{ path: string, content: string }>} files - Absolute paths and contents.
 * @param {{ force?: boolean }} [options]
 * @returns {string[]} The paths written.
 */
export function writeGeneratedFiles(files, { force = false } = {}) {
  if (!force) {
    const existing = files.filter((file) => existsSync(file.path));
    if (existing.length > 0) {
      const list = existing.map((file) => relative(process.cwd(), file.path) || file.path).join(', ');
      throw new Error(`Refusing to overwrite existing file(s): ${list}. Re-run with --force to overwrite.`);
    }
  }

  for (const file of files) {
    mkdirSync(dirname(file.path), { recursive: true });
    writeFileSync(file.path, file.content);
  }
  return files.map((file) => file.path);
}
