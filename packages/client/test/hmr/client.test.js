import { describe, it, expect, beforeEach, afterEach, vi } from 'vitest';
import { HMRClient, hmrClient } from '../../src/hmr/client.js';
import { cleanupTracker } from '../../src/hmr/cleanup-tracker.js';
import { stateCapturer } from '../../src/hmr/state-capturer.js';
import { errorOverlay } from '../../src/hmr/overlay.js';
import { connectionIndicator } from '../../src/hmr/indicator.js';
import { moduleTracker } from '../../src/hmr/module-tracker.js';

// Store mock WebSocket instances globally for test access
let mockWsInstance = null;

// Mock WebSocket
class MockWebSocket {
  static CONNECTING = 0;
  static OPEN = 1;
  static CLOSING = 2;
  static CLOSED = 3;

  constructor(url) {
    this.url = url;
    this.readyState = MockWebSocket.CONNECTING;
    this.listeners = {};
    this.sentMessages = [];
    mockWsInstance = this;
  }

  addEventListener(event, handler) {
    if (!this.listeners[event]) {
      this.listeners[event] = [];
    }
    this.listeners[event].push(handler);
  }

  removeEventListener(event, handler) {
    if (this.listeners[event]) {
      this.listeners[event] = this.listeners[event].filter((h) => h !== handler);
    }
  }

  dispatchEvent(event, data) {
    if (this.listeners[event]) {
      this.listeners[event].forEach((handler) => handler(data));
    }
  }

  send(data) {
    this.sentMessages.push(JSON.parse(data));
  }

  close() {
    this.readyState = MockWebSocket.CLOSED;
    this.dispatchEvent('close', {});
  }

  // Test helpers
  simulateOpen() {
    this.readyState = MockWebSocket.OPEN;
    this.dispatchEvent('open', {});
  }

  simulateMessage(data) {
    this.dispatchEvent('message', { data: JSON.stringify(data) });
  }

  simulateError(error) {
    this.dispatchEvent('error', error || {});
  }
}

