# Client-Side Router

**Package:** `@coherent.js/client`
**Module:** `/router`
**Since:** v1.0.0-beta.2

## Overview

The `@coherent.js/client` package includes a powerful client-side router with advanced features like route prefetching, page transitions, code splitting, and customizable scroll behavior. Perfect for building single-page applications (SPAs) with Coherent.js.

## Installation

The router is included in the `@coherent.js/client` package:

```bash
npm install @coherent.js/client@beta
# or
pnpm add @coherent.js/client@beta
# or
yarn add @coherent.js/client@beta
```

## Basic Usage

```javascript
import { createRouter } from '@coherent.js/client/router';

// Create router
const router = createRouter({
  mode: 'history', // or 'hash'
  base: '/',
  routes: {
    '/': HomeView,
    '/about': AboutView,
    '/users/:id': UserView
  }
});

// Navigate
router.push('/about');
router.push('/users/123');

// Go back/forward
router.back();
router.forward();

// Listen to route changes
router.on('navigate', (to, from) => {
  console.log(`Navigated from ${from.path} to ${to.path}`);
});
```

## Route Definitions

### Simple Routes

```javascript
const router = createRouter({
  routes: {
    '/': HomePage,
    '/about': AboutPage,
    '/contact': ContactPage
  }
});
```

### Dynamic Routes

```javascript
const router = createRouter({
  routes: {
    '/users/:id': UserProfile,
    '/posts/:slug': BlogPost,
    '/category/:category/item/:id': CategoryItem
  }
});

// Access params in component
function UserProfile({ params }) {
  const userId = params.id;
  return { div: { text: `User: ${userId}` } };
}
```

### Nested Routes

```javascript
const router = createRouter({
  routes: {
    '/dashboard': {
      component: DashboardLayout,
      children: {
        '/': DashboardHome,
        '/stats': DashboardStats,
        '/settings': DashboardSettings
      }
    }
  }
});
```

## Route Prefetching

Improve performance by prefetching routes before navigation:

```javascript
const router = createRouter({
  prefetch: {
    enabled: true,
    strategy: 'hover', // 'hover', 'visible', 'eager', or 'manual'
    delay: 100,        // ms to wait before prefetching
    maxConcurrent: 3,  // max simultaneous prefetches
    priority: {
      critical: 100,
      high: 50,
      normal: 0,
      low: -50
    }
  },
  routes: {
    '/': HomePage,
    '/products': {
      component: ProductsPage,
      prefetch: 'high' // Set priority
    }
  }
});
```

### Prefetch Strategies

- **`hover`**: Prefetch when user hovers over a link
- **`visible`**: Prefetch when link enters viewport
- **`eager`**: Prefetch immediately on page load
- **`manual`**: Require manual prefetch calls

```javascript
// Manual prefetching
router.prefetch('/products');
router.prefetch(['/about', '/contact']);
```

## Page Transitions

Add smooth transitions between pages:

```javascript
const router = createRouter({
  transitions: {
    enabled: true,
    default: {
      enter: 'fade-in',
      leave: 'fade-out',
      duration: 300
    },
    routes: {
      '/products': {
        enter: 'slide-left',
        leave: 'slide-right',
        duration: 400
      }
    }
  }
});
```

### Built-in Transitions

- `fade-in` / `fade-out`
- `slide-left` / `slide-right`
- `slide-up` / `slide-down`
- `zoom-in` / `zoom-out`

### Custom Transitions

```javascript
const router = createRouter({
  transitions: {
    enabled: true,
    custom: {
      'my-transition': {
        enter: (element) => {
          element.style.opacity = '0';
          element.style.transform = 'translateY(20px)';

          requestAnimationFrame(() => {
            element.style.transition = 'all 300ms ease';
            element.style.opacity = '1';
            element.style.transform = 'translateY(0)';
          });
        },
        leave: (element) => {
          element.style.transition = 'all 300ms ease';
          element.style.opacity = '0';
          element.style.transform = 'translateY(-20px)';
        }
      }
    }
  }
});
```

## Code Splitting

Lazy-load routes for better initial load performance:

```javascript
const router = createRouter({
  codeSplitting: {
    enabled: true,
    chunkStrategy: 'route', // or 'component'
    preload: ['/', '/about'], // Routes to load immediately
    maxChunkSize: 200 * 1024   // 200KB
  },
  routes: {
    '/': HomePage,
    '/products': () => import('./pages/Products.js'),
    '/admin': () => import('./pages/Admin.js')
  }
});
```

### Loading States

```javascript
const router = createRouter({
  codeSplitting: {
    enabled: true,
    loadingComponent: LoadingSpinner,
    errorComponent: ErrorPage
  }
});

function LoadingSpinner() {
  return {
    div: {
      className: 'loading',
      text: 'Loading...'
    }
  };
}
```

## Scroll Behavior

Control scroll position when navigating:

```javascript
const router = createRouter({
  scrollBehavior: {
    behavior: 'smooth',
    top: 0,
    preserveScroll: false,
    scrollToHash: true
  }
});
```

