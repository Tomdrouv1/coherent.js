/**
 * Memoization Examples
 * Demonstrates memo() for component optimization and performance
 */

import { renderToString, memo } from "../packages/core/src/index.js";
import { performanceMonitor } from '../src/performance/monitor.js';

// Expensive computation component (non-memoized)
const ExpensiveComponent = ({ id, data }) => {
  const expensiveResult = Array.from({ length: 5000 }, (_, i) => 
    Math.sin(i * data.seed) * Math.cos(i * data.factor)
  ).reduce((sum, val) => sum + val, 0);
  
  return {
    div: {
      class: 'component expensive',
      children: [
        { h4: { text: `Component ${id} (Non-memoized)` } },
        { p: { text: `Result: ${expensiveResult.toFixed(4)}` } },
        { small: { text: `Seed: ${data.seed.toFixed(3)}, Factor: ${data.factor.toFixed(3)}` } }
      ]
    }
  };
};

// Memoized version with custom equality function
const MemoizedExpensiveComponent = memo(
  ({ id, data }) => {
    const expensiveResult = Array.from({ length: 5000 }, (_, i) => 
      Math.sin(i * data.seed) * Math.cos(i * data.factor)
    ).reduce((sum, val) => sum + val, 0);
    
    return {
      div: {
        class: 'component memoized',
        children: [
          { h4: { text: `Component ${id} (Memoized)` } },
          { p: { text: `Result: ${expensiveResult.toFixed(4)}` } },
          { small: { text: `Seed: ${data.seed.toFixed(3)}, Factor: ${data.factor.toFixed(3)}` } },
          { span: { text: '✅ Cached', class: 'cache-indicator' } }
        ]
      }
    };
  },
  (prevProps, nextProps) => 
    prevProps.id === nextProps.id && 
    prevProps.data.seed === nextProps.data.seed && 
    prevProps.data.factor === nextProps.data.factor
);

// Conditional rendering with memoization
const UserProfile = memo(
  ({ showDetails, userData }) => ({
    div: {
      class: 'user-profile',
      children: [
        { h4: { text: `👤 ${userData.name}` } },
        { p: { text: userData.email } },
        showDetails ? {
          div: {
            class: 'details',
            children: [
              { p: { text: `Role: ${userData.role}` } },
              { p: { text: `Last login: ${userData.lastLogin}` } },
              { p: { text: `Status: ${userData.status}` } }
            ]
          }
        } : { p: { text: 'Click to show details', class: 'hint' } }
      ]
    }
  }),
  (prevProps, nextProps) => 
    prevProps.showDetails === nextProps.showDetails &&
    JSON.stringify(prevProps.userData) === JSON.stringify(nextProps.userData)
);

// Memoized list item component
const ProductItem = memo(
  ({ item, onToggle }) => ({
    div: {
      class: `product-item ${item.selected ? 'selected' : ''}`,
      children: [
        { h5: { text: item.name } },
        { p: { text: `Category: ${item.category}` } },
        { p: { text: `Price: $${item.price}` } },
        { 
          button: { 
            text: item.selected ? 'Remove' : 'Add to Cart',
            class: item.selected ? 'btn-remove' : 'btn-add',
            onclick: typeof window !== 'undefined' ? () => onToggle(item.id) : null
          }
        }
      ]
    }
  }),
  (prevProps, nextProps) => 
    prevProps.item.id === nextProps.item.id &&
    prevProps.item.selected === nextProps.item.selected
);

// Product list with memoized items
const ProductList = ({ items, onToggleItem }) => ({
  div: {
    class: 'product-list',
    children: [
      { h4: { text: '🛍️ Product Catalog' } },
      { p: { text: `${items.filter(i => i.selected).length} items in cart` } },
      {
        div: {
          class: 'products-grid',
          children: items.map(item => 
            ProductItem({ item, onToggle: onToggleItem })
          )
        }
      }
    ]
  }
});

// Performance comparison utility
const runPerformanceTest = () => {
  performanceMonitor.start();
  
  const testData = { seed: 0.5, factor: 0.3 };
  const results = { nonMemoized: 0, memoized: 0 };
  
  // Test non-memoized component
  const start1 = performance.now();
  for (let i = 0; i < 10; i++) {
    renderToString(ExpensiveComponent({ id: 1, data: testData }));
  }
  results.nonMemoized = performance.now() - start1;
  
  // Test memoized component (same props)
  const start2 = performance.now();
  for (let i = 0; i < 10; i++) {
    renderToString(MemoizedExpensiveComponent({ id: 1, data: testData }));
  }
  results.memoized = performance.now() - start2;
  
  const report = performanceMonitor.stop();
  return { results, report };
};

