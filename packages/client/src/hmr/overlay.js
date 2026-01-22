/**
 * HMR Error Overlay
 *
 * Displays error information in a full-screen overlay with Shadow DOM isolation.
 * Provides click-to-open editor support and keyboard/click dismissal.
 *
 * @module @coherent.js/client/hmr/overlay
 */

/**
 * Escape HTML special characters to prevent XSS.
 * @param {string} str - String to escape
 * @returns {string} Escaped string
 */
export function escapeHtml(str) {
  return String(str)
    .replace(/&/g, '&amp;')
    .replace(/</g, '&lt;')
    .replace(/>/g, '&gt;')
    .replace(/"/g, '&quot;');
}

/**
 * Format code frame with line numbers and highlight.
 * @param {string} frame - Code frame content
 * @param {number} highlightLine - Line number to highlight (1-based)
 * @param {number} [startLine=1] - Starting line number for the frame
 * @returns {string} Formatted HTML string
 */
export function formatCodeFrame(frame, highlightLine, startLine = 1) {
  if (!frame) return '';

  const lines = frame.split('\n');
  return lines.map((content, i) => {
    const lineNum = startLine + i;
    const isHighlight = lineNum === highlightLine;
    return `<div class="line${isHighlight ? ' highlight' : ''}">
      <span class="line-number">${lineNum}</span>
      <span class="line-content">${escapeHtml(content)}</span>
    </div>`;
  }).join('');
}

/**
 * Editor URL scheme map for click-to-open functionality.
 */
const EDITOR_URLS = {
  vscode: (file, line) => `vscode://file/${file}:${line}`,
  cursor: (file, line) => `cursor://file/${file}:${line}`,
  'vscode-insiders': (file, line) => `vscode-insiders://file/${file}:${line}`,
  atom: (file, line) => `atom://core/open/file?filename=${file}&line=${line}`,
  sublime: (file, line) => `subl://open?url=file://${file}&line=${line}`,
  webstorm: (file, line) => `webstorm://open?file=${file}&line=${line}`,
  idea: (file, line) => `idea://open?file=${file}&line=${line}`
};

/**
 * CSS styles for the error overlay (Dracula-inspired color scheme).
 */
const OVERLAY_STYLES = `
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
    --code-bg: #282a36;
    --line-num: #6272a4;
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
    font-family: 'SF Mono', Monaco, Consolas, 'Liberation Mono', 'Courier New', monospace;
  }
  .header {
    padding: 16px 20px;
    background: var(--red);
    color: white;
    display: flex;
    justify-content: space-between;
    align-items: center;
    border-radius: 8px 8px 0 0;
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
    line-height: 1;
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
    background: var(--code-bg);
    padding: 16px;
    border-radius: 4px;
    overflow-x: auto;
    font-size: 14px;
    line-height: 1.5;
    margin-bottom: 16px;
  }
  .line {
    display: flex;
  }
  .line-number {
    width: 50px;
    color: var(--line-num);
    text-align: right;
    padding-right: 16px;
    user-select: none;
    flex-shrink: 0;
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
    color: var(--line-num);
    white-space: pre-wrap;
    max-height: 200px;
    overflow-y: auto;
  }
  .tip {
    margin-top: 16px;
    padding: 12px;
    background: rgba(189, 147, 249, 0.1);
    border-left: 3px solid var(--purple);
    font-size: 13px;
    color: var(--text);
  }
  .tip strong {
    color: var(--purple);
  }
`;

/**
 * Error overlay class for HMR error display.
 * Uses Shadow DOM for complete style isolation.
 */
export class ErrorOverlay {
  constructor() {
    /** @type {{ host: HTMLElement, shadow: ShadowRoot } | null} */
    this.overlay = null;
    /** @type {string} */
    this.editor = this._getStoredEditor();
    /** @type {((e: KeyboardEvent) => void) | null} */
    this.escapeHandler = null;
  }

  /**
   * Get stored editor preference from localStorage.
   * @returns {string} Editor name
   * @private
   */
  _getStoredEditor() {
    try {
      return localStorage.getItem('coherent-editor') || 'vscode';
    } catch {
      return 'vscode';
    }
  }

  /**
   * Create the overlay element with Shadow DOM.
   * @returns {{ host: HTMLElement, shadow: ShadowRoot }} Overlay elements
   */
  createOverlay() {
    if (this.overlay) return this.overlay;

    const host = document.createElement('div');
    host.id = 'coherent-error-overlay';
    const shadow = host.attachShadow({ mode: 'open' });

    const style = document.createElement('style');
    style.textContent = OVERLAY_STYLES;
    shadow.appendChild(style);

    this.overlay = { host, shadow };
    return this.overlay;
  }

  /**
   * Show the error overlay with error details.
   * @param {Object} error - Error details
   * @param {string} error.message - Error message
   * @param {string} [error.file] - File path
   * @param {number} [error.line] - Line number
   * @param {number} [error.column] - Column number
   * @param {string} [error.frame] - Code frame with context
   * @param {string} [error.stack] - Stack trace
   */
  show(error) {
    const { host, shadow } = this.createOverlay();

    // Clear previous content (but keep styles)
    const existingWrapper = shadow.querySelector('.wrapper');
    if (existingWrapper) existingWrapper.remove();

    // Calculate start line for code frame (center on error line)
    const frameLines = error.frame ? error.frame.split('\n').length : 0;
    const startLine = error.line ? Math.max(1, error.line - Math.floor(frameLines / 2)) : 1;

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
          <div class="message">${escapeHtml(error.message || 'Unknown error')}</div>
          ${error.file ? `
            <div class="file" data-file="${escapeHtml(error.file)}" data-line="${error.line || 1}">
              ${escapeHtml(error.file)}${error.line ? `:${error.line}` : ''}${error.column ? `:${error.column}` : ''}
            </div>
          ` : ''}
          ${error.frame ? `
            <div class="code-frame">${formatCodeFrame(error.frame, error.line, startLine)}</div>
          ` : ''}
          ${error.stack ? `
            <div class="stack">${escapeHtml(error.stack)}</div>
          ` : ''}
          <div class="tip">
            Press <strong>Escape</strong> or click the X to dismiss.
            ${error.file ? ` Click the file path to open in ${this.editor}.` : ''}
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
      const target = e.target;
      const file = target.dataset.file;
      const line = parseInt(target.dataset.line, 10) || 1;
      this.openInEditor(file, line);
    });

    // Escape key handler
    this.escapeHandler = (e) => {
      if (e.key === 'Escape') this.hide();
    };
    document.addEventListener('keydown', this.escapeHandler);

    // Add to DOM if not already
    if (!host.parentNode) {
      document.body.appendChild(host);
    }
  }

  /**
   * Hide and remove the error overlay.
   */
  hide() {
    if (this.overlay?.host.parentNode) {
      this.overlay.host.parentNode.removeChild(this.overlay.host);
    }
    if (this.escapeHandler) {
      document.removeEventListener('keydown', this.escapeHandler);
      this.escapeHandler = null;
    }
    // Reset overlay reference so it can be recreated
    this.overlay = null;
  }

  /**
   * Open file in configured editor.
   * @param {string} file - File path
   * @param {number} [line=1] - Line number
   */
  openInEditor(file, line = 1) {
    const urlGenerator = EDITOR_URLS[this.editor] || EDITOR_URLS.vscode;
    const url = urlGenerator(file, line);
    window.open(url, '_self');
  }

  /**
   * Set preferred editor and store in localStorage.
   * @param {string} editor - Editor name (vscode, cursor, vscode-insiders, atom, sublime, webstorm, idea)
   */
  setEditor(editor) {
    this.editor = editor;
    try {
      localStorage.setItem('coherent-editor', editor);
    } catch {
      // Ignore localStorage errors
    }
  }
}

/**
 * Singleton instance of ErrorOverlay.
 */
export const errorOverlay = new ErrorOverlay();
