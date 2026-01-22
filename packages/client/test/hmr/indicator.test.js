/**
 * ConnectionIndicator Tests for Coherent.js HMR
 *
 * Tests the connection status indicator that shows HMR connection state.
 */

import { describe, it, expect, vi, beforeEach, afterEach } from 'vitest';
import { ConnectionIndicator, connectionIndicator } from '../../src/hmr/indicator.js';

describe('ConnectionIndicator', () => {
  let indicator;
  let mockBody;
  let mockIndicatorEl;

  beforeEach(() => {
    // Create mock indicator element
    mockIndicatorEl = {
      id: '',
      style: {
        cssText: '',
        background: ''
      },
      title: '',
      parentNode: null
    };

    // Create mock body
    mockBody = {
      appendChild: vi.fn((child) => {
        child.parentNode = mockBody;
        return child;
      }),
      removeChild: vi.fn((child) => {
        child.parentNode = null;
        return child;
      })
    };

    // Setup global mocks
    global.document = {
      createElement: vi.fn(() => mockIndicatorEl),
      body: mockBody
    };

    indicator = new ConnectionIndicator();
  });

  afterEach(() => {
    indicator.destroy();
    delete global.document;
  });

  describe('create', () => {
    it('creates element and adds to document body', () => {
      indicator.create();

      expect(global.document.createElement).toHaveBeenCalledWith('div');
      expect(mockBody.appendChild).toHaveBeenCalledWith(mockIndicatorEl);
      expect(indicator.indicator).toBe(mockIndicatorEl);
    });

    it('sets element id', () => {
      indicator.create();

      expect(mockIndicatorEl.id).toBe('coherent-hmr-indicator');
    });

    it('applies inline styles', () => {
      indicator.create();

      expect(mockIndicatorEl.style.cssText).toContain('position: fixed');
      expect(mockIndicatorEl.style.cssText).toContain('bottom: 8px');
      expect(mockIndicatorEl.style.cssText).toContain('right: 8px');
      expect(mockIndicatorEl.style.cssText).toContain('width: 8px');
      expect(mockIndicatorEl.style.cssText).toContain('height: 8px');
      expect(mockIndicatorEl.style.cssText).toContain('border-radius: 50%');
      expect(mockIndicatorEl.style.cssText).toContain('z-index: 99998');
      expect(mockIndicatorEl.style.cssText).toContain('pointer-events: none');
      expect(mockIndicatorEl.style.cssText).toContain('transition: background 0.3s ease');
    });

    it('sets default gray background', () => {
      indicator.create();

      expect(mockIndicatorEl.style.cssText).toContain('#666');
    });

    it('sets initial title', () => {
      indicator.create();

      expect(mockIndicatorEl.title).toBe('HMR: Initializing');
    });

    it('does not recreate if already exists', () => {
      indicator.create();
      indicator.create();

      expect(global.document.createElement).toHaveBeenCalledTimes(1);
    });
  });

  describe('update', () => {
    it('sets green background for connected status', () => {
      indicator.update('connected');

      expect(mockIndicatorEl.style.background).toBe('#10b981');
    });

    it('sets red background for disconnected status', () => {
      indicator.update('disconnected');

      expect(mockIndicatorEl.style.background).toBe('#ef4444');
    });

    it('sets yellow background for reconnecting status', () => {
      indicator.update('reconnecting');

      expect(mockIndicatorEl.style.background).toBe('#f59e0b');
    });

    it('sets red background for error status', () => {
      indicator.update('error');

      expect(mockIndicatorEl.style.background).toBe('#ef4444');
    });

    it('sets corresponding title for connected', () => {
      indicator.update('connected');

      expect(mockIndicatorEl.title).toBe('HMR: Connected');
    });

    it('sets corresponding title for disconnected', () => {
      indicator.update('disconnected');

      expect(mockIndicatorEl.title).toBe('HMR: Disconnected');
    });

    it('sets corresponding title for reconnecting', () => {
      indicator.update('reconnecting');

      expect(mockIndicatorEl.title).toBe('HMR: Reconnecting...');
    });

    it('sets corresponding title for error', () => {
      indicator.update('error');

      expect(mockIndicatorEl.title).toBe('HMR: Error');
    });

    it('auto-creates element if not exists', () => {
      expect(indicator.indicator).toBeNull();

      indicator.update('connected');

      expect(indicator.indicator).toBeTruthy();
      expect(mockBody.appendChild).toHaveBeenCalled();
    });

    it('falls back to disconnected color for unknown status', () => {
      indicator.update('unknown');

      expect(mockIndicatorEl.style.background).toBe('#ef4444');
    });

    it('falls back to unknown title for unknown status', () => {
      indicator.update('unknown');

      expect(mockIndicatorEl.title).toBe('HMR: Unknown');
    });
  });

  describe('destroy', () => {
    it('removes element from DOM', () => {
      indicator.create();

      indicator.destroy();

      expect(mockBody.removeChild).toHaveBeenCalledWith(mockIndicatorEl);
    });

    it('nulls indicator reference', () => {
      indicator.create();

      indicator.destroy();

      expect(indicator.indicator).toBeNull();
    });

    it('is safe to call when not created', () => {
      expect(() => indicator.destroy()).not.toThrow();
    });

    it('is safe to call multiple times', () => {
      indicator.create();

      indicator.destroy();
      indicator.destroy();

      expect(mockBody.removeChild).toHaveBeenCalledTimes(1);
    });
  });

  describe('lazy creation', () => {
    it('does not create element on construction', () => {
      const newIndicator = new ConnectionIndicator();

      expect(newIndicator.indicator).toBeNull();
      expect(global.document.createElement).not.toHaveBeenCalled();
    });

    it('creates element only on first update', () => {
      const newIndicator = new ConnectionIndicator();

      expect(global.document.createElement).not.toHaveBeenCalled();

      newIndicator.update('connected');

      expect(global.document.createElement).toHaveBeenCalledTimes(1);

      newIndicator.update('disconnected');

      expect(global.document.createElement).toHaveBeenCalledTimes(1);
    });
  });
});

describe('connectionIndicator singleton', () => {
  beforeEach(() => {
    global.document = {
      createElement: vi.fn(() => ({
        id: '',
        style: { cssText: '', background: '' },
        title: '',
        parentNode: null
      })),
      body: {
        appendChild: vi.fn(),
        removeChild: vi.fn()
      }
    };
  });

  afterEach(() => {
    delete global.document;
  });

  it('is an instance of ConnectionIndicator', () => {
    expect(connectionIndicator).toBeInstanceOf(ConnectionIndicator);
  });
});
