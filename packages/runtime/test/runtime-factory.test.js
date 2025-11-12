/**
 * Runtime Factory Tests
 * Tests for environment detection and runtime creation
 */

import { describe, it, expect, beforeEach, afterEach, vi } from 'vitest';

// Mock modules that access DOM/browser APIs at import time
vi.mock('@coherent.js/client', () => ({
  hydrate: vi.fn(),
  autoHydrate: vi.fn(),
  makeHydratable: vi.fn()
}));

vi.mock('@coherent.js/web-components', () => ({
  integrateWithWebComponents: vi.fn(),
  defineCoherentElement: vi.fn()
}));

// Mock runtime modules
vi.mock('../src/runtimes/browser.js', () => ({
  BrowserRuntime: class BrowserRuntime {
    constructor(options = {}) {
      this.options = options;
      this.isInitialized = false;
    }
    async initialize() {
      this.isInitialized = true;
    }
  }
}));

vi.mock('../src/runtimes/edge.js', () => ({
  EdgeRuntime: class EdgeRuntime {
    constructor(options = {}) {
      this.options = options;
      this.isInitialized = false;
    }
    async initialize() {
      this.isInitialized = true;
    }
  }
}));

vi.mock('../src/runtimes/static.js', () => ({
  StaticRuntime: class StaticRuntime {
    constructor(options = {}) {
      this.options = options;
      this.isInitialized = false;
    }
    async initialize() {
      this.isInitialized = true;
    }
  }
}));

vi.mock('../src/runtimes/node.js', () => ({
  NodeRuntime: class NodeRuntime {
    constructor(options = {}) {
      this.options = options;
      this.isInitialized = false;
    }
    async initialize() {
      this.isInitialized = true;
    }
  }
}));

import {
  detectRuntime,
  createRuntime,
  getRuntimeCapabilities,
  getRuntimeInfo,
  RuntimeEnvironment
} from '../src/runtime-factory.js';

