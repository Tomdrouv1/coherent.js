/**
 * Runtime Detector - Detects and analyzes JavaScript runtime environments
 * Provides detailed capability analysis for universal applications
 */

// Runtime environment constants
export const RuntimeEnvironment = {
  BROWSER: 'browser',
  NODE: 'node',
  DENO: 'deno',
  BUN: 'bun',
  EDGE: 'edge',
  CLOUDFLARE: 'cloudflare',
  ELECTRON: 'electron',
  TAURI: 'tauri',
  WEBVIEW: 'webview',
  STATIC: 'static',
  UNKNOWN: 'unknown'
};

export class RuntimeDetector {
  constructor() {
    this.detectionResult = null;
    this.capabilities = null;
  }

  // Reset detection cache (useful for testing)
  reset() {
    this.detectionResult = null;
    this.capabilities = null;
  }

  // Main detection method
  detect() {
    if (this.detectionResult) {
      return this.detectionResult;
    }

    this.detectionResult = this.performDetection();
    return this.detectionResult;
  }

  performDetection() {
    // Desktop app frameworks (check first as they may have browser-like globals)
    if (this.isTauri()) return RuntimeEnvironment.TAURI;
    if (this.isElectron()) return RuntimeEnvironment.ELECTRON;
    if (this.isWebView()) return RuntimeEnvironment.WEBVIEW;

    // JavaScript runtimes
    if (this.isDeno()) return RuntimeEnvironment.DENO;
    if (this.isBun()) return RuntimeEnvironment.BUN;
    
    // Edge environments
    if (this.isCloudflareWorkers()) return RuntimeEnvironment.CLOUDFLARE;
    if (this.isEdgeRuntime()) return RuntimeEnvironment.EDGE;
    
    // Browser and Node.js
    if (this.isBrowser()) return RuntimeEnvironment.BROWSER;
    if (this.isNodeJS()) return RuntimeEnvironment.NODE;

    return RuntimeEnvironment.UNKNOWN;
  }

  // Environment-specific detection methods
  isBrowser() {
    return typeof window !== 'undefined' && 
           typeof document !== 'undefined' &&
           typeof navigator !== 'undefined';
  }

  isNodeJS() {
    return typeof process !== 'undefined' && 
           process.versions && 
           process.versions.node &&
           typeof require !== 'undefined';
  }

  isDeno() {
    return typeof Deno !== 'undefined' && 
           typeof Deno.version !== 'undefined';
  }

  isBun() {
    return typeof Bun !== 'undefined' || 
           (typeof process !== 'undefined' && 
            process.versions && 
            process.versions.bun);
  }

  isElectron() {
    return typeof window !== 'undefined' && 
           typeof window.require !== 'undefined' &&
           typeof window.require('electron') !== 'undefined';
  }

  isTauri() {
    return typeof window !== 'undefined' && 
           typeof window.__TAURI__ !== 'undefined';
  }

  isWebView() {
    return typeof window !== 'undefined' && 
           (typeof window.webkit !== 'undefined' || 
            typeof window.external !== 'undefined') &&
           !this.isElectron() && 
           !this.isTauri();
  }

  isCloudflareWorkers() {
    return typeof caches !== 'undefined' && 
           typeof fetch !== 'undefined' &&
           typeof Response !== 'undefined' &&
           typeof addEventListener !== 'undefined' &&
           typeof window === 'undefined';
  }

  isEdgeRuntime() {
    return typeof EdgeRuntime !== 'undefined' ||
           (typeof globalThis !== 'undefined' && 
            typeof globalThis.EdgeRuntime !== 'undefined') ||
           this.isVercelEdge() ||
           this.isNetlifyEdge();
  }

  isVercelEdge() {
    return typeof process !== 'undefined' && 
           process.env && 
           process.env.VERCEL === '1' &&
           typeof EdgeRuntime !== 'undefined';
  }

  isNetlifyEdge() {
    return typeof Netlify !== 'undefined' || 
           (typeof process !== 'undefined' && 
            process.env && 
            process.env.NETLIFY === 'true');
  }

  // Detailed capability analysis
  getCapabilities(environment = null) {
    const env = environment || this.detect();
    
    if (this.capabilities && !environment) {
      return this.capabilities;
    }

    const capabilities = this.analyzeCapabilities(env);
    
    if (!environment) {
      this.capabilities = capabilities;
    }
    
    return capabilities;
  }

