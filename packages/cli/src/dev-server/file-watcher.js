/**
 * File Watcher for the dev server.
 *
 * Wraps chokidar with a small projection that maps absolute file paths
 * to HMR-protocol payloads (filePath + webPath + updateType) and a per-
 * file debounce so rapid editor saves coalesce into one HMR message.
 *
 * @module @coherent.js/cli/dev-server/file-watcher
 */

import chokidar from 'chokidar';
import { relative, sep } from 'node:path';

/**
 * @typedef {Object} FileChangeEvent
 * @property {string} filePath - Absolute filesystem path of the changed file.
 * @property {string} webPath - URL-relative path (POSIX separators, leading slash).
 * @property {'component'|'style'|'asset'} updateType - Coarse classification used by the HMR client to pick a strategy.
 */

/**
 * @typedef {Object} FileWatcherOptions
 * @property {string} root - Absolute path to the project root being watched.
 * @property {(change: FileChangeEvent) => void} onChange - Called per debounced change.
 * @property {(err: Error) => void} [onError] - Called on chokidar errors.
 * @property {number} [debounceMs=50] - Coalesce rapid writes to the same file within this window.
 * @property {Array<string|RegExp>} [ignored] - Additional ignore patterns (merged with defaults).
 */

/**
 * @typedef {Object} FileWatcher
 * @property {() => Promise<void>} close - Stop watching and release resources.
 */

const DEFAULT_IGNORES = [
  /(^|[/\\])\../,             // dotfiles + dotted dirs (.git, .DS_Store, etc.)
  /(^|[/\\])node_modules([/\\]|$)/,
  /(^|[/\\])dist([/\\]|$)/,
  /(^|[/\\])coverage([/\\]|$)/,
  /(^|[/\\])\.cache([/\\]|$)/,
];

const COMPONENT_EXTS = new Set(['.js', '.mjs', '.cjs', '.jsx', '.ts', '.tsx']);
const STYLE_EXTS = new Set(['.css', '.scss', '.sass', '.less']);

function classify(path) {
  const dot = path.lastIndexOf('.');
  if (dot < 0) return 'asset';
  const ext = path.slice(dot).toLowerCase();
  if (COMPONENT_EXTS.has(ext)) return 'component';
  if (STYLE_EXTS.has(ext)) return 'style';
  return 'asset';
}

function toWebPath(root, absPath) {
  const rel = relative(root, absPath);
  // Normalize separators to forward slashes for the URL
  const posix = sep === '\\' ? rel.split(sep).join('/') : rel;
  return posix.startsWith('/') ? posix : `/${posix}`;
}

/**
 * Create a debounced chokidar-backed file watcher.
 *
 * Resolves once chokidar has emitted `ready` so callers know the
 * initial scan is finished and subsequent writes are real edits.
 *
 * @param {FileWatcherOptions} options
 * @returns {Promise<FileWatcher>}
 */
export async function createFileWatcher(options) {
  const {
    root,
    onChange,
    onError,
    debounceMs = 50,
    ignored = [],
  } = options;

  const watcher = chokidar.watch(root, {
    ignored: [...DEFAULT_IGNORES, ...ignored],
    ignoreInitial: true,
    persistent: true,
    awaitWriteFinish: false,
  });

  /** @type {Map<string, NodeJS.Timeout>} */
  const pending = new Map();

  function schedule(filePath) {
    const prev = pending.get(filePath);
    if (prev) clearTimeout(prev);
    const timer = setTimeout(() => {
      pending.delete(filePath);
      try {
        onChange({
          filePath,
          webPath: toWebPath(root, filePath),
          updateType: classify(filePath),
        });
      } catch (err) {
        if (onError) onError(err);
      }
    }, debounceMs);
    pending.set(filePath, timer);
  }

  watcher.on('add', schedule);
  watcher.on('change', schedule);
  watcher.on('unlink', schedule);

  if (onError) {
    watcher.on('error', onError);
  }

  await new Promise((resolve) => watcher.once('ready', resolve));

  return {
    async close() {
      for (const timer of pending.values()) clearTimeout(timer);
      pending.clear();
      await watcher.close();
    },
  };
}
