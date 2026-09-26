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
import { render } from '@coherent.js/core';
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
  
  const html = render(component);
  
  res.writeHead(200, { 'Content-Type': 'text/html' });
  res.end(`<!DOCTYPE html>${html}`);
});

server.listen(3000, () => {
  console.log('SSR Server running on http://localhost:3000');
});
```

### Handling Render Errors

`render()` is synchronous. If a component throws, `render()` throws a `RenderingError` naming the component's path (the original error is its `cause`), so you can answer with a 500 instead of a half-rendered page:

```javascript
import { render } from '@coherent.js/core';
import http from 'node:http';

const server = http.createServer(async (req, res) => {
  try {
    const user = await loadUser(req);                 // await data first
    const html = render(HomePage({ title: 'My App', user }));

    res.writeHead(200, { 'Content-Type': 'text/html; charset=utf-8' });
    res.end(`<!DOCTYPE html>${html}`);
  } catch (error) {
    console.error('SSR Error:', error);
    res.writeHead(500, { 'Content-Type': 'text/plain' });
    res.end('Internal Server Error');
  }
});
```

To keep rendering when one component fails, pass `onError`; its return value is rendered in place of the component (`null` leaves it out):

```javascript
const html = render(Page(data), {
  onError: (error, { path }) => {
    console.error(`Component at ${path} failed`, error);
    return { p: { className: 'unavailable', text: 'This section is unavailable.' } };
  }
});
```

## Complete HTML Document Structure

### Full Page Component

```javascript
const DocumentLayout = ({ title, description, head = [], children, scripts = [], styles = [] }) => ({
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
          }},

          // Page-specific head elements
          ...head
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
    head: [
      // OpenGraph
      { meta: { property: 'og:title', content: post.title } },
      { meta: { property: 'og:description', content: post.excerpt } },
      { meta: { property: 'og:image', content: post.featuredImage } },
      { meta: { property: 'og:url', content: fullUrl } },
      { meta: { property: 'og:type', content: 'article' } },

      // Twitter Card
      { meta: { name: 'twitter:card', content: 'summary_large_image' } },
      { meta: { name: 'twitter:title', content: post.title } }
    ],
    children: [
      { article: {
        children: [
          { h1: { text: post.title } },
          { time: { datetime: post.publishedAt, text: new Date(post.publishedAt).toLocaleDateString() } },
          // `html` is inserted as-is: only use it for content you have sanitized
          { div: { className: 'content', html: post.contentHtml } }
        ]
      }}
    ],
    styles: ['/css/blog.css'],
    scripts: ['/js/blog.js']
  });
};
```

`generateMeta()` from `@coherent.js/seo` builds the title, description, Open Graph and Twitter tags in one call (see [SEO](../packages/seo.md)).

## Data Fetching for SSR

### Async Data Loading

Load everything a page needs, then render synchronously:

```javascript
import { render } from '@coherent.js/core';
import { createDatabaseManager, executeQuery } from '@coherent.js/database';

const db = createDatabaseManager({ type: 'postgresql', host: 'localhost', database: 'blog' });
await db.connect();

async function renderBlogPost(slug) {
  const { rows: [post] } = await executeQuery(db, {
    table: 'posts',
    where: { slug, published: true },
    limit: 1
  });
  if (!post) return null;

  const { rows: comments } = await executeQuery(db, {
    table: 'comments',
    select: ['id', 'author', 'content', 'created_at'],
    where: { post_id: post.id, approved: true },
    orderBy: { created_at: 'ASC' }
  });

  return render(BlogPostWithComments({ post, comments }));
}

const server = http.createServer(async (req, res) => {
  const url = new URL(req.url, 'http://localhost');
  if (!url.pathname.startsWith('/posts/')) {
    res.writeHead(404).end();
    return;
  }

  try {
    const html = await renderBlogPost(url.pathname.slice('/posts/'.length));
    res.writeHead(html ? 200 : 404, { 'Content-Type': 'text/html; charset=utf-8' });
    res.end(html ? `<!DOCTYPE html>${html}` : '<!DOCTYPE html><h1>Post not found</h1>');
  } catch (error) {
    console.error(error);
    res.writeHead(500).end('Internal Server Error');
  }
});
```

An `async` component, or any Promise left in the tree, makes `render()` throw (`Cannot render a Promise at <path>`).

### Caching SSR Results

```javascript
import { render } from '@coherent.js/core';

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
    return render(component);
  });
}
```

## Streaming SSR

### Streaming Large Pages

`renderToStream()` is an async generator of HTML chunks with exactly `render()`'s output. The event loop gets a turn after every chunk, so the first bytes of a large page leave early and other requests keep being served:

```javascript
import http from 'node:http';
import { Readable } from 'node:stream';
import { renderToStream, streamingUtils } from '@coherent.js/core';

