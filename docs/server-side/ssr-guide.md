# Server-Side Rendering (SSR) Guide

Learn how to implement server-side rendering with Coherent.js for fast initial page loads and SEO-friendly applications.

## Why Server-Side Rendering?

Server-side rendering provides several benefits:

- **Fast Initial Load**: HTML is rendered on the server, reducing time-to-first-paint
- **SEO Friendly**: Search engines can crawl fully-rendered HTML
- **Progressive Enhancement**: Works even with JavaScript disabled
- **Better Performance**: Reduced client-side computation
- **Social Media**: Meta tags and OpenGraph work correctly

## Basic SSR Setup

### Simple Server-Side Rendering

```javascript
import { renderToString } from '@coherentjs/core';
import http from 'http';

// Define your component
const HomePage = ({ title, user }) => ({
  html: {
    children: [
      { head: {
        children: [
          { title: { text: title } },
          { meta: { charset: 'utf-8' } },
          { meta: { name: 'viewport', content: 'width=device-width, initial-scale=1' } }
        ]
      }},
      { body: {
        children: [
          { h1: { text: `Welcome, ${user.name}!` } },
          { p: { text: 'This page was rendered on the server.' } }
        ]
      }}
    ]
  }
});

// HTTP server
const server = http.createServer((req, res) => {
  const component = HomePage({ 
    title: 'My SSR App',
    user: { name: 'John Doe' }
  });
  
  const html = renderToString(component);
  
  res.writeHead(200, { 'Content-Type': 'text/html' });
  res.end(`<!DOCTYPE html>${html}`);
});

server.listen(3000, () => {
  console.log('SSR Server running on http://localhost:3000');
});
```

### Using Coherent Factory

```javascript
import { createCoherent } from '@coherentjs/core';
import http from 'http';

// Create Coherent instance with SSR optimizations
const coherent = createCoherent({
  enableCache: true,        // Cache rendered components
  enableMonitoring: true,   // Monitor performance
  minify: true             // Minify output HTML
});

const server = http.createServer((req, res) => {
  try {
    const component = HomePage({ title: 'My App', user: { name: 'User' } });
    const html = coherent.render(component);
    
    res.writeHead(200, { 'Content-Type': 'text/html' });
    res.end(`<!DOCTYPE html>${html}`);
    
  } catch (error) {
    console.error('SSR Error:', error);
    res.writeHead(500, { 'Content-Type': 'text/plain' });
    res.end('Internal Server Error');
  }
});
```

## Complete HTML Document Structure

### Full Page Component

```javascript
const DocumentLayout = ({ title, description, children, scripts = [], styles = [] }) => ({
  html: {
    lang: 'en',
    children: [
      { head: {
        children: [
          { meta: { charset: 'utf-8' } },
          { meta: { name: 'viewport', content: 'width=device-width, initial-scale=1' } },
          { title: { text: title } },
          { meta: { name: 'description', content: description } },
          
          // CSS files
          ...styles.map(href => ({
            link: { rel: 'stylesheet', href }
          })),
          
          // Inline critical CSS
          { style: {
            text: `
              body { font-family: Arial, sans-serif; margin: 0; padding: 20px; }
              .container { max-width: 1200px; margin: 0 auto; }
            `
          }}
        ]
      }},
      { body: {
        children: [
          { div: {
            className: 'container',
            children: Array.isArray(children) ? children : [children]
          }},
          
          // JavaScript files
          ...scripts.map(src => ({
            script: { src, defer: true }
          }))
        ]
      }}
    ]
  }
});
```

### Dynamic Meta Tags

