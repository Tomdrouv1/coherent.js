/**
 * Client Router Demo - @coherent.js/client/router
 *
 * This example demonstrates the client-side router with:
 * - Basic routing and navigation
 * - Dynamic routes with parameters
 * - Route prefetching
 * - Page transitions
 * - Navigation guards
 *
 * Note: This is meant to run in a browser environment
 *
 * @since v1.0.0-beta.2
 */

import { createRouter } from '@coherent.js/client/router';
import { render } from '@coherent.js/core';

// =============================================================================
// Page Components
// =============================================================================

function HomePage() {
  return {
    div: {
      className: 'page home-page',
      children: [
        { h1: { text: 'Home Page' } },
        { p: { text: 'Welcome to the Coherent.js router demo!' } },
        {
          nav: {
            children: [
              { a: { href: '/about', text: 'About', className: 'nav-link' } },
              { a: { href: '/products', text: 'Products', className: 'nav-link' } },
              { a: { href: '/users/123', text: 'User Profile', className: 'nav-link' } }
            ]
          }
        }
      ]
    }
  };
}

function AboutPage() {
  return {
    div: {
      className: 'page about-page',
      children: [
        { h1: { text: 'About Us' } },
        { p: { text: 'Learn more about our application' } },
        { a: { href: '/', text: '← Back to Home' } }
      ]
    }
  };
}

function ProductsPage() {
  const products = [
    { id: 1, name: 'Product A', price: 29.99 },
    { id: 2, name: 'Product B', price: 39.99 },
    { id: 3, name: 'Product C', price: 49.99 }
  ];

  return {
    div: {
      className: 'page products-page',
      children: [
        { h1: { text: 'Products' } },
        {
          ul: {
            children: products.map(product => ({
              li: {
                children: [
                  {
                    a: {
                      href: `/products/${product.id}`,
                      text: `${product.name} - $${product.price}`
                    }
                  }
                ]
              }
            }))
          }
        },
        { a: { href: '/', text: '← Back to Home' } }
      ]
    }
  };
}

function ProductDetailPage({ params }) {
  const productId = params.id;

  return {
    div: {
      className: 'page product-detail-page',
      children: [
        { h1: { text: `Product #${productId}` } },
        { p: { text: `Details for product ${productId}` } },
        { a: { href: '/products', text: '← Back to Products' } }
      ]
    }
  };
}

function UserProfilePage({ params }) {
  const userId = params.id;

  return {
    div: {
      className: 'page user-profile-page',
      children: [
        { h1: { text: `User Profile` } },
        { p: { text: `User ID: ${userId}` } },
        { a: { href: '/', text: '← Back to Home' } }
      ]
    }
  };
}

function NotFoundPage() {
  return {
    div: {
      className: 'page not-found-page',
      children: [
        { h1: { text: '404 - Not Found' } },
        { p: { text: 'The page you are looking for does not exist.' } },
        { a: { href: '/', text: '← Back to Home' } }
      ]
    }
  };
}

function LoadingPage() {
  return {
    div: {
      className: 'page loading-page',
      children: [
        { div: { className: 'spinner' } },
        { p: { text: 'Loading...' } }
      ]
    }
  };
}

// =============================================================================
// Router Configuration
// =============================================================================

console.log('📦 Creating Router...\n');

const router = createRouter({
  // Router mode
  mode: 'history', // or 'hash' for hash-based routing

  // Base path
  base: '/',

  // Route prefetching
  prefetch: {
    enabled: true,
    strategy: 'hover', // Prefetch on hover
    delay: 100,        // 100ms delay
    maxConcurrent: 3,  // Max 3 concurrent prefetches
    priority: {
      critical: 100,
      high: 50,
      normal: 0,
      low: -50
    }
  },

  // Page transitions
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
  },

  // Code splitting
  codeSplitting: {
    enabled: true,
    chunkStrategy: 'route',
    preload: ['/', '/about'],
    loadingComponent: LoadingPage
  },

  // Scroll behavior
  scrollBehavior: {
    behavior: 'smooth',
    top: 0,
    preserveScroll: false,
    scrollToHash: true
  },

  // Routes
  routes: {
    '/': {
      component: HomePage,
      prefetch: 'eager' // Prefetch immediately
    },
    '/about': {
      component: AboutPage,
      prefetch: 'high'
    },
    '/products': {
      component: ProductsPage,
      prefetch: 'normal'
    },
    '/products/:id': {
      component: ProductDetailPage,
      prefetch: 'low'
    },
    '/users/:id': {
      component: UserProfilePage,
      beforeEnter: (to, from, next) => {
        console.log(`🔒 Checking access to user ${to.params.id}...`);
        // Simulate auth check
        const isAuthenticated = true; // Change to false to test guard
        if (isAuthenticated) {
          console.log('✓ Access granted');
          next();
        } else {
          console.log('✗ Access denied, redirecting to home');
          next('/');
        }
      }
    },
    '*': {
      component: NotFoundPage
    }
  }
});

// =============================================================================
// Global Navigation Guards
// =============================================================================

console.log('🔐 Setting up navigation guards...\n');

