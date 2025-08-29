/**
 * Advanced Routing System for Coherent.js
 * Supports nested routes, route guards, lazy loading, and transitions
 */

import { ReactiveState } from '../state/reactive-state.js';
import { eventSystem } from '../components/lifecycle.js';
import { globalErrorHandler } from '../utils/error-handler.js';

/**
 * Route configuration structure
 */
export class Route {
    constructor(config) {
        this.path = config.path;
        this.name = config.name;
        this.component = config.component;
        this.children = config.children || [];
        this.meta = config.meta || {};
        this.beforeEnter = config.beforeEnter;
        this.beforeLeave = config.beforeLeave;
        this.redirect = config.redirect;
        this.alias = config.alias;
        this.params = {};
        this.query = {};
        this.hash = '';

        // Convert children to Route instances
        this.children = this.children.map(child => new Route(child));
    }

    /**
     * Check if this route matches a path
     */
    matches(path) {
        return this.matchPath(path, this.path);
    }

    /**
     * Match path against route pattern with parameters
     */
    matchPath(path, pattern) {
        // Convert pattern to regex
        const paramNames = [];
        const regexPattern = pattern
            .replace(/\//g, '\\/')
            .replace(/:\w+/g, (match) => {
                paramNames.push(match.slice(1));
                return '([^/]+)';
            })
            .replace(/\*/g, '(.*)');

        const regex = new RegExp(`^${regexPattern}$`);
        const match = path.match(regex);

        if (match) {
            // Extract parameters
            const params = {};
            paramNames.forEach((name, index) => {
                params[name] = match[index + 1];
            });

            return { params, match };
        }

        return null;
    }
}

/**
 * Navigation context for route resolution
 */
class NavigationContext {
    constructor(from, to, router) {
        this.from = from;
        this.to = to;
        this.router = router;
        this.cancelled = false;
        this.redirected = false;
        this.error = null;
    }

    cancel() {
        this.cancelled = true;
    }

    redirect(location) {
        this.redirected = true;
        this.redirectLocation = location;
    }

    setError(error) {
        this.error = error;
    }
}

/**
 * Advanced router with nested routing support
 */
export class Router {
    constructor(options = {}) {
        this.options = {
            mode: options.mode || 'history', // 'history' | 'hash'
            base: options.base || '/',
            fallback: options.fallback !== false,
            scrollBehavior: options.scrollBehavior,
            ...options
        };

        this.routes = [];
        this.currentRoute = null;
        this.history = [];
        this.guards = {
            beforeEach: [],
            beforeResolve: [],
            afterEach: []
        };

        // Reactive state for route data
        this.state = new ReactiveState({
            path: '',
            params: {},
            query: {},
            hash: '',
            meta: {},
            matched: [],
            loading: false
        });

        // Initialize based on mode
        this.init();
    }

    /**
     * Initialize router
     */
    init() {
        if (typeof window !== 'undefined') {
            this.setupBrowser();
        } else {
            this.setupServer();
        }

        // Listen to initial route
        this.resolveInitialRoute();
    }

    /**
     * Setup browser environment
     */
    setupBrowser() {
        // Handle back/forward navigation
        window.addEventListener('popstate', (event) => {
            this.handlePopState(event);
        });

        // Handle hash changes in hash mode
        if (this.options.mode === 'hash') {
            window.addEventListener('hashchange', () => {
                this.syncFromLocation();
            });
        }
    }

    /**
     * Setup server environment
     */
    setupServer() {
        // Server-side routing setup
        this.isServer = true;
    }

    /**
     * Add routes to router
     */
    addRoutes(routes) {
        routes.forEach(route => {
            this.routes.push(new Route(route));
        });
    }

    /**
     * Navigate to a route
     */
    async push(location) {
        return this.navigate(location, 'push');
    }

    /**
     * Replace current route
     */
    async replace(location) {
        return this.navigate(location, 'replace');
    }

    /**
     * Go back in history
     */
    back() {
        if (typeof window !== 'undefined' && window.history.length > 1) {
            window.history.back();
        }
    }

    /**
     * Go forward in history
     */
    forward() {
        if (typeof window !== 'undefined') {
            window.history.forward();
        }
    }

    /**
     * Navigate to specific history index
     */
    go(delta) {
        if (typeof window !== 'undefined') {
            window.history.go(delta);
        }
    }

