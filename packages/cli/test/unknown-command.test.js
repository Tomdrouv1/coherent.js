/**
 * Unknown command/option handling
 *
 * Locks in that a mistyped command fails loudly instead of looking like a
 * success: non-zero exit, an explicit error on stderr, and no help dump on
 * stdout that could be mistaken for normal output.
 */

import { describe, it, expect, beforeAll, afterAll } from 'vitest';
import { execFile } from 'child_process';
import { mkdtemp, rm } from 'fs/promises';
import { writeFileSync } from 'fs';
import { join } from 'path';
import { tmpdir } from 'os';
import { fileURLToPath } from 'url';
import { promisify } from 'util';

const execFileAsync = promisify(execFile);

const CLI_SRC = fileURLToPath(new URL('../src/index.js', import.meta.url));

let entry;
let workDir;

beforeAll(async () => {
  workDir = await mkdtemp(join(tmpdir(), 'coherent-unknown-command-'));

  // bin/coherent.js prefers dist/, so drive the source directly.
  entry = join(workDir, 'entry.mjs');
  writeFileSync(
    entry,
    `import { createCLI } from ${JSON.stringify(CLI_SRC)};\nawait createCLI();\n`
  );
});

afterAll(async () => {
  await rm(workDir, { recursive: true, force: true });
});

async function runCli(...args) {
  try {
    const { stdout, stderr } = await execFileAsync(process.execPath, [entry, ...args]);
    return { code: 0, stdout, stderr };
  } catch (error) {
    return { code: error.code ?? 1, stdout: error.stdout ?? '', stderr: error.stderr ?? '' };
  }
}

describe('unknown input', () => {
  it('fails on an unknown command', async () => {
    const { code, stdout, stderr } = await runCli('scaffold');

    expect(code).not.toBe(0);
    expect(stderr).toContain("unknown command 'scaffold'");
    // A help dump on stdout would read as success.
    expect(stdout).not.toContain('Coherent.js CLI');
  });

  it('points at --help after the error', async () => {
    const { stderr } = await runCli('scaffold');

    expect(stderr).toContain('coherent --help');
  });

  it('fails on an unknown option', async () => {
    const { code, stderr } = await runCli('build', '--nope');

    expect(code).not.toBe(0);
    expect(stderr).toContain("unknown option '--nope'");
  });

  it('still succeeds for --version', async () => {
    const { code, stdout } = await runCli('--version');

    expect(code).toBe(0);
    expect(stdout.trim()).toMatch(/^\d+\.\d+\.\d+/);
  });
});
