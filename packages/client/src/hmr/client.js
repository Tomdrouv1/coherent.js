/**
 * HMRClient - Orchestrates WebSocket connection and HMR updates
 *
 * Integrates all HMR modules (cleanup tracker, state capturer, error overlay,
 * connection indicator) to provide seamless hot module replacement with
 * state preservation.
 *
 * @module @coherent.js/client/hmr/client
 */

import { cleanupTracker } from './cleanup-tracker.js';
import { stateCapturer } from './state-capturer.js';
import { errorOverlay } from './overlay.js';
import { connectionIndicator } from './indicator.js';
import { moduleTracker } from './module-tracker.js';

/**
 * Parse error stack to extract file/line info
 *
 * @param {Error} error - Error object
 * @returns {{ file: string|null, line: number|null, column: number|null }} Parsed location
 */
function parseErrorLocation(error) {
  const result = { file: null, line: null, column: null };

  if (!error.stack) {
    return result;
  }

  // Match common stack trace formats:
  // Chrome/Node: "at Function (file.js:10:5)"
  // Firefox: "Function@file.js:10:5"
  // Safari: "file.js:10:5"
  const patterns = [
    /at\s+.*?\((.+?):(\d+):(\d+)\)/,  // Chrome/Node with parens
    /at\s+(.+?):(\d+):(\d+)/,          // Chrome/Node without parens
    /@(.+?):(\d+):(\d+)/,              // Firefox
    /^(.+?):(\d+):(\d+)/,              // Safari
  ];

  const lines = error.stack.split('\n');
  for (const line of lines) {
    for (const pattern of patterns) {
      const match = line.match(pattern);
      if (match) {
        result.file = match[1];
        result.line = parseInt(match[2], 10);
        result.column = parseInt(match[3], 10);
        return result;
      }
    }
  }

  return result;
}

/**
 * HMR Client class - manages WebSocket connection and update orchestration
 */
export class HMRClient {
  constructor() {
    /**
     * WebSocket connection
     * @type {WebSocket|null}
     */
    this.socket = null;

    /**
     * Connection state
     * @type {boolean}
     */
    this.connected = false;

    /**
     * Reconnection attempt counter
     * @type {number}
     */
    this.reconnectAttempts = 0;

    /**
     * Maximum reconnection attempts
     * @type {number}
     */
    this.maxReconnectAttempts = 10;

    /**
     * Base reconnection delay in ms
     * @type {number}
     */
    this.reconnectDelay = 1000;

    /**
     * Whether we've had a disconnect (for reload detection)
     * @type {boolean}
     */
    this.hadDisconnect = false;

    /**
     * Reconnect timeout ID
     * @type {number|null}
     */
    this.reconnectTimeout = null;

    /**
     * Initialization flag
     * @type {boolean}
     */
    this.initialized = false;
  }

  /**
   * Connect to the dev server WebSocket
   *
   * Establishes WebSocket connection with automatic reconnection using
   * exponential backoff with jitter.
   *
   * @returns {void}
   */
  connect() {
    if (typeof window === 'undefined') {
      return;
    }

    // Clear any pending reconnect
    if (this.reconnectTimeout !== null) {
      clearTimeout(this.reconnectTimeout);
      this.reconnectTimeout = null;
    }

    try {
      const protocol = location.protocol === 'https:' ? 'wss' : 'ws';
      const wsUrl = `${protocol}://${location.host}`;
      this.socket = new WebSocket(wsUrl);

      // Share socket with module tracker for invalidation messages
      moduleTracker.setSocket(this.socket);

      this.socket.addEventListener('open', () => {
        console.log('[HMR] Connected');
        this.connected = true;
        this.reconnectAttempts = 0;
        connectionIndicator.update('connected');

        // Send connection acknowledgment
        this.socket.send(JSON.stringify({ type: 'connected' }));

        // If reconnecting after disconnect, reload (server may have restarted)
        if (this.hadDisconnect) {
          console.log('[HMR] Reconnected after disconnect, reloading page');
          setTimeout(() => location.reload(), 200);
          return;
        }
      });

      this.socket.addEventListener('close', () => {
        this.connected = false;
        this.hadDisconnect = true;
        connectionIndicator.update('disconnected');
        moduleTracker.setSocket(null);
        this.scheduleReconnect();
      });

      this.socket.addEventListener('error', (event) => {
        console.warn('[HMR] WebSocket error:', event);
        connectionIndicator.update('error');
        try {
          this.socket.close();
        } catch {
          // Ignore close errors
        }
      });

      this.socket.addEventListener('message', (event) => {
        this.handleMessage(event);
      });
    } catch (error) {
      console.warn('[HMR] Failed to connect:', error);
      this.scheduleReconnect();
    }
  }

  /**
   * Schedule a reconnection attempt with exponential backoff
   *
   * @private
   */
  scheduleReconnect() {
    if (this.reconnectAttempts >= this.maxReconnectAttempts) {
      console.warn('[HMR] Max reconnection attempts reached');
      connectionIndicator.update('disconnected');
      return;
    }

    connectionIndicator.update('reconnecting');

    // Exponential backoff with jitter
    const delay = Math.min(
      this.reconnectDelay * Math.pow(2, this.reconnectAttempts) + Math.random() * 1000,
      30000
    );
    this.reconnectAttempts++;

    console.log(`[HMR] Reconnecting in ${Math.round(delay)}ms (attempt ${this.reconnectAttempts}/${this.maxReconnectAttempts})`);

    this.reconnectTimeout = setTimeout(() => {
      this.reconnectTimeout = null;
      this.connect();
    }, delay);
  }

