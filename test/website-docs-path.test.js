/**
 * Tests for the website's path containment helpers.
 *
 * These guard the /docs/:slug route, which maps a URL segment straight onto
 * a file read. Before containment, `/docs/../README` served the repo-root
 * README and `/docs/../../../../../tmp/x` read files outside the repo.
 */

import { describe, it, expect, beforeAll, afterAll } from 'vitest';
import { mkdtempSync, mkdirSync, writeFileSync, symlinkSync, rmSync } from 'node:fs';
import { tmpdir } from 'node:os';
import { join, sep } from 'node:path';
import { containedPath, escapeHtml, resolveDocFile } from '../website/src/docs-path.js';

let root;
let docsDir;

beforeAll(() => {
  root = mkdtempSync(join(tmpdir(), 'coherent-docs-'));
  docsDir = join(root, 'docs');

  mkdirSync(join(docsDir, 'nested'), { recursive: true });
  mkdirSync(join(docsDir, 'section'), { recursive: true });
  writeFileSync(join(docsDir, 'guide.md'), '# Guide');
  writeFileSync(join(docsDir, 'nested', 'index.md'), '# Nested index');
  writeFileSync(join(docsDir, 'section', 'README.md'), '# Section readme');

  // Reachable only by escaping docsDir.
  writeFileSync(join(root, 'SECRET.md'), '# Secret');

  // Shares a prefix with docsDir but is a different directory.
  mkdirSync(join(root, 'docs-private'), { recursive: true });
  writeFileSync(join(root, 'docs-private', 'secret.md'), '# Also secret');

  // Links that live inside docsDir but point outside it.
  mkdirSync(join(root, 'outside'), { recursive: true });
  writeFileSync(join(root, 'outside', 'index.md'), '# Outside');
  symlinkSync(join(root, 'SECRET.md'), join(docsDir, 'escape.md'));
  symlinkSync(join(root, 'outside'), join(docsDir, 'linkdir'));
});

afterAll(() => {
  rmSync(root, { recursive: true, force: true });
});

describe('containedPath', () => {
  it('resolves a plain relative path inside the root', () => {
    expect(containedPath(docsDir, 'guide.md')).toBe(join(docsDir, 'guide.md'));
  });

  it('resolves a nested path inside the root', () => {
    expect(containedPath(docsDir, 'nested/index.md')).toBe(join(docsDir, 'nested', 'index.md'));
  });

  it('allows the root itself', () => {
    expect(containedPath(docsDir, '')).toBe(docsDir);
  });

  it('allows traversal that stays inside the root', () => {
    expect(containedPath(docsDir, 'nested/../guide.md')).toBe(join(docsDir, 'guide.md'));
  });

  it.each([
    ['../SECRET.md', 'one level up'],
    ['../../../../../../etc/passwd', 'far outside'],
    ['nested/../../SECRET.md', 'up through a real subdirectory'],
    ['../docs-private/secret.md', 'into a prefix-sharing sibling'],
  ])('rejects %j (%s)', (relativePath) => {
    expect(containedPath(docsDir, relativePath)).toBeNull();
  });

  it('rejects a sibling whose name merely extends the root', () => {
    // The trailing-separator check is what makes this fail; a bare
    // startsWith(root) would let '/…/docs-private' through.
    expect(containedPath(docsDir, `..${sep}docs-private`)).toBeNull();
  });

  it('treats an absolute path as relative to the root, not as an escape hatch', () => {
    const result = containedPath(docsDir, '/etc/passwd');

    expect(result).toBe(join(docsDir, 'etc', 'passwd'));
    expect(result.startsWith(docsDir + sep)).toBe(true);
  });
});

describe('resolveDocFile', () => {
  it('resolves a slug to <slug>.md', () => {
    expect(resolveDocFile(docsDir, 'guide')).toBe(join(docsDir, 'guide.md'));
  });

  it('falls back to <slug>/index.md', () => {
    expect(resolveDocFile(docsDir, 'nested')).toBe(join(docsDir, 'nested', 'index.md'));
  });

  it('falls back to <slug>/README.md', () => {
    expect(resolveDocFile(docsDir, 'section')).toBe(join(docsDir, 'section', 'README.md'));
  });

  it('returns null for a slug with no matching file', () => {
    expect(resolveDocFile(docsDir, 'nope')).toBeNull();
  });

  it.each([
    '../SECRET',
    '../../SECRET',
    'nested/../../SECRET',
    '../docs-private/secret',
    '../../../../../../etc/passwd',
  ])('refuses to escape docsDir via %j', (slug) => {
    expect(resolveDocFile(docsDir, slug)).toBeNull();
  });

  it('refuses to escape even when the target exists', () => {
    // SECRET.md is real and one level up, so this is the case that actually
    // leaked before: existsSync said yes and the file was served.
    expect(resolveDocFile(docsDir, '../SECRET')).toBeNull();
  });

  it('does not confuse a decoded traversal with a literal filename', () => {
    // Express percent-decodes before the handler sees the slug, so '%2e%2e'
    // arrives here already as '..'.
    expect(resolveDocFile(docsDir, '..%2fSECRET')).toBeNull();
    expect(resolveDocFile(docsDir, '../SECRET')).toBeNull();
  });
});

describe('escapeHtml', () => {
  it.each([
    ['<img src=x onerror=alert(1)>', '&lt;img src=x onerror=alert(1)&gt;'],
    ['x"onmouseover="alert(1)', 'x&quot;onmouseover=&quot;alert(1)'],
    ["it's", 'it&#39;s'],
    ['a & b', 'a &amp; b'],
  ])('escapes %j', (input, expected) => {
    expect(escapeHtml(input)).toBe(expected);
  });

  it('escapes the ampersand first, so entities are not double-decoded', () => {
    expect(escapeHtml('&lt;')).toBe('&amp;lt;');
  });

  it('returns an empty string for null and undefined', () => {
    expect(escapeHtml(null)).toBe('');
    expect(escapeHtml(undefined)).toBe('');
  });

  it('leaves ordinary text untouched', () => {
    expect(escapeHtml('Getting Started')).toBe('Getting Started');
  });
});

describe('symlink containment', () => {
  // resolve() does not follow links, so textual containment alone let a
  // symlink inside docs/ serve a file outside it.
  it('refuses a symlink pointing at a file outside the root', () => {
    expect(resolveDocFile(docsDir, 'escape')).toBeNull();
  });

  it('refuses a symlink pointing at a directory outside the root', () => {
    expect(resolveDocFile(docsDir, 'linkdir')).toBeNull();
  });

  it('refuses the linked path through containedPath too', () => {
    expect(containedPath(docsDir, 'escape.md')).toBeNull();
  });

  it('still resolves ordinary files', () => {
    expect(resolveDocFile(docsDir, 'guide')).toBe(join(docsDir, 'guide.md'));
  });

  it('still returns a path for something that does not exist yet', () => {
    // 404 handling depends on this: a missing file is not an escape.
    expect(containedPath(docsDir, 'nope.md')).toBe(join(docsDir, 'nope.md'));
  });
});