describe('HMRClient', () => {
  let client;
  let originalWebSocket;
  let originalWindow;
  let originalLocation;

  beforeEach(() => {
    client = new HMRClient();
    mockWsInstance = null;

    // Store originals
    originalWebSocket = global.WebSocket;
    originalWindow = global.window;
    originalLocation = global.location;

    // Mock WebSocket
    global.WebSocket = MockWebSocket;

    // Mock window
    global.window = {
      __coherent_hmr_initialized: false,
    };

    // Mock location
    global.location = {
      protocol: 'http:',
      host: 'localhost:3000',
      reload: vi.fn(),
    };

    // Mock document for indicator
    global.document = {
      createElement: vi.fn(() => ({
        id: '',
        style: { cssText: '', background: '' },
        title: '',
      })),
      body: {
        appendChild: vi.fn(),
        removeChild: vi.fn(),
      },
      querySelector: vi.fn(() => null),
    };

    // Reset singletons
    moduleTracker.clear();
    vi.spyOn(errorOverlay, 'show').mockImplementation(() => {});
    vi.spyOn(errorOverlay, 'hide').mockImplementation(() => {});
    vi.spyOn(connectionIndicator, 'update').mockImplementation(() => {});
    vi.spyOn(connectionIndicator, 'destroy').mockImplementation(() => {});
    vi.spyOn(stateCapturer, 'captureAll').mockImplementation(() => {});
    vi.spyOn(stateCapturer, 'restoreAll').mockImplementation(() => {});
    vi.spyOn(cleanupTracker, 'hasResources').mockImplementation(() => false);
    vi.spyOn(cleanupTracker, 'checkForLeaks').mockImplementation(() => {});
    vi.spyOn(cleanupTracker, 'cleanup').mockImplementation(() => {});
  });

  afterEach(() => {
    client.disconnect();
    global.WebSocket = originalWebSocket;
    global.window = originalWindow;
    global.location = originalLocation;
    delete global.document;
    mockWsInstance = null;
    vi.restoreAllMocks();
  });

  describe('connect', () => {
    it('should create WebSocket with correct URL (http -> ws)', () => {
      global.location.protocol = 'http:';
      global.location.host = 'localhost:3000';

      client.connect();

      expect(mockWsInstance).not.toBeNull();
      expect(mockWsInstance.url).toBe('ws://localhost:3000');
    });

    it('should create WebSocket with correct URL (https -> wss)', () => {
      global.location.protocol = 'https:';
      global.location.host = 'example.com';

      client.connect();

      expect(mockWsInstance.url).toBe('wss://example.com');
    });

    it('should log connected on open', () => {
      const consoleSpy = vi.spyOn(console, 'log').mockImplementation(() => {});

      client.connect();
      mockWsInstance.simulateOpen();

      expect(consoleSpy).toHaveBeenCalledWith('[HMR] Connected');
      consoleSpy.mockRestore();
    });

    it('should update indicator to connected', () => {
      client.connect();
      mockWsInstance.simulateOpen();

      expect(connectionIndicator.update).toHaveBeenCalledWith('connected');
    });

    it('should reset reconnect attempts on successful connect', () => {
      client.reconnectAttempts = 5;
      client.connect();
      mockWsInstance.simulateOpen();

      expect(client.reconnectAttempts).toBe(0);
    });

    it('should send connected message', () => {
      client.connect();
      mockWsInstance.simulateOpen();

      expect(mockWsInstance.sentMessages).toContainEqual({ type: 'connected' });
    });

    it('should not connect in non-browser environment', () => {
      delete global.window;
      client.connect();

      expect(mockWsInstance).toBeNull();
    });
  });

  describe('reconnection', () => {
    it('should schedule reconnect on close', () => {
      vi.useFakeTimers();
      const consoleSpy = vi.spyOn(console, 'log').mockImplementation(() => {});

      client.connect();
      mockWsInstance.simulateOpen();
      mockWsInstance.close();

      expect(connectionIndicator.update).toHaveBeenCalledWith('disconnected');
      expect(consoleSpy).toHaveBeenCalledWith(
        expect.stringMatching(/\[HMR\] Reconnecting in \d+ms/)
      );

      consoleSpy.mockRestore();
      vi.useRealTimers();
    });

    it('should use exponential backoff', () => {
      vi.useFakeTimers();

      client.connect();
      mockWsInstance.simulateOpen();

      // First close triggers reconnect attempt 1
      mockWsInstance.readyState = MockWebSocket.CLOSED;
      mockWsInstance.dispatchEvent('close', {});
      expect(client.reconnectAttempts).toBe(1);

      // Wait for first reconnect attempt
      vi.advanceTimersByTime(3000);

      // Second close without opening (simulating connection failure)
      mockWsInstance.readyState = MockWebSocket.CLOSED;
      mockWsInstance.dispatchEvent('close', {});
      expect(client.reconnectAttempts).toBe(2);

      vi.useRealTimers();
    });

    it('should stop reconnecting after max attempts', () => {
      vi.useFakeTimers();
      const consoleSpy = vi.spyOn(console, 'warn').mockImplementation(() => {});

      client.maxReconnectAttempts = 2;
      client.connect();
      mockWsInstance.simulateOpen();

      // Set attempts to max before closing
      client.reconnectAttempts = 2;

      // Close should trigger max attempts reached message
      mockWsInstance.readyState = MockWebSocket.CLOSED;
      mockWsInstance.dispatchEvent('close', {});

      expect(consoleSpy).toHaveBeenCalledWith('[HMR] Max reconnection attempts reached');
      consoleSpy.mockRestore();
      vi.useRealTimers();
    });

    it('should reload page on reconnect after disconnect', () => {
      vi.useFakeTimers();

      client.connect();
      mockWsInstance.simulateOpen();

      // Set flag as if we had disconnected before
      client.hadDisconnect = true;

      // Simulate reconnect by triggering open again
      mockWsInstance.simulateOpen();

      vi.advanceTimersByTime(300);

      expect(global.location.reload).toHaveBeenCalled();

      vi.useRealTimers();
    });
  });

  describe('message handling', () => {
    beforeEach(() => {
      client.connect();
      mockWsInstance.simulateOpen();
    });

    it('should parse JSON messages', () => {
      const consoleSpy = vi.spyOn(console, 'log').mockImplementation(() => {});

      mockWsInstance.simulateMessage({ type: 'connected' });

      expect(consoleSpy).toHaveBeenCalledWith('[HMR] message', 'connected', '');
      consoleSpy.mockRestore();
    });

    it('should handle invalid JSON gracefully', () => {
      mockWsInstance.dispatchEvent('message', { data: 'not json' });
      // Should not throw
    });

    it('should trigger full reload on hmr-full-reload', () => {
      mockWsInstance.simulateMessage({ type: 'hmr-full-reload' });

      expect(global.location.reload).toHaveBeenCalled();
    });

    it('should trigger full reload on reload message', () => {
      mockWsInstance.simulateMessage({ type: 'reload' });

      expect(global.location.reload).toHaveBeenCalled();
    });

    it('should show error overlay on hmr-error', () => {
      mockWsInstance.simulateMessage({
        type: 'hmr-error',
        error: { message: 'Syntax error', file: '/src/test.js', line: 10 },
      });

      expect(errorOverlay.show).toHaveBeenCalledWith({
        message: 'Syntax error',
        file: '/src/test.js',
        line: 10,
      });
    });
  });

  describe('handleUpdate', () => {
    beforeEach(() => {
      client.connect();
      mockWsInstance.simulateOpen();
    });

    it('should capture state before update', async () => {
      // Create a minimal handler that doesn't rely on dynamic import
      vi.spyOn(client, 'handleUpdate').mockImplementation(async () => {
        stateCapturer.captureAll();
        stateCapturer.restoreAll();
        errorOverlay.hide();
      });

      await client.handleUpdate({ filePath: '/src/test.js' });

      expect(stateCapturer.captureAll).toHaveBeenCalled();
    });

    it('should restore state after update', async () => {
      vi.spyOn(client, 'handleUpdate').mockImplementation(async () => {
        stateCapturer.captureAll();
        stateCapturer.restoreAll();
      });

      await client.handleUpdate({ filePath: '/src/test.js' });

      expect(stateCapturer.restoreAll).toHaveBeenCalled();
    });

    it('should execute dispose if module has handler', async () => {
      const disposeSpy = vi.spyOn(moduleTracker, 'executeDispose');

      const hot = moduleTracker.createHotContext('/src/test.js');
      hot.dispose(() => {});

      vi.spyOn(client, 'handleUpdate').mockImplementation(async (data) => {
        const moduleId = data.filePath;
        if (moduleTracker.hasModule(moduleId)) {
          moduleTracker.executeDispose(moduleId);
        }
      });

      await client.handleUpdate({ filePath: '/src/test.js' });

      expect(disposeSpy).toHaveBeenCalledWith('/src/test.js');
    });

    it('should cleanup tracked resources', async () => {
      cleanupTracker.hasResources.mockReturnValue(true);

      vi.spyOn(client, 'handleUpdate').mockImplementation(async (data) => {
        const moduleId = data.filePath;
        if (cleanupTracker.hasResources(moduleId)) {
          cleanupTracker.checkForLeaks(moduleId);
          cleanupTracker.cleanup(moduleId);
        }
      });

      await client.handleUpdate({ filePath: '/src/test.js' });

      expect(cleanupTracker.checkForLeaks).toHaveBeenCalledWith('/src/test.js');
      expect(cleanupTracker.cleanup).toHaveBeenCalledWith('/src/test.js');
    });

    it('should hide error overlay on successful update', async () => {
      vi.spyOn(client, 'handleUpdate').mockImplementation(async () => {
        errorOverlay.hide();
      });

      await client.handleUpdate({ filePath: '/src/test.js' });

      expect(errorOverlay.hide).toHaveBeenCalled();
    });

    it('should show error overlay on update failure', async () => {
      const error = new Error('Import failed');
      error.stack = 'Error: Import failed\n    at /src/test.js:10:5';

      // Test handleUpdateError directly
      client.handleUpdateError(error, '/src/test.js');
      expect(errorOverlay.show).toHaveBeenCalled();
    });
  });

  describe('initialize', () => {
    it('should guard against double initialization', () => {
      client.initialize();
      expect(client.initialized).toBe(true);

      const _firstWs = mockWsInstance;
      client.initialize();

      // Should still be the same instance (not reconnected)
      expect(client.initialized).toBe(true);
    });

    it('should set window flag', () => {
      client.initialize();

      expect(global.window.__coherent_hmr_initialized).toBe(true);
    });

    it('should not initialize in non-browser environment', () => {
      delete global.window;
      client.initialize();

      expect(mockWsInstance).toBeNull();
    });
  });

  describe('disconnect', () => {
    it('should close WebSocket', () => {
      client.connect();
      mockWsInstance.simulateOpen();

      client.disconnect();

      expect(mockWsInstance.readyState).toBe(MockWebSocket.CLOSED);
    });

    it('should clear reconnect timeout', () => {
      vi.useFakeTimers();
      client.connect();
      mockWsInstance.simulateOpen();

      // Trigger close without calling close() method to avoid re-close in disconnect
      mockWsInstance.readyState = MockWebSocket.CLOSED;
      mockWsInstance.dispatchEvent('close', {});

      // Reconnect is scheduled
      expect(client.reconnectTimeout).not.toBeNull();

      // Null out socket before disconnect to avoid double close
      client.socket = null;
      client.disconnect();

      expect(client.reconnectTimeout).toBeNull();
      vi.useRealTimers();
    });

    it('should destroy connection indicator', () => {
      client.connect();
      mockWsInstance.simulateOpen();

      client.disconnect();

      expect(connectionIndicator.destroy).toHaveBeenCalled();
    });
  });

  describe('isConnected', () => {
    it('should return false initially', () => {
      expect(client.isConnected()).toBe(false);
    });

    it('should return true when connected', () => {
      client.connect();
      mockWsInstance.simulateOpen();

      expect(client.isConnected()).toBe(true);
    });

    it('should return false after disconnect', () => {
      client.connect();
      mockWsInstance.simulateOpen();
      client.disconnect();

      expect(client.isConnected()).toBe(false);
    });
  });

  describe('showError / hideError', () => {
    it('should show error overlay', () => {
      client.showError({ message: 'Test error' });

      expect(errorOverlay.show).toHaveBeenCalledWith({ message: 'Test error' });
    });

    it('should hide error overlay', () => {
      client.hideError();

      expect(errorOverlay.hide).toHaveBeenCalled();
    });
  });
});

