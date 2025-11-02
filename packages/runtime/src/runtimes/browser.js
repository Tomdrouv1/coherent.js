/**
 * Browser Runtime - Full client-side Coherent.js runtime
 * Works in browsers, Electron, and Tauri
 */

import { render, withState, memo } from '@coherentjs/core';
import { hydrate, autoHydrate, makeHydratable } from '@coherentjs/client';
import { integrateWithWebComponents, defineCoherentElement } from '@coherentjs/web-components';

export class BrowserRuntime {
  constructor(options = {}) {
    this.options = {
      autoHydrate: true,
      enableWebComponents: true,
      enablePerformanceMonitoring: true,
      routingMode: 'hash', // 'hash', 'history', or 'memory'
      ...options
    };
    
    this.componentRegistry = new Map();
    this.routeRegistry = new Map();
    this.currentRoute = null;
    this.isInitialized = false;
    
    // Performance tracking
    this.renderMetrics = [];
    this.startTime = Date.now();
  }

  async initialize() {
    if (this.isInitialized) return;

    // Wait for DOM to be ready
    if (document.readyState === 'loading') {
      await new Promise(resolve => {
        document.addEventListener('DOMContentLoaded', resolve);
      });
    }

    // Initialize Web Components integration
    if (this.options.enableWebComponents) {
      await this.initializeWebComponents();
    }

    // Initialize routing
    if (this.options.routingMode !== 'none') {
      this.initializeRouting();
    }

    // Auto-hydrate existing components
    if (this.options.autoHydrate) {
      await this.autoHydrate();
    }

    // Initialize performance monitoring
    if (this.options.enablePerformanceMonitoring) {
      this.initializePerformanceMonitoring();
    }

    this.isInitialized = true;
  }

  async initializeWebComponents() {
    try {
      await integrateWithWebComponents(
        Object.fromEntries(this.componentRegistry), 
        this.options.webComponents || {}
      );
    } catch (error) {
      console.warn('Failed to initialize Web Components:', error);
    }
  }

  initializeRouting() {
    const handleRouteChange = () => {
      const newRoute = this.getCurrentRoute();
      if (newRoute !== this.currentRoute) {
        this.handleRouteChange(this.currentRoute, newRoute);
        this.currentRoute = newRoute;
      }
    };

    if (this.options.routingMode === 'hash') {
      window.addEventListener('hashchange', handleRouteChange);
    } else if (this.options.routingMode === 'history') {
      window.addEventListener('popstate', handleRouteChange);
    }

    // Handle initial route
    this.currentRoute = this.getCurrentRoute();
    handleRouteChange();
  }

  getCurrentRoute() {
    if (this.options.routingMode === 'hash') {
      return window.location.hash.slice(1) || '/';
    } else if (this.options.routingMode === 'history') {
      return window.location.pathname;
    }
    return '/';
  }

  handleRouteChange(oldRoute, newRoute) {
    const handler = this.routeRegistry.get(newRoute) || this.routeRegistry.get('*');
    
    if (handler) {
      try {
        handler({ route: newRoute, oldRoute, params: this.parseRouteParams(newRoute) });
      } catch (error) {
        console.error('Route handler error:', error);
      }
    }
  }

  parseRouteParams(route) {
    // Simple parameter parsing - can be enhanced
    const params = {};
    const parts = route.split('/').filter(Boolean);
    
    parts.forEach((part, index) => {
      if (part.startsWith(':')) {
        const key = part.slice(1);
        const value = parts[index];
        if (value && !value.startsWith(':')) {
          params[key] = value;
        }
      }
    });
    
    return params;
  }

  initializePerformanceMonitoring() {
    // Monitor render performance
    if (typeof window === 'undefined' || typeof window.PerformanceObserver === 'undefined') return;
    const observer = new window.PerformanceObserver((list) => {
      for (const entry of list.getEntries()) {
        if (entry.name.includes('coherent')) {
          this.renderMetrics.push({
            name: entry.name,
            duration: entry.duration,
            startTime: entry.startTime,
            timestamp: Date.now()
          });
        }
      }
    });

    try {
      observer.observe({ entryTypes: ['measure', 'mark'] });
    } catch (error) {
      console.warn('Performance monitoring not available:', error);
    }

    // Clean up old metrics periodically
    setInterval(() => {
      const cutoff = Date.now() - 300000; // 5 minutes
      this.renderMetrics = this.renderMetrics.filter(m => m.timestamp > cutoff);
    }, 60000); // Every minute
  }

  // Component management
  registerComponent(name, component, options = {}) {
    // Make component hydratable
    const hydratableComponent = makeHydratable(component, {
      componentName: name,
      ...options
    });

    this.componentRegistry.set(name, hydratableComponent);

    // Register as Web Component if enabled
    if (this.options.enableWebComponents && this.isInitialized) {
      try {
        defineCoherentElement(name, hydratableComponent, options);
      } catch (error) {
        console.warn(`Failed to register Web Component ${name}:`, error);
      }
    }

    return hydratableComponent;
  }

