/**
 * Module Resolver - Universal module path resolution and mapping
 * Handles different module systems and environments
 */

import { detectRuntime, RuntimeEnvironment } from './runtime-detector.js';

export class ModuleResolver {
  constructor(options = {}) {
    this.options = {
      baseUrl: '',
      paths: {},
      aliases: {},
      extensions: ['.js', '.mjs', '.cjs', '.ts', '.jsx', '.tsx'],
      moduleMap: {},
      cdnTemplate: 'https://unpkg.com/{name}@{version}/{path}',
      fallbacks: [],
      ...options
    };
    
    this.environment = detectRuntime();
    this.resolutionCache = new Map();
  }

  // Main resolution method
  resolve(modulePath, context = {}) {
    const cacheKey = this.getCacheKey(modulePath, context);
    
    if (this.resolutionCache.has(cacheKey)) {
      return this.resolutionCache.get(cacheKey);
    }

    const resolved = this.doResolve(modulePath, context);
    this.resolutionCache.set(cacheKey, resolved);
    
    return resolved;
  }

  doResolve(modulePath, context = {}) {
    // Handle different module path types
    const pathInfo = this.analyzePath(modulePath);
    
    switch (pathInfo.type) {
      case 'absolute':
        return this.resolveAbsolute(pathInfo, context);
      case 'relative':
        return this.resolveRelative(pathInfo, context);
      case 'package':
        return this.resolvePackage(pathInfo, context);
      case 'alias':
        return this.resolveAlias(pathInfo, context);
      case 'mapped':
        return this.resolveMapped(pathInfo, context);
      default:
        throw new Error(`Unable to resolve module: ${modulePath}`);
    }
  }

  analyzePath(modulePath) {
    // Absolute URLs
    if (/^https?:\/\//.test(modulePath)) {
      return { type: 'absolute', path: modulePath, original: modulePath };
    }

    // File protocol
    if (modulePath.startsWith('file://')) {
      return { type: 'absolute', path: modulePath, original: modulePath };
    }

    // Relative paths
    if (modulePath.startsWith('./') || modulePath.startsWith('../')) {
      return { type: 'relative', path: modulePath, original: modulePath };
    }

    // Check for mapped paths
    if (this.options.moduleMap[modulePath]) {
      return { 
        type: 'mapped', 
        path: modulePath, 
        mapped: this.options.moduleMap[modulePath],
        original: modulePath 
      };
    }

    // Check for aliases
    const aliasKey = Object.keys(this.options.aliases).find(alias => 
      modulePath.startsWith(`${alias  }/`) || modulePath === alias
    );
    
    if (aliasKey) {
      return { 
        type: 'alias', 
        path: modulePath, 
        alias: aliasKey,
        remainder: modulePath.slice(aliasKey.length + 1),
        original: modulePath 
      };
    }

    // Package imports
    return { type: 'package', path: modulePath, original: modulePath };
  }

  resolveAbsolute(pathInfo) {
    return {
      resolved: pathInfo.path,
      type: 'absolute',
      original: pathInfo.original
    };
  }

  resolveRelative(pathInfo, context) {
    let baseUrl = context.baseUrl || this.options.baseUrl || '';
    
    // Use current location in browsers
    if (this.environment === RuntimeEnvironment.BROWSER && !baseUrl) {
      baseUrl = window.location.href;
    }

    if (!baseUrl) {
      throw new Error(`Cannot resolve relative path "${pathInfo.path}" without base URL`);
    }

    const resolved = new URL(pathInfo.path, baseUrl).href;
    
    return {
      resolved,
      type: 'relative',
      original: pathInfo.original,
      baseUrl
    };
  }

