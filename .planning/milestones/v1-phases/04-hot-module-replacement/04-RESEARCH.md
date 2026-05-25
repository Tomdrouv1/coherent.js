# Phase 4: Hot Module Replacement - Research

**Researched:** 2026-01-22
**Domain:** Hot Module Replacement (HMR) with state preservation and error handling
**Confidence:** HIGH

## Summary

Phase 4 implements Hot Module Replacement for Coherent.js, enabling file changes to update the browser without full reloads while preserving component state. This builds upon the Phase 2 hydration system and integrates with the existing dev server WebSocket infrastructure.

Research confirms that the existing `packages/client/src/hmr.js` provides a basic HMR client (~106 lines) that handles WebSocket connection and module re-import, but lacks:
- Component state preservation during updates
- Form input state capture and restoration
- Timer/listener cleanup tracking
- Proper error overlay with click-to-open
- Connection status indicator

The CONTEXT.md decisions align well with established patterns from Vite and webpack:
- **Silent DOM updates** matches Vite's default behavior
- **Auto full reload fallback** is standard HMR practice for non-boundary modules
- **Full-screen error overlay** follows Vite's `<vite-error-overlay>` pattern
- **Timer/listener auto-cleanup** via dispose handlers is the webpack HMR pattern

**Primary recommendation:** Implement a proper HMR client with Vite-compatible API (`import.meta.hot`-style patterns), integrate with the Phase 2 event delegation and state serialization, and add an error overlay component using Shadow DOM for style isolation.

## Standard Stack

The established libraries/tools for this domain:

### Core

| Library | Version | Purpose | Why Standard |
|---------|---------|---------|--------------|
| Native WebSocket API | N/A | Dev server communication | Built-in, reliable, bidirectional |
| Shadow DOM | N/A | Error overlay style isolation | Native encapsulation, no CSS conflicts |
| MutationObserver | N/A | Form input tracking for state preservation | Native API, efficient |
| AbortController | N/A | Cleanup pending fetches on module disposal | Built-in cancellation mechanism |

### Supporting

| Library | Version | Purpose | When to Use |
|---------|---------|---------|-------------|
| Event delegation (Phase 2) | N/A | Handler survival across DOM updates | Already implemented in `@coherent.js/client` |
| State serializer (Phase 2) | N/A | State persistence across HMR | Already implemented in `packages/client/src/hydration/state-serializer.js` |

### Alternatives Considered

| Instead of | Could Use | Tradeoff |
|------------|-----------|----------|
| Custom WebSocket | Vite's HMR client | Custom allows Coherent-specific features |
| Shadow DOM for overlay | iframe | Shadow DOM is lighter, same-origin |
| Manual cleanup tracking | WeakMap auto-cleanup | Manual is more explicit for timers |

**Installation:**
```bash
# No additional dependencies needed - using native APIs
# Existing @coherent.js/client package provides hydration infrastructure
```

## Architecture Patterns

### Recommended Project Structure

The HMR system should be organized within the existing client package:

```
packages/client/src/
  hmr/
    index.js           # Public API exports
    client.js          # HMR WebSocket client
    module-tracker.js  # Module graph and boundaries
    state-capturer.js  # Form/scroll state capture
    cleanup-tracker.js # Timer/listener disposal
    overlay.js         # Error overlay component
    indicator.js       # Connection status indicator
  hmr.js               # (existing) - deprecate, re-export from hmr/
```

### Pattern 1: HMR Client with Vite-Compatible API

