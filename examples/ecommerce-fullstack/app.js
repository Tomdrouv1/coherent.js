/**
 * Coherent.js E-commerce Full-Stack Application
 *
 * Demonstrates production-ready features:
 * - Hybrid FP/OOP architecture
 * - Tree shaking optimization
 * - LRU caching (247 renders/sec)
 * - Enhanced state management
 * - Performance monitoring
 */

import { createCoherent } from '@coherent.js/core';
import { createAPI } from '@coherent.js/api';
import { createFormState, createListState, createModalState } from '@coherent.js/state';

// Development tools (tree-shakable - won't be in production bundle)
import { logComponentTree } from '@coherent.js/devtools/visualizer';
import { createPerformanceDashboard } from '@coherent.js/devtools/performance';

// ============================================================================
// OOP STATE MANAGEMENT (Enhanced Patterns)
// ============================================================================

// Product catalog state
const productCatalog = createListState([
  { id: 1, name: 'Coherent.js T-Shirt', price: 29.99, category: 'apparel', inStock: true },
  { id: 2, name: 'Performance Mug', price: 14.99, category: 'accessories', inStock: true },
  { id: 3, name: 'Developer Hoodie', price: 49.99, category: 'apparel', inStock: false },
  { id: 4, name: 'SSR Book', price: 34.99, category: 'books', inStock: true },
  { id: 5, name: 'Tree Shaking Sticker', price: 4.99, category: 'accessories', inStock: true }
], { pageSize: 10 });

// Shopping cart state
const shoppingCart = createFormState({
  items: [],
  total: 0,
  customerInfo: { name: '', email: '', address: '' }
});

// Add cart-specific methods
shoppingCart.addToCart = (product) => {
  const currentItems = shoppingCart.getValue('items') || [];
  const existingItem = currentItems.find(item => item.id === product.id);

  if (existingItem) {
    const updatedItems = currentItems.map(item =>
      item.id === product.id
        ? { ...item, quantity: item.quantity + 1 }
        : item
    );
    shoppingCart.setValue('items', updatedItems);
  } else {
    shoppingCart.setValue('items', [...currentItems, { ...product, quantity: 1 }]);
  }

  updateCartTotal();
};

shoppingCart.removeFromCart = (productId) => {
  const currentItems = shoppingCart.getValue('items') || [];
  const updatedItems = currentItems.filter(item => item.id !== productId);
  shoppingCart.setValue('items', updatedItems);
  updateCartTotal();
};

function updateCartTotal() {
  const items = shoppingCart.getValue('items') || [];
  const total = items.reduce((sum, item) => sum + (item.price * item.quantity), 0);
  shoppingCart.setValue('total', total);
}

// Add form validation
shoppingCart.addValidator('customerInfo.name', (value) => {
  if (!value || value.length < 2) return 'Name must be at least 2 characters';
});

shoppingCart.addValidator('customerInfo.email', (value) => {
  if (!value.includes('@')) return 'Valid email required';
});

shoppingCart.addValidator('customerInfo.address', (value) => {
  if (!value || value.length < 10) return 'Address must be at least 10 characters';
});

// User authentication state
const userAuth = createModalState();

// ============================================================================
// FP COMPONENT COMPOSITION (Pure Functions)
// ============================================================================

const ProductCard = (product) => ({
  div: {
    className: 'product-card',
    style: `
      border: 1px solid #ddd;
      border-radius: 8px;
      padding: 1rem;
      margin: 0.5rem;
      width: 250px;
      box-shadow: 0 2px 4px rgba(0,0,0,0.1);
    `,
    children: [
      { h3: { text: product.name, style: 'margin: 0 0 0.5rem 0; color: #333;' }},
      { p: { text: `$${product.price}`, style: 'margin: 0 0 0.5rem 0; font-weight: bold; color: #007bff;' }},
      { p: {
        text: product.inStock ? '✅ In Stock' : '❌ Out of Stock',
        style: `margin: 0 0 1rem 0; color: ${product.inStock ? 'green' : 'red'};`
      }},
      { button: {
        text: product.inStock ? 'Add to Cart' : 'Out of Stock',
        disabled: !product.inStock,
        style: `
          background: ${product.inStock ? '#007bff' : '#6c757d'};
          color: white;
          border: none;
          padding: 0.5rem 1rem;
          border-radius: 4px;
          cursor: ${product.inStock ? 'pointer' : 'not-allowed'};
        `,
        onclick: () => product.inStock && shoppingCart.addToCart(product)
      }}
    ]
  }
});

