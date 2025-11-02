/**
 * Streaming Rendering Examples
 * Demonstrates streaming capabilities for large datasets and real-time updates
 */

import { render } from '../packages/core/src/index.js';

// Note: Streaming renderer is a separate feature - using render for now
// For true streaming, use the streaming-renderer package when available

// Large list component optimized for streaming
const StreamingList = ({ itemCount = 100, title = 'Streaming List' }) => ({
  div: {
    class: 'streaming-list',
    children: [
      { h4: { text: title } },
      { p: { text: `${itemCount} items rendered progressively` } },
      {
        div: {
          class: 'list-container',
          children: Array.from({ length: itemCount }, (_, i) => ({
            div: {
              key: i,
              class: 'list-item',
              children: [
                { span: { text: `Item ${i + 1}` } },
                { small: { text: ` (Batch ${Math.floor(i / 10) + 1})` } }
              ]
            }
          }))
        }
      }
    ]
  }
});

// Streaming data table component
const StreamingDataTable = ({ rows = [], showProgress = false }) => ({
  div: {
    class: 'streaming-table-container',
    children: [
      { h4: { text: 'Data Table Streaming' } },
      showProgress && {
        div: {
          class: 'progress-info',
          children: [
            { p: { text: `Streaming ${rows.length} records` } },
            { div: { class: 'progress-bar', text: '████████████ 100%' } }
          ]
        }
      },
      {
        table: {
          class: 'streaming-table',
          children: [
            {
              thead: {
                children: [{
                  tr: {
                    children: [
                      { th: { text: 'ID' } },
                      { th: { text: 'Name' } },
                      { th: { text: 'Department' } },
                      { th: { text: 'Status' } }
                    ]
                  }
                }]
              }
            },
            {
              tbody: {
                children: rows.map(row => ({
                  tr: {
                    key: row.id,
                    class: row.status === 'active' ? 'active-row' : '',
                    children: [
                      { td: { text: row.id } },
                      { td: { text: row.name } },
                      { td: { text: row.department } },
                      { td: { text: row.status, class: `status-${row.status}` } }
                    ]
                  }
                }))
              }
            }
          ]
        }
      }
    ].filter(Boolean)
  }
});

// Progressive content streaming component
const ProgressiveContent = ({ sections = [] }) => ({
  div: {
    class: 'progressive-content',
    children: [
      { h4: { text: 'Progressive Content Streaming' } },
      { p: { text: 'Content sections loaded incrementally' } },
      ...sections.map((section, index) => ({
        div: {
          key: index,
          class: `content-section section-${index}`,
          children: [
            { h5: { text: section.title } },
            { p: { text: section.content } },
            section.highlight && {
              div: {
                class: 'highlight',
                text: section.highlight
              }
            }
          ].filter(Boolean)
        }
      }))
    ]
  }
});

// Generate sample data for streaming demos
const generateStreamingData = (count = 50) => 
  Array.from({ length: count }, (_, i) => ({
    id: i + 1,
    name: `Employee ${i + 1}`,
    department: ['Engineering', 'Marketing', 'Sales', 'Support'][i % 4],
    status: ['active', 'pending', 'inactive'][i % 3]
  }));

// Generate progressive content sections
const generateContentSections = () => [
  {
    title: 'Introduction',
    content: 'This section introduces the streaming capabilities of Coherent.js.',
    highlight: 'Streams render content progressively for better performance.'
  },
  {
    title: 'Benefits',
    content: 'Streaming provides improved perceived performance and reduced memory usage.',
    highlight: 'Large datasets can be processed without blocking the main thread.'
  },
  {
    title: 'Implementation',
    content: 'Use renderToStream() to enable streaming for any component.',
    highlight: 'Works seamlessly with existing component architecture.'
  }
];

// Real-time streaming feed component
const StreamingFeed = ({ items = [], isLive = false }) => ({
  div: {
    class: 'streaming-feed',
    children: [
      { h4: { text: '📡 Live Data Stream' } },
      {
        div: {
          class: 'feed-status',
          children: [
            { span: { text: isLive ? '🟢 Live' : '🔴 Offline', class: 'status-indicator' } },
            { span: { text: `${items.length} items` } }
          ]
        }
      },
      {
        div: {
          class: 'feed-container',
          children: items.map(item => ({
            div: {
              key: item.id,
              class: 'feed-item',
              children: [
                { h6: { text: item.title } },
                { p: { text: item.content } },
                { small: { text: `${item.timestamp}ms ago` } }
              ]
            }
          }))
        }
      }
    ]
  }
});

// Streaming utilities
const createStreamingDemo = async (component, options = {}) => {
  const { delay = 0 } = options;
  const stream = renderToStream(component);
  const chunks = [];
  
  for await (const chunk of stream) {
    chunks.push(chunk);
    if (delay > 0) {
      await new Promise(resolve => setTimeout(resolve, delay));
    }
  }
  
  return {
    totalChunks: chunks.length,
    totalSize: chunks.join('').length,
    averageChunkSize: chunks.reduce((sum, chunk) => sum + chunk.length, 0) / chunks.length
  };
};

