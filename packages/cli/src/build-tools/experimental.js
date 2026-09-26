/**
 * Shared notice for the bundler integrations, which do not transform
 * anything yet.
 */

const warned = new Set();

/**
 * Warn once per process that `integration` is an experimental pass-through.
 * Pass `{ silent: true }` in the integration's options to suppress it.
 *
 * @param {string} integration - e.g. 'createVitePlugin'
 * @param {{ silent?: boolean }} [options]
 */
export function warnExperimental(integration, options = {}) {
  if (options?.silent || warned.has(integration)) return;
  warned.add(integration);
  console.warn(
    `[@coherent.js/cli] ${integration}() is experimental and currently a pass-through: ` +
    'it does not transform Coherent.js components. Pass { silent: true } to hide this notice.'
  );
}
