#!/usr/bin/env node

import { readFileSync, writeFileSync, readdirSync, statSync } from 'fs';
import { join } from 'path';

const packagesDir = './packages';
const packages = readdirSync(packagesDir).filter(dir => 
  statSync(join(packagesDir, dir)).isDirectory()
);

// Vitest config template
const vitestConfig = `import { defineConfig } from 'vitest/config';

export default defineConfig({
  test: {
    globals: true,
    environment: 'node',
    include: ['test/**/*.{test,spec}.{js,ts}'],
    coverage: {
      provider: 'v8',
      reporter: ['text', 'lcov'],
      reportsDirectory: './coverage'
    }
  }
});`;

console.log('🔄 Updating packages to use Vitest...');

packages.forEach(packageName => {
  const packageDir = join(packagesDir, packageName);
  const packageJsonPath = join(packageDir, 'package.json');
  const vitestConfigPath = join(packageDir, 'vitest.config.js');
  
  try {
    // Read package.json
    const packageJson = JSON.parse(readFileSync(packageJsonPath, 'utf-8'));
    
    // Update scripts
    if (packageJson.scripts) {
      packageJson.scripts.test = 'vitest run';
      packageJson.scripts['test:watch'] = 'vitest';
      packageJson.scripts['test:coverage'] = 'vitest run --coverage';
      
      // Remove old node:test scripts
      delete packageJson.scripts['test:coverage-old'];
    }
    
    // Write updated package.json
    writeFileSync(packageJsonPath, `${JSON.stringify(packageJson, null, 2)}\n`);
    
    // Write vitest config
    writeFileSync(vitestConfigPath, vitestConfig);
    
    console.log(`✅ Updated ${packageName}`);
  } catch (error) {
    console.error(`❌ Failed to update ${packageName}:`, error.message);
  }
});

console.log('🎉 All packages updated to use Vitest!');