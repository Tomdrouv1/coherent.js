/**
 * `coherent dev --fs-allow`
 *
 * The built-in dev server takes an `fsAllow` list of extra directories it may
 * serve files from (a sibling package linked into the project, say), but
 * `coherent dev` had no way to set it: `--fs-allow` was an unknown option and
 * such files were always 403.
 */

import { describe, it, expect, beforeEach, afterEach } from 'vitest';
import { spawn } from 'node:child_process';
import { mkdtemp, mkdir, rm, symlink, writeFile } from 'node:fs/promises';
import { join } from 'node:path';
import { tmpdir } from 'node:os';
import { fileURLToPath } from 'node:url';

const CLI_SRC = fileURLToPath(new URL('../src/index.js', import.meta.url));

let base;
let project;
let entry;
let running = [];

beforeEach(async () => {
  base = await mkdtemp(join(tmpdir(), 'coherent-dev-fs-allow-'));
  project = join(base, 'app');
  await mkdir(project);
  await writeFile(join(project, 'package.json'), JSON.stringify({ name: 'app' }));
  entry = join(base, 'entry.mjs');
  await writeFile(entry, `import { createCLI } from ${JSON.stringify(CLI_SRC)};\nawait createCLI();\n`);
});

afterEach(async () => {
  await Promise.all(running.map((stop) => stop()));
  running = [];
  await rm(base, { recursive: true, force: true });
});

/** A directory outside the project, linked into it as `project/<name>`. */
async function linkedOutside(name) {
  const dir = join(base, `${name}-outside`);
  await mkdir(dir);
  await writeFile(join(dir, 'lib.js'), `export const name = '${name}';`);
  await symlink(dir, join(project, name), 'dir');
}

/** Run `coherent dev --coherent` on a free port; resolve once it listens. */
function startDev(args) {
  const child = spawn(
    process.execPath,
    [entry, 'dev', '--coherent', '--no-hmr', '--host', '127.0.0.1', '--port', '0', ...args],
    { cwd: project }
  );
  const exited = new Promise((resolve) => child.once('exit', resolve));
  const stop = async () => {
    if (child.exitCode === null && child.signalCode === null) child.kill('SIGTERM');
    await exited;
  };
  running.push(stop);

  let output = '';
  return new Promise((resolve, reject) => {
    const onData = (chunk) => {
      output += chunk;
      const match = /Local:\S*\s+http:\/\/127\.0\.0\.1:(\d+)/.exec(output);
      if (match) resolve({ port: Number(match[1]), stop });
    };
    child.stdout.on('data', onData);
    child.stderr.on('data', onData);
    exited.then((code) => reject(new Error(`coherent dev exited with ${code}:\n${output}`)));
  });
}

async function status(port, path) {
  const res = await fetch(`http://127.0.0.1:${port}${path}`);
  await res.arrayBuffer();
  return res.status;
}

describe('coherent dev --fs-allow', () => {
  it('lets the built-in server serve files from the listed directory', async () => {
    await linkedOutside('shared');

    const without = await startDev([]);
    expect(await status(without.port, '/shared/lib.js')).toBe(403);
    await without.stop();

    const withFsAllow = await startDev(['--fs-allow', '../shared-outside']);
    expect(await status(withFsAllow.port, '/shared/lib.js')).toBe(200);
  });

  it('accepts comma-separated directories and repeated flags', async () => {
    await linkedOutside('a');
    await linkedOutside('b');
    await linkedOutside('c');
    await linkedOutside('d');

    const { port } = await startDev([
      '--fs-allow', '../a-outside, ../b-outside',
      '--fs-allow', join(base, 'c-outside')
    ]);
    expect(await status(port, '/a/lib.js')).toBe(200);
    expect(await status(port, '/b/lib.js')).toBe(200);
    expect(await status(port, '/c/lib.js')).toBe(200);
    expect(await status(port, '/d/lib.js')).toBe(403);
  });

  it('is listed in `coherent dev --help`', async () => {
    const child = spawn(process.execPath, [entry, 'dev', '--help'], { cwd: project });
    let stdout = '';
    child.stdout.on('data', (chunk) => { stdout += chunk; });
    const code = await new Promise((resolve) => child.once('exit', resolve));
    expect(code).toBe(0);
    expect(stdout).toContain('--fs-allow <dirs>');
  });
});
