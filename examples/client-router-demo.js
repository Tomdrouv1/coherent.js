/**
 * @name Client Router
 * @category Client-Side
 * @description Client-side routing with prefetching, transitions, and guards.
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

// =============================================================================
// Router Configuration
// =============================================================================

console.log('📦 Creating Router...\n');

// In a browser, call router.start() to follow popstate/hashchange and
// intercept same-origin link clicks; push()/replace() then update the URL.
// This demo runs in Node, so it drives the router directly.
const router = createRouter({ mode: 'history', base: '/' });

let loggedIn = true;

// `component` is a loader, called once on first navigation: return the
// component, or use `() => import('./pages/About.js')` to code-split.
router.addRoute('/', { component: () => HomePage });
router.addRoute('/about', { component: () => AboutPage, meta: { title: 'About Us' } });
router.addRoute('/products', { component: () => ProductsPage });
router.addRoute('/products/:id', { component: () => ProductDetailPage });
router.addRoute('/users/:id', {
  component: () => UserProfilePage,
  // Guards may be async; returning false cancels the navigation.
  beforeEnter: (to) => {
    console.log(`🔒 Checking access to user ${to.params.id}: ${loggedIn ? 'granted' : 'denied'}`);
    return loggedIn;
  }
});
router.addRoute('*', { component: () => NotFoundPage });

// =============================================================================
// Navigation Examples
// =============================================================================

function describe(result) {
  const route = router.getCurrentRoute();
  const html = route?.component ? render(route.component({ params: route.params, query: route.query })) : '';
  console.log(`   navigated: ${result} → ${route?.fullPath}`);
  console.log(`   params: ${JSON.stringify(route?.params)} query: ${JSON.stringify(route?.query)}`);
  console.log(`   html: ${html.slice(0, 80)}${html.length > 80 ? '…' : ''}`);
}

async function main() {
  console.log('='.repeat(80));
  console.log('🧭 Router Navigation Examples');
  console.log('='.repeat(80));

  console.log('\nExample 1: Basic navigation');
  describe(await router.push('/about'));

  console.log('\nExample 2: Dynamic route parameters');
  describe(await router.push('/users/456'));

  console.log('\nExample 3: Query parameters and hash');
  describe(await router.push('/products?category=electronics&sort=price#top'));

  console.log('\nExample 4: A guard cancelling a navigation');
  loggedIn = false;
  console.log(`   navigated: ${await router.push('/users/789')} (still on ${router.getCurrentRoute().fullPath})`);
  loggedIn = true;

  console.log('\nExample 5: Back and forward');
  router.back(); // in a browser after start(), the popstate event drives this
  await new Promise((resolve) => setTimeout(resolve, 0));
  describe('back');
  router.forward();
  await new Promise((resolve) => setTimeout(resolve, 0));
  describe('forward');

  console.log('\nExample 6: Replace the current entry');
  describe(await router.replace('/products/123'));

  console.log('\nExample 7: Unknown paths fall back to the "*" route');
  describe(await router.push('/does/not/exist'));

  console.log('\nExample 8: The last navigation wins');
  const [slow, fast] = await Promise.all([router.push('/about'), router.push('/')]);
  console.log(`   /about → ${slow}, / → ${fast}, current: ${router.getCurrentRoute().fullPath}`);

  console.log('\n📊 Stats:', JSON.stringify(router.getStats()));
}

await main();