```javascript
const BlogPost = ({ post, baseUrl }) => {
  const fullUrl = `${baseUrl}/posts/${post.slug}`;
  
  return DocumentLayout({
    title: `${post.title} | My Blog`,
    description: post.excerpt,
    children: [
      // OpenGraph meta tags
      { meta: { property: 'og:title', content: post.title } },
      { meta: { property: 'og:description', content: post.excerpt } },
      { meta: { property: 'og:image', content: post.featuredImage } },
      { meta: { property: 'og:url', content: fullUrl } },
      { meta: { property: 'og:type', content: 'article' } },
      
      // Twitter Card
      { meta: { name: 'twitter:card', content: 'summary_large_image' } },
      { meta: { name: 'twitter:title', content: post.title } },
      { meta: { name: 'twitter:description', content: post.excerpt } },
      { meta: { name: 'twitter:image', content: post.featuredImage } },
      
      // Article content
      { article: {
        children: [
          { h1: { text: post.title } },
          { time: { datetime: post.publishedAt, text: new Date(post.publishedAt).toLocaleDateString() } },
          { div: { className: 'content', html: post.content } }
        ]
      }}
    ],
    styles: ['/css/blog.css'],
    scripts: ['/js/blog.js']
  });
};
```

## Data Fetching for SSR

### Async Data Loading

```javascript
import { createDatabaseManager, createQuery, executeQuery } from '@coherentjs/core';

const db = createDatabaseManager({
  type: 'postgresql',
  host: 'localhost',
  database: 'blog'
});

async function renderBlogPost(slug) {
  // Fetch post data
  const postQuery = createQuery({
    table: 'posts',
    select: ['*'],
    where: { slug, published: true }
  });
  
  const [post] = await executeQuery(postQuery, db);
  
  if (!post) {
    throw new Error('Post not found');
  }
  
  // Fetch related comments
  const commentsQuery = createQuery({
    table: 'comments',
    select: ['id', 'author', 'content', 'created_at'],
    where: { post_id: post.id, approved: true },
    orderBy: [{ column: 'created_at', direction: 'ASC' }]
  });
  
  const comments = await executeQuery(commentsQuery, db);
  
  // Render component with data
  const component = BlogPostWithComments({ post, comments });
  return renderToString(component);
}

// Usage in server
const server = http.createServer(async (req, res) => {
  const url = new URL(req.url, `http://${req.headers.host}`);
  
  if (url.pathname.startsWith('/posts/')) {
    try {
      const slug = url.pathname.split('/posts/')[1];
      const html = await renderBlogPost(slug);
      
      res.writeHead(200, { 'Content-Type': 'text/html' });
      res.end(`<!DOCTYPE html>${html}`);
    } catch (error) {
      res.writeHead(404, { 'Content-Type': 'text/html' });
      res.end('<!DOCTYPE html><html><body><h1>Post not found</h1></body></html>');
    }
  }
});
```

### Caching SSR Results

```javascript
import { createCoherent } from '@coherentjs/core';

const coherent = createCoherent({
  enableCache: true,
  cacheSize: 1000,
  cacheTTL: 300000 // 5 minutes
});

// Simple in-memory cache for rendered pages
const pageCache = new Map();

async function renderWithCache(cacheKey, renderFunction) {
  // Check cache first
  if (pageCache.has(cacheKey)) {
    const cached = pageCache.get(cacheKey);
    if (Date.now() - cached.timestamp < 300000) { // 5 minutes
      return cached.html;
    }
    pageCache.delete(cacheKey);
  }
  
  // Render and cache
  const html = await renderFunction();
  pageCache.set(cacheKey, {
    html,
    timestamp: Date.now()
  });
  
  return html;
}

// Usage
async function handleBlogPost(slug) {
  return renderWithCache(`post:${slug}`, async () => {
    const postData = await fetchPostData(slug);
    const component = BlogPost(postData);
    return coherent.render(component);
  });
}
```

## Streaming SSR

### Streaming Large Pages

```javascript
import { createStreamingRenderer } from '@coherentjs/core';

const streamRenderer = createStreamingRenderer({
  enableChunking: true,
  chunkSize: 1024
});

// Component with large content
const LargePage = ({ products = [] }) => ({
  html: {
    children: [
      { head: {
        children: [
          { title: { text: 'Product Catalog' } }
        ]
      }},
      { body: {
        children: [
          { h1: { text: 'Our Products' } },
          { div: {
            className: 'products-grid',
            children: products.map(product => ({
              div: {
                className: 'product-card',
                children: [
                  { h3: { text: product.name } },
                  { p: { text: product.description } },
                  { span: { text: `$${product.price}` } }
                ]
              }
            }))
          }}
        ]
      }}
    ]
  }
});

