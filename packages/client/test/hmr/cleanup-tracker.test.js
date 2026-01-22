/**
 * CleanupTracker Tests for Coherent.js HMR
 *
 * Tests the resource tracking and cleanup functionality for HMR module disposal.
 */

import { describe, it, expect, vi, beforeEach, afterEach } from 'vitest';
import { CleanupTracker, cleanupTracker } from '../../src/hmr/cleanup-tracker.js';

describe('CleanupTracker', () => {
  let tracker;

  beforeEach(() => {
    tracker = new CleanupTracker();
    vi.useFakeTimers();
  });

  afterEach(() => {
    vi.useRealTimers();
  });

  describe('createContext', () => {
    it('returns context with tracked methods', () => {
      const ctx = tracker.createContext('test-module');

      expect(typeof ctx.setTimeout).toBe('function');
      expect(typeof ctx.setInterval).toBe('function');
      expect(typeof ctx.clearTimeout).toBe('function');
      expect(typeof ctx.clearInterval).toBe('function');
      expect(typeof ctx.addEventListener).toBe('function');
      expect(typeof ctx.createAbortController).toBe('function');
      expect(typeof ctx.fetch).toBe('function');
    });

    it('creates resource entry for module', () => {
      tracker.createContext('test-module');

      expect(tracker.hasResources('test-module')).toBe(true);
    });
  });

  describe('tracked setTimeout', () => {
    it('fires callback and auto-removes from tracking', () => {
      const ctx = tracker.createContext('test-module');
      const callback = vi.fn();

      ctx.setTimeout(callback, 100);

      expect(tracker.getResourceCounts('test-module').timers).toBe(1);
      expect(callback).not.toHaveBeenCalled();

      vi.advanceTimersByTime(100);

      expect(callback).toHaveBeenCalledOnce();
      expect(tracker.getResourceCounts('test-module').timers).toBe(0);
    });

    it('passes arguments to callback', () => {
      const ctx = tracker.createContext('test-module');
      const callback = vi.fn();

      ctx.setTimeout(callback, 50, 'arg1', 'arg2');
      vi.advanceTimersByTime(50);

      expect(callback).toHaveBeenCalledWith('arg1', 'arg2');
    });

    it('returns timer ID that can be used with clearTimeout', () => {
      const ctx = tracker.createContext('test-module');
      const callback = vi.fn();

      const id = ctx.setTimeout(callback, 100);

      // ID should be defined and usable
      expect(id).toBeDefined();

      // Should be able to clear using the returned ID
      ctx.clearTimeout(id);
      vi.advanceTimersByTime(100);

      expect(callback).not.toHaveBeenCalled();
    });
  });

  describe('tracked setInterval', () => {
    it('stays in tracking until cleared', () => {
      const ctx = tracker.createContext('test-module');
      const callback = vi.fn();

      const id = ctx.setInterval(callback, 100);

      expect(tracker.getResourceCounts('test-module').intervals).toBe(1);

      vi.advanceTimersByTime(100);
      expect(callback).toHaveBeenCalledTimes(1);
      expect(tracker.getResourceCounts('test-module').intervals).toBe(1);

      vi.advanceTimersByTime(100);
      expect(callback).toHaveBeenCalledTimes(2);
      expect(tracker.getResourceCounts('test-module').intervals).toBe(1);

      ctx.clearInterval(id);
      expect(tracker.getResourceCounts('test-module').intervals).toBe(0);
    });

    it('passes arguments to callback', () => {
      const ctx = tracker.createContext('test-module');
      const callback = vi.fn();

      ctx.setInterval(callback, 50, 'x', 'y');
      vi.advanceTimersByTime(50);

      expect(callback).toHaveBeenCalledWith('x', 'y');
    });
  });

  describe('tracked clearTimeout', () => {
    it('removes timer from tracking and clears it', () => {
      const ctx = tracker.createContext('test-module');
      const callback = vi.fn();

      const id = ctx.setTimeout(callback, 100);
      expect(tracker.getResourceCounts('test-module').timers).toBe(1);

      ctx.clearTimeout(id);

      expect(tracker.getResourceCounts('test-module').timers).toBe(0);

      vi.advanceTimersByTime(100);
      expect(callback).not.toHaveBeenCalled();
    });
  });

  describe('tracked clearInterval', () => {
    it('removes interval from tracking and clears it', () => {
      const ctx = tracker.createContext('test-module');
      const callback = vi.fn();

      const id = ctx.setInterval(callback, 100);
      expect(tracker.getResourceCounts('test-module').intervals).toBe(1);

      ctx.clearInterval(id);

      expect(tracker.getResourceCounts('test-module').intervals).toBe(0);

      vi.advanceTimersByTime(200);
      expect(callback).not.toHaveBeenCalled();
    });
  });

  describe('tracked addEventListener', () => {
    it('stores listener info for cleanup', () => {
      const ctx = tracker.createContext('test-module');
      const target = {
        addEventListener: vi.fn(),
        removeEventListener: vi.fn(),
      };
      const handler = vi.fn();

      ctx.addEventListener(target, 'click', handler, { capture: true });

      expect(target.addEventListener).toHaveBeenCalledWith(
        'click',
        handler,
        { capture: true }
      );
      expect(tracker.getResourceCounts('test-module').listeners).toBe(1);
    });

    it('tracks multiple listeners', () => {
      const ctx = tracker.createContext('test-module');
      const target = { addEventListener: vi.fn() };

      ctx.addEventListener(target, 'click', vi.fn());
      ctx.addEventListener(target, 'keydown', vi.fn());
      ctx.addEventListener(target, 'submit', vi.fn());

      expect(tracker.getResourceCounts('test-module').listeners).toBe(3);
    });
  });

  describe('tracked createAbortController', () => {
    it('creates and tracks AbortController', () => {
      const ctx = tracker.createContext('test-module');

      const controller = ctx.createAbortController();

      expect(controller).toBeInstanceOf(AbortController);
      expect(tracker.getResourceCounts('test-module').abortControllers).toBe(1);
    });
  });

  describe('tracked fetch', () => {
    let originalFetch;

    beforeEach(() => {
      originalFetch = global.fetch;
      global.fetch = vi.fn(() =>
        Promise.resolve({ ok: true })
      );
    });

    afterEach(() => {
      global.fetch = originalFetch;
    });

    it('creates AbortController and passes signal', async () => {
      vi.useRealTimers();
      const ctx = tracker.createContext('test-module');

      await ctx.fetch('https://example.com/api');

      expect(global.fetch).toHaveBeenCalledWith(
        'https://example.com/api',
        expect.objectContaining({
          signal: expect.any(AbortSignal),
        })
      );
      vi.useFakeTimers();
    });

    it('removes AbortController from tracking after completion', async () => {
      vi.useRealTimers();
      const ctx = tracker.createContext('test-module');

      expect(tracker.getResourceCounts('test-module').abortControllers).toBe(0);

      const fetchPromise = ctx.fetch('https://example.com/api');
      // Controller is added immediately
      expect(tracker.getResourceCounts('test-module').abortControllers).toBe(1);

      await fetchPromise;
      // Controller is removed after completion
      expect(tracker.getResourceCounts('test-module').abortControllers).toBe(0);
      vi.useFakeTimers();
    });
  });

  describe('cleanup', () => {
    it('clears all timers', () => {
      const ctx = tracker.createContext('test-module');
      const callback1 = vi.fn();
      const callback2 = vi.fn();

      ctx.setTimeout(callback1, 100);
      ctx.setTimeout(callback2, 200);

      expect(tracker.getResourceCounts('test-module').timers).toBe(2);

      tracker.cleanup('test-module');

      vi.advanceTimersByTime(300);
      expect(callback1).not.toHaveBeenCalled();
      expect(callback2).not.toHaveBeenCalled();
    });

    it('clears all intervals', () => {
      const ctx = tracker.createContext('test-module');
      const callback = vi.fn();

      ctx.setInterval(callback, 100);
      ctx.setInterval(callback, 200);

      expect(tracker.getResourceCounts('test-module').intervals).toBe(2);

      tracker.cleanup('test-module');

      vi.advanceTimersByTime(500);
      expect(callback).not.toHaveBeenCalled();
    });

    it('removes all event listeners', () => {
      const ctx = tracker.createContext('test-module');
      const target = {
        addEventListener: vi.fn(),
        removeEventListener: vi.fn(),
      };
      const handler1 = vi.fn();
      const handler2 = vi.fn();

      ctx.addEventListener(target, 'click', handler1);
      ctx.addEventListener(target, 'keydown', handler2, { capture: true });

      tracker.cleanup('test-module');

      expect(target.removeEventListener).toHaveBeenCalledWith(
        'click',
        handler1,
        undefined
      );
      expect(target.removeEventListener).toHaveBeenCalledWith(
        'keydown',
        handler2,
        { capture: true }
      );
    });

    it('aborts all pending fetch controllers', () => {
      const ctx = tracker.createContext('test-module');

      const controller1 = ctx.createAbortController();
      const controller2 = ctx.createAbortController();

      const abortSpy1 = vi.spyOn(controller1, 'abort');
      const abortSpy2 = vi.spyOn(controller2, 'abort');

      tracker.cleanup('test-module');

      expect(abortSpy1).toHaveBeenCalled();
      expect(abortSpy2).toHaveBeenCalled();
    });

    it('removes module from tracking', () => {
      tracker.createContext('test-module');
      expect(tracker.hasResources('test-module')).toBe(true);

      tracker.cleanup('test-module');

      expect(tracker.hasResources('test-module')).toBe(false);
    });

    it('handles non-existent module gracefully', () => {
      expect(() => {
        tracker.cleanup('non-existent-module');
      }).not.toThrow();
    });
  });

  describe('checkForLeaks', () => {
    it('warns about uncleaned timers', () => {
      const consoleSpy = vi.spyOn(console, 'warn').mockImplementation(() => {});
      const ctx = tracker.createContext('test-module');

      ctx.setTimeout(() => {}, 100);

      tracker.checkForLeaks('test-module');

      expect(consoleSpy).toHaveBeenCalledWith(
        expect.stringContaining('[HMR] Potential leak in module test-module')
      );
      expect(consoleSpy).toHaveBeenCalledWith(
        expect.stringContaining('1 timer(s) not cleaned up')
      );

      consoleSpy.mockRestore();
    });

    it('warns about uncleaned intervals', () => {
      const consoleSpy = vi.spyOn(console, 'warn').mockImplementation(() => {});
      const ctx = tracker.createContext('test-module');

      ctx.setInterval(() => {}, 100);
      ctx.setInterval(() => {}, 200);

      tracker.checkForLeaks('test-module');

      expect(consoleSpy).toHaveBeenCalledWith(
        expect.stringContaining('2 interval(s) not cleaned up')
      );

      consoleSpy.mockRestore();
    });

    it('warns about uncleaned listeners', () => {
      const consoleSpy = vi.spyOn(console, 'warn').mockImplementation(() => {});
      const ctx = tracker.createContext('test-module');
      const target = { addEventListener: vi.fn() };

      ctx.addEventListener(target, 'click', vi.fn());

      tracker.checkForLeaks('test-module');

      expect(consoleSpy).toHaveBeenCalledWith(
        expect.stringContaining('1 listener(s) not cleaned up')
      );

      consoleSpy.mockRestore();
    });

    it('warns about pending fetches', () => {
      const consoleSpy = vi.spyOn(console, 'warn').mockImplementation(() => {});
      const ctx = tracker.createContext('test-module');

      ctx.createAbortController();

      tracker.checkForLeaks('test-module');

      expect(consoleSpy).toHaveBeenCalledWith(
        expect.stringContaining('1 pending fetch(es) not aborted')
      );

      consoleSpy.mockRestore();
    });

    it('combines multiple warnings', () => {
      const consoleSpy = vi.spyOn(console, 'warn').mockImplementation(() => {});
      const ctx = tracker.createContext('test-module');
      const target = { addEventListener: vi.fn() };

      ctx.setTimeout(() => {}, 100);
      ctx.setInterval(() => {}, 200);
      ctx.addEventListener(target, 'click', vi.fn());

      tracker.checkForLeaks('test-module');

      const warning = consoleSpy.mock.calls[0][0];
      expect(warning).toContain('timer(s)');
      expect(warning).toContain('interval(s)');
      expect(warning).toContain('listener(s)');

      consoleSpy.mockRestore();
    });

    it('does not warn if no leaks', () => {
      const consoleSpy = vi.spyOn(console, 'warn').mockImplementation(() => {});
      tracker.createContext('test-module');

      tracker.checkForLeaks('test-module');

      expect(consoleSpy).not.toHaveBeenCalled();

      consoleSpy.mockRestore();
    });

    it('handles non-existent module gracefully', () => {
      const consoleSpy = vi.spyOn(console, 'warn').mockImplementation(() => {});

      expect(() => {
        tracker.checkForLeaks('non-existent-module');
      }).not.toThrow();

      expect(consoleSpy).not.toHaveBeenCalled();

      consoleSpy.mockRestore();
    });
  });

  describe('getResourceCounts', () => {
    it('returns null for non-existent module', () => {
      expect(tracker.getResourceCounts('non-existent')).toBeNull();
    });

    it('returns correct counts', () => {
      const ctx = tracker.createContext('test-module');
      const target = { addEventListener: vi.fn() };

      ctx.setTimeout(() => {}, 100);
      ctx.setTimeout(() => {}, 200);
      ctx.setInterval(() => {}, 300);
      ctx.addEventListener(target, 'click', vi.fn());
      ctx.createAbortController();

      const counts = tracker.getResourceCounts('test-module');

      expect(counts.timers).toBe(2);
      expect(counts.intervals).toBe(1);
      expect(counts.listeners).toBe(1);
      expect(counts.abortControllers).toBe(1);
    });
  });

  describe('singleton export', () => {
    it('cleanupTracker is a CleanupTracker instance', () => {
      expect(cleanupTracker).toBeInstanceOf(CleanupTracker);
    });
  });
});
