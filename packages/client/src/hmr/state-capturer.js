/**
 * StateCapturer - Captures and restores form input state and scroll positions during HMR
 *
 * Preserves user input and scroll positions across hot module replacement updates,
 * providing a seamless development experience. Only restores scroll position if
 * the page layout hasn't changed significantly.
 *
 * @module @coherent.js/client/hmr/state-capturer
 */

/**
 * Captures and restores form/scroll state during HMR
 */
export class StateCapturer {
  constructor() {
    /**
     * Captured form input states
     * @type {Map<string, { value: string, type: string, selectionStart?: number, selectionEnd?: number, checked?: boolean }>}
     */
    this.capturedInputs = new Map();

    /**
     * Captured scroll positions
     * @type {Map<string, { top: number, left: number }>}
     */
    this.scrollPositions = new Map();

    /**
     * Layout snapshot for change detection
     * @type {Object|null}
     */
    this.layoutSnapshot = null;
  }

  /**
   * Generate a stable key for an input element
   *
   * Uses multiple factors to identify inputs across HMR updates:
   * 1. ID (most stable)
   * 2. Name + type
   * 3. Form context
   * 4. DOM path (fallback)
   *
   * @param {HTMLInputElement|HTMLTextAreaElement|HTMLSelectElement} input - Input element
   * @returns {string} Stable key for the input
   */
  getInputKey(input) {
    const parts = [];

    // ID is most stable
    if (input.id) {
      parts.push(`#${input.id}`);
      return parts.join(':');
    }

    // Name + type combination
    if (input.name) {
      parts.push(`[name="${input.name}"]`);
    }

    if (input.type) {
      parts.push(`[type="${input.type}"]`);
    }

    // Form context if available
    if (input.form?.id) {
      parts.push(`form#${input.form.id}`);
    }

    // Fallback: DOM path
    if (parts.length === 0) {
      parts.push(this.getElementPath(input));
    }

    return parts.join(':');
  }

  /**
   * Build a CSS-like path for an element
   *
   * @param {HTMLElement} element - Element to build path for
   * @returns {string} CSS-like path (e.g., "form > div:nth-of-type(2) > input")
   */
  getElementPath(element) {
    const path = [];
    let current = element;

    while (current && current !== document.body && path.length < 10) {
      let selector = current.tagName.toLowerCase();

      // Add class names (limited to avoid overly long selectors)
      if (current.className && typeof current.className === 'string') {
        const classes = current.className.trim().split(/\s+/).slice(0, 2);
        if (classes.length > 0 && classes[0]) {
          selector += `.${classes.join('.')}`;
        }
      }

      // Add nth-of-type for disambiguation
      if (current.parentElement) {
        const siblings = current.parentElement.querySelectorAll(
          `:scope > ${current.tagName.toLowerCase()}`
        );
        if (siblings.length > 1) {
          const index = Array.from(siblings).indexOf(current);
          selector += `:nth-of-type(${index + 1})`;
        }
      }

      path.unshift(selector);
      current = current.parentElement;
    }

    return path.join(' > ');
  }

  /**
   * Capture all form input states
   *
   * Iterates through all input, textarea, and select elements,
   * capturing their values, selection state, and checked state.
   *
   * @returns {Map<string, Object>} Map of input keys to their captured state
   */
  captureFormState() {
    this.capturedInputs.clear();

    const inputs = document.querySelectorAll('input, textarea, select');

    for (const input of inputs) {
      const key = this.getInputKey(input);
      const state = {
        value: input.value,
        type: input.type || input.tagName.toLowerCase(),
      };

      // Capture selection for text-like inputs
      if (
        typeof input.selectionStart === 'number' &&
        (input.type === 'text' ||
          input.type === 'search' ||
          input.type === 'url' ||
          input.type === 'tel' ||
          input.type === 'password' ||
          input.tagName.toLowerCase() === 'textarea')
      ) {
        state.selectionStart = input.selectionStart;
        state.selectionEnd = input.selectionEnd;
      }

      // Capture checked state for checkboxes/radios
      if (input.type === 'checkbox' || input.type === 'radio') {
        state.checked = input.checked;
      }

      this.capturedInputs.set(key, state);
    }

    return this.capturedInputs;
  }

  /**
   * Restore form input states after HMR update
   *
   * Finds inputs by their captured keys and restores their values,
   * only if the input type matches (to avoid corrupting data).
   */
  restoreFormState() {
    for (const [key, state] of this.capturedInputs) {
      const inputs = this.findInputsByKey(key);

      for (const input of inputs) {
        // Only restore if type matches
        const currentType = input.type || input.tagName.toLowerCase();
        if (currentType !== state.type) {
          continue;
        }

        // Restore checkbox/radio checked state
        if (state.checked !== undefined) {
          input.checked = state.checked;
          continue;
        }

        // Restore value
        input.value = state.value;

        // Restore selection if applicable and input is not focused
        if (
          state.selectionStart !== undefined &&
          document.activeElement !== input
        ) {
          try {
            input.setSelectionRange(state.selectionStart, state.selectionEnd);
          } catch {
            // Some input types don't support setSelectionRange
          }
        }
      }
    }
  }

  /**
   * Find inputs matching a captured key
   *
   * @param {string} key - Captured input key
   * @returns {HTMLElement[]} Array of matching input elements
   */
  findInputsByKey(key) {
    // ID-based key
    if (key.startsWith('#')) {
      const id = key.slice(1);
      const el = document.getElementById(id);
      return el ? [el] : [];
    }

    // Name-based key
    const nameMatch = key.match(/\[name="([^"]+)"\]/);
    if (nameMatch) {
      const name = nameMatch[1];
      const typeMatch = key.match(/\[type="([^"]+)"\]/);
      const type = typeMatch ? typeMatch[1] : null;

      let selector = `[name="${name}"]`;
      if (type) {
        selector += `[type="${type}"]`;
      }

      return Array.from(document.querySelectorAll(selector));
    }

    // Path-based key - try to query directly
    try {
      const el = document.querySelector(key);
      return el ? [el] : [];
    } catch {
      return [];
    }
  }

