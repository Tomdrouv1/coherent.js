#!/usr/bin/env node

import { readFileSync, writeFileSync, readdirSync, statSync } from 'fs';
import { join, dirname } from 'path';
import { fileURLToPath } from 'url';

const __filename = fileURLToPath(import.meta.url);
const __dirname = dirname(__filename);

function convertTestFile(filePath) {
  const content = readFileSync(filePath, 'utf-8');
  
  // Skip if already converted
  if (content.includes('from \'vitest\'') || content.includes('from "vitest"')) {
    console.log(`⏭️ Already converted: ${filePath}`);
    return false;
  }

  console.log(`🔄 Converting: ${filePath}`);

  let converted = content;

  // Replace imports
  if (content.includes('import { test } from \'node:test\';')) {
    converted = converted.replace(
      'import { test } from \'node:test\';',
      'import { describe, it, test, expect, vi } from \'vitest\';'
    );
  } else if (content.includes('from \'node:test\'')) {
    converted = converted.replace(
      /import { test.*} from 'node:test';/g,
      'import { describe, it, test, expect, vi } from \'vitest\';'
    );
  } else {
    // Add vitest import at the top after existing imports
    const lines = converted.split('\n');
    let insertIndex = 0;
    for (let i = 0; i < lines.length; i++) {
      if (lines[i].startsWith('import ') || lines[i].startsWith('/**') || lines[i].startsWith(' *') || lines[i].startsWith(' */')) {
        insertIndex = i + 1;
      } else if (lines[i].trim() === '') {
        continue;
      } else {
        break;
      }
    }
    lines.splice(insertIndex, 0, 'import { describe, it, test, expect, vi } from \'vitest\';', '');
    converted = lines.join('\n');
  }

  // Replace assert import
  converted = converted.replace(/import assert from 'node:assert';?\n?/g, '');

  // Convert console.log test descriptions to describe blocks
  const describeMatches = converted.match(/console\.log\(['"`]🧪 (.+?)['"`]\);?/g);
  if (describeMatches) {
    const testTitle = describeMatches[0].match(/console\.log\(['"`]🧪 (.+?)['"`]\);?/)[1];
    
    // Wrap the main test content in a describe block
    converted = converted.replace(/console\.log\(['"`]🧪 .+?['"`]\);?\n?/g, '');
    
    // Find where to start the describe block
    const lines = converted.split('\n');
    let startIndex = -1;
    for (let i = 0; i < lines.length; i++) {
      if (lines[i].includes('import ') || lines[i].startsWith('/**') || lines[i].startsWith(' *') || lines[i].trim() === '') {
        continue;
      } else {
        startIndex = i;
        break;
      }
    }
    
    if (startIndex !== -1) {
      lines.splice(startIndex, 0, '', `describe('${testTitle}', () => {`);
      lines.push('});');
      converted = lines.join('\n');
    }
  }

  // Convert console.assert statements to expect statements
  converted = converted.replace(
    /console\.assert\((.+?),\s*['"`](.+?)['"`]\);?/g,
    'expect($1).toBeTruthy(); // $2'
  );

  // Convert more specific console.assert patterns
  converted = converted.replace(
    /console\.assert\(typeof (.+?) === ['"`](.+?)['"`], ['"`](.+?)['"`]\);?/g,
    'expect(typeof $1).toBe(\'$2\'); // $3'
  );

  converted = converted.replace(
    /console\.assert\((.+?) === (.+?), ['"`](.+?)['"`]\);?/g,
    'expect($1).toBe($2); // $3'
  );

  converted = converted.replace(
    /console\.assert\((.+?) !== (.+?), ['"`](.+?)['"`]\);?/g,
    'expect($1).not.toBe($2); // $3'
  );

  converted = converted.replace(
    /console\.assert\((.+?)\.length === (.+?), ['"`](.+?)['"`]\);?/g,
    'expect($1.length).toBe($2); // $3'
  );

  // Convert test success logs to it blocks
  converted = converted.replace(
    /console\.log\(['"`]✅ (.+?)['"`]\);?/g,
    ''
  );

  // Wrap loose test code in it blocks
  const itBlockRegex = /(?:\/\/ Test .+|.*test.+)/g;
  
  // Clean up console.log statements that are just status messages
  converted = converted.replace(/console\.log\(['"`][✅🧪🎉].+?['"`]\);?\n?/g, '');

  // Basic cleanup
  converted = converted.replace(/\n\n\n+/g, '\n\n');
  converted = converted.replace(/^\n+/, '');

  // Write the converted file
  writeFileSync(filePath, converted);
  return true;
}

function convertAllTests() {
  const packagesDir = './packages';
  const packages = readdirSync(packagesDir).filter(dir => 
    statSync(join(packagesDir, dir)).isDirectory()
  );

  let totalConverted = 0;

  packages.forEach(packageName => {
    const testDir = join(packagesDir, packageName, 'test');
    
    if (!statSync(testDir).isDirectory()) {
      return;
    }

    const testFiles = readdirSync(testDir, { recursive: true })
      .filter(file => file.endsWith('.test.js'))
      .map(file => join(testDir, file));

    testFiles.forEach(testFile => {
      try {
        if (convertTestFile(testFile)) {
          totalConverted++;
        }
      } catch (error) {
        console.error(`❌ Failed to convert ${testFile}:`, error.message);
      }
    });
  });

  console.log(`\n🎉 Conversion complete! Converted ${totalConverted} test files.`);
}

// Run if called directly
if (import.meta.url === `file://${process.argv[1]}`) {
  convertAllTests();
}

export { convertTestFile, convertAllTests };