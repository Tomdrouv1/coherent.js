/**
 * CLI Tests
 */

import { test, assert } from 'vitest';
import { validateProjectName, validateComponentName } from '../src/utils/validation.js';

test('validateProjectName should accept valid names', () => {
  assert.strictEqual(validateProjectName('my-app'), true);
  assert.strictEqual(validateProjectName('my_app'), true);
  assert.strictEqual(validateProjectName('myapp123'), true);
  assert.strictEqual(validateProjectName('my-coherent-app'), true);
});

test('validateProjectName should reject invalid names', () => {
  assert.notStrictEqual(validateProjectName(''), true);
  assert.notStrictEqual(validateProjectName('.myapp'), true);
  assert.notStrictEqual(validateProjectName('_myapp'), true);
  assert.notStrictEqual(validateProjectName('my app'), true);
  assert.notStrictEqual(validateProjectName('node_modules'), true);
});

test('validateComponentName should accept valid names', () => {
  assert.strictEqual(validateComponentName('Button'), true);
  assert.strictEqual(validateComponentName('MyComponent'), true);
  assert.strictEqual(validateComponentName('UserProfile'), true);
  assert.strictEqual(validateComponentName('NavBar'), true);
});

test('validateComponentName should reject invalid names', () => {
  assert.notStrictEqual(validateComponentName(''), true);
  assert.notStrictEqual(validateComponentName('button'), true); // Should start with capital
  assert.notStrictEqual(validateComponentName('my-component'), true); // Should be PascalCase
  assert.notStrictEqual(validateComponentName('123Component'), true); // Can't start with number
  assert.notStrictEqual(validateComponentName('My Component'), true); // No spaces
});

test('CLI modules should be importable', async () => {
  try {
    const { createCLI } = await import('../src/index.js');
    assert(typeof createCLI === 'function');
    
    const { createCommand } = await import('../src/commands/create.js');
    assert(typeof createCommand === 'object');
    
    const { generateCommand } = await import('../src/commands/generate.js');
    assert(typeof generateCommand === 'object');
    
    
  } catch (_error) {
    assert.fail(`Failed to import CLI modules: ${_error.message}`);
  }
});