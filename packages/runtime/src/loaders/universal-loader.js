/**
 * Universal Module Loader - Loads modules across different JavaScript environments
 * Provides dynamic module loading for browser, Node.js, Deno, Bun, and edge environments
 */

export class UniversalLoader {
  constructor(options = {}) {
    this.options = {
      baseUrl: '',
      moduleMap: {},
      fallbackUrls: [],
      cache: true,
      ...options
    };
    
    this.moduleCache = new Map();
    this.loadingPromises = new Map();
    this.environment = this.detectEnvironment();
  }

  detectEnvironment() {
    if (typeof Deno !== 'undefined') return 'deno';
    if (typeof Bun !== 'undefined') return 'bun'; 
    if (typeof window !== 'undefined') return 'browser';
    if (typeof global !== 'undefined' && typeof require !== 'undefined') return 'node';
    if (typeof WorkerGlobalScope !== 'undefined') return 'worker';
    return 'unknown';
  }

  // Universal module loading
  async load(modulePath, options = {}) {
    const resolvedPath = this.resolvePath(modulePath, options);
    const cacheKey = resolvedPath + JSON.stringify(options);
    
    // Return cached module if available
    if (this.options.cache && this.moduleCache.has(cacheKey)) {
      return this.moduleCache.get(cacheKey);
    }

    // Return existing loading promise to avoid duplicate loads
    if (this.loadingPromises.has(cacheKey)) {
      return this.loadingPromises.get(cacheKey);
    }

    // Create loading promise
    const loadingPromise = this.loadModule(resolvedPath, options);
    this.loadingPromises.set(cacheKey, loadingPromise);

    try {
      const module = await loadingPromise;
      
      if (this.options.cache) {
        this.moduleCache.set(cacheKey, module);
      }
      
      return module;
    } finally {
      this.loadingPromises.delete(cacheKey);
    }
  }

  async loadModule(modulePath, options = {}) {
    switch (this.environment) {
      case 'browser':
        return await this.loadBrowserModule(modulePath, options);
      
      case 'node':
        return await this.loadNodeModule(modulePath, options);
        
      case 'deno':
        return await this.loadDenoModule(modulePath, options);
        
      case 'bun':
        return await this.loadBunModule(modulePath, options);
        
      case 'worker':
        return await this.loadWorkerModule(modulePath, options);
        
      default:
        return await this.loadGenericModule(modulePath, options);
    }
  }

  async loadBrowserModule(modulePath, options = {}) {
    if (modulePath.startsWith('http') || modulePath.startsWith('/')) {
      // ES module import
      try {
        return await import(modulePath);
      } catch {
        // Fallback to script tag loading
        return await this.loadScript(modulePath, options);
      }
    } else {
      // Try CDN loading for npm packages
      const cdnUrl = this.toCdnUrl(modulePath);
      return await import(cdnUrl);
    }
  }

  async loadNodeModule(modulePath) {
    if (typeof require !== 'undefined') {
      try {
        return require(modulePath);
      } catch {
        // Try dynamic import for ES modules
        return await import(modulePath);
      }
    } else {
      return await import(modulePath);
    }
  }

  async loadDenoModule(modulePath) {
    // Deno supports direct URLs and npm: specifier
    if (modulePath.startsWith('npm:')) {
      return await import(modulePath);
    } else if (modulePath.startsWith('http')) {
      return await import(modulePath);
    } else {
      // Convert to npm: specifier
      return await import(`npm:${modulePath}`);
    }
  }

  async loadBunModule(modulePath) {
    // Bun supports both require and import
    try {
      return await import(modulePath);
    } catch (error) {
      if (typeof require !== 'undefined') {
        return require(modulePath);
      }
      throw error;
    }
  }

  async loadWorkerModule(modulePath) {
    // Worker environments typically support import
    return await import(modulePath);
  }

  async loadGenericModule(modulePath) {
    // Generic fallback using dynamic import
    return await import(modulePath);
  }

  async loadScript(src, options = {}) {
    return new Promise((resolve, reject) => {
      const script = document.createElement('script');
      script.type = 'module';
      script.src = src;
      
      script.onload = () => {
        // For script tags, we need to get the module from window or a registry
        const moduleName = options.globalName || this.getModuleNameFromPath(src);
        const module = window[moduleName] || {};
        resolve(module);
      };
      
      script.onerror = () => reject(new Error(`Failed to load script: ${src}`));
      
      document.head.appendChild(script);
    });
  }

  resolvePath(modulePath, options = {}) {
    // Handle absolute URLs
    if (modulePath.startsWith('http://') || modulePath.startsWith('https://')) {
      return modulePath;
    }

    // Handle relative paths
    if (modulePath.startsWith('./') || modulePath.startsWith('../')) {
      return this.resolveRelativePath(modulePath, options.baseUrl || this.options.baseUrl);
    }

    // Check module map
    if (this.options.moduleMap[modulePath]) {
      return this.options.moduleMap[modulePath];
    }

    // Default resolution
    return this.options.baseUrl + modulePath;
  }

  resolveRelativePath(relativePath, baseUrl) {
    if (!baseUrl) return relativePath;
    
    const base = new URL(baseUrl, location?.href || 'file:///');
    const resolved = new URL(relativePath, base);
    return resolved.href;
  }

  toCdnUrl(packageName, version = 'latest') {
    // Convert npm package to CDN URL
    const _cleanName = packageName.replace(/^@/, '').replace('/', '-');
    return `https://unpkg.com/${packageName}@${version}/dist/index.js`;
  }

  getModuleNameFromPath(path) {
    const filename = path.split('/').pop().split('.')[0];
    return filename.replace(/[-_]/g, '');
  }

  // Batch loading
  async loadAll(modulePaths, options = {}) {
    const loadPromises = modulePaths.map(path => 
      this.load(path, options).catch(error => ({ error, path }))
    );
    
    return await Promise.all(loadPromises);
  }

  // Preloading
  async preload(modulePaths, options = {}) {
    const preloadPromises = modulePaths.map(async path => {
      try {
        await this.load(path, { ...options, preload: true });
        return { success: true, path };
      } catch (error) {
        return { success: false, path, error };
      }
    });
    
    return await Promise.all(preloadPromises);
  }

  // Cache management
  clearCache() {
    this.moduleCache.clear();
  }

  getCacheStats() {
    return {
      size: this.moduleCache.size,
      modules: Array.from(this.moduleCache.keys())
    };
  }

  // Environment detection helpers
  static isSupported() {
    return (() => { try { return typeof Function('return import("")') === 'function'; } catch { return false; } })() || typeof require !== 'undefined';
  }

  static getCapabilities() {
    return {
      dynamicImport: (() => { try { return typeof Function('return import("")') === 'function'; } catch { return false; } })(),
      require: typeof require !== 'undefined',
      fetch: typeof fetch !== 'undefined',
      worker: typeof Worker !== 'undefined',
      environment: new UniversalLoader().environment
    };
  }
}

// Factory function
export function createLoader(options = {}) {
  return new UniversalLoader(options);
}

// Default instance
export const universalLoader = new UniversalLoader();
