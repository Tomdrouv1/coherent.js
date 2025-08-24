/**
 * Advanced Features Example
 * 
 * This example demonstrates advanced Coherent.js features:
 * - Performance monitoring and optimization
 * - Component memoization
 * - Advanced state management patterns
 * - Security features (XSS protection)
 * - Streaming rendering capabilities
 * - Complex component composition
 */

import { memo, withState } from '../src/coherent.js';

// Memoized expensive computation component
export const MemoizedCalculator = memo(
  ({ data, operation = 'sum' }) => {
    const result = data.items.reduce((acc, item) => {
      switch (operation) {
        case 'sum': return acc + item.value;
        case 'product': return acc * item.value;
        case 'max': return Math.max(acc, item.value);
        default: return acc;
      }
    }, operation === 'product' ? 1 : 0);
    
    return {
      div: {
        className: 'memoized-calculator',
        children: [
          { h4: { text: `${operation.toUpperCase()} Calculator` } },
          { p: { text: `Result: ${result}` } },
          { small: { text: `Processed ${data.items.length} items (Cache Key: ${data.id})` } }
        ]
      }
    };
  },
  (props) => `${props.data.id}-${props.operation}`
);

// Advanced state management component
export const AdvancedCounter = withState(
  ({ count = 0, step = 1, history = [] }, { setState }) => {
    const increment = () => {
      const newCount = count + step;
      setState({ 
        count: newCount, 
        history: [...history, { action: 'increment', from: count, to: newCount }]
      });
    };
    
    return {
      div: {
        className: 'advanced-counter',
        children: [
          { h4: { text: 'Advanced State Management' } },
          { p: { text: `Current Count: ${count}` } },
          {
            button: {
              text: `+${step}`,
              onclick: typeof window !== 'undefined' ? increment : null
            }
          },
          {
            div: {
              children: [
                { h5: { text: 'History' } },
                ...history.slice(-3).map((entry, index) => ({
                  p: { key: index, text: `${entry.action}: ${entry.from} → ${entry.to}` }
                }))
              ]
            }
          }
        ]
      }
    };
  },
  { count: 0, step: 1, history: [] }
);

// Server-side compatible state management demo
export const StateManagementDemo = ({ count = 5, step = 2 }) => ({
  div: {
    className: 'state-management-demo',
    children: [
      { h4: { text: 'State Management Demo' } },
      { p: { text: `Current Count: ${count}` } },
      { p: { text: `Step Size: ${step}` } },
      {
        button: {
          text: `+${step}`,
          disabled: true,
          style: 'opacity: 0.6; cursor: not-allowed;'
        }
      },
      {
        div: {
          children: [
            { h5: { text: 'History' } },
            { p: { text: 'increment: 0 → 2' } },
            { p: { text: 'increment: 2 → 4' } },
            { p: { text: 'increment: 4 → 5' } }
          ]
        }
      },
      { small: { text: '💡 Interactive version available in hydrated client-side mode' } }
    ]
  }
});

// Security demonstration component
export const SecurityDemo = ({ userInput = '<script>alert("XSS")</script>' }) => ({
  div: {
    className: 'security-demo',
    children: [
      { h4: { text: 'XSS Protection Demo' } },
      { p: { text: 'Raw Input: ' } },
      { code: { text: userInput } },
      { p: { text: 'Escaped Output: ' } },
      { span: { text: userInput } }, // Automatically escaped
      { small: { text: '✅ All user input is automatically escaped' } }
    ]
  }
});

// Streaming data visualization component
export const StreamingDataGrid = ({ items = [] }) => ({
  div: {
    className: 'streaming-data-grid',
    children: [
      { h4: { text: 'Streaming Data Visualization' } },
      { p: { text: `Items: ${items.length} • Status: Live • Mode: Streaming` } },
      {
        div: {
          className: 'data-grid',
          children: items.slice(0, 10).map((item, index) => ({
            div: {
              key: index,
              children: [
                { span: { text: `#${item.id}` } },
                { span: { text: item.title } },
                { span: { text: item.status } }
              ]
            }
          }))
        }
      }
    ]
  }
});

// Complete advanced features demo page
export const advancedFeaturesDemo = {
  html: {
    children: [
      {
        head: {
          children: [
            { title: { text: 'Advanced Features - Coherent.js' } },
            {
              style: {
                text: `
                body { font-family: Arial, sans-serif; max-width: 1000px; margin: 0 auto; padding: 20px; }
                .demo-section { margin: 30px 0; padding: 20px; border: 1px solid #ddd; border-radius: 8px; }
                .feature-card { background: #f8f9fa; padding: 15px; margin: 10px 0; border-radius: 6px; }
                .btn { padding: 8px 16px; margin: 5px; border: none; border-radius: 4px; cursor: pointer; }
                .btn-primary { background: #007bff; color: white; }
                .btn-secondary { background: #6c757d; color: white; }
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
                children: [
                  { h1: { text: 'Coherent.js Advanced Features' } },
                  { p: { text: 'Explore advanced capabilities including memoization, state management, and security features.' } },
                  
                  {
                    div: {
                      className: 'demo-section',
                      children: [
                        { h2: { text: '🧮 Memoization' } },
                        MemoizedCalculator({ 
                          data: { id: 1, items: [{ value: 10 }, { value: 20 }, { value: 30 }] },
                          operation: 'sum'
                        })
                      ]
                    }
                  },
                  
                  {
                    div: {
                      className: 'demo-section',
                      children: [
                        { h2: { text: '🔄 State Management' } },
                        StateManagementDemo({})
                      ]
                    }
                  },
                  
                  {
                    div: {
                      className: 'demo-section',
                      children: [
                        { h2: { text: '🔒 Security' } },
                        SecurityDemo({})
                      ]
                    }
                  },
                  
                  {
                    div: {
                      className: 'demo-section',
                      children: [
                        { h2: { text: '📡 Streaming' } },
                        StreamingDataGrid({ 
                          items: Array.from({ length: 15 }, (_, i) => ({
                            id: i + 1,
                            title: `Item ${i + 1}`,
                            status: i % 3 === 0 ? 'active' : 'pending'
                          }))
                        })
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

export default advancedFeaturesDemo;
