/**
 * Validation and Error Handling Tests
 */

import { describe, it, expect } from 'vitest';
import { mkdtemp, rm, mkdir } from 'fs/promises';
import { existsSync } from 'fs';
import { join } from 'path';
import { tmpdir } from 'os';
import { 
  validateProjectName, 
  validateComponentName, 
  validatePath, 
  validateTemplate 
} from '../src/utils/validation.js';

// Test utilities
async function createTempDir() {
  return await mkdtemp(join(tmpdir(), 'coherent-validation-test-'));
}

async function cleanupTempDir(dir) {
  if (existsSync(dir)) {
    await rm(dir, { recursive: true, force: true });
  }
}

describe('Validation and Error Handling', () => {
  it('should accept valid project names', () => {
    const validNames = [
      'my-app',
      'my_app',
      'MyApp',
      'coherent-js-app',
      '@scope/package-name',
      'react-component',
      'my@app'
    ];
    
    for (const name of validNames) {
      const result = validateProjectName(name);
      expect(result).toBe(true);
    }
  });

  it('should reject invalid project names', () => {
    const invalidCases = [
      { name: '', expectedError: 'Project name is required' },
      { name: '.', expectedError: 'Project name cannot start with a dot' },
      { name: '..', expectedError: 'Project name cannot be ".." or "."' },
      { name: 'My App', expectedError: 'Project name can only contain letters, numbers, hyphens, underscores, dots, and slashes' },
      { name: 'my app', expectedError: 'Project name can only contain letters, numbers, hyphens, underscores, dots, and slashes' },
      { name: 'node_modules', expectedError: 'Project name "node_modules" is reserved' },
      { name: 'package.json', expectedError: 'Project name "package.json" is reserved' },
      { name: 'con', expectedError: 'Project name "con" is reserved' }
    ];
    
    for (const { name } of invalidCases) {
      const result = validateProjectName(name);
      expect(result).not.toBe(true);
      expect(typeof result).toBe('string');
    }
  });

  it('should detect existing directories', async () => {
    const tempDir = await createTempDir();
    const originalCwd = process.cwd();
    
    try {
      process.chdir(tempDir);
      
      // Create a directory
      const existingDir = 'existing-app';
      await mkdir(existingDir);
      
      const result = validateProjectName(existingDir);
      expect(result).not.toBe(true);
      expect(result).toContain('already exists');
    } finally {
      process.chdir(originalCwd);
      await cleanupTempDir(tempDir);
    }
  });

  it('should accept valid component names', () => {
    const validNames = [
      'Button',
      'MyComponent',
      'NavBar',
      'API_Component',
      'Component123',
      'VeryLongComponentNameThatIsStillValid'
    ];
    
    for (const name of validNames) {
      const result = validateComponentName(name);
      expect(result).toBe(true);
    }
  });

  it('should reject invalid component names', () => {
    const invalidCases = [
      { name: '', expectedError: 'Name is required' },
      { name: 'button', expectedError: 'Name should start with a capital letter' },
      { name: 'my_component', expectedError: 'Name should start with a capital letter' },
      { name: 'my-component', expectedError: 'Name should start with a capital letter' },
      { name: '123Component', expectedError: 'Name must start with a letter' },
      { name: 'My Component', expectedError: 'Name must start with a letter and contain only letters, numbers, hyphens, and underscores' },
      { name: 'My@Component', expectedError: 'Name must start with a letter and contain only letters, numbers, hyphens, and underscores' }
    ];
    
    for (const { name } of invalidCases) {
      const result = validateComponentName(name);
      expect(result).not.toBe(true);
      expect(typeof result).toBe('string');
    }
  });

  it('should accept valid paths', () => {
    const validPaths = [
      'src',
      'src/components',
      'components',
      'src/pages/admin',
      'api/v1/routes',
      ''  // Empty path should be valid (optional)
    ];
    
    for (const path of validPaths) {
      const result = validatePath(path);
      expect(result).toBe(true);
    }
  });

  it('should reject invalid paths', () => {
    const invalidPaths = [
      '/src/components',  // Absolute path
      'src\\components',  // Windows-style path
      'src/comp@nents',   // Invalid characters
      'src/comp onents'   // Spaces
    ];
    
    for (const path of invalidPaths) {
      const result = validatePath(path);
      expect(result).not.toBe(true);
      expect(typeof result).toBe('string');
    }
  });

  it('should accept valid templates', () => {
    const validTemplates = [
      'basic',
      'fullstack',
      'express',
      'fastify',
      'components',
      'nextjs'
    ];
    
    for (const template of validTemplates) {
      const result = validateTemplate(template);
      expect(result).toBe(true);
    }
  });

  it('should reject invalid templates', () => {
    const invalidTemplates = [
      'invalid',
      'react',
      'vue',
      'angular',
      'unknown-template'
    ];
    
    for (const template of invalidTemplates) {
      const result = validateTemplate(template);
      expect(result).not.toBe(true);
      expect(typeof result).toBe('string');
      expect(result).toContain('Invalid template');
    }
  });

  it('should handle edge cases gracefully', () => {
    // Null and undefined inputs
    expect(validateProjectName(null)).not.toBe(true);
    expect(validateProjectName(undefined)).not.toBe(true);
    expect(validateComponentName(null)).not.toBe(true);
    expect(validateComponentName(undefined)).not.toBe(true);
  });

  it('should be consistent across multiple calls', () => {
    const testName = 'TestComponent';
    
    // Should return the same result multiple times
    for (let i = 0; i < 10; i++) {
      expect(validateComponentName(testName)).toBe(true);
    }
    
    const invalidName = 'invalid-name';
    for (let i = 0; i < 10; i++) {
      expect(validateComponentName(invalidName)).not.toBe(true);
    }
  });

  it('should reject all reserved words', () => {
    // Test actual reserved words
    const reservedWords = [
      'node_modules', 'package.json', 'package-lock.json', 'yarn.lock', 'pnpm-lock.yaml',
      'con', 'prn', 'aux', 'nul'
    ];
    
    for (const word of reservedWords) {
      const result = validateProjectName(word);
      expect(result).not.toBe(true);
      expect(result).toContain('reserved');
    }
    
    // Case insensitive check
    const result = validateProjectName('NODE_MODULES');
    expect(result).not.toBe(true);
    expect(result).toContain('reserved');
  });
});