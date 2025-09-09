/**
 * Interactive Examples with Hydration Patterns
 * Demonstrates various client-side hydration scenarios and best practices
 */

import { withState } from "../packages/core/src/index.js";
import { makeHydratable, autoHydrate } from '../packages/client/src/hydration.js';

// Example 1: Simple Interactive Counter with Hydration
const CounterComponent = withState({ count: 0 })(({ state, stateUtils }) => {
  const { setState } = stateUtils;

  return {
    div: {
      'data-coherent-component': 'simple-counter',
      className: 'interactive-widget counter-widget',
      children: [
        { h3: { text: 'Interactive Counter' } },
        {
          div: {
            className: 'counter-display',
            children: [
              { span: { text: `Count: ${state.count}`, className: 'count-value' } }
            ]
          }
        },
        {
          div: {
            className: 'counter-controls',
            children: [
              {
                button: {
                  text: '−',
                  className: 'btn btn-secondary',
                  onclick: () => setState({ count: state.count - 1 })
                }
              },
              {
                button: {
                  text: 'Reset',
                  className: 'btn btn-outline',
                  onclick: () => setState({ count: 0 })
                }
              },
              {
                button: {
                  text: '+',
                  className: 'btn btn-primary',
                  onclick: () => setState({ count: state.count + 1 })
                }
              }
            ]
          }
        }
      ]
    }
  };
});

export const HydratableCounter = makeHydratable(CounterComponent, {
  componentName: 'simple-counter'
});

// Example 2: Shopping Cart with Complex State
const ShoppingCartComponent = withState({
  items: [],
  total: 0
})(({ state, stateUtils }) => {
  const { setState } = stateUtils;

  const addItem = (item) => () => {
    const existingItem = state.items.find(i => i.id === item.id);
    let newItems;
    
    if (existingItem) {
      newItems = state.items.map(i => 
        i.id === item.id ? { ...i, quantity: i.quantity + 1 } : i
      );
    } else {
      newItems = [...state.items, { ...item, quantity: 1 }];
    }
    
    const newTotal = newItems.reduce((sum, i) => sum + (i.price * i.quantity), 0);
    setState({ items: newItems, total: newTotal });
  };

  const removeItem = (itemId) => () => {
    const newItems = state.items.filter(i => i.id !== itemId);
    const newTotal = newItems.reduce((sum, i) => sum + (i.price * i.quantity), 0);
    setState({ items: newItems, total: newTotal });
  };

  const clearCart = () => {
    setState({ items: [], total: 0 });
  };

  const sampleProducts = [
    { id: 1, name: 'Coffee', price: 4.99 },
    { id: 2, name: 'Sandwich', price: 8.99 },
    { id: 3, name: 'Pastry', price: 3.99 }
  ];

  return {
    div: {
      'data-coherent-component': 'shopping-cart',
      className: 'interactive-widget cart-widget',
      children: [
        { h3: { text: 'Shopping Cart Demo' } },
        
        // Product List
        {
          div: {
            className: 'products-section',
            children: [
              { h4: { text: 'Products:' } },
              {
                div: {
                  className: 'products-grid',
                  children: sampleProducts.map(product => ({
                    div: {
                      key: product.id,
                      className: 'product-card',
                      children: [
                        { span: { text: product.name } },
                        { span: { text: `$${product.price}`, className: 'price' } },
                        {
                          button: {
                            text: 'Add to Cart',
                            className: 'btn btn-small btn-primary',
                            onclick: addItem(product)
                          }
                        }
                      ]
                    }
                  }))
                }
              }
            ]
          }
        },

        // Cart Contents
        {
          div: {
            className: 'cart-section',
            children: [
              { h4: { text: `Cart (${state.items.length} items):` } },
              state.items.length === 0 ? {
                p: { text: 'Cart is empty', className: 'empty-message' }
              } : {
                div: {
                  className: 'cart-items',
                  children: [
                    ...state.items.map(item => ({
                      div: {
                        key: item.id,
                        className: 'cart-item',
                        children: [
                          { span: { text: item.name } },
                          { span: { text: `×${item.quantity}` } },
                          { span: { text: `$${(item.price * item.quantity).toFixed(2)}`, className: 'price' } },
                          {
                            button: {
                              text: '×',
                              className: 'btn btn-danger btn-small',
                              onclick: removeItem(item.id)
                            }
                          }
                        ]
                      }
                    })),
                    {
                      div: {
                        className: 'cart-total',
                        children: [
                          { span: { text: `Total: $${state.total.toFixed(2)}`, className: 'total-amount' } },
                          {
                            button: {
                              text: 'Clear Cart',
                              className: 'btn btn-outline btn-small',
                              onclick: clearCart
                            }
                          }
                        ]
                      }
                    }
                  ]
                }
              }
            ].filter(Boolean)
          }
        }
      ]
    }
  };
});

