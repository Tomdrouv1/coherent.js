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

import { existsSync } from 'fs';

const DIST_ENTRY = new URL('../dist/index.js', import.meta.url);
// src/ is not published; it is only present in a repository checkout.
const SRC_ENTRY = new URL('../src/index.js', import.meta.url);

async function loadCLI() {
  if (!existsSync(DIST_ENTRY) && existsSync(SRC_ENTRY)) {
    return import(SRC_ENTRY.href);
  }
  return import(DIST_ENTRY.href);
}

let createCLI;
try {
  ({ createCLI } = await loadCLI());
} catch (error) {
  console.error('❌ Failed to load the Coherent.js CLI:');
  console.error(error?.stack || error);
  process.exit(1);
}

// Errors thrown while a command runs are reported as they are; the CLI is
// never loaded (and the command never run) a second time.
try {
  await createCLI();
} catch (error) {
  console.error(error?.stack || error);
  process.exit(1);
}
