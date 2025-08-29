/**
 * Generator Tests
 */

import { describe, test, assert } from 'vitest';
import { mkdtemp, rm } from 'fs/promises';
import { existsSync, readFileSync } from 'fs';
import { join } from 'path';
import { tmpdir } from 'os';
import { generateComponent } from '../src/generators/component-generator.js';
import { generatePage } from '../src/generators/page-generator.js';
import { generateAPI } from '../src/generators/api-generator.js';

describe('Running generator tests...', () => {
// Test utilities
async function createTempDir() {
  return await mkdtemp(join(tmpdir(), 'coherent-cli-test-'));
}

async function cleanupTempDir(dir) {
  if (existsSync(dir)) {
    await rm(dir, { recursive: true, force: true });
  }
}

test('generateComponent should create basic component files', async () => {
  const tempDir = await createTempDir();
  const originalCwd = process.cwd();
  
  try {
    process.chdir(tempDir);
    
    const result = await generateComponent('TestButton', {
      path: 'src/components',
      template: 'basic'
    });
    
    // Check that files were created
    assert(result.files.length >= 1);
    assert(result.nextSteps.length > 0);
    
    // Check component file exists
    const componentPath = join(tempDir, 'src/components/TestButton.js');
    assert(existsSync(componentPath));
    
    // Check component content
    const componentContent = readFileSync(componentPath, 'utf-8');
    assert(componentContent.includes('TestButton'));
    assert(componentContent.includes('createComponent'));
    assert(componentContent.includes('export const TestButton'));
    
    // Check test file exists by default
    const testPath = join(tempDir, 'src/components/TestButton.test.js');
    assert(existsSync(testPath));
    
    // Check test content
    const testContent = readFileSync(testPath, 'utf-8');
    assert(testContent.includes('TestButton'));
    assert(testContent.includes('renderToString'));
    
    
    
  } finally {
    process.chdir(originalCwd);
    await cleanupTempDir(tempDir);
  }
});

test('generateComponent should create interactive component', async () => {
  const tempDir = await createTempDir();
  const originalCwd = process.cwd();
  
  try {
    process.chdir(tempDir);
    
    await generateComponent('InteractiveButton', {
      path: 'src/components',
      template: 'interactive'
    });
    
    const componentPath = join(tempDir, 'src/components/InteractiveButton.js');
    assert(existsSync(componentPath));
    
    const componentContent = readFileSync(componentPath, 'utf-8');
    assert(componentContent.includes('InteractiveButton'));
    assert(componentContent.includes('state'));
    assert(componentContent.includes('handleChange'));
    assert(componentContent.includes('data-component'));
    
    
    
  } finally {
    process.chdir(originalCwd);
    await cleanupTempDir(tempDir);
  }
});

test('generateComponent should skip test file when requested', async () => {
  const tempDir = await createTempDir();
  const originalCwd = process.cwd();
  
  try {
    process.chdir(tempDir);
    
    await generateComponent('NoTestButton', {
      path: 'src/components',
      skipTest: true
    });
    
    const componentPath = join(tempDir, 'src/components/NoTestButton.js');
    const testPath = join(tempDir, 'src/components/NoTestButton.test.js');
    
    assert(existsSync(componentPath));
    assert(!existsSync(testPath)); // Should not exist
    
    
    
  } finally {
    process.chdir(originalCwd);
    await cleanupTempDir(tempDir);
  }
});

test('generatePage should create basic page files', async () => {
  const tempDir = await createTempDir();
  const originalCwd = process.cwd();
  
  try {
    process.chdir(tempDir);
    
    const result = await generatePage('HomePage', {
      path: 'src/pages',
      template: 'basic'
    });
    
    assert(result.files.length >= 1);
    assert(result.nextSteps.length > 0);
    
    const pagePath = join(tempDir, 'src/pages/HomePage.js');
    assert(existsSync(pagePath));
    
    const pageContent = readFileSync(pagePath, 'utf-8');
    assert(pageContent.includes('HomePage'));
    assert(pageContent.includes('html:'));
    assert(pageContent.includes('head:'));
    assert(pageContent.includes('body:'));
    assert(pageContent.includes('createComponent'));
    
    // Check test file
    const testPath = join(tempDir, 'src/pages/HomePage.test.js');
    assert(existsSync(testPath));
    
    
    
  } finally {
    process.chdir(originalCwd);
    await cleanupTempDir(tempDir);
  }
});

test('generatePage should create dashboard page', async () => {
  const tempDir = await createTempDir();
  const originalCwd = process.cwd();
  
  try {
    process.chdir(tempDir);
    
    await generatePage('AdminDashboard', {
      path: 'src/pages',
      template: 'dashboard'
    });
    
    const pagePath = join(tempDir, 'src/pages/AdminDashboard.js');
    assert(existsSync(pagePath));
    
    const pageContent = readFileSync(pagePath, 'utf-8');
    assert(pageContent.includes('AdminDashboard'));
    assert(pageContent.includes('stats-grid'));
    assert(pageContent.includes('Total Users'));
    assert(pageContent.includes('defaultStats'));
    
    
    
  } finally {
    process.chdir(originalCwd);
    await cleanupTempDir(tempDir);
  }
});

test('generatePage should create form page', async () => {
  const tempDir = await createTempDir();
  const originalCwd = process.cwd();
  
  try {
    process.chdir(tempDir);
    
    await generatePage('ContactForm', {
      path: 'src/pages',
      template: 'form'
    });
    
    const pagePath = join(tempDir, 'src/pages/ContactForm.js');
    assert(existsSync(pagePath));
    
    const pageContent = readFileSync(pagePath, 'utf-8');
    assert(pageContent.includes('ContactForm'));
    assert(pageContent.includes('form'));
    assert(pageContent.includes('onsubmit'));
    assert(pageContent.includes('handleSubmit'));
    assert(pageContent.includes('errors'));
    
    
    
  } finally {
    process.chdir(originalCwd);
    await cleanupTempDir(tempDir);
  }
});

test('generateAPI should create REST API files', async () => {
  const tempDir = await createTempDir();
  const originalCwd = process.cwd();
  
  try {
    process.chdir(tempDir);
    
    const result = await generateAPI('users', {
      path: 'src/api',
      template: 'rest'
    });
    
    assert(result.files.length >= 1);
    assert(result.nextSteps.length > 0);
    
    const apiPath = join(tempDir, 'src/api/users.js');
    assert(existsSync(apiPath));
    
    const apiContent = readFileSync(apiPath, 'utf-8');
    assert(apiContent.includes('createApiRouter'));
    assert(apiContent.includes('withValidation'));
    assert(apiContent.includes("usersAPI.get('/'"));
    assert(apiContent.includes("usersAPI.post('/'"));
    assert(apiContent.includes("usersAPI.put('/:id'"));
    assert(apiContent.includes("usersAPI.delete('/:id'"));
    
    // Check test file
    const testPath = join(tempDir, 'src/api/users.test.js');
    assert(existsSync(testPath));
    
    
    
  } finally {
    process.chdir(originalCwd);
    await cleanupTempDir(tempDir);
  }
});

test('generateAPI should create RPC API files', async () => {
  const tempDir = await createTempDir();
  const originalCwd = process.cwd();
  
  try {
    process.chdir(tempDir);
    
    await generateAPI('tasks', {
      path: 'src/api',
      template: 'rpc'
    });
    
    const apiPath = join(tempDir, 'src/api/tasks.js');
    assert(existsSync(apiPath));
    
    const apiContent = readFileSync(apiPath, 'utf-8');
    assert(apiContent.includes('RPC'));
    assert(apiContent.includes('jsonrpc'));
    assert(apiContent.includes('/list'));
    assert(apiContent.includes('/get'));
    assert(apiContent.includes('/create'));
    assert(apiContent.includes('/update'));
    assert(apiContent.includes('/delete'));
    
    
    
  } finally {
    process.chdir(originalCwd);
    await cleanupTempDir(tempDir);
  }
});

test('generators should handle custom paths', async () => {
  const tempDir = await createTempDir();
  const originalCwd = process.cwd();
  
  try {
    process.chdir(tempDir);
    
    // Test custom path for component
    await generateComponent('CustomComponent', {
      path: 'lib/ui/components'
    });
    
    const componentPath = join(tempDir, 'lib/ui/components/CustomComponent.js');
    assert(existsSync(componentPath));
    
    // Test custom path for API
    await generateAPI('custom-api', {
      path: 'server/routes'
    });
    
    const apiPath = join(tempDir, 'server/routes/custom-api.js');
    assert(existsSync(apiPath));
    
    
    
  } finally {
    process.chdir(originalCwd);
    await cleanupTempDir(tempDir);
  }
});

test('generators should validate names correctly', async () => {
  const tempDir = await createTempDir();
  const originalCwd = process.cwd();
  
  try {
    process.chdir(tempDir);
    
    // This should work fine
    const result = await generateComponent('ValidComponent');
    assert(result.files.length > 0);
    
    
    
  } finally {
    process.chdir(originalCwd);
    await cleanupTempDir(tempDir);
  }
});

});