export const HydratableShoppingCart = makeHydratable(ShoppingCartComponent, {
  componentName: 'shopping-cart'
});

// Example 3: Toggle Switch with Theme Management
const ThemeToggleComponent = withState({ 
  theme: 'light',
  animations: true 
})(({ state, stateUtils }) => {
  const { setState } = stateUtils;

  const toggleTheme = () => {
    const newTheme = state.theme === 'light' ? 'dark' : 'light';
    setState({ theme: newTheme });
    
    // Apply theme to document body (client-side only)
    if (typeof document !== 'undefined') {
      document.body.classList.remove('theme-light', 'theme-dark');
      document.body.classList.add(`theme-${newTheme}`);
    }
  };

  const toggleAnimations = () => {
    setState({ animations: !state.animations });
  };

  return {
    div: {
      'data-coherent-component': 'theme-toggle',
      className: `interactive-widget theme-widget theme-${state.theme}`,
      children: [
        { h3: { text: 'Theme Controls' } },
        {
          div: {
            className: 'theme-preview',
            children: [
              { p: { text: `Current theme: ${state.theme}` } },
              { p: { text: `Animations: ${state.animations ? 'enabled' : 'disabled'}` } }
            ]
          }
        },
        {
          div: {
            className: 'theme-controls',
            children: [
              {
                button: {
                  text: `Switch to ${state.theme === 'light' ? 'Dark' : 'Light'} Theme`,
                  className: 'btn btn-primary',
                  onclick: toggleTheme
                }
              },
              {
                button: {
                  text: `${state.animations ? 'Disable' : 'Enable'} Animations`,
                  className: 'btn btn-secondary',
                  onclick: toggleAnimations
                }
              }
            ]
          }
        }
      ]
    }
  };
});

export const HydratableThemeToggle = makeHydratable(ThemeToggleComponent, {
  componentName: 'theme-toggle'
});

