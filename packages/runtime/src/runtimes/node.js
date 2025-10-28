/**
 * Node.js Runtime - For Node.js with framework integrations
 * Provides server-side rendering with Express, Fastify, Koa support
 */

import { renderToString } from '@coherentjs/core';
import { createServer } from 'http';

export class NodeRuntime {
  constructor(options = {}) {
    this.options = {
      port: 3000,
      host: 'localhost',
      caching: true,
      framework: null, // 'express', 'fastify', 'koa', or null for standalone
      headers: {
        'Content-Type': 'text/html; charset=utf-8',
        'Cache-Control': 'public, max-age=3600',
        ...options.headers
      },
      ...options
    };
    
    this.componentRegistry = new Map();
    this.routeRegistry = new Map();
    this.middleware = [];
    this.cache = new Map();
    this.renderCount = 0;
    this.server = null;
    
    // Initialize cache cleanup if caching is enabled
    if (this.options.caching) {
      this.initializeCacheCleanup();
    }
  }

  initializeCacheCleanup() {
    // Simple LRU-style cleanup
    setInterval(() => {
      if (this.cache.size > 1000) {
        const entries = Array.from(this.cache.entries());
        const toDelete = entries.slice(0, entries.length - 500);
        toDelete.forEach(([key]) => this.cache.delete(key));
      }
    }, 300000); // Every 5 minutes
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
    for (const [pattern, handler] of this.routeRegistry.entries()) {
      const match = this.matchPattern(pattern, pathname);
      if (match) {
        return { handler, params: match.params };
      }
    }
    return null;
  }

  matchPattern(pattern, pathname) {
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
        params[patternPart.slice(1)] = pathPart;
      } else if (patternPart !== pathPart) {
        return null;
      }
    }

    return { params };
  }

  // Rendering
  async renderComponent(component, props = {}, options = {}) {
    
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
        if (Date.now() - cached.timestamp < (options.cacheMaxAge || 300000)) {
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
      console.error('Node render error:', error);
      throw error;
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
      hash = hash & hash;
    }
    return hash.toString(36);
  }

  // HTTP Request handling (for standalone mode)
  async handleRequest(req, res) {
    try {
      const url = new URL(req.url, `http://${req.headers.host}`);
      const pathname = url.pathname;
      
      // Create context
      const context = {
        req,
        res,
        url,
        pathname,
        params: {},
        query: Object.fromEntries(url.searchParams),
        method: req.method,
        headers: req.headers,
        runtime: this,
        state: {}
      };

      // Execute middleware chain
      let middlewareIndex = 0;
      const next = async () => {
        if (middlewareIndex < this.middleware.length) {
          const middleware = this.middleware[middlewareIndex++];
          return await middleware(context, next);
        }
      };

      // Run middleware
      if (this.middleware.length > 0) {
        await next();
      }

      // Check if middleware already sent a response
      if (res.headersSent) {
        return;
      }
      
      // Find matching route
      const match = this.matchRoute(pathname);
      
      if (!match) {
        res.writeHead(404, { 'Content-Type': 'text/html' });
        res.end('<h1>404 Not Found</h1>');
        return;
      }

      // Add route params to context
      context.params = match.params;

      // Execute route handler
      const result = await match.handler(context);
      
      // Handle different response types
      if (res.headersSent) {
        return; // Handler already sent response
      }

      if (typeof result === 'string') {
        res.writeHead(200, this.options.headers);
        res.end(result);
        return;
      }

      if (result && typeof result === 'object') {
        if (result.component) {
          const html = await this.renderComponent(
            result.component, 
            result.props || {}, 
            result.options || {}
          );
          res.writeHead(result.status || 200, {
            ...this.options.headers,
            ...result.headers
          });
          res.end(html);
          return;
        }

        if (result.json !== undefined) {
          res.writeHead(result.status || 200, {
            'Content-Type': 'application/json',
            ...result.headers
          });
          res.end(JSON.stringify(result.json));
          return;
        }

        if (result.redirect) {
          res.writeHead(result.status || 302, {
            'Location': result.redirect
          });
          res.end();
          return;
        }

        // Default: send as JSON
        res.writeHead(200, { 'Content-Type': 'application/json' });
        res.end(JSON.stringify(result));
        return;
      }

      // Fallback
      res.writeHead(200, this.options.headers);
      res.end(String(result));

    } catch (error) {
      console.error('Request handling error:', error);
      
      if (!res.headersSent) {
        res.writeHead(500, { 'Content-Type': 'application/json' });
        res.end(JSON.stringify({ error: error.message }));
      }
    }
  }

  // Create app factory
  createApp() {
    const app = {
      // Component registration
      component: (name, component) => this.registerComponent(name, component),
      
      // Routing
      get: (pattern, handler) => this.addRoute(pattern, handler),
      post: (pattern, handler) => this.addRoute(pattern, handler),
      put: (pattern, handler) => this.addRoute(pattern, handler),
      delete: (pattern, handler) => this.addRoute(pattern, handler),
      route: (pattern, handler) => this.addRoute(pattern, handler),
      
      // Middleware support
      use: (middleware) => {
        if (typeof middleware !== 'function') {
          throw new Error('Middleware must be a function');
        }
        this.middleware.push(middleware);
        return app;
      },
      
      // Server control
      listen: (port, callback) => {
        const serverPort = port || this.options.port;
        this.server = createServer((req, res) => this.handleRequest(req, res));
        
        this.server.listen(serverPort, this.options.host, () => {
          console.log(`Coherent.js Node runtime listening on http://${this.options.host}:${serverPort}`);
          if (callback) callback();
        });
        
        return this.server;
      },
      
      close: (callback) => {
        if (this.server) {
          this.server.close(callback);
        }
      },
      
      // Utilities
      render: (component, props, options) => this.renderComponent(component, props, options),
      getRuntime: () => this,
      getStats: () => ({
        renderCount: this.renderCount,
        cacheSize: this.cache.size,
        componentCount: this.componentRegistry.size,
        routeCount: this.routeRegistry.size,
        middlewareCount: this.middleware.length
      })
    };

    return app;
  }

  // Framework integration helpers
  expressMiddleware() {
    return async (req, res, next) => {
      req.coherent = {
        render: async (component, props, options) => {
          const html = await this.renderComponent(component, props, options);
          res.send(html);
        },
        runtime: this
      };
      next();
    };
  }

  fastifyPlugin() {
    return async (fastify) => {
      fastify.decorate('coherent', {
        render: async (component, props, renderOptions) => {
          return await this.renderComponent(component, props, renderOptions);
        },
        runtime: this
      });
    };
  }

  koaMiddleware() {
    return async (ctx, next) => {
      ctx.coherent = {
        render: async (component, props, options) => {
          const html = await this.renderComponent(component, props, options);
          ctx.type = 'html';
          ctx.body = html;
        },
        runtime: this
      };
      await next();
    };
  }
}

/**
 * Create a Node.js runtime instance
 */
export function createNodeRuntime(options = {}) {
  return new NodeRuntime(options);
}

export default NodeRuntime;