// Stream response
const server = http.createServer(async (req, res) => {
  if (req.url === '/products') {
    try {
      const products = await fetchAllProducts(); // Large dataset
      const component = LargePage({ products });
      
      res.writeHead(200, { 
        'Content-Type': 'text/html',
        'Transfer-Encoding': 'chunked'
      });
      
      res.write('<!DOCTYPE html>');
      
      for await (const chunk of streamRenderer.stream(component)) {
        res.write(chunk);
      }
      
      res.end();
    } catch (error) {
      console.error('Streaming error:', error);
      res.writeHead(500).end('Error');
    }
  }
});
```

### Progressive Content Loading

```javascript
const ProgressivePage = ({ initialData, loadingPlaceholders }) => ({
  html: {
    children: [
      { head: {
        children: [
          { title: { text: 'Dashboard' } },
          { script: {
            text: `
              // Client-side loading script
              async function loadSection(sectionId, url) {
                const element = document.getElementById(sectionId);
                try {
                  const response = await fetch(url);
                  const html = await response.text();
                  element.innerHTML = html;
                } catch (error) {
                  element.innerHTML = '<p>Error loading content</p>';
                }
              }
              
              // Load sections when page is ready
              document.addEventListener('DOMContentLoaded', () => {
                loadSection('analytics', '/api/sections/analytics');
                loadSection('recent-activity', '/api/sections/activity');
              });
            `
          }}
        ]
      }},
      { body: {
        children: [
          { h1: { text: 'Dashboard' } },
          
          // Immediately available content
          { section: {
            children: [
              { h2: { text: 'Overview' } },
              { p: { text: `Welcome back, ${initialData.user.name}!` } }
            ]
          }},
          
          // Placeholder for lazy-loaded content
          { section: {
            id: 'analytics',
            className: 'loading',
            children: [
              { div: { className: 'spinner' } },
              { p: { text: 'Loading analytics...' } }
            ]
          }},
          
          { section: {
            id: 'recent-activity',
            className: 'loading',
            children: [
              { div: { className: 'spinner' } },
              { p: { text: 'Loading recent activity...' } }
            ]
          }}
        ]
      }}
    ]
  }
});
```

## Error Handling in SSR

### Error Boundaries

```javascript
const ErrorBoundary = ({ error, children }) => {
  if (error) {
    return {
      div: {
        className: 'error-boundary',
        children: [
          { h2: { text: 'Something went wrong' } },
          { p: { text: 'Please try refreshing the page.' } },
          process.env.NODE_ENV === 'development' ? {
            details: {
              children: [
                { summary: { text: 'Error Details' } },
                { pre: { text: error.stack } }
              ]
            }
          } : null
        ].filter(Boolean)
      }
    };
  }
  
  return children;
};

// Usage in server
const server = http.createServer(async (req, res) => {
  try {
    const data = await fetchPageData(req.url);
    const component = ErrorBoundary({
      children: PageComponent(data)
    });
    
    const html = coherent.render(component);
    res.writeHead(200, { 'Content-Type': 'text/html' });
    res.end(`<!DOCTYPE html>${html}`);
    
  } catch (error) {
    console.error('SSR Error:', error);
    
    const errorComponent = ErrorBoundary({
      error,
      children: null
    });
    
    const html = coherent.render(errorComponent);
    res.writeHead(500, { 'Content-Type': 'text/html' });
    res.end(`<!DOCTYPE html>${html}`);
  }
});
```

### Graceful Degradation

```javascript
const RobustComponent = ({ data, fallback }) => {
  try {
    // Validate required data
    if (!data || !data.items || !Array.isArray(data.items)) {
      throw new Error('Invalid data structure');
    }
    
    return {
      div: {
        className: 'content',
        children: data.items.map(item => ({
          div: {
            className: 'item',
            children: [
              { h3: { text: item.title || 'Untitled' } },
              { p: { text: item.description || 'No description available' } }
            ]
          }
        }))
      }
    };
    
  } catch (error) {
    console.warn('Component rendering failed, using fallback:', error.message);
    
    return fallback || {
      div: {
        className: 'fallback-content',
        children: [
          { p: { text: 'Content temporarily unavailable' } }
        ]
      }
    };
  }
};
```

## Performance Optimization

### Component Precompilation

```javascript
import { precompileComponent } from '@coherentjs/core';