// Streaming demo component
const StreamingDemo = () => {
  const styles = `
    .demo { max-width: 1200px; margin: 0 auto; padding: 20px; font-family: system-ui, sans-serif; }
    .demo h2 { color: #333; border-bottom: 2px solid #667eea; padding-bottom: 10px; }
    .demo .section { margin: 30px 0; padding: 20px; background: #f8f9fa; border-radius: 8px; }
    .demo .grid { display: grid; grid-template-columns: repeat(auto-fit, minmax(400px, 1fr)); gap: 20px; }
    .streaming-list, .streaming-table-container, .progressive-content, .streaming-feed { 
      background: white; padding: 15px; border-radius: 5px; border: 1px solid #ddd; 
      height: 100%;
    }
    .list-container { max-height: 200px; overflow-y: auto; }
    .list-item { padding: 5px; border-bottom: 1px solid #eee; }
    .streaming-table { width: 100%; border-collapse: collapse; font-size: 0.9em; }
    .streaming-table th, .streaming-table td { border: 1px solid #ddd; padding: 6px; text-align: left; }
    .streaming-table th { background: #f8f9fa; }
    .active-row { background: #d4edda; }
    .status-active { color: #155724; }
    .status-pending { color: #856404; }
    .status-inactive { color: #721c24; }
    .progress-info { margin-bottom: 10px; }
    .progress-bar { background: #e9ecef; padding: 5px; border-radius: 3px; font-family: monospace; }
    .content-section { margin: 15px 0; padding: 10px; border-left: 3px solid #667eea; }
    .highlight { background: #fff3cd; padding: 8px; border-radius: 3px; margin-top: 5px; font-style: italic; }
    .feed-status { margin-bottom: 10px; }
    .status-indicator { margin-right: 10px; }
    .feed-item { margin: 10px 0; padding: 10px; background: #f8f9fa; border-radius: 3px; }
    .api-example { background: #e3f2fd; padding: 15px; border-radius: 5px; margin: 20px 0; }
    .api-example pre { background: #263238; color: #eee; padding: 10px; border-radius: 3px; overflow-x: auto; }
  `;
  
  const sampleData = generateStreamingData(25);
  const contentSections = generateContentSections();
  const feedItems = [
    { id: 1, title: 'System Update', content: 'New streaming features deployed', timestamp: 1200 },
    { id: 2, title: 'Performance Alert', content: 'Render time improved by 40%', timestamp: 800 },
    { id: 3, title: 'Cache Status', content: 'Cache hit rate: 95%', timestamp: 400 }
  ];
  
  return {
    html: {
      children: [
        {
          head: {
            children: [
              { title: { text: 'Streaming Rendering Demo' } },
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
                    { h2: { text: '🌊 Streaming Rendering in Coherent.js' } },
                    {
                      div: {
                        class: 'section',
                        children: [
                          { h3: { text: 'Live Streaming Examples' } },
                          { p: { text: 'These components demonstrate progressive rendering and real-time data streaming:' } },
                          {
                            div: {
                              class: 'grid',
                              children: [
                                StreamingList({ itemCount: 1000, title: 'Progressive List' }),
                                StreamingDataTable({ rows: sampleData.slice(0, 15), showProgress: true })
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
                          { h3: { text: 'Content & Data Streams' } },
                          {
                            div: {
                              class: 'grid',
                              children: [
                                ProgressiveContent({ sections: contentSections }),
                                StreamingFeed({ items: feedItems, isLive: true })
                              ]
                            }
                          }
                        ]
                      }
                    },
                    {
                      div: {
                        class: 'api-example',
                        children: [
                          { h3: { text: '🔧 Streaming API Usage' } },
                          {
                            ul: {
                              children: [
                                { li: { text: 'Use renderToStream() for progressive rendering' } },
                                { li: { text: 'Automatic chunking for optimal performance' } },
                                { li: { text: 'Compatible with Express, Fastify, and Node.js HTTP' } },
                                { li: { text: 'Real-time updates with WebSocket integration' } }
                              ]
                            }
                          },
                          { h4: { text: 'Example Implementation:' } },
                          { pre: { text: `import { renderToStream } from '@coherent/core';

// Express route with streaming
app.get('/data', async (req, res) => {
  const stream = renderToStream(LargeDataComponent());
  
  res.setHeader('Transfer-Encoding', 'chunked');
  for await (const chunk of stream) {
    res.write(chunk);
  }
  res.end();
});` } }
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

export default StreamingDemo;
export { StreamingList, StreamingDataTable, ProgressiveContent, StreamingFeed, generateStreamingData, createStreamingDemo };
