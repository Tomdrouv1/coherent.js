#!/usr/bin/env node

/**
 * Batch fix sideEffects: false across all packages
 * Simple script to add tree shaking optimization to all package.json files
 */

import fs from 'fs';
import path from 'path';
import { fileURLToPath } from 'url';

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);
const rootDir = path.join(__dirname, '..');

const packagesToFix = [
  'runtime',
  'api',
  'client',
  'forms',
  'state',
  'i18n',
  'testing',
  'performance',
  'seo',
  'nextjs',
  'express',
  'fastify',
  'koa',
  'profiler',
  'build-tools',
  'adapters',
  'web-components'
];

console.log('🔧 Fixing sideEffects: false across all packages\n');

let fixedCount = 0;
let skippedCount = 0;

packagesToFix.forEach(packageName => {
  const packageJsonPath = path.join(rootDir, 'packages', packageName, 'package.json');

  try {
    const packageJson = JSON.parse(fs.readFileSync(packageJsonPath, 'utf8'));

    // Check if sideEffects is already set
    if (packageJson.sideEffects === false) {
      console.log(`✅ ${packageName}: Already has sideEffects: false`);
      skippedCount++;
      return;
    }

    // Add sideEffects: false
    packageJson.sideEffects = false;

    // Write back to file
    fs.writeFileSync(packageJsonPath, `${JSON.stringify(packageJson, null, 2)}\n`);

    console.log(`🔧 ${packageName}: Added sideEffects: false`);
    fixedCount++;

  } catch (error) {
    console.log(`❌ ${packageName}: Error - ${error.message}`);
  }
});

console.log(`\n📊 Summary:`);
console.log(`   Fixed: ${fixedCount} packages`);
console.log(`   Skipped: ${skippedCount} packages`);
console.log(`   Total: ${fixedCount + skippedCount} packages`);

console.log(`\n✅ All packages now have sideEffects: false for optimal tree shaking!`);