  getComponent(name) {
    return this.componentRegistry.get(name);
  }

  // Routing
  addRoute(path, handler) {
    this.routeRegistry.set(path, handler);
  }

  navigate(path) {
    if (this.options.routingMode === 'hash') {
      window.location.hash = path;
    } else if (this.options.routingMode === 'history') {
      window.history.pushState({}, '', path);
      this.handleRouteChange(this.currentRoute, path);
      this.currentRoute = path;
    }
  }

  // Rendering
  async render(component, props = {}, target = null) {
    const startMark = `coherent-render-start-${Date.now()}`;
    const endMark = `coherent-render-end-${Date.now()}`;
    
    try {
      performance.mark(startMark);

      // Resolve component
      const resolvedComponent = typeof component === 'string' 
        ? this.getComponent(component) 
        : component;

      if (!resolvedComponent) {
        throw new Error(`Component not found: ${component}`);
      }

      // Render component
      const vdom = resolvedComponent(props);
      const html = render(vdom);

      // Find or create target element
      let targetElement = target;
      if (typeof target === 'string') {
        targetElement = document.querySelector(target);
      }
      if (!targetElement) {
        targetElement = document.body;
      }

      // Update DOM
      targetElement.innerHTML = html;

      // Hydrate the rendered component
      const instance = await hydrate(targetElement.firstElementChild, resolvedComponent, props);

      performance.mark(endMark);
      performance.measure(`coherent-render-${resolvedComponent.name || 'anonymous'}`, startMark, endMark);

      return instance;
    } catch (error) {
      performance.mark(endMark);
      console.error('Render error:', error);
      throw error;
    }
  }

  // Create a complete app
  async createApp(_options = {}) {
    await this.initialize();
    
    return {
      // Component management
      component: (name, component, opts) => this.registerComponent(name, component, opts),
      
      // Routing
      route: (path, handler) => this.addRoute(path, handler),
      navigate: (path) => this.navigate(path),
      
      // Rendering
      render: (component, props, target) => this.render(component, props, target),
      
      // State management
      state: withState,
      memo: memo,
      
      // Hydration
      hydrate: (element, component, props) => hydrate(element, component, props),
      
      // Utilities
      getRuntime: () => this,
      getCurrentRoute: () => this.currentRoute,
      getPerformanceMetrics: () => [...this.renderMetrics],
      
      // Lifecycle
      mount: async (component, target = '#app') => {
        const app = await this.render(component, {}, target);
        return app;
      },
      
      unmount: (target = '#app') => {
        const element = typeof target === 'string' ? document.querySelector(target) : target;
        if (element) {
          element.innerHTML = '';
        }
      }
    };
  }

  // Auto-hydration
  async autoHydrate() {
    const componentMap = Object.fromEntries(this.componentRegistry);
    await autoHydrate(componentMap);
  }

  // Static methods for quick setup
  static async createQuickApp(components = {}, options = {}) {
    const runtime = new BrowserRuntime(options);
    
    // Register all components
    Object.entries(components).forEach(([name, component]) => {
      runtime.registerComponent(name, component);
    });
    
    return await runtime.createApp(options);
  }

  static async renderToPage(component, props = {}, target = '#app') {
    const runtime = new BrowserRuntime({ autoHydrate: false });
    await runtime.initialize();
    return await runtime.render(component, props, target);
  }

  // Performance utilities
  getPerformanceReport() {
    const now = Date.now();
    const uptime = now - this.startTime;
    const recentMetrics = this.renderMetrics.filter(m => m.timestamp >= now - 60000);
    
    const averageRenderTime = recentMetrics.length > 0
      ? recentMetrics.reduce((sum, m) => sum + m.duration, 0) / recentMetrics.length
      : 0;

    return {
      uptime,
      totalRenders: this.renderMetrics.length,
      recentRenders: recentMetrics.length,
      averageRenderTime: Math.round(averageRenderTime * 100) / 100,
      registeredComponents: this.componentRegistry.size,
      registeredRoutes: this.routeRegistry.size,
      currentRoute: this.currentRoute,
      memoryUsage: this.getMemoryUsage()
    };
  }

  getMemoryUsage() {
    if (typeof performance !== 'undefined' && performance.memory) {
      return {
        used: Math.round(performance.memory.usedJSHeapSize / 1024 / 1024),
        total: Math.round(performance.memory.totalJSHeapSize / 1024 / 1024),
        limit: Math.round(performance.memory.jsHeapSizeLimit / 1024 / 1024)
      };
    }
    return null;
  }

  // Development utilities
  debug() {
    return {
      runtime: this,
      components: Array.from(this.componentRegistry.keys()),
      routes: Array.from(this.routeRegistry.keys()),
      performance: this.getPerformanceReport(),
      options: this.options
    };
  }
}
