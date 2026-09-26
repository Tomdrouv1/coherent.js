/**
 * `@coherent.js/client/hmr` — the HMR client API on its own. Importing it has
 * no side effects; call `hmrClient.initialize()` to connect.
 */
export {
  HMRClient,
  hmrClient,
  ModuleTracker,
  moduleTracker,
  createHotContext,
  CleanupTracker,
  cleanupTracker,
  StateCapturer,
  stateCapturer,
  ErrorOverlay,
  errorOverlay,
  ConnectionIndicator,
  connectionIndicator,
} from './index.js';

/** Escape text for insertion into the overlay's HTML */
export function escapeHtml(str: unknown): string;

/**
 * Render a code frame as HTML, highlighting `highlightLine`; line numbers
 * start at `startLine`
 */
export function formatCodeFrame(
  frame: string,
  highlightLine?: number | null,
  startLine?: number
): string;
