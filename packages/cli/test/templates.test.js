/**
 * Template Generation and Content Tests
 */

import { describe, test, assert } from 'vitest';
import { mkdtemp, rm } from 'fs/promises';
import { existsSync, readFileSync } from 'fs';
import { join } from 'path';
import { tmpdir } from 'os';
import { generateComponent } from '../src/generators/component-generator.js';
import { generatePage } from '../src/generators/page-generator.js';
import { generateAPI } from '../src/generators/api-generator.js';

describe('Running template generation and content tests...', () => {
// Test utilities
async function createTempDir() {
  return await mkdtemp(join(tmpdir(), 'coherent-template-test-'));
}

async function cleanupTempDir(dir) {
  if (existsSync(dir)) {
    await rm(dir, { recursive: true, force: true });
  }
}

// Component Template Tests
test('basic component template should generate correct content', async () => {
  const tempDir = await createTempDir();
  const originalCwd = process.cwd();

  try {
    process.chdir(tempDir);

    await generateComponent('TestCard', {
      path: 'src/components',
      template: 'basic'
    });

    const componentPath = join(tempDir, 'src/components/TestCard.js');
    const content = readFileSync(componentPath, 'utf-8');

    // Check imports
    assert(content.includes("import { createComponent } from '@coherent.js/core'"));

    // Check component structure
    assert(content.includes('export const TestCard = createComponent'));
    assert(content.includes('className = \'\''));
    assert(content.includes('children'));
    assert(content.includes('...props'));

    // Check component implementation
    assert(content.includes('div: {'));
    assert(content.includes('className: `testcard ${className}`'));
    assert(content.includes('children,'));
    assert(content.includes('...props'));

    // Check usage example
    assert(content.includes('// Usage example:'));
    assert(content.includes('TestCard({'));



  } finally {
    process.chdir(originalCwd);
    await cleanupTempDir(tempDir);
  }
});

test('functional component template should generate correct content', async () => {
  const tempDir = await createTempDir();
  const originalCwd = process.cwd();

  try {
    process.chdir(tempDir);

    await generateComponent('ItemList', {
      path: 'src/components',
      template: 'functional'
    });

    const componentPath = join(tempDir, 'src/components/ItemList.js');
    const content = readFileSync(componentPath, 'utf-8');

    // Check functional features
    assert(content.includes('items = []'));
    assert(content.includes('onItemClick'));
    assert(content.includes('processedItems = items.map'));
    assert(content.includes('ul: {'));
    assert(content.includes('children: processedItems.map'));

    // Check business logic
    assert(content.includes('item.id || `item-${index}`'));
    assert(content.includes('item.text || item.name || \'Untitled\''));



  } finally {
    process.chdir(originalCwd);
    await cleanupTempDir(tempDir);
  }
});

test('interactive component template should generate correct content', async () => {
  const tempDir = await createTempDir();
  const originalCwd = process.cwd();

  try {
    process.chdir(tempDir);

    await generateComponent('SearchInput', {
      path: 'src/components',
      template: 'interactive'
    });

    const componentPath = join(tempDir, 'src/components/SearchInput.js');
    const content = readFileSync(componentPath, 'utf-8');

    // Check interactive features
    assert(content.includes('const state = {'));
    assert(content.includes('value: initialValue'));
    assert(content.includes('isActive: false'));
    assert(content.includes('const handleChange'));
    assert(content.includes('const handleToggle'));

    // Check DOM attributes
    assert(content.includes('data-component'));
    assert(content.includes('oninput: (event)'));
    assert(content.includes('onclick: handleToggle'));



  } finally {
    process.chdir(originalCwd);
    await cleanupTempDir(tempDir);
  }
});

test('layout component template should generate correct content', async () => {
  const tempDir = await createTempDir();
  const originalCwd = process.cwd();

  try {
    process.chdir(tempDir);

    await generateComponent('PageLayout', {
      path: 'src/components',
      template: 'layout'
    });

    const componentPath = join(tempDir, 'src/components/PageLayout.js');
    const content = readFileSync(componentPath, 'utf-8');

    // Check layout structure
    assert(content.includes('title = \'Page Title\''));
    assert(content.includes('header = null'));
    assert(content.includes('footer = null'));

    // Check HTML structure
    assert(content.includes('header: {'));
    assert(content.includes('main: {'));
    assert(content.includes('footer: {'));

    // Check conditional rendering
    assert(content.includes('header ? {'));
    assert(content.includes('footer ? {'));
    assert(content.includes('Array.isArray'));



  } finally {
    process.chdir(originalCwd);
    await cleanupTempDir(tempDir);
  }
});

// Page Template Tests
test('basic page template should generate correct content', async () => {
  const tempDir = await createTempDir();
  const originalCwd = process.cwd();

  try {
    process.chdir(tempDir);

    await generatePage('AboutPage', {
      path: 'src/pages',
      template: 'basic'
    });

    const pagePath = join(tempDir, 'src/pages/AboutPage.js');
    const content = readFileSync(pagePath, 'utf-8');

    // Check HTML document structure
    assert(content.includes('html:'));
    assert(content.includes('head:'));
    assert(content.includes('body:'));
    assert(content.includes('title: { text: pageTitle }'));
    assert(content.includes('name: \'viewport\''));

    // Check page content
    assert(content.includes('const pageTitle = \'AboutPage\''));
    assert(content.includes('className: \'page aboutpage-page\''));
    assert(content.includes('Welcome to AboutPage!'));

    // Check route configuration
    assert(content.includes('AboutPage.route = \'/aboutpage\''));
    assert(content.includes('AboutPage.title = \'AboutPage\''));



  } finally {
    process.chdir(originalCwd);
    await cleanupTempDir(tempDir);
  }
});

test('dashboard page template should generate correct content', async () => {
  const tempDir = await createTempDir();
  const originalCwd = process.cwd();

  try {
    process.chdir(tempDir);

    await generatePage('AdminDashboard', {
      path: 'src/pages',
      template: 'dashboard'
    });

    const pagePath = join(tempDir, 'src/pages/AdminDashboard.js');
    const content = readFileSync(pagePath, 'utf-8');

    // Check dashboard features
    assert(content.includes('stats = {}'));
    assert(content.includes('user = null'));
    assert(content.includes('const defaultStats = {'));
    assert(content.includes('totalUsers: 0'));
    assert(content.includes('totalOrders: 0'));
    assert(content.includes('revenue: 0'));

    // Check dashboard UI
    assert(content.includes('stats-grid'));
    assert(content.includes('stat-card'));
    assert(content.includes('Total Users'));
    assert(content.includes('defaultStats.totalUsers.toLocaleString()'));



  } finally {
    process.chdir(originalCwd);
    await cleanupTempDir(tempDir);
  }
});

test('form page template should generate correct content', async () => {
  const tempDir = await createTempDir();
  const originalCwd = process.cwd();

  try {
    process.chdir(tempDir);

    await generatePage('ContactForm', {
      path: 'src/pages',
      template: 'form'
    });

    const pagePath = join(tempDir, 'src/pages/ContactForm.js');
    const content = readFileSync(pagePath, 'utf-8');

    // Check form features
    assert(content.includes('initialData = {}'));
    assert(content.includes('errors = {}'));
    assert(content.includes('const handleSubmit'));

    // Check form structure
    assert(content.includes('form: {'));
    assert(content.includes('onsubmit: (event)'));
    assert(content.includes('event.preventDefault()'));
    assert(content.includes('new FormData(event.target)'));

    // Check form fields
    assert(content.includes('input: {'));
    assert(content.includes('type: \'text\''));
    assert(content.includes('type: \'email\''));
    assert(content.includes('required: true'));



  } finally {
    process.chdir(originalCwd);
    await cleanupTempDir(tempDir);
  }
});

// API Template Tests
test('REST API template should generate correct content', async () => {
  const tempDir = await createTempDir();
  const originalCwd = process.cwd();

  try {
    process.chdir(tempDir);

    await generateAPI('products', {
      path: 'src/api',
      template: 'rest'
    });

    const apiPath = join(tempDir, 'src/api/products.js');
    const content = readFileSync(apiPath, 'utf-8');

    // Check imports and setup: the router @coherent.js/api actually exports
    assert(content.includes("from '@coherent.js/api'"));
    assert(content.includes('createRouter,'));
    assert(!content.includes('createApiRouter'));
    assert(content.includes('const productsAPI = createRouter(productsRoutes)'));

    // Check validation schema
    assert(content.includes('export const productsSchema = {'));
    assert(content.includes('type: \'object\''));
    assert(content.includes('properties: {'));
    assert(content.includes('required: [\'name\']'));
    assert(content.includes('validation: productsSchema'));

    // Check CRUD operations (object routes: path segment, then method)
    assert(content.includes("export const productsRoutes = {\n  'products': {"));
    assert(content.includes("':id': {"));
    for (const method of ['GET:', 'POST:', 'PUT:', 'DELETE:']) {
      assert(content.includes(method), `missing ${method} route`);
    }

    // Check response handling: plain node:http response, errors as ApiError
    assert(content.includes('return {\n        data: '));
    assert(content.includes('throw new NotFoundError('));
    assert(content.includes('sendJson(res, 201,'));
    assert(!content.includes('res.status('));
    assert(!content.includes('res.json('));



  } finally {
    process.chdir(originalCwd);
    await cleanupTempDir(tempDir);
  }
});

test('RPC API template should generate correct content', async () => {
  const tempDir = await createTempDir();
  const originalCwd = process.cwd();

  try {
    process.chdir(tempDir);

    await generateAPI('notifications', {
      path: 'src/api',
      template: 'rpc'
    });

    const apiPath = join(tempDir, 'src/api/notifications.js');
    const content = readFileSync(apiPath, 'utf-8');

    // Check RPC setup: one JSON-RPC endpoint on the real router
    assert(content.includes("import { createRouter, validateAgainstSchema } from '@coherent.js/api'"));
    assert(!content.includes('createApiRouter'));
    assert(content.includes('const notificationsRPC = createRouter(notificationsRoutes)'));
    assert(content.includes("rpc: {\n    'notifications': {"));

    // Check RPC methods
    for (const method of ['list', 'get', 'create', 'update', 'delete']) {
      assert(content.includes(`'notifications.${method}': {`), `missing notifications.${method}`);
    }

    // Check JSON-RPC format
    assert(content.includes('jsonrpc: \'2.0\''));
    assert(content.includes('result: result ?? null'));
    assert(content.includes('INVALID_REQUEST: -32600'));
    assert(content.includes('METHOD_NOT_FOUND: -32601'));
    assert(content.includes('INVALID_PARAMS: -32602'));
    assert(content.includes('INTERNAL_ERROR: -32603'));



  } finally {
    process.chdir(originalCwd);
    await cleanupTempDir(tempDir);
  }
});

// Test File Generation Tests
test('component test templates should be valid', async () => {
  const tempDir = await createTempDir();
  const originalCwd = process.cwd();

  try {
    process.chdir(tempDir);

    await generateComponent('TestableComponent', {
      path: 'src/components',
      skipTest: false
    });

    const testPath = join(tempDir, 'src/components/TestableComponent.test.js');
    const content = readFileSync(testPath, 'utf-8');

    // Check test imports
    assert(content.includes("import { describe, it, expect } from 'vitest'"));
    assert(content.includes("import { render } from '@coherent.js/core'"));
    assert(content.includes("import { TestableComponent } from './TestableComponent.js'"));

    // Check test cases
    assert(content.includes("describe('TestableComponent'"));
    assert(content.includes("it('renders correctly'"));
    assert(content.includes("it('accepts className prop'"));
    assert(content.includes("it('renders children correctly'"));

    // Check test logic
    assert(content.includes('const html = render(component)'));
    assert(content.includes('expect(html).toContain('));



  } finally {
    process.chdir(originalCwd);
    await cleanupTempDir(tempDir);
  }
});

test('story templates should be valid', async () => {
  const tempDir = await createTempDir();
  const originalCwd = process.cwd();

  try {
    process.chdir(tempDir);

    await generateComponent('StoryComponent', {
      path: 'src/components',
      skipStory: false
    });

    const storyPath = join(tempDir, 'src/components/StoryComponent.stories.js');
    const content = readFileSync(storyPath, 'utf-8');

    // Check story structure
    assert(content.includes("import { StoryComponent } from './StoryComponent.js'"));
    assert(content.includes('export default {'));
    assert(content.includes("title: 'Components/StoryComponent'"));
    assert(content.includes('component: StoryComponent'));
    assert(content.includes('argTypes: {'));

    // Check story examples
    assert(content.includes('export const Default = {'));
    assert(content.includes('export const WithCustomClass = {'));
    assert(content.includes('export const WithChildren = {'));



  } finally {
    process.chdir(originalCwd);
    await cleanupTempDir(tempDir);
  }
});

// Template Consistency Tests
test('all templates should use consistent naming conventions', async () => {
  const tempDir = await createTempDir();
  const originalCwd = process.cwd();

  try {
    process.chdir(tempDir);

    // Generate multiple items with different templates
    await generateComponent('ConsistentButton', { template: 'basic' });
    await generateComponent('ConsistentModal', { template: 'interactive' });
    await generatePage('ConsistentHome', { template: 'basic' });
    await generateAPI('consistent-api', { template: 'rest' });

    const files = [
      join(tempDir, 'src/components/ConsistentButton.js'),
      join(tempDir, 'src/components/ConsistentModal.js'),
      join(tempDir, 'src/pages/ConsistentHome.js'),
      join(tempDir, 'src/api/consistent-api.js')
    ];

    for (const file of files) {
      const content = readFileSync(file, 'utf-8');

      // Check consistent import style
      assert(content.includes("import { "), `${file} should use destructured imports`);
      assert(!content.includes('import * as'), `${file} should not use namespace imports`);

      // Check consistent export style
      assert(content.includes('export const ') || content.includes('export default'),
        `${file} should use export const or export default`);

      // Check consistent commenting
      assert(content.includes('/**'), `${file} should have JSDoc comments`);
      assert(content.includes(' * '), `${file} should have proper JSDoc format`);
    }



  } finally {
    process.chdir(originalCwd);
    await cleanupTempDir(tempDir);
  }
});

test('templates should generate valid JavaScript', async () => {
  const tempDir = await createTempDir();
  const originalCwd = process.cwd();

  try {
    process.chdir(tempDir);

    const testCases = [
      { type: 'component', name: 'ValidJSComponent', template: 'interactive' },
      { type: 'page', name: 'ValidJSPage', template: 'form' },
      { type: 'api', name: 'valid-js-api', template: 'rpc' }
    ];

    for (const { type, name, template } of testCases) {
      if (type === 'component') {
        await generateComponent(name, { template });
      } else if (type === 'page') {
        await generatePage(name, { template });
      } else if (type === 'api') {
        await generateAPI(name, { template });
      }
    }

    // Read all generated files and check for JavaScript validity
    const allFiles = [
      join(tempDir, 'src/components/ValidJSComponent.js'),
      join(tempDir, 'src/pages/ValidJSPage.js'),
      join(tempDir, 'src/api/valid-js-api.js')
    ];

    for (const file of allFiles) {
      const content = readFileSync(file, 'utf-8');

      // Basic JavaScript syntax checks
      assert(!content.includes('${undefined}'), `${file} should not have undefined template variables`);
      assert(!content.includes('${}'), `${file} should not have empty template variables`);

      // Check for proper string escaping
      assert(!content.includes("\\'"), `${file} should use proper string escaping`);
      assert(!content.includes('""'), `${file} should not have empty strings where not intended`);

      // Check for proper object syntax
      const braceCount = (content.match(/{/g) || []).length - (content.match(/}/g) || []).length;
      assert.strictEqual(braceCount, 0, `${file} should have balanced braces`);

      // Check for proper array syntax
      const bracketCount = (content.match(/\[/g) || []).length - (content.match(/\]/g) || []).length;
      assert.strictEqual(bracketCount, 0, `${file} should have balanced brackets`);
    }



  } finally {
    process.chdir(originalCwd);
    await cleanupTempDir(tempDir);
  }
});

});
