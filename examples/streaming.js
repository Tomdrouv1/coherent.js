import { renderToStream, Component } from '../src/coherent.js';

// Example 1: Basic streaming example
const LargeListComponent = ({ itemCount = 1000 }) => ({
  div: {
    className: 'large-list',
    children: [
      { h1: { text: 'Large List Streaming Example' } },
      { p: { text: `Rendering ${itemCount} items with streaming` } },
      {
        ul: {
          children: Array.from({ length: itemCount }, (_, i) => ({
            li: {
              key: i,
              children: [
                { span: { text: `Item ${i + 1}` } },
                { small: { text: ` - Generated at ${new Date().toISOString()}` } }
              ]
            }
          }))
        }
      }
    ]
  }
});

// Example 2: Data table with streaming
const DataTableComponent = ({ rows = [] }) => ({
  div: {
    className: 'data-table-container',
    children: [
      { h1: { text: 'Data Table Streaming Example' } },
      {
        table: {
          className: 'data-table',
          children: [
            {
              thead: {
                children: [{
                  tr: {
                    children: [
                      { th: { text: 'ID' } },
                      { th: { text: 'Name' } },
                      { th: { text: 'Email' } },
                      { th: { text: 'Status' } },
                      { th: { text: 'Created' } }
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
                    children: [
                      { td: { text: row.id } },
                      { td: { text: row.name } },
                      { td: { text: row.email } },
                      { 
                        td: { 
                          text: row.status,
                          className: `status ${row.status.toLowerCase()}`
                        } 
                      },
                      { td: { text: new Date(row.created).toLocaleDateString() } }
                    ]
                  }
                }))
              }
            }
          ]
        }
      }
    ]
  }
});

// Example 3: Progressive content loading
const ProgressiveContent = ({ sections = [] }) => ({
  div: {
    className: 'progressive-content',
    children: [
      { h1: { text: 'Progressive Content Loading' } },
      { p: { text: 'Content is streamed section by section' } },
      ...sections.map((section, index) => ({
        section: {
          key: index,
          id: `section-${index}`,
          children: [
            { h2: { text: section.title } },
            { p: { text: section.content } },
            section.image ? { img: { src: section.image, alt: section.title } } : null,
            { hr: {} }
          ].filter(Boolean)
        }
      }))
    ]
  }
});

// Generate sample data
const generateSampleData = (count) => 
  Array.from({ length: count }, (_, i) => ({
    id: i + 1,
    name: `User ${i + 1}`,
    email: `user${i + 1}@example.com`,
    status: i % 3 === 0 ? 'Active' : i % 3 === 1 ? 'Pending' : 'Inactive',
    created: new Date(Date.now() - Math.floor(Math.random() * 365) * 24 * 60 * 60 * 1000)
  }));

// Example 4: Streaming with real-time updates simulation
const RealTimeFeed = ({ initialItems = [] }) => ({
  div: {
    className: 'real-time-feed',
    children: [
      { h1: { text: 'Real-time Feed Simulation' } },
      { p: { text: 'Streaming feed updates as they arrive' } },
      {
        div: {
          className: 'feed',
          children: initialItems.map(item => ({
            div: {
              key: item.id,
              className: 'feed-item',
              children: [
                { h3: { text: item.title } },
                { p: { text: item.content } },
                { small: { text: new Date(item.timestamp).toLocaleTimeString() } }
              ]
            }
          }))
        }
      }
    ]
  }
});

// Demonstrate streaming
console.log('=== Streaming Examples ===\n');

// Example 1: Render large list with streaming
console.log('1. Large List Streaming (100 items):');
console.log('(Streaming output would be chunks of HTML as they are generated)\n');

// In a real server environment, you would use:
/*
const stream = renderToStream(LargeListComponent({ itemCount: 100 }));

stream.on('data', (chunk) => {
  response.write(chunk);
});

stream.on('end', () => {
  response.end();
});
*/

// Example 2: Data table streaming
console.log('2. Data Table Streaming:');
const sampleData = generateSampleData(50);
console.log('(Large data table would be streamed in chunks)\n');

// Example 3: Progressive content
console.log('3. Progressive Content Streaming:');
const contentSections = [
  {
    title: 'Introduction',
    content: 'This is the first section of content that would be streamed first.',
    image: '/images/intro.jpg'
  },
  {
    title: 'Main Content',
    content: 'This is the main content section that would be streamed after the introduction.',
    image: '/images/main.jpg'
  },
  {
    title: 'Conclusion',
    content: 'This is the final section that would be streamed last.',
    image: '/images/conclusion.jpg'
  }
];
console.log('(Content sections would be streamed progressively)\n');

// Example 4: Real-time feed
console.log('4. Real-time Feed Simulation:');
const feedItems = [
  {
    id: 1,
    title: 'First Update',
    content: 'This is the first item in the feed.',
    timestamp: Date.now() - 300000
  },
  {
    id: 2,
    title: 'Second Update',
    content: 'This is the second item in the feed.',
    timestamp: Date.now() - 120000
  }
];
console.log('(Feed items would be streamed as they become available)\n');

console.log('=== Streaming API Usage ===\n');

console.log('To use streaming in a server environment:\n');

console.log(`import { renderToStream } from 'coherent-framework';

// With Express.js
app.get('/streaming-page', async (req, res) => {
  const stream = renderToStream(LargeListComponent({ itemCount: 1000 }));
  
  res.setHeader('Content-Type', 'text/html; charset=utf-8');
  res.setHeader('Transfer-Encoding', 'chunked');
  
  for await (const chunk of stream) {
    res.write(chunk);
  }
  
  res.end();
});\n`);

console.log(`// With Node.js HTTP server
const http = require('http');

const server = http.createServer(async (req, res) => {
  if (req.url === '/stream') {
    res.writeHead(200, {
      'Content-Type': 'text/html; charset=utf-8',
      'Transfer-Encoding': 'chunked'
    });
    
    const stream = renderToStream(LargeListComponent({ itemCount: 1000 }));
    
    for await (const chunk of stream) {
      res.write(chunk);
    }
    
    res.end();
  }
});\n`);
