import { renderToString, renderToStream, performanceMonitor, withState, memo } from '../src/coherent.js';

// Example 1: Performance Monitoring
console.log('=== Performance Monitoring Example ===');

// Start monitoring
performanceMonitor.start();

// Create a complex component
const ComplexComponent = ({ items }) => ({
  div: {
    className: 'complex-component',
    children: [
      { h1: { text: 'Complex Component with Performance Monitoring' } },
      {
        ul: {
          children: items.map((item, index) => ({
            li: {
              key: index,
              children: [
                { strong: { text: item.title } },
                { p: { text: item.description } }
              ]
            }
          }))
        }
      }
    ]
  }
});

// Render the component
const items = Array.from({ length: 100 }, (_, i) => ({
  title: `Item ${i + 1}`,
  description: `This is the description for item ${i + 1}`
}));

const html = renderToString(ComplexComponent({ items }));

// Get and display stats
const stats = performanceMonitor.generateReport();
console.log('Performance Stats:', JSON.stringify(stats, null, 2));

// Get recommendations
const recommendations = performanceMonitor.generatePerformanceRecommendations();
console.log('Recommendations:', recommendations);

// Stop monitoring
performanceMonitor.stop();

// Example 2: State Management
console.log('\n=== State Management Example ===');

// Note: State management in Coherent.js is primarily for client-side hydration
// For server-side rendering, state is typically passed as props
const Counter = ({ count = 0, label = 'Counter' }) => ({
  div: {
    className: 'counter',
    children: [
      { h2: { text: label } },
      { p: { text: `Count: ${count}` } },
      {
        button: {
          text: 'Increment',
          // These would be handled by client-side hydration
          onclick: 'handleIncrement()'
        }
      },
      {
        button: {
          text: 'Reset',
          onclick: 'handleReset()'
        }
      }
    ]
  }
});

// Render initial state
console.log(renderToString(Counter({ count: 0, label: 'Counter' })));

console.log('Note: For full state management, use client-side hydration with the client.makeHydratable utility');

// Example 3: Memoization
console.log('\n=== Memoization Example ===');

// Expensive component that we want to memoize
const ExpensiveComponent = memo(
  ({ data }) => {
    // Simulate expensive computation
    const result = data.items.reduce((acc, item) => acc + item.value, 0);
    return {
      div: {
        className: 'expensive-component',
        children: [
          { h3: { text: `Computed Result: ${result}` } },
          { p: { text: `Processed ${data.items.length} items` } }
        ]
      }
    };
  },
  (props) => props.data.id // Custom key function
);

// Render the memoized component
const data1 = { id: 1, items: [{ value: 10 }, { value: 20 }, { value: 30 }] };
const data2 = { id: 1, items: [{ value: 10 }, { value: 20 }, { value: 30 }] }; // Same ID
const data3 = { id: 2, items: [{ value: 5 }, { value: 15 }] }; // Different ID

console.log('First render (data1):');
console.log(renderToString(ExpensiveComponent({ data: data1 })));

console.log('Second render (data2, same ID - should be cached):');
console.log(renderToString(ExpensiveComponent({ data: data2 })));

console.log('Third render (data3, different ID - should recompute):');
console.log(renderToString(ExpensiveComponent({ data: data3 })));

// Example 4: Component Composition
console.log('\n=== Component Composition Example ===');

const Header = () => ({
  header: {
    className: 'main-header',
    children: [
      { h1: { text: 'My Coherent.js App' } },
      {
        nav: {
          children: [
            { a: { href: '/', text: 'Home' } },
            { a: { href: '/about', text: 'About' } },
            { a: { href: '/contact', text: 'Contact' } }
          ]
        }
      }
    ]
  }
});

const Main = ({ content }) => ({
  main: {
    className: 'main-content',
    children: [
      { h2: { text: 'Main Content' } },
      { p: { text: content } }
    ]
  }
});

const Footer = () => ({
  footer: {
    className: 'main-footer',
    children: [
      { p: { text: '© 2023 My Coherent.js App' } }
    ]
  }
});

// Render components together
const Layout = ({ content }) => ({
  html: {
    children: [
      Header(),
      Main({ content }),
      Footer()
    ]
  }
});

// Render composed layout
console.log(renderToString(Layout({ content: 'This is the main content of the page.' })));

// Example 5: Streaming Renderer
console.log('\n=== Streaming Renderer Example ===');

// Create a large component
const LargeComponent = ({ items }) => ({
  div: {
    className: 'large-component',
    children: [
      { h1: { text: 'Large Component with Streaming' } },
      {
        ul: {
          children: items.map((item, index) => ({
            li: {
              key: index,
              children: [
                { h3: { text: item.title } },
                { p: { text: item.content } }
              ]
            }
          }))
        }
      }
    ]
  }
});

// Create a large dataset
const largeItems = Array.from({ length: 100 }, (_, i) => ({
  title: `Item ${i + 1}`,
  content: `This is the content for item ${i + 1}. It contains some detailed information about the item and its purpose in the application.`
}));

console.log('Streaming started...');

// For demo purposes, we'll collect chunks and display a summary
// In a real server environment, you would pipe this directly to the response
let chunkCount = 0;
let totalSize = 0;

// Note: In Node.js, you would typically use this with Express or Fastify
// For this example, we'll just show how to consume the async generator
console.log('In a real server environment, you would pipe this directly to the HTTP response.');
console.log('Example with Express:');
console.log('app.get("/stream", async (req, res) => {');
console.log('  const stream = renderToStream(LargeComponent({ items: largeItems }));');
console.log('  for await (const chunk of stream) {');
console.log('    res.write(chunk.chunk);');
console.log('  }');
console.log('  res.end();');
console.log('});');

// Example 6: Security Features
console.log('\n=== Security Features Example ===');

const SecureComponent = ({ userInput }) => ({
  div: {
    className: 'secure-component',
    children: [
      { h2: { text: 'Security Demo' } },
      {
        p: {
          text: 'User input (automatically escaped): ' + userInput
        }
      },
      {
        div: {
          html: '<strong>This is trusted HTML content</strong>'
        }
      }
    ]
  }
});

// Render with potentially unsafe input
const unsafeInput = '<script>alert("xss")</script>';
console.log('Rendering with potentially unsafe input:');
console.log(renderToString(SecureComponent({ userInput: unsafeInput })));

console.log('\n=== Advanced Features Demo Complete ===');
