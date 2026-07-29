#!/usr/bin/env node
/**
 * Validate a committed .claude/settings.json.
 *
 * The file is tracked on purpose, but it has twice been committed pointing at
 * things no clone can have: hook scripts under .claude/hooks/ (gitignored) and
 * an absolute path to one machine's node binary. Every contributor then got
 * "no such file or directory" on every matching tool call.
 */

import { existsSync, readFileSync } from 'node:fs';
import { join, dirname } from 'node:path';
import { fileURLToPath } from 'node:url';

const root = join(dirname(fileURLToPath(import.meta.url)), '..');
const settingsPath = join(root, '.claude', 'settings.json');

if (!existsSync(settingsPath)) {
  console.log('✅ No .claude/settings.json to validate.');
  process.exit(0);
}

let settings;
try {
  settings = JSON.parse(readFileSync(settingsPath, 'utf-8'));
} catch (error) {
  console.error(`❌ .claude/settings.json is not valid JSON: ${error.message}`);
  process.exit(1);
}

/** Every shell command referenced by the settings file. */
function commands(config) {
  const found = [];

  for (const [event, groups] of Object.entries(config.hooks ?? {})) {
    for (const group of groups ?? []) {
      for (const hook of group.hooks ?? []) {
        if (hook.command) found.push({ where: `hooks.${event}`, command: hook.command });
      }
    }
  }
  if (config.statusLine?.command) {
    found.push({ where: 'statusLine', command: config.statusLine.command });
  }

  return found;
}

// Gitignored, so a committed reference to it is broken for every clone.
const IGNORED_HOOK_DIR = /\.claude\/hooks\//;
// A binary under someone's home directory does not exist on other machines.
const MACHINE_PATH = /(^|["'\s])\/(Users|home)\/[^"'\s]+/;

const problems = [];

for (const { where, command } of commands(settings)) {
  if (IGNORED_HOOK_DIR.test(command)) {
    problems.push(`${where}: references .claude/hooks/, which is gitignored\n    ${command}`);
  }
  const machinePath = command.match(MACHINE_PATH);
  if (machinePath) {
    problems.push(`${where}: absolute path to one machine (${machinePath[0].trim()})\n    ${command}`);
  }
}

if (problems.length) {
  console.error('❌ .claude/settings.json would not work for other contributors:\n');
  for (const problem of problems) console.error(`  - ${problem}\n`);
  console.error('Put machine-specific hooks in ~/.claude/settings.json instead,');
  console.error('or in .claude/settings.local.json, which is gitignored.');
  process.exit(1);
}

console.log('✅ .claude/settings.json references nothing machine-specific.');
