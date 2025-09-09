/**
 * Asset Manager - Universal asset loading and management
 * Handles CSS, images, fonts, and other static assets across environments
 */

import { detectRuntime, RuntimeEnvironment } from './runtime-detector.js';

export class AssetManager {
  constructor(options = {}) {
    this.options = {
      baseUrl: '',
      assetPaths: {},
      preloadAssets: [],
      lazyLoad: true,
      cacheAssets: true,
      optimizeImages: true,
      inlineThreshold: 1024, // Inline assets smaller than this (bytes)
      supportedFormats: {
        images: ['png', 'jpg', 'jpeg', 'gif', 'svg', 'webp', 'avif'],
        styles: ['css'],
        fonts: ['woff', 'woff2', 'ttf', 'otf'],
        scripts: ['js', 'mjs']
      },
      ...options
    };
    
    this.environment = detectRuntime();
    this.loadedAssets = new Map();
    this.loadingAssets = new Map();
    this.assetCache = new Map();
  }

  // Main asset loading method
  async loadAsset(assetPath, options = {}) {
    const resolvedPath = this.resolvePath(assetPath, options);
    const assetType = this.getAssetType(resolvedPath);
    const cacheKey = this.getCacheKey(resolvedPath, options);

    // Return cached asset if available
    if (this.options.cacheAssets && this.loadedAssets.has(cacheKey)) {
      return this.loadedAssets.get(cacheKey);
    }

    // Return existing loading promise
    if (this.loadingAssets.has(cacheKey)) {
      return this.loadingAssets.get(cacheKey);
    }

    // Create loading promise
    const loadingPromise = this.doLoadAsset(resolvedPath, assetType, options);
    this.loadingAssets.set(cacheKey, loadingPromise);

    try {
      const asset = await loadingPromise;
      
      if (this.options.cacheAssets) {
        this.loadedAssets.set(cacheKey, asset);
      }
      
      return asset;
    } finally {
      this.loadingAssets.delete(cacheKey);
    }
  }

  async doLoadAsset(assetPath, assetType, options = {}) {
    switch (assetType) {
      case 'css':
        return await this.loadStylesheet(assetPath, options);
      case 'image':
        return await this.loadImage(assetPath, options);
      case 'font':
        return await this.loadFont(assetPath, options);
      case 'script':
        return await this.loadScript(assetPath, options);
      case 'data':
        return await this.loadData(assetPath, options);
      default:
        return await this.loadGeneric(assetPath, options);
    }
  }

  // CSS loading
  async loadStylesheet(cssPath, options = {}) {
    if (this.environment === RuntimeEnvironment.BROWSER) {
      return await this.loadBrowserStylesheet(cssPath, options);
    } else {
      return await this.loadServerStylesheet(cssPath, options);
    }
  }

  async loadBrowserStylesheet(cssPath, options = {}) {
    return new Promise((resolve, reject) => {
      // Check if already loaded
      const existing = document.querySelector(`link[href="${cssPath}"]`);
      if (existing) {
        resolve({ element: existing, cached: true });
        return;
      }

      const link = document.createElement('link');
      link.rel = 'stylesheet';
      link.href = cssPath;
      
      if (options.media) link.media = options.media;
      if (options.crossorigin) link.crossOrigin = options.crossorigin;

      link.onload = () => {
        resolve({ element: link, loaded: true });
      };

      link.onerror = () => {
        reject(new Error(`Failed to load stylesheet: ${cssPath}`));
      };

      document.head.appendChild(link);
    });
  }

  async loadServerStylesheet(cssPath) {
    try {
      const response = await fetch(cssPath);
      const content = await response.text();
      
      return {
        content,
        path: cssPath,
        inline: true
      };
    } catch (error) {
      throw new Error(`Failed to load stylesheet: ${cssPath} - ${error.message}`);
    }
  }

  // Image loading
  async loadImage(imagePath, options = {}) {
    if (this.environment === RuntimeEnvironment.BROWSER) {
      return await this.loadBrowserImage(imagePath, options);
    } else {
      return await this.loadServerImage(imagePath, options);
    }
  }

  async loadBrowserImage(imagePath, options = {}) {
    return new Promise((resolve, reject) => {
      const img = new Image();
      
      if (options.crossorigin) img.crossOrigin = options.crossorigin;
      if (options.loading) img.loading = options.loading; // lazy, eager
      if (options.sizes) img.sizes = options.sizes;
      if (options.srcset) img.srcset = options.srcset;

      img.onload = () => {
        resolve({
          element: img,
          width: img.naturalWidth,
          height: img.naturalHeight,
          path: imagePath
        });
      };

      img.onerror = () => {
        reject(new Error(`Failed to load image: ${imagePath}`));
      };

      img.src = imagePath;
    });
  }