**What:** Expose `import.meta.hot`-compatible API for module acceptance
**When to use:** All HMR-capable modules should use this pattern
**Example:**
```javascript
// Source: Vite HMR API (https://vite.dev/guide/api-hmr)

class HMRClient {
  constructor() {
    this.modules = new Map(); // moduleId -> { accept, dispose, data }
    this.socket = null;
    this.connected = false;
    this.reconnectAttempts = 0;
    this.maxReconnectAttempts = 10;
    this.reconnectDelay = 1000;
  }

  connect() {
    const protocol = location.protocol === 'https:' ? 'wss' : 'ws';
    this.socket = new WebSocket(`${protocol}://${location.host}`);

    this.socket.addEventListener('open', () => {
      console.log('[HMR] Connected');
      this.connected = true;
      this.reconnectAttempts = 0;
      this.updateIndicator('connected');
    });

    this.socket.addEventListener('close', () => {
      this.connected = false;
      this.updateIndicator('disconnected');
      this.scheduleReconnect();
    });

    this.socket.addEventListener('message', (event) => {
      this.handleMessage(JSON.parse(event.data));
    });
  }

  scheduleReconnect() {
    if (this.reconnectAttempts >= this.maxReconnectAttempts) {
      console.warn('[HMR] Max reconnection attempts reached');
      return;
    }

    // Exponential backoff with jitter
    const delay = Math.min(
      this.reconnectDelay * Math.pow(2, this.reconnectAttempts) + Math.random() * 1000,
      30000
    );
    this.reconnectAttempts++;

    setTimeout(() => this.connect(), delay);
  }

  // Create hot context for a module
  createHotContext(moduleId) {
    const moduleData = this.modules.get(moduleId) || { data: {} };
    this.modules.set(moduleId, moduleData);

    return {
      // Persistent data across updates
      data: moduleData.data,

      // Accept self updates
      accept(callback) {
        moduleData.accept = callback;
      },

      // Accept dependency updates
      acceptDeps(deps, callback) {
        moduleData.acceptDeps = { deps, callback };
      },

      // Cleanup handler before replacement
      dispose(callback) {
        moduleData.dispose = callback;
      },

      // Final cleanup when module removed
      prune(callback) {
        moduleData.prune = callback;
      },

      // Invalidate to propagate to importers
      invalidate(message) {
        this.socket?.send(JSON.stringify({
          type: 'invalidate',
          moduleId,
          message
        }));
      }
    };
  }
}

export const hmrClient = new HMRClient();
```

### Pattern 2: Form Input State Capture and Restoration

**What:** Capture active form input values before HMR, restore after update
**When to use:** For form state preservation per CONTEXT.md decision (Claude's discretion)
**Example:**
```javascript
// Source: Browser MutationObserver API + standard form handling patterns

class FormStateCapturer {
  constructor() {
    this.capturedInputs = new Map(); // key -> { value, selectionStart, selectionEnd }
  }

  /**
   * Generate a stable key for an input element
   * Uses multiple factors to identify inputs across HMR updates
   */
  getInputKey(input) {
    const parts = [];

    // ID is most stable
    if (input.id) {
      parts.push(`#${input.id}`);
    }

    // Name is second most stable
    if (input.name) {
      parts.push(`[name="${input.name}"]`);
    }

    // Type helps distinguish
    if (input.type) {
      parts.push(`[type="${input.type}"]`);
    }

    // Form context if available
    if (input.form?.id) {
      parts.push(`form#${input.form.id}`);
    }

    // Fallback: path in DOM
    if (parts.length === 0) {
      parts.push(this.getElementPath(input));
    }

    return parts.join(':');
  }

  getElementPath(element) {
    const path = [];
    let current = element;
    while (current && current !== document.body) {
      let selector = current.tagName.toLowerCase();
      if (current.className) {
        selector += '.' + current.className.split(' ').join('.');
      }
      const siblings = current.parentElement?.querySelectorAll(`:scope > ${selector}`);
      if (siblings?.length > 1) {
        const index = Array.from(siblings).indexOf(current);
        selector += `:nth-of-type(${index + 1})`;
      }
      path.unshift(selector);
      current = current.parentElement;
    }
    return path.join(' > ');
  }

  /**
   * Capture all form input states
   */
  capture() {
    this.capturedInputs.clear();

    // Text inputs, textareas
    document.querySelectorAll('input, textarea, select').forEach(input => {
      const key = this.getInputKey(input);
      const state = {
        value: input.value,
        type: input.type
      };

      // Capture selection for text inputs
      if (input.selectionStart !== undefined) {
        state.selectionStart = input.selectionStart;
        state.selectionEnd = input.selectionEnd;
      }

      // Capture checked state for checkboxes/radios
      if (input.type === 'checkbox' || input.type === 'radio') {
        state.checked = input.checked;
      }

      this.capturedInputs.set(key, state);
    });

    return this.capturedInputs;
  }

  /**
   * Restore form input states after HMR update
   */
  restore() {
    this.capturedInputs.forEach((state, key) => {
      // Find matching input(s)
      let inputs = [];

      if (key.startsWith('#')) {
        const id = key.split(':')[0].slice(1);
        const el = document.getElementById(id);
        if (el) inputs = [el];
      } else if (key.includes('[name=')) {
        const match = key.match(/\[name="([^"]+)"\]/);
        if (match) {
          inputs = document.querySelectorAll(`[name="${match[1]}"]`);
        }
      }

      inputs.forEach(input => {
        // Only restore if input is still compatible
        if (input.type === state.type || (!input.type && !state.type)) {
          if (state.checked !== undefined) {
            input.checked = state.checked;
          } else {
            input.value = state.value;
          }

          // Restore selection
          if (state.selectionStart !== undefined && document.activeElement !== input) {
            try {
              input.setSelectionRange(state.selectionStart, state.selectionEnd);
            } catch (e) {
              // Some inputs don't support selection
            }
          }
        }
      });
    });
  }
}

