/**
 * Interactive terminal helpers
 *
 * `prompts` never resolves when stdin is not a TTY, so a missing argument in a
 * CI job or a piped shell used to hang until Node bailed out with "Detected
 * unsettled top-level await" (exit 13) instead of printing a usable error.
 * These helpers detect that up front and fail fast with actionable output.
 */

import picocolors from 'picocolors';
import { env, stdin } from 'node:process';

/**
 * Whether the process can show interactive prompts.
 *
 * @returns {boolean} True when stdin is an interactive terminal
 */
export function isInteractive() {
  // Explicit override wins, so callers and tests can force either mode.
  if (env.COHERENT_NON_INTERACTIVE === '1') return false;
  if (env.COHERENT_INTERACTIVE === '1') return true;

  // Common CI systems attach a pipe rather than a TTY.
  if (env.CI) return false;

  return Boolean(stdin.isTTY);
}

/**
 * Abort with guidance when a value can only come from a prompt.
 *
 * @param {string} what - The value that would have been prompted for
 * @param {string} usage - How to supply it non-interactively
 * @returns {void}
 */
export function requireInteractive(what, usage) {
  if (isInteractive()) return;

  console.error(picocolors.red(`❌ Cannot prompt for ${what}: no interactive terminal.`));
  console.error(picocolors.gray(`   Provide it directly: ${usage}`));
  process.exit(1);
}
