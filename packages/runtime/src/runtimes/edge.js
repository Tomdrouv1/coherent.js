/**
 * Edge Runtime - For Cloudflare Workers, Deno, Bun, and other edge environments
 * Provides server-side rendering without Node.js dependencies
 */

import { renderToString } from '@coherentjs/core';

export class EdgeRuntime {
  constructor(options = {}) {
    this.options = {
      caching: true,
      streaming: false,
      headers: {
        'Content-Type': 'text/html; charset=utf-8',
        'Cache-Control': 'public, max-age=3600',
        ...options.headers
      },
      ...options
    };
    
    this.componentRegistry = new Map();
    this.routeRegistry = new Map();
    this.cache = new Map();
    this.renderCount = 0;
    
    // Initialize cache cleanup if caching is enabled
    if (this.options.caching) {
      this.initializeCacheCleanup();
    }
  }

  initializeCacheCleanup() {
    // Simple LRU-style cleanup
    if (typeof setInterval !== 'undefined') {
      setInterval(() => {
        if (this.cache.size > 1000) {
          const entries = Array.from(this.cache.entries());
          const toDelete = entries.slice(0, entries.length - 500);
          toDelete.forEach(([key]) => this.cache.delete(key));
        }
      }, 300000); // Every 5 minutes
    }
  }

  // Component management
  registerComponent(name, component) {
    this.componentRegistry.set(name, component);
    return component;
  }

  getComponent(name) {
    return this.componentRegistry.get(name);
  }

  // Route management
  addRoute(pattern, handler) {
    this.routeRegistry.set(pattern, handler);
  }

  matchRoute(pathname) {
    for (const [pattern, handler] of this.routeRegistry) {
      const match = this.matchPattern(pattern, pathname);
      if (match) {
        return { handler, params: match.params };
      }
    }
    return null;
  }

  matchPattern(pattern, pathname) {
    // Simple pattern matching - supports :param and * wildcards
    if (pattern === '*' || pattern === pathname) {
      return { params: {} };
    }

    const patternParts = pattern.split('/').filter(Boolean);
    const pathParts = pathname.split('/').filter(Boolean);

    if (patternParts.length !== pathParts.length) {
      return null;
    }

    const params = {};
    
    for (let i = 0; i < patternParts.length; i++) {
      const patternPart = patternParts[i];
      const pathPart = pathParts[i];

      if (patternPart.startsWith(':')) {
        // Parameter
        params[patternPart.slice(1)] = pathPart;
      } else if (patternPart !== pathPart) {
        // Literal mismatch
        return null;
      }
    }

    return { params };
  }

  // Rendering
  async renderComponent(component, props = {}, options = {}) {
    const _startTime = Date.now();
    
    try {
      // Resolve component
      const resolvedComponent = typeof component === 'string' 
        ? this.getComponent(component) 
        : component;

      if (!resolvedComponent) {
        throw new Error(`Component not found: ${component}`);
      }

      // Check cache
      const cacheKey = this.generateCacheKey(resolvedComponent, props);
      if (this.options.caching && this.cache.has(cacheKey)) {
        const cached = this.cache.get(cacheKey);
        if (Date.now() - cached.timestamp < (options.cacheMaxAge || 300000)) { // 5 min default
          return cached.html;
        }
        this.cache.delete(cacheKey);
      }

      // Render component
      const vdom = resolvedComponent(props);
      const html = renderToString(vdom);

      // Cache result
      if (this.options.caching && options.cacheable !== false) {
        this.cache.set(cacheKey, {
          html,
          timestamp: Date.now()
        });
      }

      this.renderCount++;
      
      return html;
    } catch (error) {
      console.error('Edge render error:', error);
      throw error;
    } finally {
      // Track render time
      if (typeof performance !== 'undefined' && performance.mark) {
        performance.mark(`coherent-edge-render-${Date.now()}`);
      }
    }
  }

  generateCacheKey(component, props) {
    const componentName = component.name || 'anonymous';
    const propsHash = this.hashObject(props);
    return `${componentName}-${propsHash}`;
  }

  hashObject(obj) {
    const str = JSON.stringify(obj, Object.keys(obj).sort());
    let hash = 0;
    for (let i = 0; i < str.length; i++) {
      const char = str.charCodeAt(i);
      hash = ((hash << 5) - hash) + char;
      hash = hash & hash; // Convert to 32-bit integer
    }
    return hash.toString(36);
  }

  // HTTP Request handling
  async handleRequest(request) {
    try {
      const url = new URL(request.url);
      const pathname = url.pathname;
      
      // Find matching route
      const match = this.matchRoute(pathname);
      
      if (!match) {
        return this.createErrorResponse(404, 'Not Found');
      }

      // Execute route handler
      const context = {
        request,
        url,
        pathname,
        params: match.params,
        searchParams: Object.fromEntries(url.searchParams),
        method: request.method,
        headers: Object.fromEntries(request.headers),
        runtime: this
      };

      const result = await match.handler(context);
      
      // Handle different response types
      if (result instanceof Response) {
        return result;
      }

      if (typeof result === 'string') {
        return this.createHtmlResponse(result);
      }

      if (result && typeof result === 'object') {
        if (result.component) {
          // Render component
          const html = await this.renderComponent(
            result.component, 
            result.props || {}, 
            result.options || {}
          );
          return this.createHtmlResponse(html, result.status, result.headers);
        }

        if (result.json) {
          return this.createJsonResponse(result.json, result.status, result.headers);
        }

        if (result.redirect) {
          return Response.redirect(result.redirect, result.status || 302);
        }
      }

      // Default JSON response
      return this.createJsonResponse(result);

    } catch (error) {
      console.error('Request handling error:', error);
      return this.createErrorResponse(500, 'Internal Server Error');
    }
  }