export const formStateCapturer = new FormStateCapturer();
```

### Pattern 3: Scroll Position Preservation with Layout Detection

**What:** Preserve scroll position unless layout significantly changed
**When to use:** Per CONTEXT.md decision on scroll preservation
**Example:**
```javascript
// Source: GitHub josh/scroll-anchoring pattern

class ScrollPreserver {
  constructor() {
    this.scrollPositions = new Map(); // elementKey -> { top, left }
    this.layoutSnapshot = null;
  }

  /**
   * Capture scroll positions for all scrollable containers
   */
  captureScrollPositions() {
    this.scrollPositions.clear();

    // Window scroll
    this.scrollPositions.set('window', {
      top: window.scrollY,
      left: window.scrollX
    });

    // Find scrollable containers
    document.querySelectorAll('[data-coherent-scroll-preserve], [style*="overflow"]').forEach(el => {
      if (el.scrollHeight > el.clientHeight || el.scrollWidth > el.clientWidth) {
        const key = this.getElementKey(el);
        this.scrollPositions.set(key, {
          top: el.scrollTop,
          left: el.scrollLeft
        });
      }
    });
  }

  /**
   * Capture layout snapshot for change detection
   */
  captureLayout() {
    this.layoutSnapshot = {
      bodyHeight: document.body.scrollHeight,
      bodyWidth: document.body.scrollWidth,
      // Capture positions of key elements
      anchors: new Map()
    };

    // Capture positions of elements with data-coherent-component
    document.querySelectorAll('[data-coherent-component]').forEach(el => {
      const rect = el.getBoundingClientRect();
      this.layoutSnapshot.anchors.set(this.getElementKey(el), {
        top: rect.top,
        left: rect.left,
        width: rect.width,
        height: rect.height
      });
    });
  }

  /**
   * Check if layout changed significantly (>50px shift in any anchor)
   */
  layoutChangedSignificantly() {
    if (!this.layoutSnapshot) return false;

    const THRESHOLD = 50; // pixels

    // Check body dimensions
    const heightDiff = Math.abs(document.body.scrollHeight - this.layoutSnapshot.bodyHeight);
    const widthDiff = Math.abs(document.body.scrollWidth - this.layoutSnapshot.bodyWidth);

    if (heightDiff > THRESHOLD || widthDiff > THRESHOLD) {
      return true;
    }

    // Check anchor element positions
    for (const [key, oldRect] of this.layoutSnapshot.anchors) {
      const el = this.findElementByKey(key);
      if (!el) continue;

      const newRect = el.getBoundingClientRect();
      const topDiff = Math.abs(newRect.top - oldRect.top);
      const leftDiff = Math.abs(newRect.left - oldRect.left);

      if (topDiff > THRESHOLD || leftDiff > THRESHOLD) {
        return true;
      }
    }

    return false;
  }

  /**
   * Restore scroll positions if layout didn't change significantly
   */
  restoreScrollPositions() {
    if (this.layoutChangedSignificantly()) {
      console.log('[HMR] Layout changed significantly, not restoring scroll');
      return;
    }

    // Restore window scroll
    const windowPos = this.scrollPositions.get('window');
    if (windowPos) {
      window.scrollTo(windowPos.left, windowPos.top);
    }

    // Restore container scrolls
    this.scrollPositions.forEach((pos, key) => {
      if (key === 'window') return;
      const el = this.findElementByKey(key);
      if (el) {
        el.scrollTop = pos.top;
        el.scrollLeft = pos.left;
      }
    });
  }

  getElementKey(el) {
    return el.id ? `#${el.id}` :
           el.getAttribute('data-coherent-component') ? `[data-coherent-component="${el.getAttribute('data-coherent-component')}"]` :
           this.getElementPath(el);
  }

  findElementByKey(key) {
    if (key.startsWith('#')) return document.getElementById(key.slice(1));
    try { return document.querySelector(key); } catch { return null; }
  }

  getElementPath(el) {
    // Same as FormStateCapturer.getElementPath
    const path = [];
    let current = el;
    while (current && current !== document.body && path.length < 5) {
      let selector = current.tagName.toLowerCase();
      if (current.id) {
        selector = `#${current.id}`;
        path.unshift(selector);
        break;
      }
      path.unshift(selector);
      current = current.parentElement;
    }
    return path.join(' > ');
  }
}