    /**
     * Main navigation method
     */
    async navigate(location, method = 'push') {
        // Normalize location
        const route = this.normalizeLocation(location);
        
        // Create navigation context
        const context = new NavigationContext(this.currentRoute, route, this);

        try {
            // Set loading state
            this.state.set('loading', true);

            // Run navigation guards
            await this.runGuards(context);

            if (context.cancelled) {
                return false;
            }

            if (context.redirected) {
                return this.navigate(context.redirectLocation, method);
            }

            if (context.error) {
                throw context.error;
            }

            // Resolve route
            const resolved = await this.resolveRoute(route.path);

            if (!resolved) {
                throw new Error(`Route not found: ${route.path}`);
            }

            // Update browser URL
            if (!this.isServer) {
                this.updateURL(resolved, method);
            }

            // Update current route and state
            this.currentRoute = resolved;
            this.updateState(resolved);

            // Add to history
            this.history.push({
                ...resolved,
                timestamp: Date.now(),
                method
            });

            // Emit navigation events
            eventSystem.emit('route:changed', {
                from: context.from,
                to: resolved,
                method
            });

            return true;

        } catch (error) {
            globalErrorHandler.handle(error, {
                type: 'navigation-error',
                context: { location, method, currentRoute: this.currentRoute }
            });

            eventSystem.emit('route:error', { error, context });
            return false;

        } finally {
            this.state.set('loading', false);
        }
    }

    /**
     * Normalize location input
     */
    normalizeLocation(location) {
        if (typeof location === 'string') {
            return this.parseURL(location);
        }

        return {
            path: location.path || '/',
            params: location.params || {},
            query: location.query || {},
            hash: location.hash || '',
            name: location.name
        };
    }

    /**
     * Parse URL string into route object
     */
    parseURL(url) {
        const urlObj = new URL(url, 'http://localhost');
        
        return {
            path: urlObj.pathname,
            params: {},
            query: Object.fromEntries(urlObj.searchParams),
            hash: urlObj.hash.slice(1)
        };
    }

