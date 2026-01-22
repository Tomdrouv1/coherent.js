/**
 * Coherent.js HMR (Hot Module Replacement) Module
 *
 * Provides a complete HMR client for development with:
 * - WebSocket connection to dev server
 * - Module boundary detection and hot context API
 * - Form input and scroll state preservation
 * - Timer/listener cleanup tracking
 * - Error overlay with click-to-open editor support
 * - Connection status indicator
 *
 * @module @coherent.js/client/hmr
 */

// HMR Client - main orchestrator
export { HMRClient, hmrClient } from './client.js';

// Module Tracker - hot context API and boundary detection
export { ModuleTracker, moduleTracker, createHotContext } from './module-tracker.js';

// Cleanup Tracker - resource management for timers, listeners, fetch
export { CleanupTracker, cleanupTracker } from './cleanup-tracker.js';

// State Capturer - form input and scroll position preservation
export { StateCapturer, stateCapturer } from './state-capturer.js';

// Error Overlay - displays HMR errors with file/line info
export { ErrorOverlay, errorOverlay, escapeHtml, formatCodeFrame } from './overlay.js';

// Connection Indicator - shows WebSocket connection status
export { ConnectionIndicator, connectionIndicator } from './indicator.js';