  /**
   * Handle incoming WebSocket message
   *
   * @param {MessageEvent} event - WebSocket message event
   * @private
   */
  handleMessage(event) {
    let data;
    try {
      data = JSON.parse(event.data);
    } catch {
      return;
    }

    console.log('[HMR] message', data.type, data.filePath || data.webPath || '');

    switch (data.type) {
      case 'connected':
        // Connection acknowledged
        break;

      case 'hmr-full-reload':
      case 'reload':
        console.warn('[HMR] Server requested full reload');
        location.reload();
        break;

      case 'hmr-component-update':
      case 'hmr-update':
        this.handleUpdate(data);
        break;

      case 'hmr-error':
        this.showError(data.error || data);
        break;

      case 'preview-update':
        // No-op: used by dashboard for live preview panes
        break;

      default:
        // Unknown message type, ignore
        break;
    }
  }

  /**
   * Handle module update
   *
   * Orchestrates the full HMR update cycle:
   * 1. Capture form/scroll state
   * 2. Execute dispose handlers
   * 3. Clean up module resources
   * 4. Re-import module
   * 5. Execute accept handlers
   * 6. Restore state
   *
   * @param {Object} data - Update message data
   * @param {string} [data.filePath] - File path that changed
   * @param {string} [data.webPath] - Web-accessible path
   * @param {string} [data.updateType] - Type of update (component, style, etc.)
   */
  async handleUpdate(data) {
    const filePath = data.webPath || data.filePath || '';
    const moduleId = filePath;

    try {
      // 1. Capture current state
      stateCapturer.captureAll();

      // 2. Execute dispose handler if registered
      if (moduleTracker.hasModule(moduleId)) {
        moduleTracker.executeDispose(moduleId);
      }

      // 3. Clean up module resources
      if (cleanupTracker.hasResources(moduleId)) {
        cleanupTracker.checkForLeaks(moduleId);
        cleanupTracker.cleanup(moduleId);
      }

      // 4. Re-import module with cache bust
      const importPath = filePath.startsWith('/') ? filePath : `/${filePath}`;
      const newModule = await import(`${importPath}?t=${Date.now()}`);

      // 5. Execute accept handler if module can hot-update
      const accepted = moduleTracker.canHotUpdate(moduleId);
      if (accepted) {
        moduleTracker.executeAccept(moduleId, newModule);
      } else {
        // Fall back to autoHydrate for components without explicit accept
        await this.fallbackHydrate();
      }

      // 6. Restore state
      stateCapturer.restoreAll();

      // 7. Hide error overlay (in case previous error is now fixed)
      errorOverlay.hide();

      // 8. Log success
      console.log(`[HMR] Updated: ${data.updateType || 'module'} ${filePath}`);
    } catch (error) {
      this.handleUpdateError(error, filePath);
    }
  }

  /**
   * Fall back to autoHydrate for non-HMR-aware modules
   *
   * @private
   */
  async fallbackHydrate() {
    try {
      // Try to import autoHydrate from the hydration module
      const { autoHydrate } = await import('../hydration.js');

      // If examples register a component registry on window, prefer targeted hydrate
      if (typeof window !== 'undefined' && window.componentRegistry) {
        autoHydrate(window.componentRegistry);
      } else {
        autoHydrate();
      }
    } catch {
      // autoHydrate not available or failed
      console.warn('[HMR] autoHydrate not available, component may need manual refresh');
    }
  }

  /**
   * Handle update error
   *
   * @param {Error} error - Error that occurred
   * @param {string} filePath - File that was being updated
   * @private
   */
  handleUpdateError(error, filePath) {
    console.error('[HMR] Update failed:', error);

    // Parse error location from stack
    const location = parseErrorLocation(error);

    // Build error details for overlay
    const errorDetails = {
      message: error.message || 'Unknown error during HMR update',
      file: location.file || filePath,
      line: location.line,
      column: location.column,
      stack: error.stack,
    };

    this.showError(errorDetails);
  }

  /**
   * Show error overlay
   *
   * @param {Object} error - Error details
   */
  showError(error) {
    errorOverlay.show(error);
  }

  /**
   * Hide error overlay
   */
  hideError() {
    errorOverlay.hide();
  }

  /**
   * Initialize HMR client
   *
   * Guards against double initialization and connects to dev server.
   *
   * @returns {void}
   */
  initialize() {
    if (typeof window === 'undefined') {
      return;
    }

    // Guard against double initialization
    if (window.__coherent_hmr_initialized || this.initialized) {
      return;
    }

    window.__coherent_hmr_initialized = true;
    this.initialized = true;

    this.connect();
  }

  /**
   * Disconnect and clean up
   *
   * @returns {void}
   */
  disconnect() {
    if (this.reconnectTimeout !== null) {
      clearTimeout(this.reconnectTimeout);
      this.reconnectTimeout = null;
    }

    if (this.socket) {
      try {
        this.socket.close();
      } catch {
        // Ignore close errors
      }
      this.socket = null;
    }

    this.connected = false;
    moduleTracker.setSocket(null);
    connectionIndicator.destroy();
  }

  /**
   * Check if client is connected
   *
   * @returns {boolean} True if connected
   */
  isConnected() {
    return this.connected;
  }
}

/**
 * Singleton HMR client instance
 * @type {HMRClient}
 */
export const hmrClient = new HMRClient();