  createHtmlResponse(html, status = 200, customHeaders = {}) {
    return new Response(html, {
      status,
      headers: {
        ...this.options.headers,
        ...customHeaders
      }
    });
  }

  createJsonResponse(data, status = 200, customHeaders = {}) {
    return new Response(JSON.stringify(data), {
      status,
      headers: {
        'Content-Type': 'application/json',
        ...customHeaders
      }
    });
  }

  createErrorResponse(status, message) {
    const errorHtml = `
      <!DOCTYPE html>
      <html>
        <head>
          <title>Error ${status}</title>
          <style>
            body { font-family: Arial, sans-serif; text-align: center; padding: 50px; }
            h1 { color: #e74c3c; }
          </style>
        </head>
        <body>
          <h1>Error ${status}</h1>
          <p>${message}</p>
        </body>
      </html>
    `;
    
    return new Response(errorHtml, {
      status,
      headers: { 'Content-Type': 'text/html; charset=utf-8' }
    });
  }

  // API Routes
  async handleApiRequest(request, handler) {
    try {
      const url = new URL(request.url);
      const context = {
        request,
        url,
        method: request.method,
        headers: Object.fromEntries(request.headers),
        searchParams: Object.fromEntries(url.searchParams),
        runtime: this
      };

      // Parse body for POST/PUT requests
      if (request.method === 'POST' || request.method === 'PUT') {
        const contentType = request.headers.get('content-type') || '';
        
        if (contentType.includes('application/json')) {
          context.body = await request.json();
        } else if (contentType.includes('application/x-www-form-urlencoded')) {
          const formData = await request.formData();
          context.body = Object.fromEntries(formData);
        } else {
          context.body = await request.text();
        }
      }

      const result = await handler(context);
      
      if (result instanceof Response) {
        return result;
      }
      
      return this.createJsonResponse(result);
      
    } catch (error) {
      console.error('API request error:', error);
      return this.createJsonResponse({ error: error.message }, 500);
    }
  }

  // Streaming support (for environments that support it)
  async renderStream(component, props = {}) {
    if (!this.options.streaming) {
      return await this.renderComponent(component, props);
    }

    // TODO: Implement streaming rendering
    // This would require chunked rendering of the component tree
    return await this.renderComponent(component, props);
  }

  // Create app factory
  createApp() {
    const app = {
      // Component registration
      component: (name, component, opts) => this.registerComponent(name, component, opts),
      
      // Routing
      get: (pattern, handler) => this.addRoute(pattern, handler),
      post: (pattern, handler) => this.addRoute(pattern, handler),
      put: (pattern, handler) => this.addRoute(pattern, handler),
      delete: (pattern, handler) => this.addRoute(pattern, handler),
      route: (pattern, handler) => this.addRoute(pattern, handler),
      
      // API endpoints
      api: (pattern, handler) => {
        this.addRoute(pattern, (context) => this.handleApiRequest(context.request, handler));
      },
      
      // Static file serving (basic)
      static: (pattern) => {
        this.addRoute(pattern, async () => {
          // Basic static file handling
          // In a real implementation, this would serve actual files
          return this.createErrorResponse(404, 'Static file serving not implemented');
        });
      },
      
      // Middleware (simplified)
      use: (_middleware) => {
        // TODO: Implement middleware support
        console.warn('Middleware not yet implemented in EdgeRuntime');
      },
      
      // Request handler
      fetch: (request) => this.handleRequest(request),
      
      // Utilities
      render: (component, props, options) => this.renderComponent(component, props, options),
      getRuntime: () => this,
      getStats: () => ({
        renderCount: this.renderCount,
        cacheSize: this.cache.size,
        componentCount: this.componentRegistry.size,
        routeCount: this.routeRegistry.size
      })
    };

    return app;
  }

  // Static factory methods
  static createApp(options = {}) {
    const runtime = new EdgeRuntime(options);
    return runtime.createApp(options);
  }

  static async handleRequest(request, components = {}, routes = {}) {
    const runtime = new EdgeRuntime();
    
    // Register components
    Object.entries(components).forEach(([name, component]) => {
      runtime.registerComponent(name, component);
    });
    
    // Register routes
    Object.entries(routes).forEach(([pattern, handler]) => {
      runtime.addRoute(pattern, handler);
    });
    
    return await runtime.handleRequest(request);
  }
}

// Helper functions for common edge runtime patterns

export function createCloudflareWorker(app) {
  return {
    async fetch(request, _env, _ctx) {
      return await app.fetch(request);
    }
  };
}

export function createDenoHandler(app) {
  return async (request) => {
    return await app.fetch(request);
  };
}

export function createBunHandler(app) {
  return {
    async fetch(request) {
      return await app.fetch(request);
    },
    port: 3000
  };
}