// Complete interactive examples page
export const interactiveExamplesPage = {
  html: {
    children: [
      {
        head: {
          children: [
            { title: { text: 'Interactive Examples - Coherent.js' } },
            {
              style: {
                text: `
                body {
                  font-family: -apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, sans-serif;
                  margin: 0;
                  padding: 20px;
                  background: linear-gradient(135deg, #f5f7fa 0%, #c3cfe2 100%);
                  min-height: 100dvh;
                  transition: all 0.3s ease;
                }
                
                body.theme-dark {
                  background: linear-gradient(135deg, #232526 0%, #414345 100%);
                  color: #f8f9fa;
                }
                
                .page-container {
                  max-width: 1000px;
                  margin: 0 auto;
                  background: white;
                  border-radius: 12px;
                  box-shadow: 0 10px 30px rgba(0,0,0,0.1);
                  overflow: hidden;
                }
                
                body.theme-dark .page-container {
                  background: #2c3e50;
                  color: #ecf0f1;
                  box-shadow: 0 10px 30px rgba(0,0,0,0.3);
                }
                
                .page-header {
                  background: linear-gradient(135deg, #667eea 0%, #764ba2 100%);
                  color: white;
                  padding: 30px;
                  text-align: center;
                }
                
                .page-content {
                  padding: 30px;
                }
                
                .examples-grid {
                  display: grid;
                  grid-template-columns: repeat(auto-fit, minmax(300px, 1fr));
                  gap: 20px;
                  margin-bottom: 30px;
                }
                
                .interactive-widget {
                  background: #f8f9fa;
                  padding: 20px;
                  border-radius: 8px;
                  border: 1px solid #e9ecef;
                  box-shadow: 0 2px 4px rgba(0,0,0,0.05);
                  transition: all 0.3s ease;
                }
                
                body.theme-dark .interactive-widget {
                  background: #34495e;
                  border-color: #4a6741;
                  color: #ecf0f1;
                }
                
                .interactive-widget h3 {
                  margin: 0 0 15px 0;
                  color: #2c3e50;
                  font-size: 1.2rem;
                  font-weight: 600;
                }
                
                body.theme-dark .interactive-widget h3 {
                  color: #ecf0f1;
                }
                
                .counter-display, .theme-preview {
                  text-align: center;
                  margin: 15px 0;
                  padding: 15px;
                  background: white;
                  border-radius: 6px;
                  border: 1px solid #e9ecef;
                }
                
                body.theme-dark .counter-display,
                body.theme-dark .theme-preview {
                  background: #2c3e50;
                  border-color: #4a6741;
                  color: #ecf0f1;
                }
                
                .count-value {
                  font-size: 1.25rem;
                  font-weight: 600;
                  color: #667eea;
                }
                
                body.theme-dark .count-value {
                  color: #74b9ff;
                }
                
                .counter-controls, .theme-controls {
                  display: flex;
                  justify-content: center;
                  gap: 10px;
                  flex-wrap: wrap;
                }
                
                .products-section, .cart-section {
                  margin: 20px 0;
                }
                
                .products-section h4, .cart-section h4 {
                  margin: 0 0 10px 0;
                  color: #495057;
                }
                
                body.theme-dark .products-section h4,
                body.theme-dark .cart-section h4 {
                  color: #bdc3c7;
                }
                
                .products-grid {
                  display: grid;
                  grid-template-columns: repeat(auto-fit, minmax(150px, 1fr));
                  gap: 10px;
                  margin-bottom: 20px;
                }
                
                .product-card {
                  background: white;
                  padding: 10px;
                  border-radius: 6px;
                  border: 1px solid #e9ecef;
                  display: flex;
                  flex-direction: column;
                  gap: 5px;
                  text-align: center;
                }
                
                body.theme-dark .product-card {
                  background: #2c3e50;
                  border-color: #4a6741;
                  color: #ecf0f1;
                }
                
                .cart-items {
                  background: white;
                  border-radius: 6px;
                  border: 1px solid #e9ecef;
                  padding: 15px;
                }
                
                body.theme-dark .cart-items {
                  background: #2c3e50;
                  border-color: #4a6741;
                  color: #ecf0f1;
                }
                
                .cart-item {
                  display: flex;
                  justify-content: space-between;
                  align-items: center;
                  padding: 8px 0;
                  border-bottom: 1px solid #e9ecef;
                }
                
                body.theme-dark .cart-item {
                  border-bottom-color: #4a6741;
                }
                
                .cart-item:last-child {
                  border-bottom: none;
                }
                
                .cart-total {
                  margin-top: 15px;
                  padding-top: 15px;
                  border-top: 2px solid #e9ecef;
                  display: flex;
                  justify-content: space-between;
                  align-items: center;
                }
                
                body.theme-dark .cart-total {
                  border-top-color: #4a6741;
                }
                
                .total-amount {
                  font-weight: 600;
                  font-size: 1.1rem;
                  color: #28a745;
                }
                
                body.theme-dark .total-amount {
                  color: #2ecc71;
                }
                
                .price {
                  font-weight: 500;
                  color: #28a745;
                }
                
                body.theme-dark .price {
                  color: #2ecc71;
                }
                
                .empty-message {
                  text-align: center;
                  color: #6c757d;
                  font-style: italic;
                  margin: 20px 0;
                }
                
                body.theme-dark .empty-message {
                  color: #95a5a6;
                }
                
                .btn {
                  padding: 8px 16px;
                  border: none;
                  border-radius: 6px;
                  font-weight: 500;
                  cursor: pointer;
                  transition: all 0.2s ease;
                  font-size: 14px;
                  text-decoration: none;
                  display: inline-block;
                  text-align: center;
                }
                
                .btn:hover {
                  transform: translateY(-1px);
                  box-shadow: 0 4px 8px rgba(0,0,0,0.15);
                }
                
                .btn-primary {
                  background: #667eea;
                  color: white;
                }
                
                .btn-primary:hover {
                  background: #5a6fd8;
                }
                
                .btn-secondary {
                  background: #6c757d;
                  color: white;
                }
                
                .btn-secondary:hover {
                  background: #545b62;
                }
                
                .btn-outline {
                  background: transparent;
                  color: #667eea;
                  border: 2px solid #667eea;
                }
                
                .btn-outline:hover {
                  background: #667eea;
                  color: white;
                }
                
                .btn-danger {
                  background: #dc3545;
                  color: white;
                }
                
                .btn-danger:hover {
                  background: #c82333;
                }
                
                .btn-small {
                  padding: 4px 8px;
                  font-size: 12px;
                }
                
                .hydration-info {
                  background: #e7f3ff;
                  border: 1px solid #b3d9ff;
                  border-radius: 8px;
                  padding: 20px;
                  margin: 30px 0;
                }
                
                body.theme-dark .hydration-info {
                  background: #1e3a8a;
                  border-color: #3b82f6;
                  color: #f1f5f9;
                }
                
                .hydration-info h3 {
                  color: #1e40af;
                  margin: 0 0 10px 0;
                }
                
                body.theme-dark .hydration-info h3 {
                  color: #93c5fd;
                }
                
                .hydration-info p {
                  color: #1e3a8a;
                  margin: 0;
                  line-height: 1.6;
                }
                
                body.theme-dark .hydration-info p {
                  color: #dbeafe;
                }
                `
              }
            }
          ]
        }
      },
      {
        body: {
          children: [
            {
              div: {
                className: 'page-container',
                children: [
                  {
                    div: {
                      className: 'page-header',
                      children: [
                        { h1: { text: 'Interactive Examples' } },
                        { p: { text: 'Demonstrating client-side hydration and state management with Coherent.js' } }
                      ]
                    }
                  },
                  {
                    div: {
                      className: 'page-content',
                      children: [
                        {
                          div: {
                            className: 'examples-grid',
                            children: [
                              HydratableCounter.renderWithHydration(),
                              HydratableShoppingCart.renderWithHydration(),
                              HydratableThemeToggle.renderWithHydration()
                            ]
                          }
                        },
                        {
                          div: {
                            className: 'hydration-info',
                            children: [
                              { h3: { text: 'About These Examples' } },
                              { p: { text: 'These interactive components demonstrate client-side hydration, where server-rendered HTML becomes fully interactive on the client. Each component maintains its own state and responds to user interactions in real-time. The theme toggle even affects the entire page styling dynamically!' } }
                            ]
                          }
                        }
                      ]
                    }
                  }
                ]
              }
            }
          ]
        }
      }
    ]
  }
};

// Set up client-side hydration (browser only)
if (typeof window !== 'undefined') {
  // Component registry for hydration
  window.componentRegistry = {
    'simple-counter': HydratableCounter,
    'shopping-cart': HydratableShoppingCart,
    'theme-toggle': HydratableThemeToggle
  };
  
  // Auto-hydrate when DOM is ready
  document.addEventListener('DOMContentLoaded', () => {
    setTimeout(() => {
      autoHydrate(window.componentRegistry);
      console.log('✅ Interactive examples hydration complete!');
      
      // Initialize theme based on system preference
      if (window.matchMedia && window.matchMedia('(prefers-color-scheme: dark)').matches) {
        document.body.classList.add('theme-dark');
      } else {
        document.body.classList.add('theme-light');
      }
    }, 100);
  });
}

// Export the page as default for live preview
export default interactiveExamplesPage;
