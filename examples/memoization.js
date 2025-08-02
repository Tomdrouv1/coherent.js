import { renderToString, memo, Component } from '../src/coherent.js';
import { performanceMonitor } from '../src/performance/monitor.js';

// Start performance monitoring
performanceMonitor.start();

// Example 1: Expensive component without memoization
const ExpensiveComponent = ({ id, data }) => {
  // Simulate expensive computation
  const expensiveResult = Array.from({ length: 10000 }, (_, i) => 
    Math.sin(i * data.seed) * Math.cos(i * data.factor)
  ).reduce((sum, val) => sum + val, 0);
  
  return {
    div: {
      className: 'expensive-component',
      children: [
        { h3: { text: `Expensive Component ${id}` } },
        { p: { text: `Computed value: ${expensiveResult.toFixed(4)}` } },
        { p: { text: `Data seed: ${data.seed}, factor: ${data.factor}` } }
      ]
    }
  };
};

// Example 2: Memoized version of the same component
const MemoizedExpensiveComponent = memo(
  ({ id, data }) => {
    // Simulate expensive computation
    const expensiveResult = Array.from({ length: 10000 }, (_, i) => 
      Math.sin(i * data.seed) * Math.cos(i * data.factor)
    ).reduce((sum, val) => sum + val, 0);
    
    return {
      div: {
        className: 'expensive-component memoized',
        children: [
          { h3: { text: `Memoized Component ${id}` } },
          { p: { text: `Computed value: ${expensiveResult.toFixed(4)}` } },
          { p: { text: `Data seed: ${data.seed}, factor: ${data.factor}` } }
        ]
      }
    };
  },
  // Custom equality function - components with same id and data are equal
  (prevProps, nextProps) => 
    prevProps.id === nextProps.id && 
    prevProps.data.seed === nextProps.data.seed && 
    prevProps.data.factor === nextProps.data.factor
);

// Example 3: Component with conditional rendering
const ConditionalComponent = memo(
  ({ showDetails, userData }) => ({
    div: {
      className: 'conditional-component',
      children: [
        { h2: { text: 'Conditional Rendering Example' } },
        { p: { text: `User: ${userData.name}` } },
        showDetails ? {
          div: {
            className: 'details',
            children: [
              { p: { text: `Email: ${userData.email}` } },
              { p: { text: `Role: ${userData.role}` } },
              { p: { text: `Last login: ${userData.lastLogin}` } }
            ]
          }
        } : null,
        { p: { text: `Details ${showDetails ? 'shown' : 'hidden'}` } }
      ]
    }
  }),
  // Only re-render when showDetails or userData changes
  (prevProps, nextProps) => 
    prevProps.showDetails === nextProps.showDetails &&
    prevProps.userData.name === nextProps.userData.name &&
    prevProps.userData.email === nextProps.userData.email &&
    prevProps.userData.role === nextProps.userData.role
);

// Example 4: List component with memoized items
const ListItem = memo(
  ({ item, onRemove }) => ({
    li: {
      key: item.id,
      className: 'list-item',
      children: [
        { span: { text: `${item.name} - ${item.category}` } },
        { button: { 
          text: 'Remove', 
          onclick: () => onRemove(item.id) 
        }}
      ]
    }
  }),
  // Re-render only when item or onRemove changes
  (prevProps, nextProps) => 
    prevProps.item.id === nextProps.item.id &&
    prevProps.item.name === nextProps.item.name &&
    prevProps.item.category === nextProps.item.category
);

const ListComponent = ({ items, onRemoveItem }) => ({
  div: {
    className: 'list-component',
    children: [
      { h2: { text: 'List with Memoized Items' } },
      {
        ul: {
          children: items.map(item => 
            ListItem({ item, onRemove: onRemoveItem })
          )
        }
      }
    ]
  }
});

// Performance comparison example
console.log('=== Performance Comparison: Memoization ===');

const testData = {
  seed: Math.random(),
  factor: Math.random()
};

// Render non-memoized component multiple times
console.log('\nRendering non-memoized component 5 times...');
console.time('Non-memoized');
for (let i = 0; i < 5; i++) {
  renderToString(ExpensiveComponent({ 
    id: i, 
    data: { ...testData, seed: testData.seed + i } 
  }));
}
console.timeEnd('Non-memoized');

// Render memoized component multiple times with same props
console.log('\nRendering memoized component 5 times with same props...');
console.time('Memoized (same props)');
for (let i = 0; i < 5; i++) {
  renderToString(MemoizedExpensiveComponent({ 
    id: 1, 
    data: testData 
  }));
}
console.timeEnd('Memoized (same props)');

// Render memoized component with different props
console.log('\nRendering memoized component 5 times with different props...');
console.time('Memoized (different props)');
for (let i = 0; i < 5; i++) {
  renderToString(MemoizedExpensiveComponent({ 
    id: i, 
    data: { ...testData, seed: testData.seed + i } 
  }));
}
console.timeEnd('Memoized (different props)');

// Render examples
console.log('\n=== Conditional Component Examples ===');
console.log('\nWith details:');
console.log(renderToString(ConditionalComponent({ 
  showDetails: true, 
  userData: { 
    name: 'John Doe', 
    email: 'john@example.com', 
    role: 'Admin', 
    lastLogin: '2023-05-15' 
  } 
})));

console.log('\nWithout details:');
console.log(renderToString(ConditionalComponent({ 
  showDetails: false, 
  userData: { 
    name: 'John Doe', 
    email: 'john@example.com', 
    role: 'Admin', 
    lastLogin: '2023-05-15' 
  } 
})));

console.log('\n=== List Component Example ===');
const sampleItems = [
  { id: 1, name: 'Apple', category: 'Fruit' },
  { id: 2, name: 'Carrot', category: 'Vegetable' },
  { id: 3, name: 'Banana', category: 'Fruit' }
];

console.log(renderToString(ListComponent({ 
  items: sampleItems, 
  onRemoveItem: (id) => console.log(`Remove item ${id}`) 
})));

// Show performance stats
const report = performanceMonitor.stop();
console.log('\n=== Performance Report ===');
console.log(`Total Renders: ${report.summary.totalRenders}`);
console.log(`Average Render Time: ${report.summary.averageRenderTime}ms`);
console.log(`Cache Hit Rate: ${report.caching.hitRate}%`);

if (report.recommendations.length > 0) {
  console.log('\nPerformance Recommendations:');
  report.recommendations.forEach(rec => {
    console.log(`- [${rec.priority.toUpperCase()}] ${rec.suggestion}`);
  });
}
