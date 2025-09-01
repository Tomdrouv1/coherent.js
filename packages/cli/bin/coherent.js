#!/usr/bin/env node

/**
 * Coherent.js CLI - Command-line interface for Coherent.js projects
 * 
 * Usage:
 *   coherent create <project-name>  - Create a new Coherent.js project
 *   coherent generate <type> <name> - Generate components, pages, APIs
 *   coherent build                  - Build the project
 *   coherent dev                    - Start development server
 *   coherent --help                 - Show help
 */

import { fileURLToPath } from 'url';
import { dirname, join } from 'path';
import { readFileSync } from 'fs';

const __filename = fileURLToPath(import.meta.url);
const __dirname = dirname(__filename);

// Import the main CLI module
try {
  const { createCLI } = await import('../dist/index.js');
  await createCLI();
} catch (_error) {
  // Fallback to source if dist doesn't exist (development)
  try {
    const { createCLI } = await import('../src/index.js');
    await createCLI();
  } catch (fallbackError) {
    console._error('❌ Failed to load Coherent.js CLI:');
    console._error('   ', fallbackError.message);
    console._error('\n💡 Try running: npm install');
    process.exit(1);
  }
}