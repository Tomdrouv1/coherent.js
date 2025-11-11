/**
 * Runtime Factory Tests
 * Tests for environment detection and runtime creation
 */

import { describe, it, expect, beforeEach, vi } from 'vitest';
import { 
  detectRuntime, 
  createRuntime, 
  getRuntimeCapabilities, 
  getRuntimeInfo,
  RuntimeEnvironment 
} from '../src/runtime-factory.js';

describe('Runtime Factory', () => {
  beforeEach(() => {
    // Reset all globals to clean state
    vi.unstubAllGlobals();
  });

  describe('detectRuntime', () => {
    it('should detect browser environment', () => {
      vi.stubGlobal('window', { document: {} });
      vi.stubGlobal('document', {});
      
      const runtime = detectRuntime();
      expect(runtime).toBe(RuntimeEnvironment.BROWSER);
    });

    it('should detect Electron environment', () => {
      vi.stubGlobal('window', { 
        document: {},
        process: { versions: { electron: '1.0.0' } }
      });
      vi.stubGlobal('document', {});
      
      const runtime = detectRuntime();
      expect(runtime).toBe(RuntimeEnvironment.ELECTRON);
    });

    it('should detect Tauri environment', () => {
      vi.stubGlobal('window', { 
        document: {},
        __TAURI__: {}
      });
      vi.stubGlobal('document', {});
      
      const runtime = detectRuntime();
      expect(runtime).toBe(RuntimeEnvironment.TAURI);
    });

    it('should detect Node.js environment', () => {
      vi.stubGlobal('process', {
        versions: { node: '18.0.0' }
      });
      
      const runtime = detectRuntime();
      expect(runtime).toBe(RuntimeEnvironment.NODE);
    });

    it('should detect Edge runtime environment', () => {
      // Clear Node.js indicators first
      vi.stubGlobal('process', undefined);
      vi.stubGlobal('global', undefined);
      // Set Edge runtime indicator
      vi.stubGlobal('EdgeRuntime', {});
      
      const runtime = detectRuntime();
      expect(runtime).toBe(RuntimeEnvironment.EDGE);
    });

    it('should detect Cloudflare Workers environment', () => {
      // Clear Node.js indicators first
      vi.stubGlobal('process', undefined);
      vi.stubGlobal('global', undefined);
      // Set Cloudflare Workers indicators
      vi.stubGlobal('caches', {});
      vi.stubGlobal('Request', class Request {});
      vi.stubGlobal('Response', class Response {});
      vi.stubGlobal('addEventListener', vi.fn());
      
      const runtime = detectRuntime();
      expect(runtime).toBe(RuntimeEnvironment.CLOUDFLARE);
    });

    it('should detect Deno environment', () => {
      // Clear Node.js indicators first
      vi.stubGlobal('process', undefined);
      vi.stubGlobal('global', undefined);
      // Set Deno indicator
      vi.stubGlobal('Deno', { version: { deno: '1.0.0' } });
      
      const runtime = detectRuntime();
      expect(runtime).toBe(RuntimeEnvironment.DENO);
    });

    it('should detect Bun environment', () => {
      // Clear Node.js indicators first
      vi.stubGlobal('process', undefined);
      vi.stubGlobal('global', undefined);
      // Set Bun indicator
      vi.stubGlobal('Bun', { version: '1.0.0' });
      
      const runtime = detectRuntime();
      expect(runtime).toBe(RuntimeEnvironment.BUN);
    });

    it('should fallback to browser for unknown environments', () => {
      // Clear all globals
      vi.stubGlobal('window', undefined);
      vi.stubGlobal('document', undefined);
      vi.stubGlobal('process', undefined);
      vi.stubGlobal('EdgeRuntime', undefined);
      vi.stubGlobal('Deno', undefined);
      vi.stubGlobal('Bun', undefined);
      
      const runtime = detectRuntime();
      expect(runtime).toBe(RuntimeEnvironment.BROWSER);
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
      vi.stubGlobal('process', {
        versions: { node: '18.0.0' },
        platform: 'darwin',
        arch: 'x64',
        version: 'v18.0.0'
      });
      
      const info = getRuntimeInfo();
      
      expect(info).toHaveProperty('environment', RuntimeEnvironment.NODE);
      expect(info).toHaveProperty('capabilities');
      expect(info).toHaveProperty('version');
      expect(info).toHaveProperty('features');
      expect(info).toHaveProperty('platform');
      expect(info.capabilities.ssr).toBe(true);
    });

    it('should detect available features correctly', () => {
      vi.stubGlobal('fetch', vi.fn());
      vi.stubGlobal('WebSocket', vi.fn());
      vi.stubGlobal('crypto', {});
      
      const info = getRuntimeInfo();
      
      expect(info.features).toContain('fetch');
      expect(info.features).toContain('websockets');
      expect(info.features).toContain('crypto');
    });
  });

  describe('createRuntime', () => {
    it('should create browser runtime for browser environment', async () => {
      vi.stubGlobal('window', { document: {} });
      vi.stubGlobal('document', {});
      
      // Mock the dynamic import
      const mockRuntime = {
        createApp: vi.fn(),
        renderApp: vi.fn()
      };
      
      const browserModule = await import('../src/runtimes/browser.js');
      vi.spyOn(browserModule, 'BrowserRuntime').mockImplementation(() => mockRuntime);
      
      const runtime = await createRuntime();
      expect(runtime).toBeDefined();
    });

    it('should create edge runtime for edge environment', async () => {
      vi.stubGlobal('EdgeRuntime', {});
      
      // Mock the dynamic import
      const mockRuntime = {
        createApp: vi.fn(),
        renderApp: vi.fn()
      };
      
      const edgeModule = await import('../src/runtimes/edge.js');
      vi.spyOn(edgeModule, 'EdgeRuntime').mockImplementation(() => mockRuntime);
      
      const runtime = await createRuntime();
      expect(runtime).toBeDefined();
    });

    it('should create static runtime when specified', async () => {
      // Mock the dynamic import
      const mockRuntime = {
        createApp: vi.fn(),
        renderApp: vi.fn()
      };
      
      const staticModule = await import('../src/runtimes/static.js');
      vi.spyOn(staticModule, 'StaticRuntime').mockImplementation(() => mockRuntime);
      
      const runtime = await createRuntime({ 
        environment: RuntimeEnvironment.STATIC 
      });
      expect(runtime).toBeDefined();
    });

    it('should throw error for unsupported environment', async () => {
      await expect(createRuntime({ 
        environment: 'unsupported' 
      })).rejects.toThrow('Unsupported runtime environment: unsupported');
    });

    it('should pass options to runtime constructor', async () => {
      vi.stubGlobal('window', { document: {} });
      vi.stubGlobal('document', {});
      
      const MockBrowserRuntime = vi.fn();
      const browserModule = await import('../src/runtimes/browser.js');
      vi.spyOn(browserModule, 'BrowserRuntime').mockImplementation(MockBrowserRuntime);
      
      const options = { debug: true, customOption: 'test' };
      await createRuntime(options);
      
      expect(MockBrowserRuntime).toHaveBeenCalledWith(options);
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
