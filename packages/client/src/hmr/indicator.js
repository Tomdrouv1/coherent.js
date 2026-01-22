/**
 * HMR Connection Status Indicator
 *
 * Displays a small colored dot in the bottom-right corner indicating
 * WebSocket connection status. Unobtrusive design per CONTEXT.md decision.
 *
 * @module @coherent.js/client/hmr/indicator
 */

/**
 * Status color mapping for connection states.
 */
const STATUS_COLORS = {
  connected: '#10b981',    // Green
  disconnected: '#ef4444', // Red
  reconnecting: '#f59e0b', // Yellow/amber
  error: '#ef4444'         // Red
};

/**
 * Status title mapping for accessibility.
 */
const STATUS_TITLES = {
  connected: 'HMR: Connected',
  disconnected: 'HMR: Disconnected',
  reconnecting: 'HMR: Reconnecting...',
  error: 'HMR: Error'
};

/**
 * Default/initial color before status is set.
 */
const DEFAULT_COLOR = '#666';

/**
 * Connection status indicator class.
 * Shows an 8px colored dot in the bottom-right corner of the viewport.
 */
export class ConnectionIndicator {
  constructor() {
    /** @type {HTMLElement | null} */
    this.indicator = null;
  }

  /**
   * Create the indicator element if it doesn't exist.
   * Uses inline styles to avoid external CSS dependencies.
   */
  create() {
    if (this.indicator) return;

    const el = document.createElement('div');
    el.id = 'coherent-hmr-indicator';
    el.style.cssText = `
      position: fixed;
      bottom: 8px;
      right: 8px;
      width: 8px;
      height: 8px;
      border-radius: 50%;
      background: ${DEFAULT_COLOR};
      z-index: 99998;
      pointer-events: none;
      transition: background 0.3s ease;
    `;
    el.title = 'HMR: Initializing';

    document.body.appendChild(el);
    this.indicator = el;
  }

  /**
   * Update the indicator status.
   * Creates the element if it doesn't exist (lazy initialization).
   *
   * @param {string} status - Status string: 'connected', 'disconnected', 'reconnecting', or 'error'
   */
  update(status) {
    if (!this.indicator) {
      this.create();
    }

    const color = STATUS_COLORS[status] || STATUS_COLORS.disconnected;
    const title = STATUS_TITLES[status] || 'HMR: Unknown';

    this.indicator.style.background = color;
    this.indicator.title = title;
  }

  /**
   * Remove the indicator from the DOM.
   */
  destroy() {
    if (this.indicator?.parentNode) {
      this.indicator.parentNode.removeChild(this.indicator);
    }
    this.indicator = null;
  }
}

/**
 * Singleton instance of ConnectionIndicator.
 */
export const connectionIndicator = new ConnectionIndicator();