    /**
     * Resolve route by path
     */
    async resolveRoute(path, routes = this.routes, parentRoute = null) {
        for (const route of routes) {
            const match = route.matchPath(path, route.path);
            
            if (match) {
                const resolved = {
                    ...route,
                    params: { ...match.params },
                    fullPath: path,
                    matched: parentRoute ? [...parentRoute.matched, route] : [route]
                };

                // Handle redirects
                if (route.redirect) {
                    const redirectPath = typeof route.redirect === 'function' 
                        ? route.redirect(resolved)
                        : route.redirect;
                    return this.resolveRoute(redirectPath);
                }

                // Check for child routes
                if (route.children.length > 0) {
                    const remainingPath = path.slice(route.path.length).replace(/^\//, '');
                    if (remainingPath) {
                        const childMatch = await this.resolveRoute(remainingPath, route.children, resolved);
                        if (childMatch) {
                            return {
                                ...childMatch,
                                parent: resolved,
                                matched: [...resolved.matched, ...childMatch.matched]
                            };
                        }
                    }
                }

                // Load component if lazy
                if (typeof route.component === 'function' && route.component.lazy) {
                    route.component = await route.component();
                }

                return resolved;
            }
        }

        return null;
    }

    /**
     * Run navigation guards
     */
    async runGuards(context) {
        // beforeEach guards
        for (const guard of this.guards.beforeEach) {
            await this.runGuard(guard, context);
            if (context.cancelled || context.redirected || context.error) return;
        }

        // Route-specific beforeEnter guards
        if (context.to.beforeEnter) {
            await this.runGuard(context.to.beforeEnter, context);
            if (context.cancelled || context.redirected || context.error) return;
        }

        // beforeLeave guards on current route
        if (context.from && context.from.beforeLeave) {
            await this.runGuard(context.from.beforeLeave, context);
            if (context.cancelled || context.redirected || context.error) return;
        }

        // beforeResolve guards
        for (const guard of this.guards.beforeResolve) {
            await this.runGuard(guard, context);
            if (context.cancelled || context.redirected || context.error) return;
        }
    }

    /**
     * Run individual guard
     */
    async runGuard(guard, context) {
        try {
            const result = await guard(context.to, context.from, (location) => {
                if (location === false) {
                    context.cancel();
                } else if (location && location !== true) {
                    context.redirect(location);
                }
            });

            // Handle guard return values
            if (result === false) {
                context.cancel();
            } else if (result && typeof result === 'object') {
                context.redirect(result);
            }

        } catch (error) {
            context.setError(error);
        }
    }

    /**
     * Update browser URL
     */
    updateURL(route, method = 'push') {
        if (!window || !window.history) return;

        const url = this.buildURL(route);
        
        if (method === 'replace') {
            window.history.replaceState(route, '', url);
        } else {
            window.history.pushState(route, '', url);
        }
    }

    /**
     * Build URL from route
     */
    buildURL(route) {
        let url = route.fullPath || route.path;

        // Add query parameters
        const queryString = new URLSearchParams(route.query).toString();
        if (queryString) {
            url += `?${  queryString}`;
        }

        // Add hash
        if (route.hash) {
            url += `#${  route.hash}`;
        }

        return url;
    }

    /**
     * Update reactive state
     */
    updateState(route) {
        this.state.batch({
            path: route.fullPath || route.path,
            params: route.params || {},
            query: route.query || {},
            hash: route.hash || '',
            meta: route.meta || {},
            matched: route.matched || []
        });
    }

    /**
     * Handle browser popstate event
     */
    handlePopState() {
        this.syncFromLocation();
    }

    /**
     * Sync router state from browser location
     */
    syncFromLocation() {
        if (!window) return;

        let path = window.location.pathname;
        
        if (this.options.mode === 'hash') {
            path = window.location.hash.slice(1) || '/';
        }

        this.navigate(path, 'popstate');
    }

    /**
     * Resolve initial route
     */
    resolveInitialRoute() {
        let initialPath = '/';

        if (!this.isServer && window) {
            initialPath = this.options.mode === 'hash' 
                ? window.location.hash.slice(1) || '/'
                : window.location.pathname;
        }

        this.navigate(initialPath, 'initial');
    }

    /**
     * Add navigation guards
     */
    beforeEach(guard) {
        this.guards.beforeEach.push(guard);
        return () => {
            const index = this.guards.beforeEach.indexOf(guard);
            if (index > -1) this.guards.beforeEach.splice(index, 1);
        };
    }

    beforeResolve(guard) {
        this.guards.beforeResolve.push(guard);
        return () => {
            const index = this.guards.beforeResolve.indexOf(guard);
            if (index > -1) this.guards.beforeResolve.splice(index, 1);
        };
    }

    afterEach(guard) {
        this.guards.afterEach.push(guard);
        return () => {
            const index = this.guards.afterEach.indexOf(guard);
            if (index > -1) this.guards.afterEach.splice(index, 1);
        };
    }

    /**
     * Get current route information
     */
    getCurrentRoute() {
        return this.currentRoute;
    }

    /**
     * Check if route is current
     */
    isActive(route, exact = false) {
        if (!this.currentRoute) return false;

        if (exact) {
            return this.currentRoute.path === route;
        }

        return this.currentRoute.path.startsWith(route);
    }

    /**
     * Generate URL for route
     */
    resolve(location) {
        const route = this.normalizeLocation(location);
        return this.buildURL(route);
    }

    /**
     * Get router statistics
     */
    getStats() {
        return {
            totalRoutes: this.routes.length,
            currentRoute: this.currentRoute?.path,
            historyLength: this.history.length,
            guards: {
                beforeEach: this.guards.beforeEach.length,
                beforeResolve: this.guards.beforeResolve.length,
                afterEach: this.guards.afterEach.length
            },
            isLoading: this.state.get('loading')
        };
    }

    /**
     * Cleanup router
     */
    destroy() {
        // Remove event listeners
        if (typeof window !== 'undefined') {
            window.removeEventListener('popstate', this.handlePopState);
            if (this.options.mode === 'hash') {
                window.removeEventListener('hashchange', this.syncFromLocation);
            }
        }

        // Cleanup state
        this.state.destroy();

        // Clear arrays
        this.routes = [];
        this.history = [];
        Object.values(this.guards).forEach(guards => guards.length = 0);
    }
}

/**
 * Route guard utilities
 */
export const routeGuards = {
    /**
     * Authentication guard
     */
    requireAuth(authCheck) {
        return (to, from, next) => {
            if (authCheck()) {
                next();
            } else {
                next('/login');
            }
        };
    },

    /**
     * Role-based access guard
     */
    requireRole(roleCheck, roles) {
        return (to, from, next) => {
            const userRoles = roleCheck();
            const hasRole = roles.some(role => userRoles.includes(role));
            
            if (hasRole) {
                next();
            } else {
                next('/unauthorized');
            }
        };
    },

    /**
     * Meta-based guard
     */
    requireMeta(metaKey, expectedValue) {
        return (to, from, next) => {
            if (to.meta[metaKey] === expectedValue) {
                next();
            } else {
                next(false);
            }
        };
    },

    /**
     * Confirmation guard
     */
    requireConfirmation(message, confirmCallback) {
        return (to, from, next) => {
            if (confirmCallback) {
                confirmCallback(message, (confirmed) => {
                    if (confirmed) {
                        next();
                    } else {
                        next(false);
                    }
                });
            } else {
                // Default to allowing navigation if no callback provided
                next();
            }
        };
    }
};

/**
 * Create router instance
 */
export function createRouter(options) {
    return new Router(options);
}

/**
 * Route component helpers
 */
export const routeComponents = {
    /**
     * Router link component
     */
    RouterLink(props = {}) {
        const { to, exact = false, children, ...otherProps } = props;
        
        return {
            a: {
                ...otherProps,
                href: to,
                className: `router-link ${exact ? 'router-link-exact' : ''}`,
                onclick: (event) => {
                    event.preventDefault();
                    // This would need access to router instance
                    // router.push(to);
                },
                children
            }
        };
    },

    /**
     * Router view component
     */
    RouterView(props = {}) {
        // This would render the current route's component
        return {
            div: {
                className: 'router-view',
                children: props.children || []
            }
        };
    }
};

export default Router;