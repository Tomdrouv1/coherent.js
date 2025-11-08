/**
 * Component Loader - Specialized loader for Coherent.js components
 * Handles component registration, lazy loading, and dependency resolution
 */

import { universalLoader } from './universal-loader.js';

export class ComponentLoader {
  constructor(options = {}) {
    this.options = {
      componentRegistry: new Map(),
      lazyLoad: true,
      preloadComponents: [],
      componentPaths: {},
      ...options
    };
    
    this.loader = universalLoader;
    this.loadingQueue = new Map();
    this.dependencyGraph = new Map();
    this.loadedComponents = new Set();
  }

  // Register a component with its metadata
  registerComponent(name, componentOrPath, options = {}) {
    const registration = {
      name,
      path: typeof componentOrPath === 'string' ? componentOrPath : null,
      component: typeof componentOrPath === 'function' ? componentOrPath : null,
      loaded: typeof componentOrPath === 'function',
      dependencies: options.dependencies || [],
      lazy: options.lazy !== false,
      preload: options.preload || false,
      metadata: options.metadata || {},
      ...options
    };

    this.options.componentRegistry.set(name, registration);

    // Build dependency graph
    if (registration.dependencies.length > 0) {
      this.dependencyGraph.set(name, registration.dependencies);
    }

    // Auto-load if not lazy
    if (!registration.lazy && registration.path && !registration.loaded) {
      this.loadComponent(name);
    }

    return registration;
  }

  // Load a component by name
  async loadComponent(name, options = {}) {
    const registration = this.options.componentRegistry.get(name);
    
    if (!registration) {
      throw new Error(`Component '${name}' not found in registry`);
    }

    // Return already loaded component
    if (registration.loaded && registration.component) {
      return registration.component;
    }

    // Return existing loading promise
    if (this.loadingQueue.has(name)) {
      return this.loadingQueue.get(name);
    }

    // Create loading promise
    const loadingPromise = this.doLoadComponent(registration, options);
    this.loadingQueue.set(name, loadingPromise);

    try {
      const component = await loadingPromise;
      
      // Update registration
      registration.component = component;
      registration.loaded = true;
      this.loadedComponents.add(name);
      
      return component;
    } finally {
      this.loadingQueue.delete(name);
    }
  }

  async doLoadComponent(registration, options = {}) {
    const { name, path, dependencies } = registration;

    try {
      // Load dependencies first
      if (dependencies.length > 0) {
        await this.loadDependencies(dependencies, options);
      }

      // Load the component module
      let component;
      if (path) {
        const module = await this.loader.load(path, options);
        
        // Extract component from module
        component = this.extractComponent(module, name);
      } else if (registration.component) {
        component = registration.component;
      } else {
        throw new Error(`No component or path specified for '${name}'`);
      }

      // Process component (add metadata, wrap, etc.)
      return this.processComponent(component, registration, options);

    } catch (error) {
      console.error(`Failed to load component '${name}':`, error);
      throw error;
    }
  }

  extractComponent(module, componentName) {
    // Try different export patterns
    if (module.default && typeof module.default === 'function') {
      return module.default;
    }
    
    if (module[componentName] && typeof module[componentName] === 'function') {
      return module[componentName];
    }
    
    // Look for the first function export
    for (const [key, value] of Object.entries(module)) {
      if (typeof value === 'function' && key !== 'default') {
        return value;
      }
    }
    
    throw new Error(`No valid component function found in module for '${componentName}'`);
  }

  processComponent(component, registration, options = {}) {
    // Add component metadata
    if (registration.metadata) {
      Object.assign(component, {
        $meta: registration.metadata,
        $name: registration.name
      });
    }

    // Wrap component with additional functionality if needed
    if (options.wrapper) {
      return options.wrapper(component, registration);
    }

    return component;
  }

  async loadDependencies(dependencies, options = {}) {
    const dependencyPromises = dependencies.map(depName => {
      return this.loadComponent(depName, options);
    });

    await Promise.all(dependencyPromises);
  }

  // Batch component loading
  async loadComponents(componentNames, options = {}) {
    const loadPromises = componentNames.map(name => 
      this.loadComponent(name, options).catch(error => ({ error, name }))
    );
    
    const results = await Promise.all(loadPromises);
    
    // Separate successful loads from errors
    const loaded = {};
    const errors = [];
    
    results.forEach((result, index) => {
      const name = componentNames[index];
      if (result && result.error) {
        errors.push({ name, error: result.error });
      } else {
        loaded[name] = result;
      }
    });

    return { loaded, errors };
  }

  // Preload components
  async preloadComponents(componentNames = null) {
    const toPreload = componentNames || this.getPreloadableComponents();
    
    const preloadResults = await Promise.allSettled(
      toPreload.map(name => this.loadComponent(name, { preload: true }))
    );

    const results = {
      successful: [],
      failed: []
    };

    preloadResults.forEach((result, index) => {
      const name = toPreload[index];
      if (result.status === 'fulfilled') {
        results.successful.push(name);
      } else {
        results.failed.push({ name, error: result.reason });
      }
    });

    return results;
  }

