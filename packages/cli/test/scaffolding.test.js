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
    assert(packageJson.dependencies['@coherentjs/core']);
    assert(packageJson.devDependencies['@coherentjs/cli']);
    
    
    
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
    assert(packageJson.dependencies['@coherentjs/express']);

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
    
    assert(testContent.includes("import { test } from 'node:test'"));
    assert(testContent.includes("import { render } from '@coherentjs/core'"));
    assert(testContent.includes("test('renders basic component'"));
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
      skipInstall: true,
      skipGit: true
    });

    const indexPath = join(tempDir, 'src/index.js');
    const indexContent = readFileSync(indexPath, 'utf-8');

    // Check basic structure (built-in HTTP server)
    assert(indexContent.includes("import http from 'http'"));
    assert(indexContent.includes("import { render } from '@coherentjs/core'"));
    assert(indexContent.includes("import { HomePage } from './components/HomePage.js'"));
    assert(indexContent.includes('server.listen'));
    assert(indexContent.includes('PORT'));
    
    
    
  } finally {
    await cleanupTempDir(tempDir);
  }
});

});