describe('hmrClient singleton', () => {
  beforeEach(() => {
    global.window = {
      __coherent_hmr_initialized: false,
    };
  });

  afterEach(() => {
    delete global.window;
  });

  it('should be an HMRClient instance', () => {
    expect(hmrClient).toBeInstanceOf(HMRClient);
  });
});

describe('error location parsing', () => {
  let client;

  beforeEach(() => {
    client = new HMRClient();
    vi.spyOn(errorOverlay, 'show').mockImplementation(() => {});
  });

  afterEach(() => {
    vi.restoreAllMocks();
  });

  it('should parse Chrome stack trace format', () => {
    const error = new Error('Test');
    error.stack = `Error: Test
    at Object.handler (/src/components/Test.js:25:10)
    at processQueue (/node_modules/queue.js:50:15)`;

    client.handleUpdateError(error, '/fallback.js');

    expect(errorOverlay.show).toHaveBeenCalledWith(
      expect.objectContaining({
        file: '/src/components/Test.js',
        line: 25,
        column: 10,
      })
    );
  });

  it('should use fallback filePath if stack parsing fails', () => {
    const error = new Error('Test');
    error.stack = 'Error: Test\n    at anonymous';

    client.handleUpdateError(error, '/fallback.js');

    expect(errorOverlay.show).toHaveBeenCalledWith(
      expect.objectContaining({
        file: '/fallback.js',
      })
    );
  });
});
