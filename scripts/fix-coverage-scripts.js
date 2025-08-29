#!/usr/bin/env node
/**
 * Script to fix test:coverage scripts in all packages
 */

import { readFileSync, writeFileSync, readdirSync, statSync } from 'fs';
import { join } from 'path';

// Find all package.json files in packages subdirectories
const packagesDir = 'packages';
const packageDirs = readdirSync(packagesDir).filter(dir => {
  const dirPath = join(packagesDir, dir);
  return statSync(dirPath).isDirectory();
});

const packageJsonPaths = packageDirs.map(dir => join(packagesDir, dir, 'package.json'));

for (const packageJsonPath of packageJsonPaths) {
  try {
    const content = readFileSync(packageJsonPath, 'utf-8');
    const packageJson = JSON.parse(content);
    
    if (packageJson.scripts && packageJson.scripts['test:coverage']) {
      console.log(`Fixing test:coverage in ${packageJsonPath}`);
      
      packageJson.scripts['test:coverage'] = 
        'mkdir -p coverage && node --test --experimental-test-coverage --test-reporter=lcov --test-reporter-destination=coverage/lcov.info test/*.test.js';
      
      writeFileSync(packageJsonPath, `${JSON.stringify(packageJson, null, 2)}\n`);
    } else {
      console.log(`No test:coverage script in ${packageJsonPath}`);
    }
  } catch (error) {
    console.error(`Error processing ${packageJsonPath}:`, error.message);
  }
}

console.log('Done fixing coverage scripts in packages');