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

function fail(message) {
  console.error(`❌ ${message}`);
  process.exit(1);
}

function readSettings(path) {
  let parsed;
  try {
    parsed = JSON.parse(readFileSync(path, 'utf-8'));
  } catch (error) {
    fail(`.claude/settings.json is not valid JSON: ${error.message}`);
  }

  // JSON.parse accepts null, arrays and scalars; traversing those would throw
  // a stack trace instead of reporting the real problem.
  if (parsed === null || typeof parsed !== 'object' || Array.isArray(parsed)) {
    fail('.claude/settings.json must contain a JSON object.');
  }

  return parsed;
}

/** Every shell command referenced by the settings file. */
function commands(config, problems) {
  const found = [];
  const { hooks } = config;

  if (hooks !== undefined) {
    if (!hooks || typeof hooks !== 'object' || Array.isArray(hooks)) {
      problems.push('hooks: expected an object keyed by event name');
    } else {
      for (const [event, groups] of Object.entries(hooks)) {
        if (!Array.isArray(groups)) {
          problems.push(`hooks.${event}: expected an array of hook groups`);
          continue;
        }

        for (const group of groups) {
          if (!group || typeof group !== 'object') {
            problems.push(`hooks.${event}: expected each group to be an object`);
            continue;
          }
          if (group.hooks !== undefined && !Array.isArray(group.hooks)) {
            problems.push(`hooks.${event}: expected group.hooks to be an array`);
            continue;
          }

          for (const hook of group.hooks ?? []) {
            if (hook && typeof hook.command === 'string') {
              found.push({ where: `hooks.${event}`, command: hook.command });
            }
          }
        }
      }
    }
  }

  if (typeof config.statusLine?.command === 'string') {
    found.push({ where: 'statusLine', command: config.statusLine.command });
  }

  return found;
}

// Gitignored, so a committed reference is broken for every clone. Either
// separator, with or without a trailing one.
const IGNORED_HOOK_DIR = /\.claude[\\/]+hooks(?:[\\/]|["'\s]|$)/;
// A binary under someone's home directory does not exist elsewhere.
// Unanchored, so `NODE=/Users/...` is caught too.
const MACHINE_PATH = /\/(?:Users|home)\/[^\s"']+/;

const settings = readSettings(settingsPath);
const problems = [];

for (const { where, command } of commands(settings, problems)) {
  if (IGNORED_HOOK_DIR.test(command)) {
    problems.push(`${where}: references .claude/hooks/, which is gitignored\n    ${command}`);
  }

  const machinePath = command.match(MACHINE_PATH);
  if (machinePath) {
    problems.push(`${where}: absolute path to one machine (${machinePath[0]})\n    ${command}`);
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