// Precompile static components
const precompiledHeader = precompileComponent({
  header: {
    children: [
      { h1: { text: 'My Website' } },
      { nav: {
        children: [
          { a: { href: '/', text: 'Home' } },
          { a: { href: '/about', text: 'About' } },
          { a: { href: '/contact', text: 'Contact' } }
        ]
      }}
    ]
  }
});

// Use in pages
const HomePage = ({ content }) => ({
  html: {
    children: [
      { head: { children: [{ title: { text: 'Home' } }] }},
      { body: {
        children: [
          precompiledHeader, // Pre-rendered HTML
          { main: { children: content } }
        ]
      }}
    ]
  }
});
```

### Memory Usage Optimization

```javascript
import { createCoherent, performanceMonitor } from '@coherentjs/core';

const coherent = createCoherent({
  enableCache: true,
  cacheSize: 500,  // Limit cache size
  enableMonitoring: true
});

// Monitor memory usage
setInterval(() => {
  const stats = coherent.getPerformanceStats();
  const memUsage = process.memoryUsage();
  
  console.log('SSR Performance Stats:', {
    renderTime: stats.monitor.avgRenderTime,
    cacheHitRate: stats.cache.hitRate,
    memoryUsage: `${Math.round(memUsage.heapUsed / 1024 / 1024)}MB`
  });
  
  // Clear cache if memory usage is high
  if (memUsage.heapUsed > 500 * 1024 * 1024) { // 500MB
    coherent.clearCache();
    console.log('Cache cleared due to high memory usage');
  }
}, 60000); // Every minute
```

## SEO Optimization

### Structured Data

```javascript
const ProductPage = ({ product }) => ({
  html: {
    children: [
      { head: {
        children: [
          { title: { text: `${product.name} | My Store` } },
          { meta: { name: 'description', content: product.description } },
          
          // Structured data for SEO
          { script: {
            type: 'application/ld+json',
            text: JSON.stringify({
              '@context': 'https://schema.org',
              '@type': 'Product',
              name: product.name,
              description: product.description,
              image: product.images,
              offers: {
                '@type': 'Offer',
                price: product.price,
                priceCurrency: 'USD',
                availability: product.inStock ? 'https://schema.org/InStock' : 'https://schema.org/OutOfStock'
              }
            })
          }}
        ]
      }},
      { body: {
        children: [
          { h1: { text: product.name } },
          { img: { src: product.images[0], alt: product.name } },
          { p: { text: product.description } },
          { span: { text: `$${product.price}` } }
        ]
      }}
    ]
  }
});
```

### Sitemap Generation

```javascript
import { createQuery, executeQuery, createDatabaseManager } from 'coherent-js';

const db = createDatabaseManager({ type: 'postgresql', database: 'mysite' });

async function generateSitemap() {
  // Get all pages
  const pagesQuery = createQuery({
    table: 'pages',
    select: ['slug', 'updated_at'],
    where: { published: true }
  });
  
  const pages = await executeQuery(pagesQuery, db);
  
  // Generate sitemap XML
  const sitemap = {
    urlset: {
      xmlns: 'http://www.sitemaps.org/schemas/sitemap/0.9',
      children: pages.map(page => ({
        url: {
          children: [
            { loc: { text: `https://mysite.com/${page.slug}` } },
            { lastmod: { text: page.updated_at.toISOString().split('T')[0] } },
            { changefreq: { text: 'weekly' } },
            { priority: { text: '0.8' } }
          ]
        }
      }))
    }
  };
  
  return renderToString(sitemap);
}
```

## Next Steps

- [Express Integration](./express-integration.md) - Use with Express.js
- [Client-Side Hydration](../client-side/hydration.md) - Add interactivity
- [Performance Optimization](../performance/optimization.md) - Advanced performance techniques