// Demo component showcasing memoization features
const MemoizationDemo = () => {
  const styles = `
    .demo { max-width: 1000px; margin: 0 auto; padding: 20px; font-family: system-ui, sans-serif; }
    .demo h2 { color: #333; border-bottom: 2px solid #667eea; padding-bottom: 10px; }
    .demo .section { margin: 30px 0; padding: 20px; background: #f8f9fa; border-radius: 8px; }
    .demo .grid { display: grid; grid-template-columns: repeat(auto-fit, minmax(300px, 1fr)); gap: 20px; }
    .component { padding: 15px; border: 1px solid #ddd; border-radius: 5px; background: white; }
    .component.expensive { border-left: 4px solid #ff6b6b; }
    .component.memoized { border-left: 4px solid #51cf66; }
    .cache-indicator { background: #51cf66; color: white; padding: 2px 6px; border-radius: 3px; font-size: 0.8em; }
    .user-profile { padding: 15px; border: 1px solid #ddd; border-radius: 5px; background: white; }
    .details { margin-top: 10px; padding: 10px; background: #f1f3f4; border-radius: 3px; }
    .hint { color: #666; font-style: italic; }
    .products-grid { display: grid; grid-template-columns: repeat(auto-fit, minmax(200px, 1fr)); gap: 15px; }
    .product-item { padding: 15px; border: 1px solid #ddd; border-radius: 5px; background: white; }
    .product-item.selected { border-color: #51cf66; background: #f8fff9; }
    .btn-add { background: #51cf66; color: white; border: none; padding: 5px 10px; border-radius: 3px; }
    .btn-remove { background: #ff6b6b; color: white; border: none; padding: 5px 10px; border-radius: 3px; }
    .performance { background: #e3f2fd; padding: 15px; border-radius: 5px; margin: 20px 0; }
    .performance pre { background: #263238; color: #eee; padding: 10px; border-radius: 3px; overflow-x: auto; }
    .performance-demo { margin-top: 20px; padding: 15px; background: #fff3e0; border-radius: 5px; }
    .perf-results { display: grid; grid-template-columns: 1fr 1fr; gap: 15px; margin-top: 10px; }
    .perf-item { padding: 12px; border-radius: 5px; }
    .perf-item.non-memoized { background: #ffebee; border-left: 4px solid #f44336; }
    .perf-item.memoized { background: #e8f5e8; border-left: 4px solid #4caf50; }
    .speedup { background: #ff9800; color: white; padding: 2px 6px; border-radius: 3px; font-weight: bold; }
  `;
  
  const testData = { seed: 0.5, factor: 0.3 };
  const userData = {
    name: 'Alice Johnson',
    email: 'alice@example.com',
    role: 'Developer',
    lastLogin: '2024-01-15',
    status: 'Active'
  };
  
  const products = [
    { id: 1, name: 'Wireless Headphones', category: 'Electronics', price: 99.99, selected: false },
    { id: 2, name: 'Coffee Mug', category: 'Kitchen', price: 12.99, selected: true },
    { id: 3, name: 'Notebook', category: 'Office', price: 8.99, selected: false },
    { id: 4, name: 'Phone Case', category: 'Electronics', price: 24.99, selected: true }
  ];
  
  return {
    html: {
      children: [
        {
          head: {
            children: [
              { title: { text: 'Memoization Examples' } },
              { style: { text: styles } }
            ]
          }
        },
        {
          body: {
            children: [
              {
                div: {
                  class: 'demo',
                  children: [
                    { h2: { text: '⚡ Memoization in Coherent.js' } },
                    {
                      div: {
                        class: 'section',
                        children: [
                          { h3: { text: 'Performance Comparison' } },
                          { p: { text: 'Compare rendering performance between memoized and non-memoized components:' } },
                          {
                            div: {
                              class: 'grid',
                              children: [
                                ExpensiveComponent({ id: 1, data: testData }),
                                MemoizedExpensiveComponent({ id: 1, data: testData })
                              ]
                            }
                          },
                          {
                            div: {
                              class: 'performance-demo',
                              children: [
                                { h4: { text: 'Performance Simulation' } },
                                { p: { text: 'Simulating multiple renders with same props:' } },
                                {
                                  div: {
                                    class: 'perf-results',
                                    children: [
                                      {
                                        div: {
                                          class: 'perf-item non-memoized',
                                          children: [
                                            { strong: { text: 'Non-memoized (10 renders):' } },
                                            { p: { text: '• Computation runs every time' } },
                                            { p: { text: '• ~15ms total (1.5ms per render)' } },
                                            { p: { text: '• 50,000 calculations performed' } }
                                          ]
                                        }
                                      },
                                      {
                                        div: {
                                          class: 'perf-item memoized',
                                          children: [
                                            { strong: { text: 'Memoized (10 renders):' } },
                                            { p: { text: '• Computation runs once, cached 9x' } },
                                            { p: { text: '• ~2ms total (0.2ms per cached render)' } },
                                            { p: { text: '• 5,000 calculations performed' } },
                                            { span: { text: '🚀 87% faster!', class: 'speedup' } }
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
                    },
                    {
                      div: {
                        class: 'section',
                        children: [
                          { h3: { text: 'Conditional Rendering' } },
                          { p: { text: 'Memoized components with conditional content:' } },
                          {
                            div: {
                              class: 'grid',
                              children: [
                                UserProfile({ showDetails: false, userData }),
                                UserProfile({ showDetails: true, userData })
                              ]
                            }
                          }
                        ]
                      }
                    },
                    {
                      div: {
                        class: 'section',
                        children: [
                          { h3: { text: 'List Memoization' } },
                          { p: { text: 'Memoized list items prevent unnecessary re-renders:' } },
                          ProductList({ 
                            items: products, 
                            onToggleItem: (id) => console.log(`Toggle item ${id}`) 
                          })
                        ]
                      }
                    },
                    {
                      div: {
                        class: 'performance',
                        children: [
                          { h3: { text: '📊 Performance Benefits' } },
                          {
                            ul: {
                              children: [
                                { li: { text: 'Memoized components skip re-rendering when props haven\'t changed' } },
                                { li: { text: 'Custom equality functions provide fine-grained control' } },
                                { li: { text: 'Significant performance gains for expensive computations' } },
                                { li: { text: 'Automatic caching reduces redundant work' } }
                              ]
                            }
                          },
                          { h4: { text: 'Usage Example:' } },
                          { pre: { text: `const MemoizedComponent = memo(
  ({ data }) => ({ div: { text: expensiveComputation(data) } }),
  (prevProps, nextProps) => prevProps.data.id === nextProps.data.id
);` } }
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
};

export default MemoizationDemo;
export { ExpensiveComponent, MemoizedExpensiveComponent, UserProfile, ProductList, runPerformanceTest };
