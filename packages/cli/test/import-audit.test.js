/**
 * Import Audit Tests
 * Validates that generated scaffold code imports from actual package exports
 */

import { describe, test, expect } from 'vitest';
import { mkdtemp, rm, readFile, readdir } from 'fs/promises';
import { existsSync } from 'fs';
import { join } from 'path';
import { tmpdir } from 'os';
import { scaffoldProject } from '../src/generators/project-scaffold.js';

// Known exports from each @coherent.js package
// These must be kept in sync with actual package exports
const PACKAGE_EXPORTS = {
  '@coherent.js/core': [
    'render',
    'createComponent',
    'defineComponent',
    'registerComponent',
    'withState',
    'createStateManager',
    'memoize',
    'memo',
    'h',
    'createElement',
    'renderWithTemplate',
    'renderComponentFactory',
    'isCoherentComponent',
    'withStateUtils',
    'getComponent',
    'getRegisteredComponents',
    'lazy',
    'isLazy',
    'evaluateLazy',
    'ComponentLifecycle',
    'LIFECYCLE_PHASES',
    'withLifecycle',
    'createLifecycleHooks',
    'useHooks',
    'lifecycleUtils',
    'createTextNode',
    'ComponentCache',
    'createComponentCache',
    'createErrorBoundary',
    'createErrorFallback',
    'withErrorBoundary',
    'createAsyncErrorBoundary',
    'GlobalErrorHandler',
    'createGlobalErrorHandler',
    'createErrorResponse',
    'isPeerDependencyAvailable',
    'importPeerDependency',
    'createLazyIntegration',
    'checkPeerDependencies',
    'hasChildren',
    'normalizeChildren',
    'validateNesting',
    'FORBIDDEN_CHILDREN',
    'HTMLNestingError',
    'validateComponent',
    'isCoherentObject',
    'deepClone',
    'dangerouslySetInnerContent',
    'VERSION',
    'performanceMonitor',
    'shadowDOM',
    'eventSystem',
    'EventBus',
    'createEventBus',
    'globalEventBus',
    'emit',
    'emitSync',
    'on',
    'once',
    'off',
    'registerAction',
    'handleAction',
    'DOMEventIntegration',
    'globalDOMIntegration',
    'initializeDOMIntegration',
    'withEventBus',
    'withEventState',
    'createActionHandlers',
    'createEventHandlers',
    'createEventComponent'
  ],
  '@coherent.js/database': [
    'setupDatabase',
    'PostgreSQLAdapter',
    'MySQLAdapter',
    'SQLiteAdapter',
    'MongoDBAdapter',
    'createQuery',
    'executeQuery',
    'createModel',
    'createMigration',
    'createDatabaseManager',
    'withDatabase',
    'withTransaction',
    'withModel',
    'withPagination',
    'createConnection',
    'runMigrations',
    'DEFAULT_DB_CONFIG'
  ],
  '@coherent.js/express': [
    'setupCoherent',
    'expressEngine'
  ],
  '@coherent.js/fastify': [
    'coherentFastify',
    'createHandler',
    'setupCoherent'
  ],
  '@coherent.js/koa': [
    'setupCoherent',
    'coherentKoaMiddleware',
    'createHandler',
    'createKoaIntegration'
  ],
  '@coherent.js/api': [
    'createRouter',
    'ApiError',
    'ValidationError',
    'AuthenticationError',
    'AuthorizationError',
    'NotFoundError',
    'ConflictError',
    'withErrorHandling',
    'createErrorHandler',
    'validateAgainstSchema',
    'validateField',
    'withValidation',
    'withQueryValidation',
    'withParamsValidation',
    'serializeDate',
    'deserializeDate',
    'serializeMap',
    'deserializeMap',
    'serializeSet',
    'deserializeSet',
    'withSerialization',
    'serializeForJSON',
    'withAuth',
    'withRole',
    'hashPassword',
    'verifyPassword',
    'generateToken',
    'withInputValidation'
  ],
  '@coherent.js/client': [
    'hydrate',
    'EventDelegation',
    'eventDelegation',
    'HandlerRegistry',
    'handlerRegistry',
    'wrapEvent',
    'serializeState',
    'deserializeState',
    'extractState',
    'serializeStateWithWarning',
    'detectMismatch',
    'reportMismatches',
    'formatPath',
    'legacyHydrate',
    'hydrateAll',
    'hydrateBySelector',
    'enableClientEvents',
    'makeHydratable',
    'autoHydrate',
    'registerEventHandler'
  ]
};

/**
 * Extract imports from code
 * @param {string} code - Source code to analyze
 * @returns {Array<{names: string[], from: string, isDefault: boolean}>}
 */
