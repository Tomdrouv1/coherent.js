/**
 * Simplified Integration Tests - Essential end-to-end workflows
 */

import { describe, test, assert } from 'vitest';
import { mkdtemp, rm } from 'fs/promises';
import { existsSync, readFileSync } from 'fs';
import { join } from 'path';
import { tmpdir } from 'os';

describe('Running simplified integration tests...', () => {
// Test utilities
async function createTempDir() {
  return await mkdtemp(join(tmpdir(), 'coherent-integration-simple-'));
}

async function cleanupTempDir(dir) {
  if (existsSync(dir)) {
    await rm(dir, { recursive: true, force: true });
  }
}

test('Generated code should be syntactically valid', async () => {
  const tempDir = await createTempDir();
  const projectDir = join(tempDir, 'syntax-test-app');
  
  try {
    const { scaffoldProject } = await import('../src/generators/project-scaffold.js');
    const { generateComponent } = await import('../src/generators/component-generator.js');
    
    await scaffoldProject(projectDir, {
      name: 'syntax-test-app',
      template: 'basic',
      skipInstall: true,
      skipGit: true
    });
    
    const originalCwd = process.cwd();
    process.chdir(projectDir);
    
    try {
      await generateComponent('SyntaxTestComponent', {
        path: 'src/components',
        template: 'interactive'
      });
      
      // Read generated files and check syntax
      const files = [
        join(projectDir, 'src/index.js'),
        join(projectDir, 'src/components/Button.js'),
        join(projectDir, 'src/components/SyntaxTestComponent.js'),
        join(projectDir, 'tests/basic.test.js')
      ];
      
      for (const file of files) {
        const content = readFileSync(file, 'utf-8');
        
        // Basic syntax checks
        assert(!content.includes('${undefined}'), `${file} should not contain undefined template variables`);
        assert(!content.includes('${}'), `${file} should not contain empty template literals`);
        assert(!content.includes('\\\\\\\\'), `${file} should not contain double escapes`);
        
        // Check for balanced brackets
        const openBraces = (content.match(/\\{/g) || []).length;
        const closeBraces = (content.match(/\\}/g) || []).length;
        assert.strictEqual(openBraces, closeBraces, `${file} should have balanced braces`);
        
        // Check for proper exports
        if (file.includes('components') || file.includes('pages') || file.includes('api')) {
          assert(content.includes('export'), `${file} should have export statements`);
        }
      }
      
      
      
    } finally {
      process.chdir(originalCwd);
    }
    
  } finally {
    await cleanupTempDir(tempDir);
  }
});

test('Generated files should pass basic linting', async () => {
  const tempDir = await createTempDir();
  const projectDir = join(tempDir, 'lint-test-app');
  
  try {
    const { scaffoldProject } = await import('../src/generators/project-scaffold.js');
    const { generateComponent } = await import('../src/generators/component-generator.js');
    
    await scaffoldProject(projectDir, {
      name: 'lint-test-app',
      template: 'basic',
      skipInstall: true,
      skipGit: true
    });
    
    const originalCwd = process.cwd();
    process.chdir(projectDir);
    
    try {
      await generateComponent('LintTestComponent', {
        path: 'src/components'
      });
      
      // Read generated component and check for common linting issues
      const componentPath = join(projectDir, 'src/components/LintTestComponent.js');
      const content = readFileSync(componentPath, 'utf-8');
      
      // Check for proper semicolon usage
      const lines = content.split('\\n').filter(line => line.trim());
      const jsLines = lines.filter(line => 
        !line.trim().startsWith('//') && 
        !line.trim().startsWith('*') &&
        !line.trim().startsWith('/*') &&
        (line.includes('=') || line.includes('import') || line.includes('export'))
      );
      
      // Most JS lines should end with semicolon or be part of object/function
      for (const line of jsLines) {
        if (line.includes('import') || line.includes('export')) {
          // Import/export lines should end with semicolon or valid syntax
          const trimmed = line.trim();
          assert(trimmed.endsWith(';') || trimmed.endsWith('{') || trimmed.endsWith('({') || trimmed.includes('=>'), 
            `Line should end properly: ${trimmed}`);
        }
      }
      
      // Check for consistent indentation (should use spaces, not tabs)
      assert(!content.includes('\\t'), 'Generated code should use spaces, not tabs');
      
      
      
    } finally {
      process.chdir(originalCwd);
    }
    
  } finally {
    await cleanupTempDir(tempDir);
  }
});

});