  async loadServerImage(imagePath) {
    try {
      const response = await fetch(imagePath);
      const blob = await response.blob();
      
      return {
        blob,
        size: blob.size,
        type: blob.type,
        path: imagePath
      };
    } catch (error) {
      throw new Error(`Failed to load image: ${imagePath} - ${error.message}`);
    }
  }

  // Font loading
  async loadFont(fontPath, options = {}) {
    if (this.environment === RuntimeEnvironment.BROWSER && 'fonts' in document) {
      return await this.loadBrowserFont(fontPath, options);
    } else {
      return await this.loadGeneric(fontPath, options);
    }
  }

  async loadBrowserFont(fontPath, options = {}) {
    try {
      const fontFace = new FontFace(
        options.family || 'CustomFont',
        `url(${fontPath})`,
        {
          style: options.style || 'normal',
          weight: options.weight || 'normal',
          stretch: options.stretch || 'normal'
        }
      );

      await fontFace.load();
      document.fonts.add(fontFace);

      return {
        fontFace,
        family: options.family,
        loaded: true
      };
    } catch (error) {
      throw new Error(`Failed to load font: ${fontPath} - ${error.message}`);
    }
  }

  // Script loading
  async loadScript(scriptPath, options = {}) {
    if (this.environment === RuntimeEnvironment.BROWSER) {
      return await this.loadBrowserScript(scriptPath, options);
    } else {
      return await this.loadServerScript(scriptPath, options);
    }
  }

  async loadBrowserScript(scriptPath, options = {}) {
    return new Promise((resolve, reject) => {
      // Check if already loaded
      const existing = document.querySelector(`script[src="${scriptPath}"]`);
      if (existing) {
        resolve({ element: existing, cached: true });
        return;
      }

      const script = document.createElement('script');
      script.src = scriptPath;
      
      if (options.type) script.type = options.type;
      if (options.async !== undefined) script.async = options.async;
      if (options.defer !== undefined) script.defer = options.defer;
      if (options.crossorigin) script.crossOrigin = options.crossorigin;

      script.onload = () => {
        resolve({ element: script, loaded: true });
      };

      script.onerror = () => {
        reject(new Error(`Failed to load script: ${scriptPath}`));
      };

      document.head.appendChild(script);
    });
  }

  async loadServerScript(scriptPath, options = {}) {
    try {
      const response = await fetch(scriptPath);
      const content = await response.text();
      
      return {
        content,
        path: scriptPath,
        type: options.type || 'text/javascript'
      };
    } catch (error) {
      throw new Error(`Failed to load script: ${scriptPath} - ${error.message}`);
    }
  }

  // Data loading (JSON, XML, etc.)
  async loadData(dataPath) {
    try {
      const response = await fetch(dataPath);
      
      const contentType = response.headers.get('content-type') || '';
      let data;

      if (contentType.includes('application/json')) {
        data = await response.json();
      } else if (contentType.includes('text/xml') || contentType.includes('application/xml')) {
        const text = await response.text();
        data = this.parseXML(text);
      } else {
        data = await response.text();
      }

      return {
        data,
        contentType,
        path: dataPath
      };
    } catch (error) {
      throw new Error(`Failed to load data: ${dataPath} - ${error.message}`);
    }
  }

  parseXML(xmlString) {
    if (typeof DOMParser !== 'undefined') {
      const parser = new DOMParser();
      return parser.parseFromString(xmlString, 'text/xml');
    }
    return xmlString;
  }

  // Generic loading
  async loadGeneric(assetPath) {
    try {
      const response = await fetch(assetPath);
      const blob = await response.blob();
      
      return {
        blob,
        size: blob.size,
        type: blob.type,
        path: assetPath
      };
    } catch (error) {
      throw new Error(`Failed to load asset: ${assetPath} - ${error.message}`);
    }
  }

  // Path resolution
  resolvePath(assetPath, options = {}) {
    // Ensure assetPath is a string
    if (typeof assetPath !== 'string') {
      throw new Error(`Expected string path, got ${typeof assetPath}: ${assetPath}`);
    }
    
    // Absolute URLs
    if (assetPath.startsWith('http://') || assetPath.startsWith('https://')) {
      return assetPath;
    }

    // Data URLs
    if (assetPath.startsWith('data:')) {
      return assetPath;
    }

    // Blob URLs
    if (assetPath.startsWith('blob:')) {
      return assetPath;
    }

    // Check asset path mappings
    if (this.options.assetPaths[assetPath]) {
      return this.options.assetPaths[assetPath];
    }

    // Resolve relative to base URL
    const baseUrl = options.baseUrl || this.options.baseUrl;
    if (baseUrl) {
      return new URL(assetPath, baseUrl).href;
    }

    return assetPath;
  }

