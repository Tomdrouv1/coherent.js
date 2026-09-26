/**
 * Coherent.js E-commerce Full-Stack Application
 *
 * Demonstrates:
 * - Hybrid FP/OOP architecture (pure object components, OOP state classes)
 * - Server-side rendering with @coherent.js/core
 * - A JSON API built on the @coherent.js/api object router
 * - Enhanced state management
 * - Performance monitoring (NODE_ENV=development)
 *
 * Run: node app.js (PORT=0 picks a free port), then open / or /api/products.
 * The components' onclick handlers only run in a browser after hydration;
 * the server-rendered page is static, and state changes go through the API.
 */

import { createServer } from 'node:http';
import { resolve } from 'node:path';
import { fileURLToPath } from 'node:url';
import { render } from '@coherent.js/core';
import { createRouter, ConflictError, NotFoundError } from '@coherent.js/api';
import { createFormState, createListState, createModalState } from '@coherent.js/state';

// Development tools (tree-shakable - won't be in production bundle)
import { logComponentTree } from '@coherent.js/devtools/visualizer';
import { createPerformanceDashboard, showPerformanceDashboard } from '@coherent.js/devtools/performance';

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
// API ENDPOINTS (@coherent.js/api object router)
// ============================================================================

/**
 * Send a JSON response with a status other than 200.
 * The router hands handlers a plain node:http response.
 */
function sendJson(res, statusCode, body) {
  res.writeHead(statusCode, { 'Content-Type': 'application/json' });
  res.end(JSON.stringify(body));
}

function cartSummary() {
  return {
    items: shoppingCart.getValue('items') || [],
    total: shoppingCart.getValue('total') || 0
  };
}

let nextProductId = 100;

// Handlers return data (sent as JSON) or answer through `res`; a thrown
// ApiError (NotFoundError, ConflictError...) is answered with its status, and
// a body that fails `validation` gets a 400 listing the invalid fields.
const api = createRouter({
  api: {
    products: {
      GET: () => productCatalog.sortedItems,

      POST: {
        validation: {
          name: { type: 'string', required: true, minLength: 1, maxLength: 100 },
          price: { type: 'number', required: true, minimum: 0 },
          category: { type: 'string', default: 'misc' },
          inStock: { type: 'boolean', default: true }
        },
        handler: (req, res) => {
          const product = { ...req.body, id: nextProductId++ };
          productCatalog.addItem(product);
          sendJson(res, 201, { message: 'Product created', product });
        }
      }
    },

    cart: {
      GET: () => cartSummary(),

      add: {
        // Only a product id is accepted: name and price come from the catalog,
        // never from the client.
        POST: {
          validation: { id: { type: 'integer', required: true } },
          handler: (req) => {
            const product = productCatalog.sortedItems.find((item) => item.id === req.body.id);
            if (!product) throw new NotFoundError(`Product ${req.body.id} not found`);
            if (!product.inStock) throw new ConflictError(`${product.name} is out of stock`);

            shoppingCart.addToCart(product);
            return { message: 'Item added to cart', ...cartSummary() };
          }
        }
      }
    },

    health: {
      GET: () => ({
        status: 'healthy',
        architecture: 'hybrid FP/OOP',
        products: productCatalog.sortedItems.length
      })
    }
  }
});

// ============================================================================
// SERVER (node:http: pages rendered by Coherent.js, /api/* by the router)
// ============================================================================

/**
 * Full HTML document for the storefront
 */
export function renderPage() {
  return `<!DOCTYPE html>${render({
    html: {
      lang: 'en',
      children: [
        {
          head: {
            children: [
              { meta: { charset: 'utf-8' } },
              { meta: { name: 'viewport', content: 'width=device-width, initial-scale=1' } },
              { title: { text: 'Coherent.js E-commerce Demo' } }
            ]
          }
        },
        { body: { style: 'margin: 0; font-family: system-ui, sans-serif;', children: [App()] } }
      ]
    }
  })}`;
}

/**
 * Request handler: the API router for /api/*, the rendered page for GET /
 */
export async function handleRequest(req, res) {
  const { pathname } = new URL(req.url || '/', 'http://localhost');

  if (pathname === '/api' || pathname.startsWith('/api/')) {
    await api.handle(req, res);
    return;
  }

  if ((req.method === 'GET' || req.method === 'HEAD') && pathname === '/') {
    try {
      const html = renderPage();
      res.writeHead(200, { 'Content-Type': 'text/html; charset=utf-8' });
      res.end(html);
    } catch (error) {
      console.error('Render failed:', error);
      res.writeHead(500, { 'Content-Type': 'text/plain' });
      res.end('Internal Server Error');
    }
    return;
  }

  res.writeHead(404, { 'Content-Type': 'text/plain' });
  res.end('Not Found');
}

/**
 * Start the storefront server (PORT=0 picks a free port).
 *
 * With NODE_ENV=development it also prints the component tree and records
 * every page render and API request in a performance dashboard, printed
 * every 30 seconds.
 */
export function startServer(port = Number(process.env.PORT ?? 3000)) {
  let dashboard = null;
  if (process.env.NODE_ENV === 'development') {
    console.log('🔍 Component Tree Visualization:');
    logComponentTree(App(), 'App', { colorOutput: true });
    dashboard = createPerformanceDashboard();
    dashboard.startMonitoring();
  }

  const server = createServer(async (req, res) => {
    const started = performance.now();
    await handleRequest(req, res);
    if (!dashboard) return;
    const duration = performance.now() - started;
    if (req.url?.startsWith('/api')) {
      dashboard.recordAPIRequest(duration, 'dynamic');
    } else {
      dashboard.recordComponentRender(duration, 'App');
    }
  });

  if (dashboard) {
    const timer = setInterval(() => showPerformanceDashboard(dashboard), 30_000);
    timer.unref();
    server.on('close', () => {
      clearInterval(timer);
      dashboard.stopMonitoring();
    });
  }

  server.listen(port, () => {
    console.log(`🛒 Coherent.js e-commerce demo: http://localhost:${server.address().port}`);
  });
  return server;
}

// `node app.js` starts the server; importing the module does not.
if (process.argv[1] && resolve(process.argv[1]) === fileURLToPath(import.meta.url)) {
  startServer();
}

export default handleRequest;
export { api, App, productCatalog, shoppingCart, userAuth };