function extractImports(code) {
  const imports = [];

  // Match named imports: import { a, b } from 'package'
  const namedImportRegex = /import\s*\{([^}]+)\}\s*from\s*['"]([^'"]+)['"]/g;
  let match;

  while ((match = namedImportRegex.exec(code)) !== null) {
    const namesRaw = match[1];
    const from = match[2];

    // Parse individual names, handling 'as' aliases
    const names = namesRaw
      .split(',')
      .map(n => n.trim())
      .filter(n => n)
      .map(n => {
        // Handle "Foo as Bar" - take original name (Foo)
        const parts = n.split(/\s+as\s+/);
        return parts[0].trim();
      });

    imports.push({ names, from, isDefault: false });
  }

  // Match default imports: import Foo from 'package'
  const defaultImportRegex = /import\s+(\w+)\s+from\s*['"]([^'"]+)['"]/g;

  while ((match = defaultImportRegex.exec(code)) !== null) {
    const name = match[1];
    const from = match[2];

    // Skip if this looks like a named import (already handled)
    if (code.includes(`import { ${name}`)) continue;

    imports.push({ names: [name], from, isDefault: true });
  }

  return imports;
}

/**
 * Validate imports against known package exports
 * @param {Array<{names: string[], from: string, isDefault: boolean}>} imports
 * @returns {string[]} Array of error messages
 */
function validateImports(imports) {
  const errors = [];

  for (const importInfo of imports) {
    const { names, from, isDefault } = importInfo;

    // Only validate @coherent.js packages
    if (!from.startsWith('@coherent.js/')) continue;

    // Check if package is known
    if (!PACKAGE_EXPORTS[from]) {
      errors.push(`Unknown package: ${from}`);
      continue;
    }

    const knownExports = PACKAGE_EXPORTS[from];

    // Default imports are valid (packages export default)
    if (isDefault) continue;

    // Check each named export
    for (const name of names) {
      if (!knownExports.includes(name)) {
        errors.push(`Invalid import: '${name}' is not exported from '${from}'. Known exports: ${knownExports.join(', ')}`);
      }
    }
  }

  return errors;
}

/**
 * Recursively get all source files from a directory
 * @param {string} dir - Directory path
 * @returns {Promise<string[]>} Array of file paths
 */
async function getAllSourceFiles(dir) {
  const files = [];
  const entries = await readdir(dir, { withFileTypes: true });

  for (const entry of entries) {
    const fullPath = join(dir, entry.name);

    // Skip node_modules
    if (entry.name === 'node_modules') continue;

    if (entry.isDirectory()) {
      const subFiles = await getAllSourceFiles(fullPath);
      files.push(...subFiles);
    } else if (entry.isFile() && (entry.name.endsWith('.js') || entry.name.endsWith('.ts'))) {
      files.push(fullPath);
    }
  }

  return files;
}

// Test utilities
async function createTempDir() {
  return await mkdtemp(join(tmpdir(), 'coherent-import-audit-'));
}

async function cleanupTempDir(dir) {
  if (existsSync(dir)) {
    await rm(dir, { recursive: true, force: true });
  }
}

