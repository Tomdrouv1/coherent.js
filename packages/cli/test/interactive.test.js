/**
 * Non-interactive terminal handling
 *
 * Regression coverage for `coherent generate` / `coherent create` hanging when
 * stdin is not a TTY. `prompts` never resolves without a terminal, so the
 * process sat until Node reported "Detected unsettled top-level await"
 * (exit 13) — unusable in CI, and no indication of what went wrong.
 */

import { describe, it, expect, beforeEach, afterEach } from 'vitest';
import { execFile } from 'child_process';
import { mkdtemp, rm } from 'fs/promises';
import { join } from 'path';
import { tmpdir } from 'os';
import { fileURLToPath } from 'url';
import { promisify } from 'util';
import { isInteractive } from '../src/utils/interactive.js';

const execFileAsync = promisify(execFile);

const CLI_BIN = fileURLToPath(new URL('../bin/coherent.js', import.meta.url));

const ENV_KEYS = ['COHERENT_NON_INTERACTIVE', 'COHERENT_INTERACTIVE', 'CI'];
const savedEnv = {};
const tempDirs = [];

beforeEach(() => {
  // interactive.js captures `env` by reference, so mutate process.env in place
  // rather than replacing the object.
  for (const key of ENV_KEYS) {
    savedEnv[key] = process.env[key];
    delete process.env[key];
  }
});

afterEach(async () => {
  for (const key of ENV_KEYS) {
    if (savedEnv[key] === undefined) delete process.env[key];
    else process.env[key] = savedEnv[key];
  }
  while (tempDirs.length) {
    await rm(tempDirs.pop(), { recursive: true, force: true });
  }
});

describe('isInteractive', () => {
  it('honours the explicit non-interactive override', () => {
    process.env.COHERENT_NON_INTERACTIVE = '1';
    expect(isInteractive()).toBe(false);
  });

  it('honours the explicit interactive override', () => {
    process.env.COHERENT_INTERACTIVE = '1';
    expect(isInteractive()).toBe(true);
  });

  it('treats CI as non-interactive', () => {
    process.env.CI = 'true';
    expect(isInteractive()).toBe(false);
  });

  it('lets the explicit override win over CI', () => {
    process.env.CI = 'true';
    process.env.COHERENT_INTERACTIVE = '1';
    expect(isInteractive()).toBe(true);
  });
});

async function runCli(args, cwd) {
  try {
    const { stdout, stderr } = await execFileAsync(process.execPath, [CLI_BIN, ...args], {
      cwd,
      timeout: 60_000,
      // No stdin: exactly the condition that used to hang.
      stdio: ['ignore', 'pipe', 'pipe']
    });
    return { code: 0, stdout, stderr };
  } catch (error) {
    return { code: error.code ?? 1, stdout: error.stdout ?? '', stderr: error.stderr ?? '' };
  }
}

describe('commands without a terminal', () => {
  it.each([
    [['generate'], 'the generation type'],
    [['generate', 'component'], 'the component name'],
    [['create'], 'the project name']
  ])('%j fails fast with guidance', async (args, expected) => {
    const { code, stderr } = await runCli(args);

    expect(code).toBe(1);
    expect(stderr).toContain(expected);
    expect(stderr).toContain('no interactive terminal');
    // The old failure mode.
    expect(stderr).not.toContain('unsettled top-level await');
  });

  it('still scaffolds when the name is supplied', async () => {
    const dir = await mkdtemp(join(tmpdir(), 'coherent-noninteractive-'));
    tempDirs.push(dir);

    const { code } = await runCli(
      ['create', 'ci-app', '--skip-install', '--skip-git'],
      dir
    );

    expect(code).toBe(0);

    const { readFile } = await import('fs/promises');
    const manifest = JSON.parse(await readFile(join(dir, 'ci-app/package.json'), 'utf-8'));
    expect(manifest.dependencies['@coherent.js/core']).toBeDefined();
  }, 90_000);
});
