/**
 * CLI robustness
 *
 * Regression coverage for: bin/coherent.js catching any error from a run
 * and re-running the CLI from ../src (not shipped); `coherent dev --open`
 * failing on the undeclared `open` package (and leaving the dev server it
 * had spawned running); `create` starting its dev server detached; generators
 * silently overwriting files; an unknown --runtime leaving a half-created
 * directory; `create 'foo/../../x'` writing outside the working directory;
 * `coherent dev -h` erroring instead of showing help.
 */

import { describe, it, expect, beforeEach, afterEach, vi } from 'vitest';
import { execFile } from 'node:child_process';
import { promisify } from 'node:util';
import { mkdtemp, rm, mkdir, writeFile, copyFile, readFile, readdir } from 'node:fs/promises';
import { existsSync } from 'node:fs';
import { join } from 'node:path';
import { tmpdir } from 'node:os';
import { fileURLToPath } from 'node:url';
import { openBrowser } from '../src/commands/dev.js';
import { runAttached } from '../src/commands/create.js';
import { generateComponent } from '../src/generators/component-generator.js';
import { scaffoldProject } from '../src/generators/project-scaffold.js';

const execFileAsync = promisify(execFile);
const BIN = fileURLToPath(new URL('../bin/coherent.js', import.meta.url));
const CLI_SRC = fileURLToPath(new URL('../src/index.js', import.meta.url));

let workDir;
let entry;

beforeEach(async () => {
  workDir = await mkdtemp(join(tmpdir(), 'coherent-cli-robustness-'));
  entry = join(workDir, 'entry.mjs');
  await writeFile(entry, `import { createCLI } from ${JSON.stringify(CLI_SRC)};\nawait createCLI();\n`);
});

afterEach(async () => {
  vi.restoreAllMocks();
  await rm(workDir, { recursive: true, force: true });
});

async function run(file, args, cwd = workDir) {
  try {
    const { stdout, stderr } = await execFileAsync(process.execPath, [file, ...args], { cwd, timeout: 30_000 });
    return { code: 0, stdout, stderr };
  } catch (error) {
    return { code: error.code, stdout: error.stdout, stderr: error.stderr };
  }
}

describe('bin/coherent.js', () => {
  async function fakePackage(distSource) {
    const pkg = join(workDir, 'pkg');
    await mkdir(join(pkg, 'bin'), { recursive: true });
    await mkdir(join(pkg, 'dist'));
    await mkdir(join(pkg, 'src'));
    await copyFile(BIN, join(pkg, 'bin', 'coherent.js'));
    await writeFile(join(pkg, 'package.json'), '{"type":"module"}');
    await writeFile(join(pkg, 'dist', 'index.js'), distSource);
    await writeFile(join(pkg, 'src', 'index.js'), 'export async function createCLI() { console.log("SRC FALLBACK"); }');
    return join(pkg, 'bin', 'coherent.js');
  }

  it('reports a failing command once and exits 1, without re-running it from src/', async () => {
    const bin = await fakePackage('export async function createCLI() { console.log("RUN"); throw new Error("real failure"); }');
    const { code, stdout, stderr } = await run(bin, []);
    expect(code).toBe(1);
    expect(stderr).toContain('real failure');
    expect(stdout.match(/RUN/g)).toHaveLength(1);
    expect(stdout).not.toContain('SRC FALLBACK');
  });

  it('prints the real load error instead of falling back to src/', async () => {
    const bin = await fakePackage('import "a-dependency-that-is-not-installed";\nexport async function createCLI() {}');
    const { code, stdout, stderr } = await run(bin, []);
    expect(code).toBe(1);
    expect(stderr).toContain('a-dependency-that-is-not-installed');
    expect(stdout).not.toContain('SRC FALLBACK');
  });
});