  analyzeCapabilities(environment) {
    const base = {
      environment,
      dom: false,
      ssr: false,
      filesystem: false,
      fetch: false,
      websockets: false,
      workers: false,
      storage: false,
      crypto: false,
      streams: false,
      modules: {
        esm: false,
        commonjs: false,
        dynamicImport: false
      },
      apis: {
        console: false,
        timers: false,
        events: false,
        url: false,
        base64: false
      }
    };

    switch (environment) {
      case RuntimeEnvironment.BROWSER:
        return {
          ...base,
          dom: true,
          fetch: typeof fetch !== 'undefined',
          websockets: typeof WebSocket !== 'undefined',
          workers: typeof Worker !== 'undefined',
          storage: typeof localStorage !== 'undefined',
          crypto: typeof crypto !== 'undefined',
          streams: typeof ReadableStream !== 'undefined',
          modules: {
            esm: true,
            commonjs: false,
            dynamicImport: (() => { try { return typeof Function('return import("")') === 'function'; } catch { return false; } })()
          },
          apis: {
            console: typeof console !== 'undefined',
            timers: typeof setTimeout !== 'undefined',
            events: typeof EventTarget !== 'undefined',
            url: typeof URL !== 'undefined',
            base64: typeof btoa !== 'undefined'
          }
        };

      case RuntimeEnvironment.NODE:
        return {
          ...base,
          ssr: true,
          filesystem: true,
          fetch: typeof fetch !== 'undefined',
          websockets: true,
          crypto: true,
          streams: true,
          modules: {
            esm: true,
            commonjs: true,
            dynamicImport: (() => { try { return typeof Function('return import("")') === 'function'; } catch { return false; } })()
          },
          apis: {
            console: true,
            timers: true,
            events: true,
            url: typeof URL !== 'undefined',
            base64: typeof Buffer !== 'undefined'
          }
        };

      case RuntimeEnvironment.DENO:
        return {
          ...base,
          ssr: true,
          filesystem: typeof Deno.readTextFile !== 'undefined',
          fetch: typeof fetch !== 'undefined',
          websockets: typeof WebSocket !== 'undefined',
          crypto: typeof crypto !== 'undefined',
          streams: typeof ReadableStream !== 'undefined',
          modules: {
            esm: true,
            commonjs: false,
            dynamicImport: true
          },
          apis: {
            console: true,
            timers: true,
            events: true,
            url: typeof URL !== 'undefined',
            base64: typeof btoa !== 'undefined'
          }
        };

      case RuntimeEnvironment.BUN:
        return {
          ...base,
          ssr: true,
          filesystem: true,
          fetch: typeof fetch !== 'undefined',
          websockets: typeof WebSocket !== 'undefined',
          crypto: typeof crypto !== 'undefined',
          streams: typeof ReadableStream !== 'undefined',
          modules: {
            esm: true,
            commonjs: true,
            dynamicImport: true
          },
          apis: {
            console: true,
            timers: true,
            events: true,
            url: typeof URL !== 'undefined',
            base64: typeof btoa !== 'undefined'
          }
        };

      case RuntimeEnvironment.CLOUDFLARE:
        return {
          ...base,
          ssr: true,
          fetch: typeof fetch !== 'undefined',
          websockets: typeof WebSocket !== 'undefined',
          storage: typeof caches !== 'undefined',
          crypto: typeof crypto !== 'undefined',
          streams: typeof ReadableStream !== 'undefined',
          modules: {
            esm: true,
            commonjs: false,
            dynamicImport: true
          },
          apis: {
            console: true,
            timers: true,
            events: true,
            url: typeof URL !== 'undefined',
            base64: typeof btoa !== 'undefined'
          }
        };

      case RuntimeEnvironment.ELECTRON:
        return {
          ...base,
          dom: true,
          ssr: true,
          filesystem: true,
          fetch: typeof fetch !== 'undefined',
          websockets: typeof WebSocket !== 'undefined',
          workers: typeof Worker !== 'undefined',
          storage: typeof localStorage !== 'undefined',
          crypto: typeof crypto !== 'undefined',
          streams: typeof ReadableStream !== 'undefined',
          modules: {
            esm: true,
            commonjs: true,
            dynamicImport: true
          },
          apis: {
            console: true,
            timers: true,
            events: true,
            url: typeof URL !== 'undefined',
            base64: typeof btoa !== 'undefined'
          }
        };

      case RuntimeEnvironment.TAURI:
        return {
          ...base,
          dom: true,
          ssr: true,
          filesystem: typeof window !== 'undefined' && 
                    typeof window.__TAURI__ !== 'undefined',
          fetch: typeof fetch !== 'undefined',
          websockets: typeof WebSocket !== 'undefined',
          storage: typeof localStorage !== 'undefined',
          crypto: typeof crypto !== 'undefined',
          streams: typeof ReadableStream !== 'undefined',
          modules: {
            esm: true,
            commonjs: false,
            dynamicImport: true
          },
          apis: {
            console: true,
            timers: true,
            events: true,
            url: typeof URL !== 'undefined',
            base64: typeof btoa !== 'undefined'
          }
        };

      default:
        return base;
    }
  }

