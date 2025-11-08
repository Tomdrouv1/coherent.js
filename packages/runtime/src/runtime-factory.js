/**
 * Runtime Factory - Detects environment and creates appropriate runtime
 */

export const RuntimeEnvironment = {
  BROWSER: 'browser',
  NODE: 'node', 
  EDGE: 'edge',
  CLOUDFLARE: 'cloudflare',
  DENO: 'deno',
  BUN: 'bun',
  ELECTRON: 'electron',
  TAURI: 'tauri',
  STATIC: 'static'
};

/**
 * Detect the current runtime environment
 */
export function detectRuntime() {
  // Browser environments
  if (typeof window !== 'undefined' && typeof document !== 'undefined') {
    // Electron detection
    if (typeof window.require !== 'undefined' || 
        typeof window.process !== 'undefined' && window.process.versions?.electron) {
      return RuntimeEnvironment.ELECTRON;
    }
    
    // Tauri detection
    if (typeof window.__TAURI__ !== 'undefined') {
      return RuntimeEnvironment.TAURI;
    }
    
    return RuntimeEnvironment.BROWSER;
  }
  
  // Server-side environments
  if (typeof process !== 'undefined') {
    // Node.js detection
    if (process.versions?.node) {
      return RuntimeEnvironment.NODE;
    }
  }
  
  // Edge runtime detection
  if (typeof EdgeRuntime !== 'undefined') {
    return RuntimeEnvironment.EDGE;
  }
  
  // Cloudflare Workers
  if (typeof caches !== 'undefined' && 
      typeof Request !== 'undefined' && 
      typeof Response !== 'undefined' &&
      typeof addEventListener !== 'undefined') {
    return RuntimeEnvironment.CLOUDFLARE;
  }
  
  // Deno detection
  if (typeof Deno !== 'undefined') {
    return RuntimeEnvironment.DENO;
  }
  
  // Bun detection
  if (typeof Bun !== 'undefined') {
    return RuntimeEnvironment.BUN;
  }
  
  // Fallback to browser
  return RuntimeEnvironment.BROWSER;
}

/**
 * Create runtime instance based on environment
 */
export async function createRuntime(options = {}) {
  const environment = options.environment || detectRuntime();
  
  switch (environment) {
    case RuntimeEnvironment.BROWSER:
    case RuntimeEnvironment.ELECTRON:
    case RuntimeEnvironment.TAURI: {
      const { BrowserRuntime } = await import('./runtimes/browser.js');
      return new BrowserRuntime(options);
    }
    
    case RuntimeEnvironment.EDGE:
    case RuntimeEnvironment.CLOUDFLARE:
    case RuntimeEnvironment.DENO:
    case RuntimeEnvironment.BUN: {
      const { EdgeRuntime } = await import('./runtimes/edge.js');
      return new EdgeRuntime(options);
    }
    
    case RuntimeEnvironment.NODE: {
      // Use Node.js runtime for Node.js environments
      const { NodeRuntime } = await import('./runtimes/node.js');
      return new NodeRuntime(options);
    }
    
    case RuntimeEnvironment.STATIC: {
      const { StaticRuntime } = await import('./runtimes/static.js');
      return new StaticRuntime(options);
    }
    
    default:
      throw new Error(`Unsupported runtime environment: ${environment}`);
  }
}

/**
 * Runtime capabilities detection
 */