export const scrollPreserver = new ScrollPreserver();
```

### Pattern 4: Cleanup Tracker for Timers and Listeners

**What:** Track and automatically cleanup timers, intervals, listeners, and fetch requests on module disposal
**When to use:** Per CONTEXT.md decision on auto-cleanup
**Example:**
```javascript
// Source: Webpack HMR dispose pattern + common memory leak prevention patterns

class CleanupTracker {
  constructor() {
    // Tracked resources per module
    this.moduleResources = new Map(); // moduleId -> { timers, listeners, abortControllers }
  }

  /**
   * Create a tracked context for a module
   */
  createContext(moduleId) {
    const resources = {
      timers: new Set(),
      intervals: new Set(),
      listeners: [], // { target, event, handler, options }
      abortControllers: new Set()
    };

    this.moduleResources.set(moduleId, resources);

    return {
      /**
       * Tracked setTimeout
       */
      setTimeout: (callback, delay, ...args) => {
        const id = setTimeout((...a) => {
          resources.timers.delete(id);
          callback(...a);
        }, delay, ...args);
        resources.timers.add(id);
        return id;
      },

      /**
       * Tracked setInterval
       */
      setInterval: (callback, delay, ...args) => {
        const id = setInterval(callback, delay, ...args);
        resources.intervals.add(id);
        return id;
      },

      /**
       * Clear tracked timeout
       */
      clearTimeout: (id) => {
        resources.timers.delete(id);
        clearTimeout(id);
      },

      /**
       * Clear tracked interval
       */
      clearInterval: (id) => {
        resources.intervals.delete(id);
        clearInterval(id);
      },

      /**
       * Tracked addEventListener
       */
      addEventListener: (target, event, handler, options) => {
        target.addEventListener(event, handler, options);
        resources.listeners.push({ target, event, handler, options });
      },

      /**
       * Create tracked AbortController for fetch
       */
      createAbortController: () => {
        const controller = new AbortController();
        resources.abortControllers.add(controller);
        return controller;
      },

      /**
       * Tracked fetch with automatic abort on disposal
       */
      fetch: (url, options = {}) => {
        const controller = new AbortController();
        resources.abortControllers.add(controller);

        return fetch(url, {
          ...options,
          signal: controller.signal
        }).finally(() => {
          resources.abortControllers.delete(controller);
        });
      }
    };
  }

  /**
   * Cleanup all resources for a module
   * Called during HMR module disposal
   */
  cleanup(moduleId) {
    const resources = this.moduleResources.get(moduleId);
    if (!resources) return;

    // Clear all timers
    resources.timers.forEach(id => clearTimeout(id));
    resources.timers.clear();

    // Clear all intervals
    resources.intervals.forEach(id => clearInterval(id));
    resources.intervals.clear();

    // Remove all event listeners
    resources.listeners.forEach(({ target, event, handler, options }) => {
      target.removeEventListener(event, handler, options);
    });
    resources.listeners.length = 0;

    // Abort all pending fetches
    resources.abortControllers.forEach(controller => {
      try { controller.abort(); } catch (e) { /* ignore */ }
    });
    resources.abortControllers.clear();

    this.moduleResources.delete(moduleId);
  }

  /**
   * Check for potential leaks (untracked global listeners)
   * Warn if detected
   */
  checkForLeaks(moduleId) {
    // This would require patching global APIs which is invasive
    // Instead, provide a development-time warning if cleanup wasn't called
    const resources = this.moduleResources.get(moduleId);
    if (!resources) return;

    const warnings = [];
    if (resources.timers.size > 0) {
      warnings.push(`${resources.timers.size} timer(s) not cleaned up`);
    }
    if (resources.intervals.size > 0) {
      warnings.push(`${resources.intervals.size} interval(s) not cleaned up`);
    }
    if (resources.listeners.length > 0) {
      warnings.push(`${resources.listeners.length} listener(s) not cleaned up`);
    }
    if (resources.abortControllers.size > 0) {
      warnings.push(`${resources.abortControllers.size} pending fetch(es) not aborted`);
    }

    if (warnings.length > 0) {
      console.warn(`[HMR] Potential leak in module ${moduleId}: ${warnings.join(', ')}`);
    }
  }
}

export const cleanupTracker = new CleanupTracker();
```

### Pattern 5: Error Overlay with Click-to-Open

**What:** Full-screen error overlay showing error details with click-to-open editor
**When to use:** On HMR failures per CONTEXT.md decision
**Example:**
```javascript
// Source: Vite error overlay pattern (https://github.com/vitejs/vite)

class ErrorOverlay {
  constructor() {
    this.overlay = null;
    this.editor = localStorage.getItem('coherent-editor') || 'vscode';
  }