// Before navigation
router.beforeEach((to, from, next) => {
  console.log(`📍 Navigating from ${from?.path || '(initial)'} to ${to.path}`);

  // Log navigation
  console.log(`   Params: ${JSON.stringify(to.params)}`);
  console.log(`   Query: ${JSON.stringify(to.query)}`);

  // Simulate analytics
  trackPageView(to.path);

  // Continue navigation
  next();
});

// After navigation
router.afterEach((to, from) => {
  console.log(`✓ Navigation complete to ${to.path}\n`);

  // Update page title
  const pageTitles = {
    '/': 'Home',
    '/about': 'About Us',
    '/products': 'Products',
    '/users/:id': 'User Profile'
  };

  const title = pageTitles[to.path] || 'Page';
  console.log(`📄 Page title: ${title}`);
});

// =============================================================================
// Router Events
// =============================================================================

console.log('📢 Setting up router events...\n');

router.on('navigate', (to, from) => {
  console.log(`🚀 Navigate event: ${from?.path} → ${to.path}`);
});

router.on('error', (error) => {
  console.error('❌ Router error:', error);
});

router.on('prefetch:start', (path) => {
  console.log(`⏳ Prefetching started: ${path}`);
});

router.on('prefetch:complete', (path) => {
  console.log(`✓ Prefetching complete: ${path}`);
});

// =============================================================================
// Helper Functions
// =============================================================================

function trackPageView(path) {
  console.log(`📊 Analytics: Page view tracked for ${path}`);
}

// =============================================================================
// Navigation Examples
// =============================================================================

console.log('=' .repeat(80));
console.log('🧭 Router Navigation Examples');
console.log('='.repeat(80));
console.log('');

// Example 1: Basic navigation
console.log('Example 1: Basic Navigation\n');
router.push('/about');

setTimeout(() => {
  // Example 2: Navigation with dynamic route
  console.log('\nExample 2: Dynamic Route Navigation\n');
  router.push('/users/456');

  setTimeout(() => {
    // Example 3: Navigation with query parameters
    console.log('\nExample 3: Query Parameters\n');
    router.push({ path: '/products', query: { category: 'electronics', sort: 'price' } });

    setTimeout(() => {
      // Example 4: Navigation with hash
      console.log('\nExample 4: Hash Navigation\n');
      router.push({ path: '/about', hash: '#team' });

      setTimeout(() => {
        // Example 5: Back navigation
        console.log('\nExample 5: Back Navigation\n');
        router.back();

        setTimeout(() => {
          // Example 6: Forward navigation
          console.log('\nExample 6: Forward Navigation\n');
          router.forward();

          setTimeout(() => {
            // Example 7: Replace current route
            console.log('\nExample 7: Replace Route\n');
            router.replace('/products/123');

            setTimeout(() => {
              // Example 8: Check active route
              console.log('\nExample 8: Check Active Route\n');
              console.log('Is /products/123 active?', router.isActive('/products/123'));
              console.log('Is /about active?', router.isActive('/about'));

              setTimeout(() => {
                // Example 9: Get current route
                console.log('\nExample 9: Current Route Info\n');
                const current = router.currentRoute;
                console.log('Current path:', current.path);
                console.log('Current params:', current.params);
                console.log('Current query:', current.query);

                setTimeout(() => {
                  // Example 10: Manual prefetch
                  console.log('\nExample 10: Manual Prefetch\n');
                  router.prefetch('/users/789');
                  router.prefetch(['/about', '/products']);

                  setTimeout(() => {
                    // Final summary
                    console.log('\n' + '='.repeat(80));
                    console.log('📝 Router Demo Complete!');
                    console.log('='.repeat(80));
                    console.log('');
                    console.log('Features demonstrated:');
                    console.log('✓ Basic navigation (push, back, forward, replace)');
                    console.log('✓ Dynamic routes with parameters');
                    console.log('✓ Query parameters and hash');
                    console.log('✓ Navigation guards (beforeEach, afterEach, beforeEnter)');
                    console.log('✓ Route prefetching (automatic and manual)');
                    console.log('✓ Page transitions');
                    console.log('✓ Router events');
                    console.log('✓ Active route checking');
                    console.log('');
                    console.log('🚀 Ready to use in your application!');
                    console.log('='.repeat(80));
                  }, 1000);
                }, 1000);
              }, 1000);
            }, 1000);
          }, 1000);
        }, 1000);
      }, 1000);
    }, 1000);
  }, 1000);
}, 1000);

// =============================================================================
// Usage in HTML
// =============================================================================

/*
<!DOCTYPE html>
<html>
<head>
  <title>Coherent.js Router Demo</title>
  <style>
    .page { padding: 20px; }
    .nav-link { margin-right: 10px; }
    .spinner { width: 40px; height: 40px; border: 4px solid #f3f3f3;
                border-top: 4px solid #3498db; border-radius: 50%;
                animation: spin 1s linear infinite; }
    @keyframes spin { 0% { transform: rotate(0deg); }
                      100% { transform: rotate(360deg); } }
  </style>
</head>
<body>
  <div id="app"></div>
  <script type="module" src="./client-router-demo.js"></script>
</body>
</html>
*/