  // Asset type detection
  getAssetType(assetPath) {
    const extension = this.getFileExtension(assetPath).toLowerCase();
    
    if (this.options.supportedFormats.images.includes(extension)) {
      return 'image';
    }
    
    if (this.options.supportedFormats.styles.includes(extension)) {
      return 'css';
    }
    
    if (this.options.supportedFormats.fonts.includes(extension)) {
      return 'font';
    }
    
    if (this.options.supportedFormats.scripts.includes(extension)) {
      return 'script';
    }

    if (['json', 'xml'].includes(extension)) {
      return 'data';
    }

    return 'generic';
  }

  getFileExtension(path) {
    // Remove query parameters and hash
    const cleanPath = path.split('?')[0].split('#')[0];
    const parts = cleanPath.split('.');
    return parts.length > 1 ? parts.pop() : '';
  }

  // Batch operations
  async loadAssets(assetPaths, options = {}) {
    const loadPromises = assetPaths.map(path => 
      this.loadAsset(path, options).catch(error => ({ error, path }))
    );
    
    const results = await Promise.all(loadPromises);
    
    return {
      successful: results.filter(r => !r.error),
      failed: results.filter(r => r.error)
    };
  }

  // Preloading
  async preloadAssets(assetPaths = null) {
    const toPreload = assetPaths || this.options.preloadAssets;
    
    if (this.environment === RuntimeEnvironment.BROWSER) {
      return await this.preloadBrowserAssets(toPreload);
    } else {
      return await this.loadAssets(toPreload, { preload: true });
    }
  }

  async preloadBrowserAssets(assetPaths) {
    const preloadPromises = assetPaths.map(async (assetPath) => {
      try {
        const link = document.createElement('link');
        link.rel = 'preload';
        link.href = this.resolvePath(assetPath);
        
        const assetType = this.getAssetType(assetPath);
        switch (assetType) {
          case 'css':
            link.as = 'style';
            break;
          case 'script':
            link.as = 'script';
            break;
          case 'font':
            link.as = 'font';
            link.crossOrigin = 'anonymous';
            break;
          case 'image':
            link.as = 'image';
            break;
        }

        document.head.appendChild(link);
        return { success: true, path: assetPath };
      } catch (error) {
        return { success: false, path: assetPath, error };
      }
    });

    return await Promise.all(preloadPromises);
  }

  // Cache management
  getCacheKey(assetPath, options) {
    return `${assetPath}::${JSON.stringify(options)}`;
  }

  clearCache() {
    this.loadedAssets.clear();
    this.assetCache.clear();
  }

  getCacheStats() {
    return {
      loaded: this.loadedAssets.size,
      loading: this.loadingAssets.size,
      cached: this.assetCache.size
    };
  }

  // Asset optimization
  shouldInline(assetPath, size = null) {
    if (size && size <= this.options.inlineThreshold) {
      return true;
    }
    return false;
  }

  async optimizeImage(imagePath, options = {}) {
    // Placeholder for image optimization
    // In a real implementation, this might compress images, convert formats, etc.
    return await this.loadImage(imagePath, options);
  }

  // Utilities
  addAssetPath(alias, path) {
    this.options.assetPaths[alias] = path;
  }

  setBaseUrl(baseUrl) {
    this.options.baseUrl = baseUrl;
  }

  isAssetLoaded(assetPath) {
    const resolvedPath = this.resolvePath(assetPath);
    return this.loadedAssets.has(this.getCacheKey(resolvedPath, {}));
  }

  getLoadedAssets() {
    return Array.from(this.loadedAssets.keys());
  }
}

// Factory function
export function createAssetManager(options = {}) {
  return new AssetManager(options);
}

// Default asset manager instance
export const assetManager = new AssetManager();

// Convenience functions
export async function loadAsset(assetPath, options = {}) {
  return await assetManager.loadAsset(assetPath, options);
}

export async function loadStylesheet(cssPath, options = {}) {
  return await assetManager.loadStylesheet(cssPath, options);
}

export async function loadImage(imagePath, options = {}) {
  return await assetManager.loadImage(imagePath, options);
}

export async function preloadAssets(assetPaths) {
  return await assetManager.preloadAssets(assetPaths);
}