describe('Runtime Factory', () => {
  let originalGlobals = {};

  beforeEach(() => {
    // Save original global values
    originalGlobals = {
      window: global.window,
      document: global.document,
      EdgeRuntime: global.EdgeRuntime,
      caches: global.caches,
      Request: global.Request,
      Response: global.Response,
      addEventListener: global.addEventListener,
      Deno: global.Deno,
      Bun: global.Bun
    };

    // Clean slate - remove all environment indicators
    // Note: We don't delete process in Node.js as it can cause issues
    delete global.window;
    delete global.document;
    delete global.EdgeRuntime;
    delete global.caches;
    delete global.Request;
    delete global.Response;
    delete global.addEventListener;
    delete global.Deno;
    delete global.Bun;
  });

  afterEach(() => {
    // Restore original globals (skip process as it's special in Node.js)
    Object.keys(originalGlobals).forEach(key => {
      if (key === 'process') {
        // Don't delete process in Node.js, just skip restoration
        return;
      }
      if (key === 'global') {
        // Don't modify global.global
        return;
      }
      if (originalGlobals[key] === undefined) {
        delete global[key];
      } else {
        global[key] = originalGlobals[key];
      }
    });
  });

  describe('detectRuntime', () => {
    it('should detect browser environment', () => {
      global.window = { document: {} };
      global.document = {};

      const runtime = detectRuntime();
      expect(runtime).toBe(RuntimeEnvironment.BROWSER);
    });

    it('should detect Electron environment', () => {
      global.window = {
        document: {},
        process: { versions: { electron: '1.0.0' } }
      };
      global.document = {};

      const runtime = detectRuntime();
      expect(runtime).toBe(RuntimeEnvironment.ELECTRON);
    });

    it('should detect Tauri environment', () => {
      global.window = {
        document: {},
        __TAURI__: {}
      };
      global.document = {};

      const runtime = detectRuntime();
      expect(runtime).toBe(RuntimeEnvironment.TAURI);
    });

    it('should detect Node.js environment', () => {
      global.process = {
        versions: { node: '18.0.0' }
      };

      const runtime = detectRuntime();
      expect(runtime).toBe(RuntimeEnvironment.NODE);
    });

    it('should detect Edge runtime environment', () => {
      // Clear Node.js indicator and set Edge runtime indicator
      const originalProcess = global.process;
      global.process = undefined;
      global.EdgeRuntime = {};

      const runtime = detectRuntime();
      expect(runtime).toBe(RuntimeEnvironment.EDGE);

      // Restore
      global.process = originalProcess;
    });

    it('should detect Cloudflare Workers environment', () => {
      // Clear Node.js indicator and set Cloudflare Workers indicators
      const originalProcess = global.process;
      global.process = undefined;
      global.caches = {};
      global.Request = class Request {};
      global.Response = class Response {};
      global.addEventListener = vi.fn();

      const runtime = detectRuntime();
      expect(runtime).toBe(RuntimeEnvironment.CLOUDFLARE);

      // Restore
      global.process = originalProcess;
    });

    it('should detect Deno environment', () => {
      // Clear Node.js indicator and set Deno indicator
      const originalProcess = global.process;
      global.process = undefined;
      global.Deno = { version: { deno: '1.0.0' } };

      const runtime = detectRuntime();
      expect(runtime).toBe(RuntimeEnvironment.DENO);

      // Restore
      global.process = originalProcess;
    });

    it('should detect Bun environment', () => {
      // Clear Node.js indicator and set Bun indicator
      const originalProcess = global.process;
      global.process = undefined;
      global.Bun = { version: '1.0.0' };

      const runtime = detectRuntime();
      expect(runtime).toBe(RuntimeEnvironment.BUN);

      // Restore
      global.process = originalProcess;
    });

    it('should fallback to browser for unknown environments', () => {
      // Clear Node.js indicator
      const originalProcess = global.process;
      global.process = undefined;

      const runtime = detectRuntime();
      expect(runtime).toBe(RuntimeEnvironment.BROWSER);

      // Restore
      global.process = originalProcess;
    });
  });

  describe('getRuntimeCapabilities', () => {
    it('should return correct capabilities for browser', () => {
      const capabilities = getRuntimeCapabilities(RuntimeEnvironment.BROWSER);
      
      expect(capabilities).toEqual({
        dom: true,
        ssr: false,
        filesystem: false,
        fetch: true,
        websockets: true,
        workers: true,
        storage: true,
        crypto: true,
        streams: true
      });
    });

    it('should return correct capabilities for Electron', () => {
      const capabilities = getRuntimeCapabilities(RuntimeEnvironment.ELECTRON);
      
      expect(capabilities).toEqual({
        dom: true,
        ssr: false,
        filesystem: true,
        fetch: true,
        websockets: true,
        workers: false,
        storage: true,
        crypto: true,
        streams: true
      });
    });

    it('should return correct capabilities for Node.js', () => {
      const capabilities = getRuntimeCapabilities(RuntimeEnvironment.NODE);
      
      expect(capabilities).toEqual({
        dom: false,
        ssr: true,
        filesystem: true,
        fetch: true,
        websockets: true,
        workers: false,
        storage: false,
        crypto: true,
        streams: true
      });
    });

    it('should return correct capabilities for Edge runtime', () => {
      const capabilities = getRuntimeCapabilities(RuntimeEnvironment.EDGE);
      
      expect(capabilities).toEqual({
        dom: false,
        ssr: true,
        filesystem: false,
        fetch: true,
        websockets: false,
        workers: false,
        storage: true,
        crypto: true,
        streams: true
      });
    });

    it('should return correct capabilities for static runtime', () => {
      const capabilities = getRuntimeCapabilities(RuntimeEnvironment.STATIC);
      
      expect(capabilities).toEqual({
        dom: false,
        ssr: true,
        filesystem: false,
        fetch: false,
        websockets: false,
        workers: false,
        storage: false,
        crypto: false,
        streams: false
      });
    });
  });

  describe('getRuntimeInfo', () => {
    it('should return comprehensive runtime info', () => {
      global.process = {
        versions: { node: '18.0.0' },
        platform: 'darwin',
        arch: 'x64',
        version: 'v18.0.0'
      };

      const info = getRuntimeInfo();

      expect(info).toHaveProperty('environment', RuntimeEnvironment.NODE);
      expect(info).toHaveProperty('capabilities');
      expect(info).toHaveProperty('version');
      expect(info).toHaveProperty('features');
      expect(info).toHaveProperty('platform');
      expect(info.capabilities.ssr).toBe(true);
    });

    it('should detect available features correctly', () => {
      global.fetch = vi.fn();
      global.WebSocket = vi.fn();
      // crypto is read-only in Node.js, so we skip testing it here

      const info = getRuntimeInfo();

      expect(info.features).toContain('fetch');
      expect(info.features).toContain('websockets');
      // crypto should be available in Node.js by default
      expect(info.features).toContain('crypto');
    });
  });

  describe('createRuntime', () => {
    it('should create browser runtime for browser environment', async () => {
      global.window = { document: {} };
      global.document = {};

      const runtime = await createRuntime();
      expect(runtime).toBeDefined();
      expect(runtime).toBeInstanceOf(Object);
    });

    it('should create edge runtime for edge environment', async () => {
      global.EdgeRuntime = {};

      const runtime = await createRuntime();
      expect(runtime).toBeDefined();
      expect(runtime).toBeInstanceOf(Object);
    });

    it('should create static runtime when specified', async () => {
      const runtime = await createRuntime({
        environment: RuntimeEnvironment.STATIC
      });
      expect(runtime).toBeDefined();
      expect(runtime).toBeInstanceOf(Object);
    });

    it('should throw error for unsupported environment', async () => {
      await expect(createRuntime({
        environment: 'unsupported'
      })).rejects.toThrow('Unsupported runtime environment: unsupported');
    });

    it('should pass options to runtime constructor', async () => {
      global.window = { document: {} };
      global.document = {};

      const options = { autoHydrate: false, customOption: 'test' };
      const runtime = await createRuntime(options);

      expect(runtime).toBeDefined();
      // The runtime should have the options (constructor receives them)
      expect(runtime.options).toBeDefined();
    });
  });

  describe('RuntimeEnvironment constants', () => {
    it('should have all expected runtime environment constants', () => {
      expect(RuntimeEnvironment.BROWSER).toBe('browser');
      expect(RuntimeEnvironment.NODE).toBe('node');
      expect(RuntimeEnvironment.EDGE).toBe('edge');
      expect(RuntimeEnvironment.CLOUDFLARE).toBe('cloudflare');
      expect(RuntimeEnvironment.DENO).toBe('deno');
      expect(RuntimeEnvironment.BUN).toBe('bun');
      expect(RuntimeEnvironment.ELECTRON).toBe('electron');
      expect(RuntimeEnvironment.TAURI).toBe('tauri');
      expect(RuntimeEnvironment.STATIC).toBe('static');
    });
  });
});