  /**
   * Create Shadow DOM overlay for style isolation
   */
  createOverlay() {
    if (this.overlay) return this.overlay;

    const host = document.createElement('div');
    host.id = 'coherent-error-overlay';
    const shadow = host.attachShadow({ mode: 'open' });

    const style = document.createElement('style');
    style.textContent = `
      :host {
        position: fixed;
        top: 0;
        left: 0;
        width: 100%;
        height: 100%;
        z-index: 99999;
        --bg: #181818;
        --text: #f8f8f2;
        --red: #ff5555;
        --yellow: #f1fa8c;
        --purple: #bd93f9;
        --cyan: #8be9fd;
      }
      .backdrop {
        position: absolute;
        top: 0;
        left: 0;
        width: 100%;
        height: 100%;
        background: rgba(0, 0, 0, 0.66);
      }
      .container {
        position: absolute;
        top: 50%;
        left: 50%;
        transform: translate(-50%, -50%);
        width: min(800px, 90vw);
        max-height: 90vh;
        overflow: auto;
        background: var(--bg);
        border-radius: 8px;
        box-shadow: 0 20px 40px rgba(0, 0, 0, 0.5);
        font-family: 'SF Mono', Monaco, Consolas, monospace;
      }
      .header {
        padding: 16px 20px;
        background: var(--red);
        color: white;
        display: flex;
        justify-content: space-between;
        align-items: center;
      }
      .title {
        font-weight: bold;
        font-size: 16px;
      }
      .close-btn {
        background: none;
        border: none;
        color: white;
        font-size: 24px;
        cursor: pointer;
        padding: 0 8px;
      }
      .close-btn:hover {
        opacity: 0.8;
      }
      .content {
        padding: 20px;
        color: var(--text);
      }
      .message {
        font-size: 18px;
        color: var(--red);
        margin-bottom: 20px;
        word-break: break-word;
      }
      .file {
        color: var(--cyan);
        margin-bottom: 16px;
        cursor: pointer;
        text-decoration: underline;
      }
      .file:hover {
        color: var(--purple);
      }
      .code-frame {
        background: #282a36;
        padding: 16px;
        border-radius: 4px;
        overflow-x: auto;
        font-size: 14px;
        line-height: 1.5;
      }
      .line {
        display: flex;
      }
      .line-number {
        width: 50px;
        color: #6272a4;
        text-align: right;
        padding-right: 16px;
        user-select: none;
      }
      .line-content {
        flex: 1;
        white-space: pre;
      }
      .line.highlight {
        background: rgba(255, 85, 85, 0.2);
      }
      .line.highlight .line-content {
        color: var(--red);
      }
      .stack {
        margin-top: 20px;
        font-size: 12px;
        color: #6272a4;
        white-space: pre-wrap;
      }
      .tip {
        margin-top: 16px;
        padding: 12px;
        background: rgba(189, 147, 249, 0.1);
        border-left: 3px solid var(--purple);
        font-size: 13px;
      }
    `;

    shadow.appendChild(style);
    this.overlay = { host, shadow };
    return this.overlay;
  }

  /**
   * Show error overlay
   * @param {Object} error - Error details
   * @param {string} error.message - Error message
   * @param {string} error.file - File path
   * @param {number} error.line - Line number
   * @param {number} error.column - Column number
   * @param {string} error.frame - Code frame with context
   * @param {string} error.stack - Stack trace
   */
  show(error) {
    const { host, shadow } = this.createOverlay();

    // Clear previous content
    const existingContainer = shadow.querySelector('.wrapper');
    if (existingContainer) existingContainer.remove();

    const wrapper = document.createElement('div');
    wrapper.className = 'wrapper';
    wrapper.innerHTML = `
      <div class="backdrop"></div>
      <div class="container">
        <div class="header">
          <span class="title">HMR Error</span>
          <button class="close-btn" title="Close (Escape)">&times;</button>
        </div>
        <div class="content">
          <div class="message">${this.escapeHtml(error.message)}</div>
          ${error.file ? `
            <div class="file" data-file="${this.escapeHtml(error.file)}" data-line="${error.line || 1}">
              ${this.escapeHtml(error.file)}${error.line ? `:${error.line}` : ''}${error.column ? `:${error.column}` : ''}
            </div>
          ` : ''}
          ${error.frame ? `
            <div class="code-frame">${this.formatCodeFrame(error.frame, error.line)}</div>
          ` : ''}
          ${error.stack ? `
            <div class="stack">${this.escapeHtml(error.stack)}</div>
          ` : ''}
          <div class="tip">
            Press <strong>Escape</strong> or click the X to dismiss.
            ${error.file ? `Click the file path to open in ${this.editor}.` : ''}
          </div>
        </div>
      </div>
    `;

    shadow.appendChild(wrapper);

    // Event handlers
    const closeBtn = wrapper.querySelector('.close-btn');
    const backdrop = wrapper.querySelector('.backdrop');
    const fileLink = wrapper.querySelector('.file');

    closeBtn?.addEventListener('click', () => this.hide());
    backdrop?.addEventListener('click', () => this.hide());
    fileLink?.addEventListener('click', (e) => {
      const file = e.target.dataset.file;
      const line = e.target.dataset.line;
      this.openInEditor(file, line);
    });

    // Escape key handler
    this.escapeHandler = (e) => {
      if (e.key === 'Escape') this.hide();
    };
    document.addEventListener('keydown', this.escapeHandler);

    document.body.appendChild(host);
  }

