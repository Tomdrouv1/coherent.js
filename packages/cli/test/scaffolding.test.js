/**
 * Project Scaffolding Tests
 */

import { describe, test, assert } from 'vitest';
import { mkdtemp, rm } from 'fs/promises';
import { existsSync, readFileSync } from 'fs';
import { join } from 'path';
import { tmpdir } from 'os';
import { scaffoldProject } from '../src/generators/project-scaffold.js';

describe('Running project scaffolding tests...', () => {
// Test utilities
async function createTempDir() {
  return await mkdtemp(join(tmpdir(), 'coherent-scaffold-test-'));
}

async function cleanupTempDir(dir) {
  if (existsSync(dir)) {
    await rm(dir, { recursive: true, force: true });
  }
}

test('scaffoldProject should create basic project structure', async () => {
  const tempDir = await createTempDir();

  try {
    await scaffoldProject(tempDir, {
      name: 'test-app',
      template: 'basic',
      skipInstall: true,
      skipGit: true
    });

    // Check directory structure
    const expectedDirs = [
      'src',
      'src/components',
      'src/pages',
      'src/utils',
      'public',
      'tests'
    ];

    for (const dir of expectedDirs) {
      const dirPath = join(tempDir, dir);
      assert(existsSync(dirPath), `Directory ${dir} should exist`);
    }

    // Check essential files
    const expectedFiles = [
      'package.json',
      'README.md',
      '.gitignore',
      'src/index.js',
      'src/components/Button.js',
      'src/components/HomePage.js',
      'tests/basic.test.js'
    ];

    for (const file of expectedFiles) {
      const filePath = join(tempDir, file);
      assert(existsSync(filePath), `File ${file} should exist`);
    }



  } finally {
    await cleanupTempDir(tempDir);
  }
});

test('scaffoldProject should create correct package.json for basic template', async () => {
  const tempDir = await createTempDir();

  try {
    await scaffoldProject(tempDir, {
      name: 'my-coherent-app',
      template: 'basic',
      skipInstall: true,
      skipGit: true
    });

    const packageJsonPath = join(tempDir, 'package.json');
    const packageJsonContent = readFileSync(packageJsonPath, 'utf-8');
    const packageJson = JSON.parse(packageJsonContent);

    // Check basic properties
    assert.strictEqual(packageJson.name, 'my-coherent-app');
    assert(packageJson.version);
    assert(packageJson.type === 'module');
    assert(packageJson.main === 'src/index.js');

    // Check scripts
    assert(packageJson.scripts.dev);
    assert(packageJson.scripts.build);
    assert(packageJson.scripts.start);
    assert(packageJson.scripts.test);

    // Check dependencies
    assert(packageJson.dependencies['@coherent.js/core']);
    assert(packageJson.devDependencies['@coherent.js/cli']);



  } finally {
    await cleanupTempDir(tempDir);
  }
});

test('scaffoldProject should create Express template correctly', async () => {
  const tempDir = await createTempDir();

  try {
    await scaffoldProject(tempDir, {
      name: 'express-app',
      template: 'basic',
      runtime: 'express',
      skipInstall: true,
      skipGit: true
    });

    // Check package.json has Express dependencies
    const packageJsonPath = join(tempDir, 'package.json');
    const packageJson = JSON.parse(readFileSync(packageJsonPath, 'utf-8'));

    assert(packageJson.dependencies.express);
    assert(packageJson.dependencies['@coherent.js/express']);

    // Check main index.js has Express setup
    const indexPath = join(tempDir, 'src/index.js');
    const indexContent = readFileSync(indexPath, 'utf-8');

    assert(indexContent.includes('express'));
    assert(indexContent.includes('setupCoherent'));
    assert(indexContent.includes('app.listen'));



  } finally {
    await cleanupTempDir(tempDir);
  }
});

test('scaffoldProject should create proper README.md', async () => {
  const tempDir = await createTempDir();

  try {
    await scaffoldProject(tempDir, {
      name: 'readme-test-app',
      template: 'basic',
      skipInstall: true,
      skipGit: true
    });

    const readmePath = join(tempDir, 'README.md');
    const readmeContent = readFileSync(readmePath, 'utf-8');

    assert(readmeContent.includes('# readme-test-app'));
    assert(readmeContent.includes('Coherent.js'));
    assert(readmeContent.includes('npm install'));
    assert(readmeContent.includes('npm run dev'));
    assert(readmeContent.includes('## Project Structure'));



  } finally {
    await cleanupTempDir(tempDir);
  }
});

test('scaffoldProject should create proper .gitignore', async () => {
  const tempDir = await createTempDir();

  try {
    await scaffoldProject(tempDir, {
      name: 'gitignore-test',
      template: 'basic',
      skipInstall: true,
      skipGit: true
    });

    const gitignorePath = join(tempDir, '.gitignore');
    const gitignoreContent = readFileSync(gitignorePath, 'utf-8');

    assert(gitignoreContent.includes('node_modules/'));
    assert(gitignoreContent.includes('dist/'));
    assert(gitignoreContent.includes('.env'));
    assert(gitignoreContent.includes('.DS_Store'));
    assert(gitignoreContent.includes('*.log'));



  } finally {
    await cleanupTempDir(tempDir);
  }
});

test('scaffoldProject should create basic test file', async () => {
  const tempDir = await createTempDir();

  try {
    await scaffoldProject(tempDir, {
      name: 'test-file-test',
      template: 'basic',
      skipInstall: true,
      skipGit: true
    });

    const testPath = join(tempDir, 'tests/basic.test.js');
    const testContent = readFileSync(testPath, 'utf-8');

    assert(testContent.includes("import { describe, it, expect } from 'vitest'"));
    assert(testContent.includes("import { render } from '@coherent.js/core'"));
    assert(testContent.includes("describe('Basic Component Rendering'"));
    assert(testContent.includes("it('renders basic component'"));
    assert(testContent.includes("Hello, World!"));



  } finally {
    await cleanupTempDir(tempDir);
  }
});

test('scaffoldProject should create working Button component', async () => {
  const tempDir = await createTempDir();

  try {
    await scaffoldProject(tempDir, {
      name: 'button-test',
      template: 'basic',
      skipInstall: true,
      skipGit: true
    });

    const buttonPath = join(tempDir, 'src/components/Button.js');
    const buttonContent = readFileSync(buttonPath, 'utf-8');

    assert(buttonContent.includes('export function Button'));
    assert(buttonContent.includes('onClick'));
    assert(buttonContent.includes('className'));
    assert(buttonContent.includes('button:'));



  } finally {
    await cleanupTempDir(tempDir);
  }
});

test('scaffoldProject should handle different templates', async () => {
  const tempDir = await createTempDir();

  try {
    // Test basic template
    const basicDir = join(tempDir, 'basic');
    await scaffoldProject(basicDir, {
      name: 'basic-app',
      template: 'basic',
      skipInstall: true,
      skipGit: true
    });

    assert(existsSync(join(basicDir, 'src/index.js')));

    // Test express runtime
    const expressDir = join(tempDir, 'express');
    await scaffoldProject(expressDir, {
      name: 'express-app',
      template: 'basic',
      runtime: 'express',
      skipInstall: true,
      skipGit: true
    });

    const expressPackageJson = JSON.parse(
      readFileSync(join(expressDir, 'package.json'), 'utf-8')
    );
    assert(expressPackageJson.dependencies.express);



  } finally {
    await cleanupTempDir(tempDir);
  }
});

test('scaffoldProject should create valid main index.js', async () => {
  const tempDir = await createTempDir();

  try {
    await scaffoldProject(tempDir, {
      name: 'main-index-test',
      template: 'basic',
      runtime: 'built-in',
      database: null,
      auth: null,
      packages: [],
      language: 'javascript',
      packageManager: 'npm',
      skipInstall: true,
      skipGit: true
    });

    const indexPath = join(tempDir, 'src/index.js');
    const indexContent = readFileSync(indexPath, 'utf-8');

    // Check basic structure (built-in HTTP server)
    assert(indexContent.includes("import http from 'node:http'"));
    assert(indexContent.includes("import { render } from '@coherent.js/core'"));
    assert(indexContent.includes("import { HomePage } from './components/HomePage.js'"));
    assert(indexContent.includes('server.listen'));
    assert(indexContent.includes('PORT'));



  } finally {
    await cleanupTempDir(tempDir);
  }
});

test('scaffoldProject only supports basic and fullstack templates', async () => {
  const tempDir = await createTempDir();

  try {
    // Test basic template creates src/index.js
    const basicDir = join(tempDir, 'basic');
    await scaffoldProject(basicDir, {
      name: 'basic-app',
      template: 'basic',
      skipInstall: true,
      skipGit: true
    });

    assert(existsSync(join(basicDir, 'src/index.js')), 'Basic template should create src/index.js');
    assert(existsSync(join(basicDir, 'src/components/HomePage.js')), 'Basic template should create HomePage component');

    // Test fullstack template with database: null creates src/index.js
    const fullstackDir = join(tempDir, 'fullstack');
    await scaffoldProject(fullstackDir, {
      name: 'fullstack-app',
      template: 'fullstack',
      database: null,
      skipInstall: true,
      skipGit: true
    });

    assert(existsSync(join(fullstackDir, 'src/index.js')), 'Fullstack template should create src/index.js');
    assert(existsSync(join(fullstackDir, 'src/components/HomePage.js')), 'Fullstack template should create HomePage component');

    // Test legacy/unsupported template name falls back to basic behavior
    const customDir = join(tempDir, 'custom');
    await scaffoldProject(customDir, {
      name: 'custom-app',
      template: 'custom', // Unsupported template name
      skipInstall: true,
      skipGit: true
    });

    // Should still create basic structure via fallback
    assert(existsSync(join(customDir, 'src/index.js')), 'Custom template should fall back to creating src/index.js');
    assert(existsSync(join(customDir, 'package.json')), 'Custom template should fall back to creating package.json');

  } finally {
    await cleanupTempDir(tempDir);
  }
});

test('scaffoldProject consolidated templates with runtime selection', async () => {
  const tempDir = await createTempDir();

  try {
    // Verify basic template works with all runtimes
    const runtimes = ['built-in', 'express', 'fastify', 'koa'];

    for (const runtime of runtimes) {
      const runtimeDir = join(tempDir, runtime);
      await scaffoldProject(runtimeDir, {
        name: `${runtime}-app`,
        template: 'basic',
        runtime,
        skipInstall: true,
        skipGit: true
      });

      assert(existsSync(join(runtimeDir, 'src/index.js')), `Basic template with ${runtime} runtime should create src/index.js`);
      assert(existsSync(join(runtimeDir, 'package.json')), `Basic template with ${runtime} runtime should create package.json`);
    }

    // Verify fullstack template works with database
    const fullstackDbDir = join(tempDir, 'fullstack-db');
    await scaffoldProject(fullstackDbDir, {
      name: 'fullstack-db-app',
      template: 'fullstack',
      runtime: 'express',
      database: 'sqlite',
      skipInstall: true,
      skipGit: true
    });

    assert(existsSync(join(fullstackDbDir, 'src/index.js')), 'Fullstack template with database should create src/index.js');
    assert(existsSync(join(fullstackDbDir, 'src/db/index.js')), 'Fullstack template with database should create db/index.js');
    assert(existsSync(join(fullstackDbDir, 'src/db/models/User.js')), 'Fullstack template with database should create User model');

  } finally {
    await cleanupTempDir(tempDir);
  }
});

});