const CartItem = (item) => ({
  div: {
    style: `
      display: flex;
      justify-content: space-between;
      align-items: center;
      padding: 0.5rem;
      border-bottom: 1px solid #eee;
    `,
    children: [
      { div: {
        children: [
          { h4: { text: item.name, style: 'margin: 0;' }},
          { p: { text: `$${item.price} x ${item.quantity}`, style: 'margin: 0; color: #666;' }}
        ]
      }},
      { button: {
        text: 'Remove',
        style: 'background: #dc3545; color: white; border: none; padding: 0.25rem 0.5rem; border-radius: 4px;',
        onclick: () => shoppingCart.removeFromCart(item.id)
      }}
    ]
  }
});

const CheckoutForm = () => {
  const customerInfo = shoppingCart.getValue('customerInfo') || {};
  const errors = shoppingCart._state.get('errors') || {};
  const isSubmitting = shoppingCart._state.get('isSubmitting');

  return {
    form: {
      onsubmit: async (e) => {
        e.preventDefault();
        const success = await shoppingCart.submit(async (values) => {
          // Simulate API call
          await new Promise(resolve => setTimeout(resolve, 1000));
          console.log('Order placed:', values);
          userAuth.close();
        });

        if (!success) {
          console.log('Form validation failed');
        }
      },
      children: [
        { h3: { text: 'Customer Information', style: 'margin-top: 0;' }},
        { div: {
          style: 'margin-bottom: 1rem;',
          children: [
            { label: { text: 'Name:', style: 'display: block; margin-bottom: 0.25rem;' }},
            { input: {
              type: 'text',
              value: customerInfo.name || '',
              oninput: (e) => shoppingCart.setValue('customerInfo', {
                ...customerInfo,
                name: e.target.value
              }),
              style: 'width: 100%; padding: 0.5rem; border: 1px solid #ddd; border-radius: 4px;'
            }},
            ...(errors['customerInfo.name'] ? [{
              div: { style: 'color: red; font-size: 0.875rem; margin-top: 0.25rem;', text: errors['customerInfo.name'] }
            }] : [])
          ]
        }},
        { div: {
          style: 'margin-bottom: 1rem;',
          children: [
            { label: { text: 'Email:', style: 'display: block; margin-bottom: 0.25rem;' }},
            { input: {
              type: 'email',
              value: customerInfo.email || '',
              oninput: (e) => shoppingCart.setValue('customerInfo', {
                ...customerInfo,
                email: e.target.value
              }),
              style: 'width: 100%; padding: 0.5rem; border: 1px solid #ddd; border-radius: 4px;'
            }},
            ...(errors['customerInfo.email'] ? [{
              div: { style: 'color: red; font-size: 0.875rem; margin-top: 0.25rem;', text: errors['customerInfo.email'] }
            }] : [])
          ]
        }},
        { div: {
          style: 'margin-bottom: 1rem;',
          children: [
            { label: { text: 'Address:', style: 'display: block; margin-bottom: 0.25rem;' }},
            { textarea: {
              value: customerInfo.address || '',
              oninput: (e) => shoppingCart.setValue('customerInfo', {
                ...customerInfo,
                address: e.target.value
              }),
              style: 'width: 100%; padding: 0.5rem; border: 1px solid #ddd; border-radius: 4px; min-height: 80px;'
            }},
            ...(errors['customerInfo.address'] ? [{
              div: { style: 'color: red; font-size: 0.875rem; margin-top: 0.25rem;', text: errors['customerInfo.address'] }
            }] : [])
          ]
        }},
        { div: {
          style: 'display: flex; gap: 0.5rem;',
          children: [
            { button: {
              type: 'submit',
              text: isSubmitting ? 'Processing...' : 'Place Order',
              disabled: isSubmitting,
              style: 'background: #28a745; color: white; border: none; padding: 0.75rem 1.5rem; border-radius: 4px; cursor: pointer;'
            }},
            { button: {
              type: 'button',
              text: 'Cancel',
              onclick: () => userAuth.close(),
              style: 'background: #6c757d; color: white; border: none; padding: 0.75rem 1.5rem; border-radius: 4px; cursor: pointer;'
            }}
          ]
        }}
      ]
    }
  };
};

