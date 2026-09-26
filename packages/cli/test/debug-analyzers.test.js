/**
 * `coherent debug performance|hydration|bundle`
 *
 * Regression coverage for analyzers that printed canned data: a fresh app
 * was told it had a "UserList … virtualization" bottleneck and a
 * "UserProfile" hydration mismatch, and `debug hydration` against a port
 * with nothing listening reported success.
 */

import { describe, it, expect, beforeAll, afterAll } from 'vitest';
import { createServer } from 'node:http';
import { execFile } from 'node:child_process';
import { promisify } from 'node:util';
import { mkdtemp, rm, mkdir, writeFile } from 'node:fs/promises';
import { join } from 'node:path';
import { tmpdir } from 'node:os';
import { fileURLToPath } from 'node:url';
import { analyzePerformance } from '../src/analyzers/performance-analyzer.js';
import { analyzeHydration } from '../src/analyzers/hydration-analyzer.js';

const execFileAsync = promisify(execFile);
const CLI_SRC = fileURLToPath(new URL('../src/index.js', import.meta.url));

const PAGE = `<!DOCTYPE html><html><body>
<div data-coherent-component="Counter" data-state="e30="><button>+</button></div>
<div data-coherent-component="Counter"><span>1</span></div>
<p>static</p>
</body></html>`;

const FABRICATED = /UserList|UserProfile|Dashboard|virtualization|John Doe|245KB/;

let server;
let base;
let workDir;
let entry;
let requests = 0;

beforeAll(async () => {
  server = createServer((req, res) => {
    requests++;
    if (req.url === '/missing') {
      res.writeHead(404).end('nope');
      return;
    }
    if (req.url === '/static') {
      res.writeHead(200, { 'content-type': 'text/html' }).end('<html><body><p>hi</p></body></html>');
      return;
    }
    res.writeHead(200, { 'content-type': 'text/html; charset=utf-8' }).end(PAGE);
  });
  await new Promise((resolve) => server.listen(0, '127.0.0.1', resolve));
  base = `http://127.0.0.1:${server.address().port}`;

  workDir = await mkdtemp(join(tmpdir(), 'coherent-debug-'));
  entry = join(workDir, 'entry.mjs');
  await writeFile(entry, `import { createCLI } from ${JSON.stringify(CLI_SRC)};\nawait createCLI();\n`);
});

afterAll(async () => {
  await new Promise((resolve) => server.close(resolve));
  await rm(workDir, { recursive: true, force: true });
});

async function runCli(args, cwd = workDir) {
  try {
    const { stdout, stderr } = await execFileAsync(process.execPath, [entry, ...args], { cwd });
    return { code: 0, stdout, output: stdout + stderr };
  } catch (error) {
    return { code: error.code, stdout: error.stdout, output: `${error.stdout}${error.stderr}` };
  }
}

describe('analyzeHydration', () => {
  it('reports what the page actually contains', async () => {
    const result = await analyzeHydration({ url: base, components: 'Counter,Missing' });
    expect(result.summary.status).toBe('success');
    expect(result.summary.httpStatus).toBe(200);
    expect(result.summary.hydrationMarkers).toBe(3);
    expect(result.details.markers['data-coherent-component']).toBe(2);
    expect(result.details.markers['data-state']).toBe(1);
    expect(result.details.components).toEqual({ Counter: 2, Missing: 0 });
    expect(JSON.stringify(result)).not.toMatch(FABRICATED);
  });

  it('warns about a page with no hydration markers', async () => {
    const result = await analyzeHydration({ url: `${base}/static` });
    expect(result.summary.status).toBe('warning');
    expect(result.summary.hydrationMarkers).toBe(0);
  });

  it('fails when the page cannot be fetched or is not OK', async () => {
    const refused = await analyzeHydration({ url: 'http://127.0.0.1:1' });
    expect(refused.summary.status).toBe('error');
    expect(refused.summary.error).toMatch(/Could not fetch/);

    const missing = await analyzeHydration({ url: `${base}/missing` });
    expect(missing.summary.status).toBe('error');
    expect(missing.summary.httpStatus).toBe(404);
  });

  it('refuses --compare instead of pretending to compare', async () => {
    const result = await analyzeHydration({ url: base, compare: true });
    expect(result.summary.status).toBe('error');
    expect(result.summary.error).toMatch(/not implemented/);
  });
});

describe('analyzePerformance', () => {
  it('times real requests', async () => {
    const before = requests;
    const result = await analyzePerformance({ url: base, samples: '5', time: '10' });
    expect(requests - before).toBe(5);
    expect(result.summary.status).toBe('success');
    expect(result.summary.requests).toBe(5);
    expect(result.details.metrics.statusCodes).toEqual({ 200: 5 });
    expect(result.details.metrics.responseBytes).toBe(Buffer.byteLength(PAGE));
    expect(result.details.metrics.minMs).toBeLessThanOrEqual(result.details.metrics.maxMs);
    expect(JSON.stringify(result)).not.toMatch(FABRICATED);
  });

  it('flags non-2xx responses', async () => {
    const result = await analyzePerformance({ url: `${base}/missing`, samples: '2' });
    expect(result.summary.status).toBe('warning');
    expect(result.details.metrics.statusCodes).toEqual({ 404: 2 });
  });

  it('reports errors instead of numbers it did not measure', async () => {
    expect((await analyzePerformance({ url: 'http://127.0.0.1:1' })).summary.status).toBe('error');
    expect((await analyzePerformance({ url: base, component: 'UserList' })).summary.error).toMatch(/not implemented/);
    expect((await analyzePerformance({ url: base, memory: true })).summary.error).toMatch(/not implemented/);
  });
});

describe('coherent debug (CLI)', () => {
  it('debug hydration against a dead port exits non-zero without fabricated output', async () => {
    const { code, output } = await runCli(['debug', 'hydration', '--url', 'http://127.0.0.1:1']);
    expect(code).toBe(1);
    expect(output).toContain('http://127.0.0.1:1');
    expect(output).toMatch(/Status: error/);
    expect(output).not.toMatch(FABRICATED);
  });

  it('debug performance --url measures the given server', async () => {
    const { code, output } = await runCli(['debug', 'performance', '--url', base, '--samples', '3']);
    expect(code).toBe(0);
    expect(output).toContain(base);
    expect(output).toMatch(/requests: 3/);
    expect(output).not.toMatch(FABRICATED);
  });

  it('debug bundle reports the real build output', async () => {
    const project = join(workDir, 'bundle-project');
    await mkdir(join(project, 'dist', 'chunks'), { recursive: true });
    await writeFile(join(project, 'dist', 'index.js'), 'x'.repeat(2048));
    await writeFile(join(project, 'dist', 'chunks', 'a.js'), 'y'.repeat(1024));
    const { code, stdout } = await runCli(['debug', 'bundle', '--output', 'json'], project);
    expect(code).toBe(0);
    const report = JSON.parse(stdout.slice(stdout.indexOf('{\n')));
    expect(report.summary).toMatchObject({ files: 2, scriptFiles: 2, totalSize: '3.0KB' });
    expect(Object.keys(report.details.largestScripts)).toEqual(['index.js', join('chunks', 'a.js')]);
  });
});