describe('Import audit: generated code imports from actual exports', () => {
  test('basic template with built-in runtime has valid imports', async () => {
    const tempDir = await createTempDir();

    try {
      await scaffoldProject(tempDir, {
        name: 'test-import-builtin',
        template: 'basic',
        runtime: 'built-in',
        skipInstall: true,
        skipGit: true
      });

      const files = await getAllSourceFiles(join(tempDir, 'src'));
      const allErrors = [];

      for (const filePath of files) {
        const code = await readFile(filePath, 'utf-8');
        const imports = extractImports(code);
        const errors = validateImports(imports);

        if (errors.length > 0) {
          allErrors.push(`${filePath}:\n  ${errors.join('\n  ')}`);
        }
      }

      expect(allErrors).toEqual([]);
    } finally {
      await cleanupTempDir(tempDir);
    }
  });

  test('basic template with express runtime has valid imports', async () => {
    const tempDir = await createTempDir();

    try {
      await scaffoldProject(tempDir, {
        name: 'test-import-express',
        template: 'basic',
        runtime: 'express',
        skipInstall: true,
        skipGit: true
      });

      const files = await getAllSourceFiles(join(tempDir, 'src'));
      const allErrors = [];

      for (const filePath of files) {
        const code = await readFile(filePath, 'utf-8');
        const imports = extractImports(code);
        const errors = validateImports(imports);

        if (errors.length > 0) {
          allErrors.push(`${filePath}:\n  ${errors.join('\n  ')}`);
        }
      }

      expect(allErrors).toEqual([]);
    } finally {
      await cleanupTempDir(tempDir);
    }
  });

  test('fullstack template with database has valid imports', async () => {
    const tempDir = await createTempDir();

    try {
      await scaffoldProject(tempDir, {
        name: 'test-import-db',
        template: 'fullstack',
        runtime: 'built-in',
        database: 'postgres',
        packages: ['api'],
        skipInstall: true,
        skipGit: true
      });

      const files = await getAllSourceFiles(join(tempDir, 'src'));
      const allErrors = [];

      for (const filePath of files) {
        const code = await readFile(filePath, 'utf-8');
        const imports = extractImports(code);
        const errors = validateImports(imports);

        if (errors.length > 0) {
          allErrors.push(`${filePath}:\n  ${errors.join('\n  ')}`);
        }
      }

      expect(allErrors).toEqual([]);
    } finally {
      await cleanupTempDir(tempDir);
    }
  });

  test('fullstack template with jwt auth has valid imports', async () => {
    const tempDir = await createTempDir();

    try {
      await scaffoldProject(tempDir, {
        name: 'test-import-auth',
        template: 'fullstack',
        runtime: 'express',
        database: 'sqlite',
        auth: 'jwt',
        skipInstall: true,
        skipGit: true
      });

      const files = await getAllSourceFiles(join(tempDir, 'src'));
      const allErrors = [];

      for (const filePath of files) {
        const code = await readFile(filePath, 'utf-8');
        const imports = extractImports(code);
        const errors = validateImports(imports);

        if (errors.length > 0) {
          allErrors.push(`${filePath}:\n  ${errors.join('\n  ')}`);
        }
      }

      expect(allErrors).toEqual([]);
    } finally {
      await cleanupTempDir(tempDir);
    }
  });

  describe('database adapter imports', () => {
    const databases = ['postgres', 'mysql', 'sqlite', 'mongodb'];

    for (const database of databases) {
      test(`${database} adapter import is valid`, async () => {
        const tempDir = await createTempDir();

        try {
          await scaffoldProject(tempDir, {
            name: `test-import-${database}`,
            template: 'fullstack',
            runtime: 'built-in',
            database,
            skipInstall: true,
            skipGit: true
          });

          // Read db/index.js specifically
          const dbIndexPath = join(tempDir, 'src/db/index.js');
          const code = await readFile(dbIndexPath, 'utf-8');
          const imports = extractImports(code);
          const errors = validateImports(imports);

          expect(errors).toEqual([]);
        } finally {
          await cleanupTempDir(tempDir);
        }
      });
    }
  });
});

describe('Import audit: no undefined exports referenced', () => {
  test('extractImports correctly parses named imports', () => {
    const code = `
      import { render, createComponent } from '@coherent.js/core';
      import { setupCoherent } from '@coherent.js/express';
    `;

    const imports = extractImports(code);

    expect(imports).toHaveLength(2);
    expect(imports[0].names).toContain('render');
    expect(imports[0].names).toContain('createComponent');
    expect(imports[0].from).toBe('@coherent.js/core');
    expect(imports[1].names).toContain('setupCoherent');
    expect(imports[1].from).toBe('@coherent.js/express');
  });

  test('extractImports handles as aliases', () => {
    const code = `
      import { render as renderHTML } from '@coherent.js/core';
    `;

    const imports = extractImports(code);

    expect(imports).toHaveLength(1);
    expect(imports[0].names).toContain('render');
    expect(imports[0].from).toBe('@coherent.js/core');
  });

  test('validateImports catches invalid exports', () => {
    const imports = [
      { names: ['invalidExport'], from: '@coherent.js/core', isDefault: false }
    ];

    const errors = validateImports(imports);

    expect(errors.length).toBeGreaterThan(0);
    expect(errors[0]).toContain('invalidExport');
    expect(errors[0]).toContain('is not exported from');
  });

  test('validateImports allows valid exports', () => {
    const imports = [
      { names: ['render', 'createComponent'], from: '@coherent.js/core', isDefault: false },
      { names: ['setupCoherent'], from: '@coherent.js/express', isDefault: false }
    ];

    const errors = validateImports(imports);

    expect(errors).toEqual([]);
  });

  test('validateImports ignores non-coherent packages', () => {
    const imports = [
      { names: ['anything'], from: 'some-other-package', isDefault: false },
      { names: ['express'], from: 'express', isDefault: true }
    ];

    const errors = validateImports(imports);

    expect(errors).toEqual([]);
  });
});