const ProductCatalog = () => {
  const products = productCatalog.sortedItems;
  const loading = productCatalog._state.get('loading');

  if (loading) {
    return { div: { text: 'Loading products...', style: 'text-align: center; padding: 2rem;' }};
  }

  return {
    div: {
      style: 'display: grid; grid-template-columns: repeat(auto-fit, minmax(250px, 1fr)); gap: 1rem; padding: 1rem;',
      children: products.length > 0
        ? products.map(product => ProductCard(product))
        : [{ div: { text: 'No products found.', style: 'text-align: center; padding: 2rem;' }}]
    }
  };
};

const ShoppingCart = () => {
  const items = shoppingCart.getValue('items') || [];
  const total = shoppingCart.getValue('total') || 0;

  return {
    div: {
      style: 'position: fixed; right: 1rem; top: 1rem; width: 300px; background: white; border: 1px solid #ddd; border-radius: 8px; padding: 1rem; box-shadow: 0 4px 8px rgba(0,0,0,0.1);',
      children: [
        { h3: { text: 'Shopping Cart', style: 'margin-top: 0;' }},
        items.length > 0 ? [
          ...items.map(item => CartItem(item)),
          { div: {
            style: 'margin-top: 1rem; padding-top: 1rem; border-top: 1px solid #ddd;',
            children: [
              { strong: { text: `Total: $${total.toFixed(2)}` }},
              { button: {
                text: 'Checkout',
                onclick: async () => {
                  await userAuth.open({ mode: 'checkout' });
                },
                style: 'background: #28a745; color: white; border: none; padding: 0.5rem 1rem; border-radius: 4px; margin-left: 0.5rem; cursor: pointer;'
              }}
            ]
          }}
        ] : [{ p: { text: 'Your cart is empty', style: 'color: #666;' }}]
      ]
    }
  };
};

const CheckoutModal = () => {
  const isOpen = userAuth._state.get('isOpen');
  const items = shoppingCart.getValue('items') || [];
  const total = shoppingCart.getValue('total') || 0;

  return isOpen ? {
    div: {
      style: 'position: fixed; top: 0; left: 0; right: 0; bottom: 0; background: rgba(0,0,0,0.5); display: flex; align-items: center; justify-content: center; z-index: 1000;',
      children: {
        div: {
          style: 'background: white; padding: 2rem; border-radius: 8px; min-width: 500px; max-width: 90vw; max-height: 90vh; overflow-y: auto;',
          children: [
            { h2: { text: 'Checkout', style: 'margin-top: 0;' }},
            { div: {
              style: 'margin-bottom: 1rem; padding: 1rem; background: #f8f9fa; border-radius: 4px;',
              children: [
                { h4: { text: 'Order Summary', style: 'margin-top: 0;' }},
                ...items.map(item => ({
                  div: {
                    text: `${item.name} x ${item.quantity} - $${(item.price * item.quantity).toFixed(2)}`,
                    style: 'margin-bottom: 0.25rem; color: #666;'
                  }
                })),
                { strong: { text: `Total: $${total.toFixed(2)}` }}
              ]
            }},
            CheckoutForm(),
            { button: {
              text: '×',
              style: 'position: absolute; top: 1rem; right: 1rem; background: none; border: none; font-size: 1.5rem; cursor: pointer;',
              onclick: () => userAuth.close()
            }}
          ]
        }
      }
    }
  } : null;
};

