/**
 * `coherent generate api` output, run for real.
 *
 * The generator used to emit `createApiRouter` (not exported by
 * @coherent.js/api), `.post(path, withValidation(schema), handler)` (the
 * router's shortcuts take `(path, handler, options)`) and Express-style
 * `res.status(201).json(...)` on the plain node:http response the router
 * passes: the generated module could not even be imported. These tests
 * generate each variant, serve it with the router's own createServer(), and
 * send HTTP requests; they also run the generated test files with vitest.
 */

import { describe, it, expect, beforeAll, afterAll } from 'vitest';
import { mkdtemp, mkdir, rm, writeFile } from 'node:fs/promises';
import { join } from 'node:path';
import { tmpdir } from 'node:os';
import { spawnSync } from 'node:child_process';
import { fileURLToPath, pathToFileURL } from 'node:url';
import { generateAPI } from '../src/generators/api-generator.js';

const REPO_ROOT = fileURLToPath(new URL('../../../', import.meta.url));

let projectDir;
let originalCwd;

beforeAll(async () => {
  projectDir = await mkdtemp(join(tmpdir(), 'coherent-generated-api-'));
  originalCwd = process.cwd();
  process.chdir(projectDir);
});

afterAll(async () => {
  process.chdir(originalCwd);
  await rm(projectDir, { recursive: true, force: true });
});

/** Generate an API module and import it (`@coherent.js/api` resolves to the package sources). */
async function generateAndImport(name, template) {
  const { files } = await generateAPI(name, { path: 'src/api', template });
  const mod = await import(pathToFileURL(files[0]).href);
  return { files, mod };
}

/** Serve a router on a free port and return a request helper. */
async function serve(router) {
  const server = router.createServer();
  await new Promise((resolve) => server.listen(0, '127.0.0.1', resolve));
  const baseUrl = `http://127.0.0.1:${server.address().port}`;

  const request = async (method, path, body) => {
    const res = await fetch(`${baseUrl}${path}`, {
      method,
      headers: body === undefined ? {} : { 'Content-Type': 'application/json' },
      body: body === undefined ? undefined : JSON.stringify(body)
    });
    const text = await res.text();
    return { status: res.status, type: res.headers.get('content-type'), body: text ? JSON.parse(text) : null };
  };

  return { request, close: () => new Promise((resolve) => server.close(resolve)) };
}

describe('generated REST API', () => {
  it('serves list, create, read, update and delete with validation and 404s', async () => {
    const { mod } = await generateAndImport('user-profile', 'rest');
    expect(Object.keys(mod.userProfileRoutes)).toEqual(['user-profile']);

    const { request, close } = await serve(mod.default);
    try {
      const list = await request('GET', '/user-profile?page=2&limit=1');
      expect(list.status).toBe(200);
      expect(list.type).toMatch(/^application\/json/);
      expect(list.body.data).toHaveLength(1);
      expect(list.body.pagination).toEqual({ page: 2, limit: 1, total: 2, totalPages: 2 });

      const badQuery = await request('GET', '/user-profile?limit=500');
      expect(badQuery.status).toBe(400);
      expect(badQuery.body.details.errors[0]).toMatchObject({ field: 'limit', rule: 'maximum' });

      expect((await request('GET', '/user-profile/health')).body.status).toBe('ok');

      const created = await request('POST', '/user-profile', { name: 'Ada', description: 'First' });
      expect(created.status).toBe(201);
      expect(created.body.data).toMatchObject({ name: 'Ada', description: 'First' });
      const { id } = created.body.data;

      const invalid = await request('POST', '/user-profile', { description: 'no name', role: 'admin' });
      expect(invalid.status).toBe(400);
      expect(invalid.body.details.errors.map((error) => error.field).sort()).toEqual(['name', 'role']);

      const read = await request('GET', `/user-profile/${id}`);
      expect(read.status).toBe(200);
      expect(read.body.data.name).toBe('Ada');

      const updated = await request('PUT', `/user-profile/${id}`, { name: 'Grace' });
      expect(updated.status).toBe(200);
      expect(updated.body.data).toMatchObject({ id, name: 'Grace', description: 'First' });

      expect((await request('PUT', `/user-profile/${id}`, {})).status).toBe(400);
      expect((await request('PUT', '/user-profile/missing', { name: 'x' })).status).toBe(404);

      const deleted = await request('DELETE', `/user-profile/${id}`);
      expect(deleted.status).toBe(200);
      expect(deleted.body.data.id).toBe(id);

      const gone = await request('GET', `/user-profile/${id}`);
      expect(gone.status).toBe(404);
      expect(gone.body.error).toBe(`UserProfile ${id} not found`);
      expect((await request('DELETE', `/user-profile/${id}`)).status).toBe(404);
    } finally {
      await close();
    }
  });
});