  resolvePackage(pathInfo, context) {
    const packageName = this.parsePackageName(pathInfo.path);
    
    // Try different resolution strategies based on environment
    switch (this.environment) {
      case RuntimeEnvironment.BROWSER:
        return this.resolveBrowserPackage(packageName, context);
      
      case RuntimeEnvironment.NODE:
        return this.resolveNodePackage(packageName, context);
        
      case RuntimeEnvironment.DENO:
        return this.resolveDenoPackage(packageName, context);
        
      case RuntimeEnvironment.BUN:
        return this.resolveBunPackage(packageName, context);
        
      case RuntimeEnvironment.CLOUDFLARE:
      case RuntimeEnvironment.EDGE:
        return this.resolveEdgePackage(packageName, context);
        
      default:
        return this.resolveGenericPackage(packageName, context);
    }
  }

  parsePackageName(modulePath) {
    const parts = modulePath.split('/');
    
    if (modulePath.startsWith('@')) {
      // Scoped package
      return {
        name: `${parts[0]}/${parts[1]}`,
        subpath: parts.slice(2).join('/'),
        scope: parts[0],
        packageName: parts[1]
      };
    } else {
      // Regular package
      return {
        name: parts[0],
        subpath: parts.slice(1).join('/'),
        scope: null,
        packageName: parts[0]
      };
    }
  }

  resolveBrowserPackage(packageInfo, context) {
    // Try CDN resolution first
    const cdnUrl = this.resolveToCdn(packageInfo, context);
    
    return {
      resolved: cdnUrl,
      type: 'package',
      strategy: 'cdn',
      original: packageInfo.name + (packageInfo.subpath ? `/${  packageInfo.subpath}` : ''),
      package: packageInfo
    };
  }

  resolveNodePackage(packageInfo) {
    // Node.js resolution - return as-is for require/import to handle
    const modulePath = packageInfo.name + (packageInfo.subpath ? `/${  packageInfo.subpath}` : '');
    
    return {
      resolved: modulePath,
      type: 'package',
      strategy: 'node',
      original: modulePath,
      package: packageInfo
    };
  }

  resolveDenoPackage(packageInfo) {
    // Use npm: specifier for Deno
    const modulePath = `npm:${  packageInfo.name  }${packageInfo.subpath ? `/${  packageInfo.subpath}` : ''}`;
    
    return {
      resolved: modulePath,
      type: 'package',
      strategy: 'deno-npm',
      original: packageInfo.name + (packageInfo.subpath ? `/${  packageInfo.subpath}` : ''),
      package: packageInfo
    };
  }

  resolveBunPackage(packageInfo) {
    // Bun can handle npm packages directly
    const modulePath = packageInfo.name + (packageInfo.subpath ? `/${  packageInfo.subpath}` : '');
    
    return {
      resolved: modulePath,
      type: 'package',
      strategy: 'bun',
      original: modulePath,
      package: packageInfo
    };
  }

  resolveEdgePackage(packageInfo, context) {
    // Edge environments typically use CDN or bundled modules
    const cdnUrl = this.resolveToCdn(packageInfo, context);
    
    return {
      resolved: cdnUrl,
      type: 'package',
      strategy: 'edge-cdn',
      original: packageInfo.name + (packageInfo.subpath ? `/${  packageInfo.subpath}` : ''),
      package: packageInfo
    };
  }

  resolveGenericPackage(packageInfo) {
    // Generic fallback
    const modulePath = packageInfo.name + (packageInfo.subpath ? `/${  packageInfo.subpath}` : '');
    
    return {
      resolved: modulePath,
      type: 'package',
      strategy: 'generic',
      original: modulePath,
      package: packageInfo
    };
  }

  resolveToCdn(packageInfo, context = {}) {
    const version = context.version || 'latest';
    const subpath = packageInfo.subpath || 'dist/index.js';
    
    return this.options.cdnTemplate
      .replace('{name}', packageInfo.name)
      .replace('{version}', version)
      .replace('{path}', subpath);
  }

  resolveAlias(pathInfo, context) {
    const aliasTarget = this.options.aliases[pathInfo.alias];
    const resolvedPath = pathInfo.remainder 
      ? `${aliasTarget}/${pathInfo.remainder}`
      : aliasTarget;
    
    // Recursively resolve the aliased path
    const resolved = this.doResolve(resolvedPath, context);
    
    return {
      ...resolved,
      type: 'alias',
      alias: pathInfo.alias,
      aliasTarget,
      original: pathInfo.original
    };
  }