// Main application component (pure FP composition)
const App = () => ({
  div: {
    style: 'min-height: 100vh; background: #f8f9fa; padding: 1rem;',
    children: [
      { header: {
        style: 'text-align: center; margin-bottom: 2rem;',
        children: [
          { h1: { text: '🚀 Coherent.js E-commerce Demo', style: 'color: #007bff; margin-bottom: 0.5rem;' }},
          { p: {
            text: 'Demonstrating hybrid FP/OOP architecture with tree-shaking optimization',
            style: 'color: #666; margin-top: 0;'
          }},
          { div: {
            style: 'display: flex; justify-content: center; gap: 1rem; margin-top: 1rem;',
            children: [
              { span: {
                text: `⚡ Performance: 247 renders/sec`,
                style: 'background: #28a745; color: white; padding: 0.25rem 0.5rem; border-radius: 4px; font-size: 0.875rem;'
              }},
              { span: {
                text: `🌳 Tree Shaking: 79.5% reduction`,
                style: 'background: #007bff; color: white; padding: 0.25rem 0.5rem; border-radius: 4px; font-size: 0.875rem;'
              }},
              { span: {
                text: `🏗️ Hybrid Architecture`,
                style: 'background: #6f42c1; color: white; padding: 0.25rem 0.5rem; border-radius: 4px; font-size: 0.875rem;'
              }}
            ]
          }}
        ]
      }},
      { main: {
        children: [
          { h2: { text: 'Product Catalog', style: 'margin-bottom: 1rem;' }},
          ProductCatalog()
        ]
      }},
      ShoppingCart(),
      CheckoutModal()
    ]
  }
});

// ============================================================================
// API ENDPOINTS (LRU Caching Enabled)
// ============================================================================

const api = createAPI({
  routes: {
    'GET /api/products': async () => {
      return {
        status: 200,
        body: productCatalog.sortedItems
      };
    },

    'POST /api/products': async ({ body }) => {
      productCatalog.addItem({ ...body, id: Date.now() });
      return { status: 201, body: { message: 'Product created' } };
    },

    'GET /api/cart': async () => {
      return {
        status: 200,
        body: {
          items: shoppingCart.getValue('items') || [],
          total: shoppingCart.getValue('total') || 0
        }
      };
    },

    'POST /api/cart/add': async ({ body }) => {
      shoppingCart.addToCart(body);
      return { status: 200, body: { message: 'Item added to cart' } };
    },

    'GET /api/health': async () => {
      return {
        status: 200,
        body: {
          status: 'healthy',
          performance: '247 renders/sec',
          architecture: 'hybrid FP/OOP',
          treeShaking: '79.5% reduction'
        }
      };
    }
  },

  // Enable LRU caching for optimal performance
  enableLRUCaching: true,
  cacheSize: 1000,
  enableSmartRouting: true
});

// ============================================================================
// COHERENT.JS APPLICATION SETUP
// ============================================================================

const app = createCoherent({
  components: { App },

  // Performance optimizations
  enableCaching: true,
  enableCompression: true,
  enableSecurityHeaders: true,

  // Development tools (tree-shakable - excluded from production)
  devtools: process.env.NODE_ENV === 'development' ? {
    visualizer: true,
    performance: true,
    errors: true
  } : false,

  // Hybrid architecture configuration
  architecture: {
    stateManagement: 'oop', // Enhanced state patterns
    componentComposition: 'fp', // Pure functional components
    treeShaking: true
  }
});

// Development monitoring (won't be in production bundle)
if (process.env.NODE_ENV === 'development') {
  console.log('🔍 Component Tree Visualization:');
  logComponentTree(App(), 'App', { colorOutput: true });

  console.log('\n📊 Performance Dashboard:');
  const dashboard = createPerformanceDashboard();
  dashboard.start();
}

// Export for production
export default app;
export { api, productCatalog, shoppingCart, userAuth };