export function getRuntimeCapabilities(environment = null) {
  const env = environment || detectRuntime();
  
  const capabilities = {
    dom: false,
    ssr: false,
    filesystem: false,
    fetch: false,
    websockets: false,
    workers: false,
    storage: false,
    crypto: false,
    streams: false
  };
  
  switch (env) {
    case RuntimeEnvironment.BROWSER:
      return {
        ...capabilities,
        dom: true,
        fetch: true,
        websockets: true,
        workers: true,
        storage: true,
        crypto: true,
        streams: true
      };
      
    case RuntimeEnvironment.ELECTRON:
      return {
        ...capabilities,
        dom: true,
        filesystem: true,
        fetch: true,
        websockets: true,
        storage: true,
        crypto: true,
        streams: true
      };
      
    case RuntimeEnvironment.TAURI:
      return {
        ...capabilities,
        dom: true,
        filesystem: true,
        fetch: true,
        websockets: true,
        storage: true,
        crypto: true
      };
      
    case RuntimeEnvironment.NODE:
      return {
        ...capabilities,
        ssr: true,
        filesystem: true,
        fetch: true,
        websockets: true,
        crypto: true,
        streams: true
      };
      
    case RuntimeEnvironment.EDGE:
    case RuntimeEnvironment.CLOUDFLARE:
      return {
        ...capabilities,
        ssr: true,
        fetch: true,
        crypto: true,
        streams: true,
        storage: true
      };
      
    case RuntimeEnvironment.DENO:
      return {
        ...capabilities,
        ssr: true,
        filesystem: true,
        fetch: true,
        websockets: true,
        crypto: true,
        streams: true
      };
      
    case RuntimeEnvironment.BUN:
      return {
        ...capabilities,
        ssr: true,
        filesystem: true,
        fetch: true,
        websockets: true,
        crypto: true,
        streams: true
      };
      
    case RuntimeEnvironment.STATIC:
      return {
        ...capabilities,
        ssr: true,
        filesystem: false
      };
      
    default:
      return capabilities;
  }
}

/**
 * Runtime information
 */
export function getRuntimeInfo() {
  const environment = detectRuntime();
  const capabilities = getRuntimeCapabilities(environment);
  
  return {
    environment,
    capabilities,
    version: getEnvironmentVersion(),
    features: getAvailableFeatures(),
    userAgent: typeof navigator !== 'undefined' ? navigator.userAgent : null,
    platform: getPlatform()
  };
}

function getEnvironmentVersion() {
  const env = detectRuntime();
  
  switch (env) {
    case RuntimeEnvironment.NODE:
      return typeof process !== 'undefined' ? process.version : null;
    case RuntimeEnvironment.DENO:
      return typeof Deno !== 'undefined' ? Deno.version.deno : null;
    case RuntimeEnvironment.BUN:
      return typeof Bun !== 'undefined' ? Bun.version : null;
    case RuntimeEnvironment.BROWSER:
    case RuntimeEnvironment.ELECTRON:
    case RuntimeEnvironment.TAURI:
      return typeof navigator !== 'undefined' ? navigator.userAgent : null;
    default:
      return null;
  }
}

function getAvailableFeatures() {
  const features = [];
  
  // Check for various Web APIs and features
  if (typeof fetch !== 'undefined') features.push('fetch');
  if (typeof WebSocket !== 'undefined') features.push('websockets');
  if (typeof Worker !== 'undefined') features.push('workers');
  if (typeof localStorage !== 'undefined') features.push('localStorage');
  if (typeof sessionStorage !== 'undefined') features.push('sessionStorage');
  if (typeof indexedDB !== 'undefined') features.push('indexedDB');
  if (typeof crypto !== 'undefined') features.push('crypto');
  if (typeof ReadableStream !== 'undefined') features.push('streams');
  if (typeof customElements !== 'undefined') features.push('customElements');
  if (typeof ShadowRoot !== 'undefined') features.push('shadowDOM');
  if (typeof IntersectionObserver !== 'undefined') features.push('intersectionObserver');
  if (typeof MutationObserver !== 'undefined') features.push('mutationObserver');
  if (typeof requestAnimationFrame !== 'undefined') features.push('animationFrame');
  if (typeof requestIdleCallback !== 'undefined') features.push('idleCallback');
  
  return features;
}

function getPlatform() {
  if (typeof navigator !== 'undefined') {
    return {
      platform: navigator.platform,
      userAgent: navigator.userAgent,
      language: navigator.language,
      cookieEnabled: navigator.cookieEnabled,
      onLine: navigator.onLine
    };
  }
  
  if (typeof process !== 'undefined') {
    return {
      platform: process.platform,
      arch: process.arch,
      version: process.version,
      versions: process.versions
    };
  }
  
  if (typeof Deno !== 'undefined') {
    return {
      platform: Deno.build.os,
      arch: Deno.build.arch,
      version: Deno.version.deno
    };
  }
  
  return null;
}