  /**
   * Capture scroll positions for window and scrollable containers
   *
   * Captures scroll positions for:
   * - Window (scrollX/scrollY)
   * - Elements with [data-coherent-scroll-preserve] attribute
   * - Elements with overflow that have actual scrolling
   */
  captureScrollPositions() {
    this.scrollPositions.clear();

    // Window scroll
    this.scrollPositions.set('window', {
      top: window.scrollY,
      left: window.scrollX,
    });

    // Find scrollable containers with explicit marker
    const markedScrollables = document.querySelectorAll(
      '[data-coherent-scroll-preserve]'
    );
    for (const el of markedScrollables) {
      const key = this.getScrollableKey(el);
      this.scrollPositions.set(key, {
        top: el.scrollTop,
        left: el.scrollLeft,
      });
    }

    // Find elements with overflow that have actual scroll content
    const overflowElements = document.querySelectorAll(
      '[style*="overflow"], [class]'
    );
    for (const el of overflowElements) {
      const style = window.getComputedStyle(el);
      const hasOverflow =
        style.overflow === 'auto' ||
        style.overflow === 'scroll' ||
        style.overflowY === 'auto' ||
        style.overflowY === 'scroll' ||
        style.overflowX === 'auto' ||
        style.overflowX === 'scroll';

      if (
        hasOverflow &&
        (el.scrollHeight > el.clientHeight || el.scrollWidth > el.clientWidth)
      ) {
        const key = this.getScrollableKey(el);
        if (!this.scrollPositions.has(key)) {
          this.scrollPositions.set(key, {
            top: el.scrollTop,
            left: el.scrollLeft,
          });
        }
      }
    }

    return this.scrollPositions;
  }

  /**
   * Generate a stable key for a scrollable element
   *
   * @param {HTMLElement} el - Scrollable element
   * @returns {string} Key for the element
   */
  getScrollableKey(el) {
    if (el.id) {
      return `#${el.id}`;
    }

    const component = el.getAttribute('data-coherent-component');
    if (component) {
      return `[data-coherent-component="${component}"]`;
    }

    return this.getElementPath(el);
  }

  /**
   * Capture layout snapshot for change detection
   *
   * Captures body dimensions and positions of anchor elements
   * (elements with data-coherent-component attribute).
   */
  captureLayout() {
    this.layoutSnapshot = {
      bodyHeight: document.body.scrollHeight,
      bodyWidth: document.body.scrollWidth,
      anchors: new Map(),
    };

    // Capture positions of component elements as anchors
    const components = document.querySelectorAll('[data-coherent-component]');
    for (const el of components) {
      const rect = el.getBoundingClientRect();
      const key = this.getScrollableKey(el);
      this.layoutSnapshot.anchors.set(key, {
        top: rect.top,
        left: rect.left,
        width: rect.width,
        height: rect.height,
      });
    }
  }

  /**
   * Check if layout changed significantly (>50px shift)
   *
   * Returns true if:
   * - Body dimensions changed by more than 50px
   * - Any anchor element position shifted by more than 50px
   *
   * @returns {boolean} True if layout changed significantly
   */
  layoutChangedSignificantly() {
    if (!this.layoutSnapshot) {
      return false;
    }

    const THRESHOLD = 50; // pixels

    // Check body dimensions
    const heightDiff = Math.abs(
      document.body.scrollHeight - this.layoutSnapshot.bodyHeight
    );
    const widthDiff = Math.abs(
      document.body.scrollWidth - this.layoutSnapshot.bodyWidth
    );

    if (heightDiff > THRESHOLD || widthDiff > THRESHOLD) {
      return true;
    }

    // Check anchor element positions
    for (const [key, oldRect] of this.layoutSnapshot.anchors) {
      const el = this.findElementByKey(key);
      if (!el) {
        continue;
      }

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
   * Find an element by its scrollable key
   *
   * @param {string} key - Element key
   * @returns {HTMLElement|null} Found element or null
   */
  findElementByKey(key) {
    if (key === 'window') {
      return null;
    }

    if (key.startsWith('#')) {
      return document.getElementById(key.slice(1));
    }

    try {
      return document.querySelector(key);
    } catch {
      return null;
    }
  }

  /**
   * Restore scroll positions if layout hasn't changed significantly
   *
   * Logs a message if scroll restoration is skipped due to layout changes.
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
    for (const [key, pos] of this.scrollPositions) {
      if (key === 'window') {
        continue;
      }

      const el = this.findElementByKey(key);
      if (el) {
        el.scrollTop = pos.top;
        el.scrollLeft = pos.left;
      }
    }
  }

  /**
   * Capture all state (form + scroll + layout)
   *
   * Convenience method that calls all capture methods.
   */
  captureAll() {
    this.captureFormState();
    this.captureScrollPositions();
    this.captureLayout();
  }

  /**
   * Restore all state (form + scroll)
   *
   * Convenience method that calls all restore methods.
   */
  restoreAll() {
    this.restoreFormState();
    this.restoreScrollPositions();
  }

  /**
   * Clear all captured state
   */
  clear() {
    this.capturedInputs.clear();
    this.scrollPositions.clear();
    this.layoutSnapshot = null;
  }
}

/**
 * Singleton state capturer instance
 * @type {StateCapturer}
 */
export const stateCapturer = new StateCapturer();
