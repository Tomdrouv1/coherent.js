/**
 * Scaffold Matrix Tests
 * Tests scaffold permutations systematically for template x runtime x database x auth combinations
 */

import { describe, test, expect, beforeAll, afterAll } from 'vitest';
import { mkdtemp, rm, readFile } from 'fs/promises';
import { existsSync } from 'fs';
import { join } from 'path';
import { tmpdir } from 'os';
import { scaffoldProject } from '../src/generators/project-scaffold.js';

// Test utilities
async function createTempDir() {
  return await mkdtemp(join(tmpdir(), 'coherent-matrix-test-'));
}

async function cleanupTempDir(dir) {
  if (existsSync(dir)) {
    await rm(dir, { recursive: true, force: true });
  }
}

describe('Scaffold Matrix Tests', () => {
  describe('P0: Basic template x runtime matrix', () => {
    const runtimes = ['built-in', 'express', 'fastify', 'koa'];

    for (const runtime of runtimes) {
      test(`basic template with ${runtime} runtime creates correct structure`, async () => {
        const tempDir = await createTempDir();

        try {
          await scaffoldProject(tempDir, {
            name: `test-${runtime}-app`,
            template: 'basic',
            runtime,
            skipInstall: true,
            skipGit: true
          });

          // Assert basic structure exists
          expect(existsSync(join(tempDir, 'src/index.js'))).toBe(true);
          expect(existsSync(join(tempDir, 'src/components/HomePage.js'))).toBe(true);
          expect(existsSync(join(tempDir, 'package.json'))).toBe(true);

          // Read index.js for runtime-specific assertions
          const indexContent = await readFile(join(tempDir, 'src/index.js'), 'utf-8');

          // Assert runtime-specific content
          if (runtime === 'built-in') {
            expect(indexContent).toContain("import http from 'node:http'");
            expect(indexContent).toContain("server.listen");
          } else if (runtime === 'express') {
            expect(indexContent).toContain("import express from 'express'");
            expect(indexContent).toContain("setupCoherent");
            expect(indexContent).toContain("app.listen");
          } else if (runtime === 'fastify') {
            expect(indexContent).toContain("import Fastify from 'fastify'");
            expect(indexContent).toContain("setupCoherent");
            expect(indexContent).toContain("fastify.listen");
          } else if (runtime === 'koa') {
            expect(indexContent).toContain("import Koa from 'koa'");
            expect(indexContent).toContain("setupCoherent");
            expect(indexContent).toContain("app.listen");
          }

          // Read and verify package.json
          const packageJsonContent = await readFile(join(tempDir, 'package.json'), 'utf-8');
          const packageJson = JSON.parse(packageJsonContent);

          // All should have @coherent.js/core
          expect(packageJson.dependencies['@coherent.js/core']).toBeDefined();

          // Runtime-specific deps
          if (runtime === 'express') {
            expect(packageJson.dependencies.express).toBeDefined();
            expect(packageJson.dependencies['@coherent.js/express']).toBeDefined();
          } else if (runtime === 'fastify') {
            expect(packageJson.dependencies.fastify).toBeDefined();
            expect(packageJson.dependencies['@coherent.js/fastify']).toBeDefined();
          } else if (runtime === 'koa') {
            expect(packageJson.dependencies.koa).toBeDefined();
            expect(packageJson.dependencies['@coherent.js/koa']).toBeDefined();
          }
        } finally {
          await cleanupTempDir(tempDir);
        }
      });
    }
  });

  describe('P1: Fullstack template x database matrix', () => {
    const databases = ['postgres', 'mysql', 'sqlite', 'mongodb'];
    const adapterNames = {
      postgres: 'PostgreSQLAdapter',
      mysql: 'MySQLAdapter',
      sqlite: 'SQLiteAdapter',
      mongodb: 'MongoDBAdapter'
    };

    for (const database of databases) {
      test(`fullstack template with ${database} database creates correct structure`, async () => {
        const tempDir = await createTempDir();

        try {
          await scaffoldProject(tempDir, {
            name: `test-${database}-app`,
            template: 'fullstack',
            runtime: 'built-in',
            database,
            packages: ['api'],
            skipInstall: true,
            skipGit: true
          });

          // Assert database files exist
          expect(existsSync(join(tempDir, 'src/db'))).toBe(true);
          expect(existsSync(join(tempDir, 'src/db/config.js'))).toBe(true);
          expect(existsSync(join(tempDir, 'src/db/index.js'))).toBe(true);
          expect(existsSync(join(tempDir, 'src/db/models/User.js'))).toBe(true);

          // Read db/index.js and verify adapter import
          const dbIndexContent = await readFile(join(tempDir, 'src/db/index.js'), 'utf-8');
          expect(dbIndexContent).toContain(adapterNames[database]);
          expect(dbIndexContent).toContain('dbConfig');
          expect(dbIndexContent).toContain("'@coherent.js/database'");

          // Read and verify package.json has database dep
          const packageJsonContent = await readFile(join(tempDir, 'package.json'), 'utf-8');
          const packageJson = JSON.parse(packageJsonContent);
          expect(packageJson.dependencies['@coherent.js/database']).toBeDefined();
        } finally {
          await cleanupTempDir(tempDir);
        }
      });
    }
  });

  describe('P1: Fullstack template x auth matrix', () => {
    const auths = ['jwt', 'session'];
    const runtimes = ['express', 'fastify', 'koa', 'built-in'];

    for (const auth of auths) {
      for (const runtime of runtimes) {
        test(`fullstack template with ${auth} auth and ${runtime} runtime creates correct structure`, async () => {
          const tempDir = await createTempDir();

          try {
            await scaffoldProject(tempDir, {
              name: `test-${auth}-${runtime}-app`,
              template: 'fullstack',
              runtime,
              database: 'sqlite', // Required for auth
              auth,
              skipInstall: true,
              skipGit: true
            });

            // Determine auth directory based on runtime
            const authDir = runtime === 'fastify' ? 'plugins' : 'middleware';

            // Assert auth files exist
            expect(existsSync(join(tempDir, `src/${authDir}/auth.js`))).toBe(true);
            expect(existsSync(join(tempDir, 'src/api/auth.js'))).toBe(true);

            // Read auth routes and verify imports
            const authRoutesContent = await readFile(join(tempDir, 'src/api/auth.js'), 'utf-8');

            if (auth === 'jwt') {
              // JWT auth should import generateToken
              expect(authRoutesContent).toContain('generateToken');
              expect(authRoutesContent).toContain('UserModel');
            }

            // Read .env.example and verify secrets
            const envContent = await readFile(join(tempDir, '.env.example'), 'utf-8');
            if (auth === 'jwt') {
              expect(envContent).toContain('JWT_SECRET');
            } else if (auth === 'session') {
              expect(envContent).toContain('SESSION_SECRET');
            }
          } finally {
            await cleanupTempDir(tempDir);
          }
        });
      }
    }
  });

  describe('TypeScript scaffold', () => {
    test('basic TypeScript scaffold creates correct structure', async () => {
      const tempDir = await createTempDir();

      try {
        await scaffoldProject(tempDir, {
          name: 'test-ts-app',
          template: 'basic',
          runtime: 'built-in',
          language: 'typescript',
          skipInstall: true,
          skipGit: true
        });

        // Assert .ts files exist
        expect(existsSync(join(tempDir, 'src/index.ts'))).toBe(true);
        expect(existsSync(join(tempDir, 'src/components/HomePage.ts'))).toBe(true);

        // Assert tsconfig.json exists
        expect(existsSync(join(tempDir, 'tsconfig.json'))).toBe(true);

        // Verify tsconfig has correct settings
        const tsconfigContent = await readFile(join(tempDir, 'tsconfig.json'), 'utf-8');
        const tsconfig = JSON.parse(tsconfigContent);
        expect(tsconfig.compilerOptions.module).toBe('ESNext');

        // Verify package.json has typescript devDeps
        const packageJsonContent = await readFile(join(tempDir, 'package.json'), 'utf-8');
        const packageJson = JSON.parse(packageJsonContent);
        expect(packageJson.devDependencies.typescript).toBeDefined();
        expect(packageJson.devDependencies.tsx).toBeDefined();
      } finally {
        await cleanupTempDir(tempDir);
      }
    });

    test('fullstack TypeScript scaffold creates typed models', async () => {
      const tempDir = await createTempDir();

      try {
        await scaffoldProject(tempDir, {
          name: 'test-ts-fullstack-app',
          template: 'fullstack',
          runtime: 'built-in',
          database: 'postgres',
          language: 'typescript',
          skipInstall: true,
          skipGit: true
        });

        // Assert typed model file exists
        expect(existsSync(join(tempDir, 'src/db/models/User.ts'))).toBe(true);

        // Verify model contains TypeScript constructs
        const modelContent = await readFile(join(tempDir, 'src/db/models/User.ts'), 'utf-8');
        expect(modelContent).toContain('interface');
        expect(modelContent).toContain(': Promise<');
      } finally {
        await cleanupTempDir(tempDir);
      }
    });
  });
});