### Custom Scroll Behavior

```javascript
const router = createRouter({
  scrollBehavior: (to, from, savedPosition) => {
    // Return to saved position (browser back/forward)
    if (savedPosition) {
      return savedPosition;
    }

    // Scroll to hash if present
    if (to.hash) {
      return {
        selector: to.hash,
        behavior: 'smooth'
      };
    }

    // Scroll to top for new pages
    return { x: 0, y: 0 };
  }
});
```

## Navigation Guards

Add authentication, logging, or other checks:

```javascript
const router = createRouter({
  routes: {
    '/': HomePage,
    '/dashboard': DashboardPage,
    '/admin': AdminPage
  }
});

// Global before guard
router.beforeEach((to, from, next) => {
  if (to.path.startsWith('/admin') && !isAdmin()) {
    next('/'); // Redirect to home
  } else {
    next(); // Continue navigation
  }
});

// Global after guard
router.afterEach((to, from) => {
  // Analytics
  trackPageView(to.path);
});

// Per-route guard
const routes = {
  '/dashboard': {
    component: DashboardPage,
    beforeEnter: (to, from, next) => {
      if (!isAuthenticated()) {
        next('/login');
      } else {
        next();
      }
    }
  }
};
```

## Router API

### Navigation

```javascript
// Push new route
router.push('/about');
router.push({ path: '/users/123' });
router.push({ path: '/search', query: { q: 'test' } });

// Replace current route
router.replace('/about');

// Go back/forward
router.back();
router.forward();
router.go(-2); // Go back 2 pages
router.go(1);  // Go forward 1 page
```

### Router State

```javascript
// Current route
const current = router.currentRoute;
console.log(current.path);     // '/users/123'
console.log(current.params);   // { id: '123' }
console.log(current.query);    // { tab: 'profile' }
console.log(current.hash);     // '#section'

// Check if route matches
router.isActive('/about'); // true/false
```

### Events

```javascript
// Navigate event
router.on('navigate', (to, from) => {
  console.log(`Navigated to ${to.path}`);
});

// Error event
router.on('error', (error) => {
  console.error('Router error:', error);
});

// Prefetch events
router.on('prefetch:start', (path) => {
  console.log(`Prefetching ${path}`);
});

router.on('prefetch:complete', (path) => {
  console.log(`Prefetched ${path}`);
});
```

## Complete Example

```javascript
import { createRouter } from '@coherent.js/client/router';
import { render } from '@coherent.js/core';

// Create router with all features
const router = createRouter({
  mode: 'history',
  base: '/app',

  // Route prefetching
  prefetch: {
    enabled: true,
    strategy: 'hover',
    delay: 100
  },

  // Page transitions
  transitions: {
    enabled: true,
    default: {
      enter: 'fade-in',
      leave: 'fade-out',
      duration: 300
    }
  },

  // Code splitting
  codeSplitting: {
    enabled: true,
    loadingComponent: LoadingSpinner
  },

  // Scroll behavior
  scrollBehavior: {
    behavior: 'smooth',
    top: 0
  },

  // Routes
  routes: {
    '/': HomePage,
    '/about': AboutPage,
    '/products': () => import('./pages/Products.js'),
    '/products/:id': ProductDetail,
    '/dashboard': {
      component: DashboardLayout,
      beforeEnter: requireAuth,
      children: {
        '/': DashboardHome,
        '/stats': DashboardStats
      }
    }
  }
});

// Global guards
router.beforeEach((to, from, next) => {
  // Analytics
  trackPageView(to.path);
  next();
});

// Start router
router.start('#app');

// Components
function HomePage() {
  return {
    div: {
      children: [
        { h1: { text: 'Welcome' } },
        { a: { href: '/about', text: 'About', onclick: (e) => {
          e.preventDefault();
          router.push('/about');
        }}}
      ]
    }
  };
}

function requireAuth(to, from, next) {
  if (isAuthenticated()) {
    next();
  } else {
    next('/login');
  }
}
```

## TypeScript Support

```typescript
import { createRouter, Router, Route, RouteConfig } from '@coherent.js/client/router';

interface RouteParams {
  id: string;
}

const router: Router = createRouter({
  routes: {
    '/users/:id': (({ params }: { params: RouteParams }) => {
      return {
        div: { text: `User ${params.id}` }
      };
    })
  }
});
```

## Integration with Hydration

Use with client-side hydration for optimal performance:

```javascript
import { hydrateBySelector } from '@coherent.js/client';
import { createRouter } from '@coherent.js/client/router';

import { App } from './App.js';

// Hydrate server-rendered content
hydrateBySelector('#app', App);

// Start router after hydration
const router = createRouter({ /* ... */ });
router.start('#app');
```

## See Also

- [Client-Side Hydration](/docs/client-side-hydration-guide.md)
- [Code Splitting](/docs/advanced/code-splitting.md)
- [Performance Optimizations](/docs/performance-optimizations.md)
