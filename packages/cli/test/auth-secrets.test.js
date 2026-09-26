/**
 * Scaffolded auth secrets
 *
 * Regression coverage for generated auth code that fell back to a secret
 * published in this CLI's source (`process.env.JWT_SECRET || 'your-secret-…'`),
 * wrote a known placeholder into `.env`, and never loaded `.env` at all — so
 * every scaffolded app signed tokens with the same public key.
 */

import { describe, it, expect, afterEach } from 'vitest';
import { spawnSync } from 'node:child_process';
import { mkdtemp, rm } from 'node:fs/promises';
import { readFileSync, writeFileSync, mkdirSync } from 'node:fs';
import { join } from 'node:path';
import { tmpdir } from 'node:os';
import { scaffoldProject } from '../src/generators/project-scaffold.js';

const tempDirs = [];

afterEach(async () => {
  while (tempDirs.length) {
    await rm(tempDirs.pop(), { recursive: true, force: true });
  }
});

async function scaffold(options) {
  const dir = await mkdtemp(join(tmpdir(), 'coherent-auth-secrets-'));
  tempDirs.push(dir);
  await scaffoldProject(dir, {
    name: 'auth-secrets-app',
    template: 'fullstack',
    database: 'sqlite',
    skipInstall: true,
    skipGit: true,
    ...options
  });
  return dir;
}

/** Minimal ESM stand-ins so the generated auth module can be imported without installing. */
function stubPackage(projectDir, name, source) {
  const dir = join(projectDir, 'node_modules', name);
  mkdirSync(dir, { recursive: true });
  writeFileSync(join(dir, 'package.json'), JSON.stringify({ name, type: 'module', main: 'index.js' }));
  writeFileSync(join(dir, 'index.js'), source);
}

/** Import `file` in a fresh node process, the way the generated npm scripts start the app. */
function importModule(projectDir, file, { env = {}, nodeFlags = [] } = {}) {
  const cleanEnv = { ...process.env };
  delete cleanEnv.JWT_SECRET;
  delete cleanEnv.SESSION_SECRET;
  Object.assign(cleanEnv, env);
  return spawnSync(process.execPath, [...nodeFlags, file], {
    cwd: projectDir,
    env: cleanEnv,
    encoding: 'utf8'
  });
}

const envFlagsOf = (script) => script.split(/\s+/).filter((part) => part.startsWith('--env-file'));

describe('scaffolded JWT auth secret', () => {
  it('writes a unique random JWT_SECRET into .env and an empty placeholder into .env.example', async () => {
    const first = await scaffold({ runtime: 'express', auth: 'jwt' });
    const second = await scaffold({ runtime: 'express', auth: 'jwt' });

    const secretOf = (dir) => /^JWT_SECRET=(.*)$/m.exec(readFileSync(join(dir, '.env'), 'utf8'))?.[1];
    expect(secretOf(first)).toMatch(/^[0-9a-f]{64}$/);
    expect(secretOf(second)).toMatch(/^[0-9a-f]{64}$/);
    expect(secretOf(first)).not.toBe(secretOf(second));

    const example = readFileSync(join(first, '.env.example'), 'utf8');
    expect(example).toMatch(/^JWT_SECRET=$/m);
    expect(example).not.toContain(secretOf(first));
    // The auth step appends; the database settings written before it survive.
    expect(example).toContain('DB_PATH');

    const gitignore = readFileSync(join(first, '.gitignore'), 'utf8').split('\n');
    expect(gitignore).toContain('.env');
  });

  it('has no hard-coded fallback secret in any runtime or language', async () => {
    for (const runtime of ['built-in', 'express', 'fastify', 'koa']) {
      for (const language of ['javascript', 'typescript']) {
        const dir = await scaffold({ runtime, auth: 'jwt', language });
        const ext = language === 'typescript' ? 'ts' : 'js';
        const authDir = runtime === 'fastify' ? 'plugins' : 'middleware';
        const source = readFileSync(join(dir, `src/${authDir}/auth.${ext}`), 'utf8');
        expect(source).not.toMatch(/process\.env\.JWT_SECRET\s*\|\|/);
        expect(source).not.toContain('change-this');
        expect(source).toContain("requireSecret('JWT_SECRET')");
      }
    }
  });

  it('the generated app refuses to start without JWT_SECRET and starts with the generated .env', async () => {
    const dir = await scaffold({ runtime: 'express', auth: 'jwt' });
    stubPackage(dir, 'jsonwebtoken', 'export default { sign: () => "t", verify: () => ({}) };');
    const middleware = join(dir, 'src/middleware/auth.js');

    const withoutSecret = importModule(dir, middleware);
    expect(withoutSecret.status).not.toBe(0);
    expect(withoutSecret.stderr).toContain('JWT_SECRET is not set');

    // The generated start script loads .env, which holds the generated secret.
    const pkg = JSON.parse(readFileSync(join(dir, 'package.json'), 'utf8'));
    expect(pkg.scripts.start).toContain('--env-file-if-exists=.env');
    expect(pkg.scripts.dev).toContain('--env-file-if-exists=.env');
    const withDotEnv = importModule(dir, middleware, { nodeFlags: envFlagsOf(pkg.scripts.start) });
    expect(withDotEnv.stderr).toBe('');
    expect(withDotEnv.status).toBe(0);
  });
});

describe('scaffolded session auth secret', () => {
  it('express session auth refuses to start without SESSION_SECRET', async () => {
    const dir = await scaffold({ runtime: 'express', auth: 'session' });
    stubPackage(dir, 'express-session', 'export default () => (_req, _res, next) => next();');
    const middleware = join(dir, 'src/middleware/auth.js');

    const source = readFileSync(middleware, 'utf8');
    expect(source).not.toContain('change-this');
    expect(readFileSync(join(dir, '.env'), 'utf8')).toMatch(/^SESSION_SECRET=[0-9a-f]{64}$/m);
    expect(readFileSync(join(dir, '.env.example'), 'utf8')).toMatch(/^SESSION_SECRET=$/m);

    const withoutSecret = importModule(dir, middleware);
    expect(withoutSecret.status).not.toBe(0);
    expect(withoutSecret.stderr).toContain('SESSION_SECRET is not set');

    const withSecret = importModule(dir, middleware, { env: { SESSION_SECRET: 'x'.repeat(64) } });
    expect(withSecret.status).toBe(0);
  });
});