  resolveMapped(pathInfo, context) {
    const mapped = pathInfo.mapped;
    
    // If mapped value is a function, call it
    if (typeof mapped === 'function') {
      const result = mapped(pathInfo.path, context);
      return {
        resolved: result,
        type: 'mapped',
        original: pathInfo.original,
        mapFunction: true
      };
    }
    
    // Static mapping
    return {
      resolved: mapped,
      type: 'mapped',
      original: pathInfo.original
    };
  }

  // Path utilities
  addExtension(path, extensions = null) {
    const exts = extensions || this.options.extensions;
    
    // Already has extension
    if (exts.some(ext => path.endsWith(ext))) {
      return path;
    }
    
    // Add default extension
    return path + exts[0];
  }

  stripExtension(path) {
    const ext = this.options.extensions.find(e => path.endsWith(e));
    return ext ? path.slice(0, -ext.length) : path;
  }

  isRelative(path) {
    return path.startsWith('./') || path.startsWith('../');
  }

  isAbsolute(path) {
    return /^https?:\/\//.test(path) || path.startsWith('file://');
  }

  // Configuration methods
  addAlias(alias, target) {
    this.options.aliases[alias] = target;
    this.clearCache();
  }

  addMapping(from, to) {
    this.options.moduleMap[from] = to;
    this.clearCache();
  }

  setBaseUrl(baseUrl) {
    this.options.baseUrl = baseUrl;
    this.clearCache();
  }

  setCdnTemplate(template) {
    this.options.cdnTemplate = template;
    this.clearCache();
  }

  // Path patterns and wildcards
  resolvePattern(pattern, replacements = {}) {
    let resolved = pattern;
    
    Object.entries(replacements).forEach(([key, value]) => {
      resolved = resolved.replace(new RegExp(`\\{${key}\\}`, 'g'), value);
    });
    
    return resolved;
  }

  // Batch resolution
  resolveAll(modulePaths, context = {}) {
    return modulePaths.map(path => {
      try {
        return { path, resolution: this.resolve(path, context), success: true };
      } catch (error) {
        return { path, error, success: false };
      }
    });
  }

  // Cache management
  getCacheKey(modulePath, context) {
    return `${modulePath}::${JSON.stringify(context)}`;
  }

  clearCache() {
    this.resolutionCache.clear();
  }

  getCacheStats() {
    return {
      size: this.resolutionCache.size,
      keys: Array.from(this.resolutionCache.keys())
    };
  }

  // Validation
  validateResolution(resolution) {
    if (!resolution || !resolution.resolved) {
      return { valid: false, error: 'Invalid resolution object' };
    }
    
    // Additional validation based on type
    switch (resolution.type) {
      case 'absolute':
        if (!this.isAbsolute(resolution.resolved)) {
          return { valid: false, error: 'Absolute resolution must be a valid URL' };
        }
        break;
      
      case 'relative':
        if (!resolution.baseUrl) {
          return { valid: false, error: 'Relative resolution must include baseUrl' };
        }
        break;
    }
    
    return { valid: true };
  }

  // Debug utilities
  debug(modulePath, context = {}) {
    const pathInfo = this.analyzePath(modulePath);
    const resolution = this.resolve(modulePath, context);
    const validation = this.validateResolution(resolution);
    
    return {
      input: modulePath,
      context,
      pathInfo,
      resolution,
      validation,
      environment: this.environment,
      options: this.options
    };
  }
}

// Factory function
export function createModuleResolver(options = {}) {
  return new ModuleResolver(options);
}

// Default resolver instance
export const moduleResolver = new ModuleResolver();

// Convenience functions
export function resolveModule(modulePath, context = {}) {
  return moduleResolver.resolve(modulePath, context);
}

export function addAlias(alias, target) {
  return moduleResolver.addAlias(alias, target);
}

export function addMapping(from, to) {
  return moduleResolver.addMapping(from, to);
}