// Component with large content
const LargePage = ({ products = [] }) => ({
  html: {
    children: [
      { head: { children: [{ title: { text: 'Product Catalog' } }] } },
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

const server = http.createServer(async (req, res) => {
  if (req.url !== '/products') {
    res.writeHead(404).end();
    return;
  }

  const products = await fetchAllProducts(); // load data before streaming
  res.writeHead(200, { 'Content-Type': 'text/html; charset=utf-8' });
  res.write('<!DOCTYPE html>');

  try {
    // Writes with backpressure
    await streamingUtils.streamToResponse(renderToStream(LargePage({ products }), { chunkSize: 16384 }), res);
  } catch (error) {
    // The status line is already sent, so the response is aborted instead of
    // ending as a truncated 200
    console.error('Streaming failed:', error);
  }
});

// Or pipe it:
// Readable.from(renderToStream(LargePage({ products }))).pipe(res);
```

Errors propagate out of the iteration (and `onError` works as in `render()`). Streaming trades total render time for time-to-first-byte; for small pages `render()` is faster. When you use the SSR context API of `@coherent.js/state`, wrap a streaming render in `runWithContext()`.

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

A function component that throws makes `render()` throw. Handle failures where you can do something useful:

```javascript
import { render, createErrorBoundary } from '@coherent.js/core';

// 1. Wrap a component that may fail
const SafeRecommendations = createErrorBoundary({
  fallback: { p: { text: 'Recommendations are unavailable right now.' } },
  onError: (error) => console.error('Recommendations failed:', error)
})(Recommendations);

const Page = (data) => ({
  main: {
    children: [
      Article(data.article),
      SafeRecommendations(data)
    ]
  }
});

// 2. Or decide for every component at render time
const html = render(Page(data), {
  onError: (error, { path }) => (process.env.NODE_ENV === 'development'
    ? { pre: { text: `${path}: ${error.stack}` } }
    : null)
});
```

On the server, a boundary starts from a clean state on every call, so one failed request does not make later requests render the fallback.

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

### Rendering options for production

```javascript
import { render } from '@coherent.js/core';

const html = render(component, { minify: true, maxDepth: 100 });
```

- **`minify`**: reduces HTML size; check the output if you rely on whitespace.
- **`maxDepth`** (default 100): a guard against accidentally deep trees.
- **Caching is off by default.** `enableCache: true` stores whole renders keyed on the complete component tree; it only pays off when identical trees are rendered again, and trees containing functions are never cached. Give it its own bounded cache:

```javascript
import { render, createCacheManager } from '@coherent.js/core';

const pageCache = createCacheManager({ maxCacheSize: 500, ttlMs: 5 * 60 * 1000 });
const html = render(StaticPage(), { enableCache: true, cache: pageCache });
```

`cacheSize` is deprecated and ignored. For expensive components rendered with the same props, `memo()` is usually the better tool.

### Memoizing Static Components

```javascript
import { memo } from '@coherent.js/core';

// Memoize static components to avoid re-rendering
const Header = memo(() => ({
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
          Header(), // Memoized - only rendered once
          { main: { children: content } }
        ]
      }}
    ]
  }
});
```

### Monitoring

```javascript
import { render, performanceMonitor } from '@coherent.js/core';

const html = render(component, { enableMonitoring: true });

setInterval(() => {
  const { metrics } = performanceMonitor.generateReport();
  console.log('SSR stats:', {
    avgRenderMs: metrics.renderTime.avg,
    heapMB: Math.round(process.memoryUsage().heapUsed / 1024 / 1024)
  });
}, 60_000).unref();
```

A cache from `createCacheManager()` is bounded by `maxCacheSize` and `maxMemoryMB`; call `pageCache.clear()` to drop it.

## SEO Optimization

### Structured Data

Use `@coherent.js/seo` rather than `JSON.stringify` into a script: it escapes `<`, `>` and `&` so no value can close the `<script>` element.

```javascript
import { generateStructuredData } from '@coherent.js/seo';

const ProductPage = ({ product }) => ({
  html: {
    children: [
      { head: {
        children: [
          { title: { text: `${product.name} | My Store` } },
          { meta: { name: 'description', content: product.description } },
          generateStructuredData('product', {
            name: product.name,
            description: product.description,
            image: product.images,
            offers: {
              price: product.price,
              currency: 'USD',
              availability: product.inStock ? 'https://schema.org/InStock' : 'https://schema.org/OutOfStock'
            }
          })
        ]
      }},
      { body: {
        children: [
          { h1: { text: product.name } },
          { img: { src: product.images[0], alt: product.name } },
          { p: { text: product.description } }
        ]
      }}
    ]
  }
});
```

### Sitemap Generation

```javascript
import { generateSitemap } from '@coherent.js/seo';
import { executeQuery } from '@coherent.js/database';

async function sitemapXml(db) {
  const { rows: pages } = await executeQuery(db, {
    table: 'pages',
    select: ['slug', 'updated_at'],
    where: { published: true }
  });

  return generateSitemap(
    pages.map((page) => ({
      url: `/${page.slug}`,
      lastmod: new Date(page.updated_at).toISOString().slice(0, 10),
      changefreq: 'weekly',
      priority: 0.8
    })),
    { hostname: 'https://mysite.com' }
  );
}

app.get('/sitemap.xml', async (req, res) => {
  res.type('application/xml').send(await sitemapXml(db));
});
```

## Next Steps

- [Express Integration](../deployment/integrations.md) - Use with Express.js
- [Client-Side Hydration](../client/hydration.md) - Add interactivity
- [Performance Optimization](../deployment/performance.md) - Advanced performance techniques
