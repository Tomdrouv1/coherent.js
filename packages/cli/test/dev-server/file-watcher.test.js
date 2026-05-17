/**
 * File watcher tests
 */

import { describe, test, expect, beforeEach, afterEach } from 'vitest';
import { mkdtempSync, rmSync, writeFileSync, mkdirSync } from 'node:fs';
import { tmpdir } from 'node:os';
import { join, sep } from 'node:path';
import { createFileWatcher } from '../../src/dev-server/file-watcher.js';

async function waitFor(predicate, { timeoutMs = 2000, intervalMs = 25 } = {}) {
  const start = Date.now();
  while (Date.now() - start < timeoutMs) {
    if (predicate()) return;
    await new Promise((r) => setTimeout(r, intervalMs));
  }
  throw new Error('waitFor timed out');
}

describe('createFileWatcher', () => {
  let root;
  let watcher;
  let changes;
  let errors;

  beforeEach(() => {
    root = mkdtempSync(join(tmpdir(), 'coherent-fw-'));
    changes = [];
    errors = [];
  });

  afterEach(async () => {
    if (watcher) await watcher.close();
    rmSync(root, { recursive: true, force: true });
  });

  test('emits a change payload with filePath, webPath, updateType on .js write', async () => {
    watcher = await createFileWatcher({
      root,
      onChange: (c) => changes.push(c),
      onError: (e) => errors.push(e),
    });

    const file = join(root, 'src', 'app.js');
    mkdirSync(join(root, 'src'));
    writeFileSync(file, 'export const x = 1;');

    await waitFor(() => changes.length >= 1);

    expect(changes[0]).toMatchObject({
      filePath: file,
      // webPath is project-relative with leading slash, POSIX separators
      webPath: '/src/app.js',
      updateType: 'component',
    });
    expect(errors).toEqual([]);
  });

  test('classifies .css changes as updateType "style"', async () => {
    watcher = await createFileWatcher({
      root,
      onChange: (c) => changes.push(c),
      onError: (e) => errors.push(e),
    });

    const file = join(root, 'styles.css');
    writeFileSync(file, 'body { color: red; }');

    await waitFor(() => changes.length >= 1);
    expect(changes[0].updateType).toBe('style');
  });

  test('classifies unknown extensions as updateType "asset"', async () => {
    watcher = await createFileWatcher({
      root,
      onChange: (c) => changes.push(c),
      onError: (e) => errors.push(e),
    });

    const file = join(root, 'image.png');
    writeFileSync(file, 'fake-png-bytes');

    await waitFor(() => changes.length >= 1);
    expect(changes[0].updateType).toBe('asset');
  });

  test('debounces rapid writes to the same file into a single change', async () => {
    watcher = await createFileWatcher({
      root,
      onChange: (c) => changes.push(c),
      onError: (e) => errors.push(e),
      debounceMs: 50,
    });

    const file = join(root, 'rapid.js');
    writeFileSync(file, 'v1');
    writeFileSync(file, 'v2');
    writeFileSync(file, 'v3');

    // Wait for the debounce window plus headroom
    await new Promise((r) => setTimeout(r, 200));

    const rapidChanges = changes.filter((c) => c.filePath === file);
    expect(rapidChanges.length).toBe(1);
  });

  test('ignores node_modules and .git by default', async () => {
    mkdirSync(join(root, 'node_modules', 'foo'), { recursive: true });
    mkdirSync(join(root, '.git'), { recursive: true });

    watcher = await createFileWatcher({
      root,
      onChange: (c) => changes.push(c),
      onError: (e) => errors.push(e),
    });

    writeFileSync(join(root, 'node_modules', 'foo', 'index.js'), 'noise');
    writeFileSync(join(root, '.git', 'HEAD'), 'noise');

    // Allow some time; nothing should fire
    await new Promise((r) => setTimeout(r, 200));
    expect(changes).toEqual([]);
  });

  test('webPath uses forward slashes even on platforms with backslash separators', async () => {
    watcher = await createFileWatcher({
      root,
      onChange: (c) => changes.push(c),
      onError: (e) => errors.push(e),
    });

    mkdirSync(join(root, 'nested', 'deeper'), { recursive: true });
    writeFileSync(join(root, 'nested', 'deeper', 'leaf.js'), 'export {};');

    await waitFor(() => changes.length >= 1);
    expect(changes[0].webPath).toBe('/nested/deeper/leaf.js');
    // Sanity: never contains the platform-native separator if it's backslash
    if (sep === '\\') {
      expect(changes[0].webPath).not.toContain('\\');
    }
  });
});