  /**
   * Hide error overlay
   */
  hide() {
    if (this.overlay?.host.parentNode) {
      this.overlay.host.parentNode.removeChild(this.overlay.host);
    }
    if (this.escapeHandler) {
      document.removeEventListener('keydown', this.escapeHandler);
      this.escapeHandler = null;
    }
  }

  /**
   * Open file in configured editor
   */
  openInEditor(file, line = 1) {
    const editorUrls = {
      vscode: `vscode://file/${file}:${line}`,
      cursor: `cursor://file/${file}:${line}`,
      'vscode-insiders': `vscode-insiders://file/${file}:${line}`,
      atom: `atom://core/open/file?filename=${file}&line=${line}`,
      sublime: `subl://open?url=file://${file}&line=${line}`,
      webstorm: `webstorm://open?file=${file}&line=${line}`,
      idea: `idea://open?file=${file}&line=${line}`
    };

    const url = editorUrls[this.editor] || editorUrls.vscode;
    window.open(url, '_self');
  }

  /**
   * Set preferred editor
   */
  setEditor(editor) {
    this.editor = editor;
    localStorage.setItem('coherent-editor', editor);
  }

  escapeHtml(str) {
    return String(str)
      .replace(/&/g, '&amp;')
      .replace(/</g, '&lt;')
      .replace(/>/g, '&gt;')
      .replace(/"/g, '&quot;');
  }

  formatCodeFrame(frame, highlightLine) {
    const lines = frame.split('\n');
    return lines.map((content, i) => {
      const lineNum = i + 1; // Adjust based on actual frame
      const isHighlight = lineNum === highlightLine;
      return `<div class="line${isHighlight ? ' highlight' : ''}">
        <span class="line-number">${lineNum}</span>
        <span class="line-content">${this.escapeHtml(content)}</span>
      </div>`;
    }).join('');
  }
}

export const errorOverlay = new ErrorOverlay();
```

### Pattern 6: Connection Status Indicator

**What:** Small unobtrusive corner indicator showing WebSocket connection status
**When to use:** Always visible during development per CONTEXT.md decision
**Example:**
```javascript
// Source: CONTEXT.md decision - small colored dot indicator

class ConnectionIndicator {
  constructor() {
    this.indicator = null;
  }

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
      background: #666;
      z-index: 99998;
      transition: background 0.3s ease;
      pointer-events: none;
    `;
    el.title = 'HMR: Disconnected';
    document.body.appendChild(el);
    this.indicator = el;
  }

  update(status) {
    if (!this.indicator) this.create();

    const colors = {
      connected: '#10b981',     // Green
      disconnected: '#ef4444',  // Red
      reconnecting: '#f59e0b',  // Yellow
      error: '#ef4444'          // Red
    };

    const titles = {
      connected: 'HMR: Connected',
      disconnected: 'HMR: Disconnected',
      reconnecting: 'HMR: Reconnecting...',
      error: 'HMR: Error'
    };

    this.indicator.style.background = colors[status] || colors.disconnected;
    this.indicator.title = titles[status] || 'HMR: Unknown';
  }

  destroy() {
    if (this.indicator?.parentNode) {
      this.indicator.parentNode.removeChild(this.indicator);
    }
    this.indicator = null;
  }
}

export const connectionIndicator = new ConnectionIndicator();
```

### Anti-Patterns to Avoid

- **Full page reload on every change:** Use proper HMR boundaries to accept updates locally
- **Losing state on component updates:** Use `dispose()` + `data` object to preserve state
- **Timer leaks:** Always track timers/intervals and clean up on module disposal
- **Immediate reconnection attempts:** Use exponential backoff to avoid server overwhelm
- **CSS-in-JS style leaks:** Clean up injected styles in dispose handlers
- **Unbounded error history:** Limit stored errors to prevent memory issues

## Don't Hand-Roll

Problems that look simple but have existing solutions:

| Problem | Don't Build | Use Instead | Why |
|---------|-------------|-------------|-----|
| WebSocket reconnection | Simple retry loop | Exponential backoff with jitter | Prevents thundering herd |
| Style isolation | CSS namespacing | Shadow DOM | True encapsulation |
| Form state capture | Manual value reading | Stable key generation | Survives DOM structure changes |
| Module graph tracking | Custom dependency analysis | Bundler's module graph | Already available from dev server |
| Click-to-open editor | Custom protocol handler | Standard URL schemes (vscode://) | Works across editors |

**Key insight:** The existing `packages/client/src/hmr.js` already handles WebSocket connection and basic module re-import. The main gaps are state preservation, cleanup tracking, and error display - all of which can be added without replacing the core connection logic.

## Common Pitfalls

### Pitfall 1: State Loss on Component Update

**What goes wrong:** Component state resets to initial values after HMR update
**Why it happens:** Module re-evaluation creates new state, previous state not transferred
**How to avoid:** Use `dispose()` to save state to `data` object, restore in module initialization
**Warning signs:** Form inputs clear, counters reset, expanded accordions collapse after save

### Pitfall 2: Duplicate Event Listeners

**What goes wrong:** Each HMR update adds more event listeners, causing handlers to fire multiple times
**Why it happens:** Event listeners not cleaned up before module replacement
**How to avoid:** Track all listeners via cleanup tracker, remove in `dispose()` handler
**Warning signs:** Click handlers fire 2x, 3x, etc. after multiple saves; console logs multiply

### Pitfall 3: Timer Accumulation

**What goes wrong:** setInterval callbacks multiply, timers from old modules keep running
**Why it happens:** Timers hold references to old module closures, never cleared
**How to avoid:** Use tracked timers via cleanup context, clearInterval in dispose
**Warning signs:** Animation speeds up, polling gets faster, CPU usage increases

### Pitfall 4: WebSocket Connection Storms

**What goes wrong:** Many simultaneous reconnection attempts after dev server restart
**Why it happens:** All clients reconnect immediately at same time
**How to avoid:** Exponential backoff with random jitter
**Warning signs:** Dev server overloaded after restart, slow reconnection

### Pitfall 5: Scroll Jump on Update

**What goes wrong:** Page scrolls to top or wrong position after HMR update
**Why it happens:** DOM replacement resets scroll, or layout shift moves content
**How to avoid:** Capture scroll before update, check for layout changes, restore if stable
**Warning signs:** User loses reading position, has to re-scroll after every save

### Pitfall 6: Style Duplication

**What goes wrong:** Styles multiply with each HMR update, selectors conflict
**Why it happens:** Style injection without cleanup, or Shadow DOM not used for isolation
**How to avoid:** Clean up injected styles in dispose, use Shadow DOM for overlay
**Warning signs:** CSS specificity wars, overlay styles leaking, multiple style tags

## Code Examples

Verified patterns from official sources:

### HMR-Enabled Component Module

```javascript
// Source: Vite HMR API pattern adapted for Coherent.js

import { hydrate } from '@coherent.js/client';

// Component definition
function Counter(props) {
  return {
    div: {
      'data-coherent-component': 'Counter',
      children: [
        { span: { text: `Count: ${props.count}` } },
        { button: { text: '+', 'data-coherent-click': 'increment' } }
      ]
    }
  };
}

// HMR handling
if (import.meta.hot) {
  // Accept self-updates
  import.meta.hot.accept((newModule) => {
    // Re-hydrate with preserved state
    const containers = document.querySelectorAll('[data-coherent-component="Counter"]');
    containers.forEach(container => {
      const control = container.__coherentControl;
      if (control) {
        const state = control.getState();
        control.unmount();
        const newControl = hydrate(newModule.Counter, container, {
          initialState: state
        });
        container.__coherentControl = newControl;
      }
    });
    console.log('[HMR] Updated: Counter.js');
  });

  // Cleanup handler
  import.meta.hot.dispose((data) => {
    // Save state for next version
    const containers = document.querySelectorAll('[data-coherent-component="Counter"]');
    data.states = [];
    containers.forEach(container => {
      const control = container.__coherentControl;
      if (control) {
        data.states.push(control.getState());
      }
    });
  });

  // Restore from previous version
  if (import.meta.hot.data?.states) {
    // State will be restored in accept callback
  }
}

export { Counter };
```

### Dev Server HMR Message Protocol

```javascript
// Source: Vite dev server HMR protocol

// Server -> Client messages
const serverMessages = {
  // File changed, can be hot updated
  update: {
    type: 'hmr-component-update',
    filePath: '/src/components/Counter.js',
    webPath: '/src/components/Counter.js',
    updateType: 'component',
    timestamp: Date.now()
  },

  // File changed, requires full reload
  fullReload: {
    type: 'hmr-full-reload',
    reason: 'Non-component file changed'
  },

  // Syntax/runtime error
  error: {
    type: 'hmr-error',
    error: {
      message: 'SyntaxError: Unexpected token',
      file: '/src/components/Counter.js',
      line: 15,
      column: 10,
      frame: '  14 | function Counter() {\n> 15 |   return {\n     |          ^\n  16 |     div: {',
      stack: 'SyntaxError: Unexpected token...'
    }
  },

  // Connected acknowledgment
  connected: {
    type: 'connected'
  }
};

// Client -> Server messages
const clientMessages = {
  // Connection established
  connected: {
    type: 'connected'
  },

  // Module invalidated (propagate to importers)
  invalidate: {
    type: 'invalidate',
    moduleId: '/src/components/Counter.js',
    message: 'Cannot hot update, propagating'
  }
};
```

## State of the Art

| Old Approach | Current Approach | When Changed | Impact |
|--------------|------------------|--------------|--------|
| Full reload on any change | Module-level HMR boundaries | 2015+ (webpack) | Preserves application state |
| Manual cleanup | Tracked dispose handlers | 2018+ (HMR v4) | Prevents memory leaks |
| iframe error display | Shadow DOM overlays | 2020+ (Vite) | Better style isolation |
| Immediate reconnect | Exponential backoff | Standard practice | Server-friendly |
| Component-specific HMR | Framework-agnostic HMR API | 2020+ (esm-hmr) | Reusable across frameworks |

**Deprecated/outdated:**
- Inline `module.hot` API: Replaced by `import.meta.hot` for ESM
- Synchronous accept: All modern HMR uses async module loading
- Global error handlers: Use scoped overlays instead

## Open Questions

Things that couldn't be fully resolved:

1. **Module boundary detection for Coherent.js objects**
   - What we know: Virtual DOM object functions don't have clear module boundaries like React components
   - What's unclear: How to determine which file changes can be hot-updated vs require full reload
   - Recommendation: Mark component files explicitly with `export const __hmrBoundary = true` or detect by `data-coherent-component` presence

2. **CSS-in-JS style cleanup**
   - What we know: Coherent.js doesn't have built-in CSS-in-JS
   - What's unclear: If users add styles dynamically, how to track for cleanup
   - Recommendation: Document pattern for tracked style injection, but don't build complex CSS tracking

3. **Multi-tab HMR synchronization**
   - What we know: Each tab has its own WebSocket connection
   - What's unclear: Should state sync across tabs during HMR?
   - Recommendation: Each tab manages its own HMR independently, no cross-tab sync

## Sources

### Primary (HIGH confidence)

- [Vite HMR API Documentation](https://vite.dev/guide/api-hmr) - Official API reference
- [Webpack HMR API](https://webpack.js.org/api/hot-module-replacement/) - Complete API documentation
- Coherent.js existing codebase:
  - `packages/client/src/hmr.js` - Current HMR client (106 lines)
  - `packages/client/src/hydrate.js` - Phase 2 hydration API
  - `packages/client/src/events/delegation.js` - Event delegation system
  - `packages/devtools/src/enhanced-errors.js` - Error handling patterns

### Secondary (MEDIUM confidence)

- [Hot Module Replacement is Easy](https://bjornlu.com/blog/hot-module-replacement-is-easy) - Bjorn Lu's deep dive
- [React Router HMR docs](https://reactrouter.com/explanation/hot-module-replacement) - State preservation patterns
- [WebSocket Reconnection Strategies](https://dev.to/hexshift/robust-websocket-reconnection-strategies-in-javascript-with-exponential-backoff-40n1) - Exponential backoff patterns
- [GitHub josh/scroll-anchoring](https://github.com/josh/scroll-anchoring) - Scroll preservation during DOM mutations

### Tertiary (LOW confidence)

- MDN documentation for native APIs (WebSocket, MutationObserver, AbortController)
- General memory leak prevention patterns in JavaScript

## Metadata

**Confidence breakdown:**
- Standard stack: HIGH - Native APIs, well-documented patterns
- Architecture: HIGH - Follows Vite/webpack established patterns
- Pitfalls: HIGH - Confirmed by analyzing common HMR issues and existing hmr.js code

**Research date:** 2026-01-22
**Valid until:** 60 days - HMR patterns are stable, unlikely to change significantly