describe('generated JSON-RPC API', () => {
  let rpc;
  let mod;

  beforeAll(async () => {
    ({ mod } = await generateAndImport('tasks', 'rpc'));
    rpc = await serve(mod.default);
  });

  afterAll(() => rpc.close());

  const call = (payload) => rpc.request('POST', '/rpc/tasks', payload);

  it('answers valid calls with a result envelope', async () => {
    const created = await call({ jsonrpc: '2.0', method: 'tasks.create', params: { name: 'Write docs' }, id: 1 });
    expect(created.status).toBe(200);
    expect(created.body).toMatchObject({ jsonrpc: '2.0', id: 1, result: { name: 'Write docs' } });
    expect(created.body).not.toHaveProperty('error');
    const { id } = created.body.result;

    const read = await call({ jsonrpc: '2.0', method: 'tasks.get', params: { id }, id: 'req-2' });
    expect(read.body).toEqual({ jsonrpc: '2.0', result: created.body.result, id: 'req-2' });

    const updated = await call({ jsonrpc: '2.0', method: 'tasks.update', params: { id, name: 'Ship docs' }, id: 3 });
    expect(updated.body.result.name).toBe('Ship docs');

    const list = await call({ jsonrpc: '2.0', method: 'tasks.list', params: { limit: 2 }, id: 4 });
    expect(list.body.result.items).toHaveLength(2);
    expect(list.body.result.total).toBe(3);

    const deleted = await call({ jsonrpc: '2.0', method: 'tasks.delete', params: { id }, id: 5 });
    expect(deleted.body.result).toMatchObject({ success: true, deleted: { id } });
  });

  it('answers invalid calls with the JSON-RPC 2.0 error codes', async () => {
    const { RPC_ERRORS } = mod;
    expect(RPC_ERRORS).toMatchObject({
      INVALID_REQUEST: -32600,
      METHOD_NOT_FOUND: -32601,
      INVALID_PARAMS: -32602,
      INTERNAL_ERROR: -32603
    });

    const notFound = await call({ jsonrpc: '2.0', method: 'tasks.nope', id: 7 });
    expect(notFound.status).toBe(200);
    expect(notFound.body).toEqual({ jsonrpc: '2.0', error: { code: -32601, message: 'Method not found' }, id: 7 });

    const badParams = await call({ jsonrpc: '2.0', method: 'tasks.get', params: { id: 42 }, id: 8 });
    expect(badParams.body.error).toMatchObject({ code: -32602, message: 'Invalid params' });
    expect(badParams.body.error.data.errors[0]).toMatchObject({ field: 'id', rule: 'type' });
    expect(badParams.body.id).toBe(8);

    const invalidRequest = await call({ method: 'tasks.list', id: 9 });
    expect(invalidRequest.body).toEqual({ jsonrpc: '2.0', error: { code: -32600, message: 'Invalid Request' }, id: 9 });

    const missingItem = await call({ jsonrpc: '2.0', method: 'tasks.get', params: { id: 'missing' }, id: 10 });
    expect(missingItem.body.error).toEqual({ code: RPC_ERRORS.NOT_FOUND, message: 'Tasks missing not found' });
    expect(missingItem.body).not.toHaveProperty('result');
  });

  it('handles batches and answers notifications with no body', async () => {
    const notification = await call({ jsonrpc: '2.0', method: 'tasks.list' });
    expect(notification.status).toBe(204);
    expect(notification.body).toBeNull();

    const batch = await call([
      { jsonrpc: '2.0', method: 'tasks.list', params: { limit: 1 }, id: 1 },
      { jsonrpc: '2.0', method: 'tasks.list' },
      'not a request'
    ]);
    expect(batch.body).toEqual([
      expect.objectContaining({ id: 1, result: expect.objectContaining({ total: 2 }) }),
      { jsonrpc: '2.0', error: { code: -32600, message: 'Invalid Request' }, id: null }
    ]);

    expect((await call([])).body.error.code).toBe(-32600);
  });
});

