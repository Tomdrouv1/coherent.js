#!/usr/bin/env node

import { readFileSync, writeFileSync, readdirSync, statSync } from 'fs';
import { join } from 'path';

const packagesDir = './packages';
const packages = readdirSync(packagesDir).filter(dir => 
  statSync(join(packagesDir, dir)).isDirectory()
);

console.log('🔄 Updating packages to use Vitest by default...');

packages.forEach(packageName => {
  const packageDir = join(packagesDir, packageName);
  const packageJsonPath = join(packageDir, 'package.json');
  
  try {
    const packageJson = JSON.parse(readFileSync(packageJsonPath, 'utf-8'));
    
    if (packageJson.scripts) {
      // Use Vitest by default, keep Node.js test as fallback
      packageJson.scripts.test = 'vitest run';
      packageJson.scripts['test:node'] = 'node --test test/*.test.js';
      packageJson.scripts['test:watch'] = 'vitest';
      packageJson.scripts['test:coverage'] = 'vitest run --coverage';
    }
    
    writeFileSync(packageJsonPath, `${JSON.stringify(packageJson, null, 2)}\n`);
    console.log(`✅ Updated ${packageName}`);
  } catch (error) {
    console.error(`❌ Failed to update ${packageName}:`, error.message);
  }
});

// Also update root package.json
const rootPackageJsonPath = './package.json';
try {
  const rootPackageJson = JSON.parse(readFileSync(rootPackageJsonPath, 'utf-8'));
  
  if (rootPackageJson.scripts) {
    rootPackageJson.scripts.test = 'vitest run';
    rootPackageJson.scripts['test:node'] = 'pnpm -r run test:node';  
    rootPackageJson.scripts['test:packages'] = 'pnpm -r run test';
    rootPackageJson.scripts['test:watch'] = 'vitest';
    rootPackageJson.scripts['test:coverage'] = 'vitest run --coverage';
  }
  
  writeFileSync(rootPackageJsonPath, `${JSON.stringify(rootPackageJson, null, 2)}\n`);
  console.log('✅ Updated root package.json');
} catch (error) {
  console.error('❌ Failed to update root package.json:', error.message);
}

console.log('🎉 All packages updated to use Vitest by default!');