  // Get detailed runtime information
  getRuntimeInfo() {
    const environment = this.detect();
    const capabilities = this.getCapabilities(environment);
    
    return {
      environment,
      capabilities,
      version: this.getRuntimeVersion(environment),
      features: this.getAvailableFeatures(),
      userAgent: this.getUserAgent(),
      platform: this.getPlatformInfo()
    };
  }

  // Alias method for backward compatibility
  getEnvironmentInfo() {
    return this.getRuntimeInfo();
  }

  getRuntimeVersion(environment) {
    switch (environment) {
      case RuntimeEnvironment.NODE:
        return typeof process !== 'undefined' ? process.version : null;
        
      case RuntimeEnvironment.DENO:
        return typeof Deno !== 'undefined' ? Deno.version.deno : null;
        
      case RuntimeEnvironment.BUN:
        return typeof Bun !== 'undefined' ? Bun.version : 
               (typeof process !== 'undefined' ? process.versions.bun : null);
        
      case RuntimeEnvironment.BROWSER:
        return typeof navigator !== 'undefined' ? navigator.userAgent : null;
        
      default:
        return null;
    }
  }

  getAvailableFeatures() {
    const features = [];
    
    if (typeof fetch !== 'undefined') features.push('fetch');
    if (typeof WebSocket !== 'undefined') features.push('websockets');
    if (typeof Worker !== 'undefined') features.push('workers');
    if (typeof crypto !== 'undefined') features.push('crypto');
    if (typeof localStorage !== 'undefined') features.push('localStorage');
    if (typeof sessionStorage !== 'undefined') features.push('sessionStorage');
    if (typeof IndexedDB !== 'undefined') features.push('indexedDB');
    if (typeof WebAssembly !== 'undefined') features.push('webassembly');
    if (typeof SharedArrayBuffer !== 'undefined') features.push('sharedArrayBuffer');
    if (typeof BigInt !== 'undefined') features.push('bigint');
    if ((() => { try { return typeof Function('return import("")') === 'function'; } catch { return false; } })()) features.push('dynamicImport');
    
    return features;
  }

  getUserAgent() {
    if (typeof navigator !== 'undefined' && navigator.userAgent) {
      return navigator.userAgent;
    }
    return null;
  }

  getPlatformInfo() {
    // Browser platform info
    if (typeof navigator !== 'undefined') {
      return {
        platform: navigator.platform,
        language: navigator.language,
        cookieEnabled: navigator.cookieEnabled,
        onLine: navigator.onLine
      };
    }
    
    // Node.js platform info
    if (typeof process !== 'undefined') {
      return {
        platform: process.platform,
        arch: process.arch,
        version: process.version,
        pid: process.pid
      };
    }
    
    // Deno platform info
    if (typeof Deno !== 'undefined') {
      return {
        os: Deno.build.os,
        arch: Deno.build.arch,
        version: Deno.version
      };
    }
    
    return null;
  }

  // Compatibility checking
  isCompatible(requirements) {
    const capabilities = this.getCapabilities();
    
    for (const [feature, required] of Object.entries(requirements)) {
      if (required && !capabilities[feature]) {
        return false;
      }
    }
    
    return true;
  }

  getIncompatibilities(requirements) {
    const capabilities = this.getCapabilities();
    const incompatibilities = [];
    
    for (const [feature, required] of Object.entries(requirements)) {
      if (required && !capabilities[feature]) {
        incompatibilities.push(feature);
      }
    }
    
    return incompatibilities;
  }

  // Static methods for quick access
  static detect() {
    return new RuntimeDetector().detect();
  }

  static getCapabilities(environment = null) {
    return new RuntimeDetector().getCapabilities(environment);
  }

  static getRuntimeInfo() {
    return new RuntimeDetector().getRuntimeInfo();
  }

  static isCompatible(requirements) {
    return new RuntimeDetector().isCompatible(requirements);
  }
}

// Convenience functions
export function detectRuntime() {
  return RuntimeDetector.detect();
}

export function getRuntimeCapabilities(environment = null) {
  return RuntimeDetector.getCapabilities(environment);
}

export function getRuntimeInfo() {
  return RuntimeDetector.getRuntimeInfo();
}

export function isRuntimeCompatible(requirements) {
  return RuntimeDetector.isCompatible(requirements);
}

// Default detector instance
export const runtimeDetector = new RuntimeDetector();