describe('coherent dev', () => {
  it('-h shows help (the host flag is -H)', async () => {
    const { code, stdout } = await run(entry, ['dev', '-h']);
    expect(code).toBe(0);
    expect(stdout).toContain('--host');
    expect(stdout).toContain('-H, --host');
  });

  it('--open without the optional "open" package explains instead of failing', async () => {
    vi.spyOn(console, 'log').mockImplementation(() => {});
    const missing = Object.assign(new Error("Cannot find package 'open'"), { code: 'ERR_MODULE_NOT_FOUND' });
    await expect(openBrowser('http://localhost:3000', () => Promise.reject(missing))).resolves.toBe(false);
    const printed = console.log.mock.calls.flat().join('\n');
    expect(printed).toContain('npm install --save-dev open');
    expect(printed).toContain('http://localhost:3000');
  });

  it('--open keeps the dev server running when "open" is not installed', async () => {
    const project = join(workDir, 'app');
    await mkdir(project);
    const marker = join(project, 'server-started');
    await writeFile(join(project, 'package.json'), JSON.stringify({
      name: 'app',
      scripts: { dev: `node -e "require('fs').writeFileSync('server-started', '1'); setTimeout(() => {}, 1500)"` }
    }));
    const { code, stdout, stderr } = await run(entry, ['dev', '--open'], project);
    expect(existsSync(marker)).toBe(true);
    expect(stdout + stderr).toContain('Open http://localhost:3000 manually');
    expect(stdout + stderr).not.toContain('Failed to start development server');
    // The CLI stayed attached until the dev server exited on its own
    expect(code).toBe(0);
  });
});

describe('coherent create', () => {
  it('rejects an unknown --runtime before creating anything', async () => {
    const { code, stderr } = await run(entry, ['create', 'my-app', '--runtime', 'nope', '--skip-install', '--skip-git', '--skip-prompts']);
    expect(code).toBe(1);
    expect(stderr).toContain('Unknown runtime "nope"');
    expect(await readdir(workDir)).toEqual(['entry.mjs']);
  });

  it('rejects a project name that is a path', async () => {
    const inner = join(workDir, 'a', 'b');
    await mkdir(inner, { recursive: true });
    const { code, stderr } = await run(entry, ['create', 'foo/../../x', '--skip-install', '--skip-git', '--skip-prompts'], inner);
    expect(code).toBe(1);
    expect(stderr).toContain('path separators');
    expect(existsSync(join(workDir, 'x'))).toBe(false);
    expect(existsSync(join(inner, 'foo'))).toBe(false);
  });

  it('scaffoldProject() rejects unknown options before writing', async () => {
    const target = join(workDir, 'lib-app');
    await expect(scaffoldProject(target, { name: 'lib-app', runtime: 'nope', skipInstall: true, skipGit: true }))
      .rejects.toThrow(/Unknown runtime "nope"/);
    expect(existsSync(target)).toBe(false);
  });

  it('runs the dev server attached and reports its exit code', async () => {
    const started = Date.now();
    const code = await runAttached('node -e "setTimeout(() => process.exit(3), 300)"', workDir);
    expect(code).toBe(3);
    expect(Date.now() - started).toBeGreaterThanOrEqual(250);
  });
});

describe('coherent generate', () => {
  it('refuses to overwrite existing files unless --force', async () => {
    const cwd = process.cwd();
    process.chdir(workDir);
    try {
      await generateComponent('Button', { skipStory: true });
      const file = join(workDir, 'src/components/Button.js');
      await writeFile(file, '// my edits');

      await expect(generateComponent('Button', { skipStory: true })).rejects.toThrow(/Refusing to overwrite.*Button\.js.*--force/);
      expect(await readFile(file, 'utf8')).toBe('// my edits');
      // Nothing was written by the refused run (the test file is untouched too)
      expect(existsSync(join(workDir, 'src/components/Button.stories.js'))).toBe(false);

      await generateComponent('Button', { skipStory: true, force: true });
      expect(await readFile(file, 'utf8')).toContain('Button');
    } finally {
      process.chdir(cwd);
    }
  });

  it('the CLI exits 1 on a second generate and succeeds with --force', async () => {
    expect((await run(entry, ['generate', 'page', 'About'])).code).toBe(0);
    const second = await run(entry, ['generate', 'page', 'About']);
    expect(second.code).toBe(1);
    expect(second.stdout + second.stderr).toContain('--force');
    expect((await run(entry, ['generate', 'page', 'About', '--force'])).code).toBe(0);
  });
});