describe('generated API test files', () => {
  it('pass when run with vitest', async () => {
    const suiteDir = join(projectDir, 'suite');
    await mkdir(suiteDir);
    process.chdir(suiteDir);
    try {
      await generateAPI('products', { template: 'rest' });
      await generateAPI('jobs', { template: 'rpc' });
    } finally {
      process.chdir(projectDir);
    }

    // The generated tests run in a child vitest whose config resolves
    // @coherent.js/* to the package sources, like this suite does.
    const shared = pathToFileURL(join(REPO_ROOT, 'vitest.shared.js')).href;
    await writeFile(
      join(suiteDir, 'vitest.config.mjs'),
      `import { coherentSources } from '${shared}';\n` +
        "export default { plugins: [coherentSources()], test: { include: ['src/**/*.test.js'] } };\n"
    );

    const vitestBin = join(REPO_ROOT, 'node_modules', 'vitest', 'vitest.mjs');
    // Uncoloured output: CI forces colours, and the escape codes between
    // "Test Files" and "2 passed" made the assertions below fail.
    const env = {
      ...Object.fromEntries(
        Object.entries(process.env).filter(([key]) => !key.startsWith('VITEST') && key !== 'FORCE_COLOR')
      ),
      NO_COLOR: '1'
    };
    const result = spawnSync(process.execPath, [vitestBin, 'run', '--root', suiteDir], {
      cwd: suiteDir,
      env,
      encoding: 'utf8',
      timeout: 60_000
    });

    const output = `${result.stdout}\n${result.stderr}`;
    expect(result.status, output).toBe(0);
    expect(output).toMatch(/Test Files\s+2 passed/);
    expect(output).toMatch(/Tests\s+6 passed/);
  }, 90_000);
});

describe('coherent generate api <name>', () => {
  it('accepts the lowercase names the README shows and writes a working module', async () => {
    const cliDir = join(projectDir, 'cli');
    await mkdir(cliDir);
    const entry = join(cliDir, 'entry.mjs');
    const cliSrc = fileURLToPath(new URL('../src/index.js', import.meta.url));
    await writeFile(entry, `import { createCLI } from ${JSON.stringify(cliSrc)};\nawait createCLI();\n`);

    const run = (...args) =>
      spawnSync(process.execPath, [entry, ...args], { cwd: cliDir, encoding: 'utf8', timeout: 30_000 });

    // Used to exit 1 with "Name should start with a capital letter (PascalCase)"
    const api = run('generate', 'api', 'users');
    expect(api.status, `${api.stdout}\n${api.stderr}`).toBe(0);

    const { default: usersAPI } = await import(pathToFileURL(join(cliDir, 'src/api/users.js')).href);
    const { request, close } = await serve(usersAPI);
    try {
      const list = await request('GET', '/users');
      expect(list.status).toBe(200);
      expect(list.body.data).toHaveLength(2);
    } finally {
      await close();
    }

    // Components keep their PascalCase rule
    expect(run('generate', 'component', 'button').status).toBe(1);
  });
});
