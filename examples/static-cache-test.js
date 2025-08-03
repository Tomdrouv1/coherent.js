/**
 * Performance Testing Example
 * 
 * This example demonstrates performance testing patterns in Coherent.js:
 * - Rendering large component trees efficiently
 * - Measuring rendering performance
 * - Streaming renderer capabilities
 * - Memory usage optimization
 */

// Performance test component with many elements
export const PerformanceTestGrid = ({ itemCount = 50, showMetrics = false }) => {
  const items = Array.from({ length: itemCount }, (_, i) => ({
    div: {
      className: 'grid-item',
      key: `item-${i}`,
      children: [
        {
          div: {
            className: 'item-header',
            children: [
              { span: { text: `Item ${i + 1}`, className: 'item-number' } },
              { span: { text: '⭐', className: 'item-icon' } }
            ]
          }
        },
        {
          div: {
            className: 'item-content',
            children: [
              { p: { text: `This is content for item ${i + 1}. It demonstrates rendering performance with many elements.` } },
              {
                div: {
                  className: 'item-actions',
                  children: [
                    {
                      button: {
                        text: 'Action',
                        className: 'btn btn-sm',
                        onclick: typeof window !== 'undefined' ? () => {
                          console.log(`Action clicked for item ${i + 1}`);
                        } : null
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
  }));

  return {
    div: {
      className: 'performance-grid',
      children: [
        {
          div: {
            className: 'grid-header',
            children: [
              { h3: { text: `Performance Grid (${itemCount} items)`, className: 'grid-title' } },
              showMetrics ? {
                div: {
                  className: 'performance-metrics',
                  children: [
                    { span: { text: `Elements: ${itemCount}`, className: 'metric' } },
                    { span: { text: 'Status: Rendered', className: 'metric status-ok' } }
                  ]
                }
              } : null
            ].filter(Boolean)
          }
        },
        {
          div: {
            className: 'grid-container',
            children: items
          }
        }
      ]
    }
  };
};

// Performance testing controls
export const PerformanceControls = () => {
  return {
    div: {
      className: 'performance-controls',
      children: [
        {
          h3: {
            text: 'Performance Testing Controls',
            className: 'controls-title'
          }
        },
        {
          div: {
            className: 'control-group',
            children: [
              {
                label: {
                  text: 'Item Count:',
                  className: 'control-label'
                }
              },
              {
                select: {
                  id: 'item-count-select',
                  className: 'control-select',
                  children: [
                    { option: { value: '25', text: '25 items' } },
                    { option: { value: '50', text: '50 items', selected: true } },
                    { option: { value: '100', text: '100 items' } },
                    { option: { value: '200', text: '200 items' } }
                  ],
                  onchange: typeof window !== 'undefined' ? (e) => {
                    const count = parseInt(e.target.value);
                    console.log(`Rendering ${count} items...`);
                    // In a real app, this would trigger a re-render
                  } : null
                }
              }
            ]
          }
        },
        {
          div: {
            className: 'control-buttons',
            children: [
              {
                button: {
                  text: '🔄 Re-render',
                  className: 'btn btn-primary',
                  onclick: typeof window !== 'undefined' ? () => {
                    const start = performance.now();
                    // Simulate re-render
                    setTimeout(() => {
                      const end = performance.now();
                      console.log(`Re-render completed in ${(end - start).toFixed(2)}ms`);
                    }, 10);
                  } : null
                }
              },
              {
                button: {
                  text: '📊 Measure Performance',
                  className: 'btn btn-secondary',
                  onclick: typeof window !== 'undefined' ? () => {
                    console.log('Performance measurement started...');
                    // In a real app, this would run performance tests
                  } : null
                }
              }
            ]
          }
        }
      ]
    }
  };
};

// Complete performance testing demo page
export const performanceDemo = {
  html: {
    children: [
      {
        head: {
          children: [
            { title: { text: 'Performance Testing - Coherent.js' } },
            {
              style: {
                text: `
                body { 
                  font-family: 'Segoe UI', Tahoma, Geneva, Verdana, sans-serif; 
                  max-width: 1200px; 
                  margin: 0 auto; 
                  padding: 20px; 
                  background: #f8fafc;
                  line-height: 1.6;
                }
                .demo-container {
                  background: white;
                  padding: 30px;
                  border-radius: 12px;
                  box-shadow: 0 4px 20px rgba(0,0,0,0.1);
                }
                .demo-section {
                  margin: 30px 0;
                  padding: 25px;
                  border: 1px solid #e2e8f0;
                  border-radius: 8px;
                  background: #fafbfc;
                }
                .performance-controls {
                  background: white;
                  padding: 20px;
                  border-radius: 8px;
                  border: 1px solid #e2e8f0;
                  margin-bottom: 20px;
                }
                .controls-title {
                  color: #2d3748;
                  margin-bottom: 15px;
                }
                .control-group {
                  display: flex;
                  align-items: center;
                  gap: 10px;
                  margin: 15px 0;
                }
                .control-label {
                  font-weight: 500;
                  color: #4a5568;
                  min-width: 100px;
                }
                .control-select {
                  padding: 8px 12px;
                  border: 1px solid #e2e8f0;
                  border-radius: 6px;
                  font-size: 14px;
                }
                .control-buttons {
                  display: flex;
                  gap: 10px;
                  margin-top: 15px;
                }
                .performance-grid {
                  background: white;
                  border-radius: 8px;
                  border: 1px solid #e2e8f0;
                }
                .grid-header {
                  padding: 20px;
                  border-bottom: 1px solid #e2e8f0;
                  background: #f7fafc;
                  display: flex;
                  justify-content: space-between;
                  align-items: center;
                }
                .grid-title {
                  color: #2d3748;
                  margin: 0;
                }
                .performance-metrics {
                  display: flex;
                  gap: 15px;
                }
                .metric {
                  padding: 4px 8px;
                  background: #edf2f7;
                  border-radius: 4px;
                  font-size: 0.9em;
                  color: #4a5568;
                }
                .status-ok {
                  background: #c6f6d5;
                  color: #22543d;
                }
                .grid-container {
                  display: grid;
                  grid-template-columns: repeat(auto-fill, minmax(280px, 1fr));
                  gap: 15px;
                  padding: 20px;
                  max-height: 600px;
                  overflow-y: auto;
                }
                .grid-item {
                  border: 1px solid #e2e8f0;
                  border-radius: 6px;
                  background: white;
                  transition: all 0.2s ease;
                }
                .grid-item:hover {
                  border-color: #cbd5e0;
                  box-shadow: 0 2px 8px rgba(0,0,0,0.1);
                }
                .item-header {
                  padding: 12px 15px;
                  background: #f7fafc;
                  border-bottom: 1px solid #e2e8f0;
                  display: flex;
                  justify-content: space-between;
                  align-items: center;
                }
                .item-number {
                  font-weight: 600;
                  color: #2d3748;
                }
                .item-icon {
                  font-size: 1.2em;
                }
                .item-content {
                  padding: 15px;
                }
                .item-content p {
                  margin: 0 0 10px 0;
                  color: #4a5568;
                  font-size: 0.9em;
                  line-height: 1.5;
                }
                .item-actions {
                  margin-top: 10px;
                }
                .btn {
                  padding: 8px 16px;
                  border: none;
                  border-radius: 6px;
                  cursor: pointer;
                  font-size: 14px;
                  font-weight: 500;
                  transition: all 0.2s ease;
                }
                .btn-primary {
                  background: #3182ce;
                  color: white;
                }
                .btn-primary:hover {
                  background: #2c5aa0;
                }
                .btn-secondary {
                  background: #718096;
                  color: white;
                }
                .btn-secondary:hover {
                  background: #4a5568;
                }
                .btn-sm {
                  padding: 6px 12px;
                  font-size: 12px;
                }
                h1 {
                  text-align: center;
                  color: #1a202c;
                  margin-bottom: 10px;
                }
                .subtitle {
                  text-align: center;
                  color: #4a5568;
                  margin-bottom: 30px;
                  font-style: italic;
                }
                .section-title {
                  color: #2b6cb0;
                  border-bottom: 2px solid #2b6cb0;
                  padding-bottom: 5px;
                  margin-bottom: 20px;
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
                className: 'demo-container',
                children: [
                  { h1: { text: 'Performance Testing Demo' } },
                  { p: { 
                    text: 'This demo showcases performance testing patterns for rendering large component trees efficiently in Coherent.js.',
                    className: 'subtitle'
                  }},
                  
                  {
                    div: {
                      className: 'demo-section',
                      children: [
                        { h2: { text: 'Performance Controls', className: 'section-title' } },
                        { p: { text: 'Use these controls to test rendering performance with different numbers of components.' } },
                        PerformanceControls()
                      ]
                    }
                  },
                  
                  {
                    div: {
                      className: 'demo-section',
                      children: [
                        { h2: { text: 'Performance Grid', className: 'section-title' } },
                        { p: { text: 'A grid of components to test rendering performance. Each item contains multiple nested elements and interactive controls.' } },
                        PerformanceTestGrid({ itemCount: 50, showMetrics: true })
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

// Export the demo page as default for live preview
export default performanceDemo;
