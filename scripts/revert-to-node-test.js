#!/usr/bin/env node

import { readFileSync, writeFileSync, readdirSync, statSync } from 'fs';
import { join } from 'path';

const packagesDir = './packages';
const packages = readdirSync(packagesDir).filter(dir => 
  statSync(join(packagesDir, dir)).isDirectory()
);

console.log('🔄 Reverting packages to use Node.js test runner...');

packages.forEach(packageName => {
  const packageDir = join(packagesDir, packageName);
  const packageJsonPath = join(packageDir, 'package.json');
  
  try {
    // Read package.json
    const packageJson = JSON.parse(readFileSync(packageJsonPath, 'utf-8'));
    
    // Update scripts to use Node.js test runner by default, keep Vitest as option
    if (packageJson.scripts) {
      packageJson.scripts.test = 'node --test test/*.test.js';
      packageJson.scripts['test:vitest'] = 'vitest run';
      packageJson.scripts['test:watch'] = 'vitest';
      packageJson.scripts['test:coverage'] = 'mkdir -p coverage && node --test --experimental-test-coverage --test-reporter=lcov --test-reporter-destination=coverage/lcov.info test/*.test.js';
    }
    
    // Write updated package.json
    writeFileSync(packageJsonPath, `${JSON.stringify(packageJson, null, 2)}\n`);
    
    console.log(`✅ Reverted ${packageName}`);
  } catch (error) {
    console.error(`❌ Failed to revert ${packageName}:`, error.message);
  }
});

console.log('🎉 All packages reverted to Node.js test runner!');