  getPreloadableComponents() {
    return Array.from(this.options.componentRegistry.values())
      .filter(reg => reg.preload && !reg.loaded)
      .map(reg => reg.name);
  }

  // Component discovery
  async discoverComponents(basePath, options = {}) {
    // This would scan directories/modules for component files
    // Implementation depends on the environment
    const discovered = [];
    
    try {
      if (typeof fetch !== 'undefined') {
        // Browser-based discovery (limited)
        discovered.push(...await this.discoverFromManifest(basePath, options));
      } else if (typeof require !== 'undefined') {
        // Node.js-based discovery
        discovered.push(...await this.discoverFromFileSystem(basePath, options));
      }
    } catch (error) {
      console.warn('Component discovery failed:', error);
    }

    return discovered;
  }

  async discoverFromManifest(basePath, _options = {}) {
    try {
      const manifestUrl = `${basePath}/components.json`;
      const response = await fetch(manifestUrl);
      const manifest = await response.json();
      
      return manifest.components || [];
    } catch {
      return [];
    }
  }

  async discoverFromFileSystem(basePath, _options = {}) {
    // This would require file system access
    // Placeholder for Node.js implementation
    return [];
  }

  // Auto-registration from patterns
  registerComponentPattern(pattern, options = {}) {
    // Register components matching a pattern
    // e.g., './components/*.js' -> register all JS files as components
    this.componentPatterns = this.componentPatterns || [];
    this.componentPatterns.push({ pattern, options });
  }

  // Dependency analysis
  analyzeDependencies() {
    const analysis = {
      circular: [],
      missing: [],
      unused: [],
      depth: new Map()
    };

    // Check for circular dependencies
    analysis.circular = this.findCircularDependencies();
    
    // Check for missing dependencies
    analysis.missing = this.findMissingDependencies();
    
    // Find unused components
    analysis.unused = this.findUnusedComponents();
    
    // Calculate dependency depths
    analysis.depth = this.calculateDependencyDepths();

    return analysis;
  }

  findCircularDependencies() {
    const circular = [];
    const visited = new Set();
    const recursionStack = new Set();

    const visit = (componentName, path = []) => {
      if (recursionStack.has(componentName)) {
        circular.push([...path, componentName]);
        return;
      }
      
      if (visited.has(componentName)) return;
      
      visited.add(componentName);
      recursionStack.add(componentName);
      
      const dependencies = this.dependencyGraph.get(componentName) || [];
      dependencies.forEach(dep => {
        visit(dep, [...path, componentName]);
      });
      
      recursionStack.delete(componentName);
    };

    Array.from(this.dependencyGraph.keys()).forEach(visit);
    return circular;
  }

  findMissingDependencies() {
    const missing = [];
    
    for (const [component, dependencies] of this.dependencyGraph) {
      for (const dep of dependencies) {
        if (!this.options.componentRegistry.has(dep)) {
          missing.push({ component, dependency: dep });
        }
      }
    }
    
    return missing;
  }

  findUnusedComponents() {
    const used = new Set();
    
    // Mark all dependencies as used
    for (const dependencies of this.dependencyGraph.values()) {
      dependencies.forEach(dep => used.add(dep));
    }
    
    // Find registered components not marked as used
    const unused = [];
    for (const name of this.options.componentRegistry.keys()) {
      if (!used.has(name)) {
        unused.push(name);
      }
    }
    
    return unused;
  }

  calculateDependencyDepths() {
    const depths = new Map();
    
    const calculateDepth = (componentName, visited = new Set()) => {
      if (depths.has(componentName)) {
        return depths.get(componentName);
      }
      
      if (visited.has(componentName)) {
        return Infinity; // Circular dependency
      }
      
      visited.add(componentName);
      
      const dependencies = this.dependencyGraph.get(componentName) || [];
      const maxDepth = dependencies.length === 0 
        ? 0 
        : Math.max(...dependencies.map(dep => calculateDepth(dep, new Set(visited)))) + 1;
      
      depths.set(componentName, maxDepth);
      return maxDepth;
    };

    for (const componentName of this.options.componentRegistry.keys()) {
      calculateDepth(componentName);
    }
    
    return depths;
  }

  // Utilities
  getRegisteredComponents() {
    return Array.from(this.options.componentRegistry.keys());
  }

  getLoadedComponents() {
    return Array.from(this.loadedComponents);
  }

  getComponentInfo(name) {
    return this.options.componentRegistry.get(name);
  }

  isComponentLoaded(name) {
    return this.loadedComponents.has(name);
  }

  clearCache() {
    this.loader.clearCache();
    this.loadingQueue.clear();
  }

  getStats() {
    return {
      registered: this.options.componentRegistry.size,
      loaded: this.loadedComponents.size,
      loading: this.loadingQueue.size,
      dependencies: this.dependencyGraph.size
    };
  }
}

// Factory function
export function createComponentLoader(options = {}) {
  return new ComponentLoader(options);
}

// Default instance
export const componentLoader = new ComponentLoader();
