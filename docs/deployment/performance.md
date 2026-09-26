# Coherent.js Performance Guide

How to make Coherent.js pages fast in production: what the framework does for you, what is opt-in, and the server, client and infrastructure settings that usually matter more.

## 🚀 Overview

- `render()` is synchronous and does no caching unless you ask for it. On a typical machine a ~300-node page renders in about 0.2 ms (`pnpm perf:render` reproduces the numbers in the repository).
- `memo()` caches a component's output per props, `enableCache` caches whole renders, and `renderToStream()` sends large pages in chunks.
- Measure before optimizing: the framework's own time is usually small next to data loading, the network and the HTTP framework.

## 🏗️ Caching in Coherent.js

### 1. Component memoization

```javascript
import { memo } from '@coherent.js/core';

const ProductCard = memo(
  ({ product }) => ({ article: { className: 'product', text: product.name } }),
  { keyFn: ({ product }) => `${product.id}:${product.updatedAt}`, maxSize: 1000 }
);
```

Every memoized component has its own bounded LRU cache. By default the key is derived from the props (callbacks are identified by reference); a `keyFn` that uses an id and a version is cheaper and more precise. Strategies: `'lru'` (default), `'ttl'` (with `ttl` in ms), `'weak'` (keyed on the first argument's identity) and `'simple'`.

### 2. Whole-render cache

```javascript
import { render, createCacheManager } from '@coherent.js/core';

const pageCache = createCacheManager({ maxCacheSize: 500, ttlMs: 60_000 });

const html = render(AboutPage(), { enableCache: true, cache: pageCache });
```

- Off by default. When enabled, one entry is stored per whole render, keyed on the complete component tree, so it only helps when **identical trees** are rendered again.
- Trees containing functions, class instances or Dates are never cached.
- Without `cache`, a shared process-wide cache is used; pass your own to bound it (`maxCacheSize`, `maxMemoryMB`, `ttlMs`) and to `clear()` it.
- `cacheSize` is deprecated and ignored.

### 3. HTTP caching

For pages that are the same for every visitor, an HTTP cache (CDN, reverse proxy or `Cache-Control`) is more effective than any in-process cache:

```javascript
app.get('/about', (req, res) => {
  res.set('Cache-Control', 'public, max-age=300, s-maxage=3600');
  res.send(`<!DOCTYPE html>${render(AboutPage())}`);
});
```

`render()` output is deterministic — scoped CSS ids are derived from the CSS, and no random handler ids are emitted — so ETags work.

## ⚡ Rendering Techniques

### Load data before rendering

`render()` is synchronous; an async component or a Promise in the tree throws. Fetch in parallel, then render once:

```javascript
const [user, feed] = await Promise.all([loadUser(id), loadFeed(id)]);
const html = render(Dashboard({ user, feed }));
```

### Stream large pages

```javascript
import { renderToStream, streamingUtils } from '@coherent.js/core';

try {
  await streamingUtils.streamToResponse(renderToStream(LargePage({ rows })), res);
} catch (error) {
  console.error('Streaming failed:', error); // the response has been aborted
}
```

The event loop gets a turn after every chunk: the first bytes of a 10,000-row page leave after ~20 ms instead of ~80–100 ms, at the cost of a higher total render time. Small pages are faster with `render()`.

### Keep trees flat and small

- Paginate or virtualize long lists instead of rendering thousands of rows.
- Reuse layout components; build page-specific parts per request.
- Avoid deep wrapper chains: depth costs more than breadth.

### Monitor renders

```javascript
import { render, performanceMonitor } from '@coherent.js/core';

render(Page(data), { enableMonitoring: true });

const { renderTime } = performanceMonitor.generateReport().metrics;
console.log(renderTime.avg, renderTime.p95); // ms
```

Monitoring is off by default and costs a little per render; enable it where you need numbers.

## 🚀 Production Performance Optimization

### Server-Side Optimizations

#### 1. Keep-Alive

```javascript
import http from 'node:http';
import { render } from '@coherent.js/core';

const server = http.createServer({ keepAlive: true }, (req, res) => {
  const html = render(MyComponent(props));
  res.writeHead(200, { 'Content-Type': 'text/html; charset=utf-8' });
  res.end(`<!DOCTYPE html>${html}`);
});

// Keep these above your load balancer's idle timeout
server.keepAliveTimeout = 65_000;
server.headersTimeout = 66_000;
```

#### 2. Response Compression

```javascript
import express from 'express';
import compression from 'compression';
import { render } from '@coherent.js/core';

const app = express();

app.use(compression({ level: 6, threshold: 1024 }));

app.get('/', (req, res) => {
  res.setHeader('Cache-Control', 'public, max-age=300, s-maxage=3600');
  res.send(`<!DOCTYPE html>${render(PageComponent(props))}`);
});
```

If a reverse proxy already compresses responses (see the nginx example below), skip it in Node.

#### 3. Multiple Cores

Rendering is CPU work on the main thread. Run one process per core, with a process manager, a container orchestrator, or `node:cluster`:

```javascript
// cluster.js
import cluster from 'node:cluster';
import { availableParallelism } from 'node:os';

if (cluster.isPrimary) {
  for (let i = 0; i < availableParallelism(); i++) cluster.fork();
  cluster.on('exit', (worker) => {
    console.log(`Worker ${worker.process.pid} died, starting a new one`);
    cluster.fork();
  });
} else {
  await import('./app.js');
}
```

Set heap limits when starting Node (`node --max-old-space-size=2048 cluster.js`, or `NODE_OPTIONS=--max-old-space-size=2048`); changing `process.env.NODE_OPTIONS` from inside a running process has no effect.

### Client-Side Performance

#### 1. Ship only what the page uses

`@coherent.js/client` is only needed on pages with interactive components. Import from subpaths (`@coherent.js/client/router`, `@coherent.js/devtools/profiler`...) so bundlers can drop the rest; every package declares `sideEffects: false`.

```javascript
// vite.config.js
export default {
  build: {
    rollupOptions: {
      output: {
        manualChunks: {
          'coherent-client': ['@coherent.js/client']
        }
      }
    }
  }
};
```

#### 2. Hydrate lazily

Hydrate below-the-fold components when they become visible, and load their code on demand:

```javascript
import { hydrate } from '@coherent.js/client';

const observer = new IntersectionObserver(async (entries) => {
  for (const entry of entries) {
    if (!entry.isIntersecting) continue;
    observer.unobserve(entry.target);
    const { Comments } = await import('./components/Comments.js');
    hydrate(Comments, entry.target);
  }
}, { rootMargin: '200px' });

document.querySelectorAll('[data-widget="comments"]').forEach((el) => observer.observe(el));
```

Mismatch detection is off in production builds (it walks the whole DOM); keep it on in development.

### Shared Caching Across Instances

The in-process caches are per process. To share rendered fragments between instances, put them in a shared store such as Redis:

```javascript
import { createClient } from 'redis';
import { render } from '@coherent.js/core';

const redis = createClient({ url: process.env.REDIS_URL });
await redis.connect();

async function renderCached(key, buildTree, ttlSeconds = 300) {
  const cached = await redis.get(key);
  if (cached !== null) return cached;

  const html = render(buildTree());
  await redis.set(key, html, { EX: ttlSeconds });
  return html;
}

// Invalidate when the data changes
await redis.del(`product:${productId}`);

const html = await renderCached(`product:${id}:${product.updatedAt}`, () => ProductPage({ product }));
```

Include everything the output depends on in the key (ids, versions, locale, the user's role...), and never cache pages that contain per-user data under a shared key.

### Database and I/O Optimizations

- Use a connection pool (`@coherent.js/database` pools PostgreSQL and MySQL connections; configure `pool: { min, max }`).
- Select only the columns a page needs and paginate (`limit` / `offset`).
- Batch lookups (`where: { id: { in: ids } }`) instead of one query per row.

```javascript
import { executeQuery } from '@coherent.js/database';

const { rows: users } = await executeQuery(db, {
  table: 'users',
  select: ['id', 'name', 'email', 'created_at'],
  orderBy: { created_at: 'DESC' },
  limit: 20,
  offset: (page - 1) * 20
});

const { rows: profiles } = await executeQuery(db, {
  table: 'profiles',
  where: { user_id: { in: users.map((user) => user.id) } }
});
```

### Monitoring and Profiling

Time renders at the call site and export the numbers to your monitoring system:

```javascript
import { render } from '@coherent.js/core';

const SLOW_RENDER_MS = 10;

function monitoredRender(name, tree) {
  const start = performance.now();
  const html = render(tree);
  const duration = performance.now() - start;
  if (duration > SLOW_RENDER_MS) {
    console.warn(`Slow render: ${name} took ${duration.toFixed(1)} ms`);
  }
  return html;
}
```

For profiling in development, `@coherent.js/devtools/profiler` records timings once enabled (`createProfiler({ enabled: true })`), and `node --cpu-prof` shows where the time goes.

### Production Deployment Optimizations

#### 1. Container Optimization

```dockerfile
FROM node:22-alpine AS builder
WORKDIR /app
COPY package*.json ./
RUN npm ci --omit=dev --silent

FROM node:22-alpine AS production
WORKDIR /app

# Create non-root user
RUN addgroup -g 1001 -S nodejs
RUN adduser -S coherent -u 1001

# Copy the application
COPY --from=builder /app/node_modules ./node_modules
COPY --chown=coherent:nodejs . .

ENV NODE_ENV=production
ENV NODE_OPTIONS="--max-old-space-size=2048"

# Health check
HEALTHCHECK --interval=30s --timeout=3s --start-period=5s --retries=3 \
  CMD node healthcheck.js

USER coherent
EXPOSE 3000

CMD ["node", "server.js"]
```

#### 2. Load Balancing Configuration

```nginx
# nginx.conf for load balancing
proxy_cache_path /var/cache/nginx/html keys_zone=html_cache:10m max_size=1g inactive=10m;

upstream coherent_app {
    least_conn;
    server app1:3000 max_fails=3 fail_timeout=30s;
    server app2:3000 max_fails=3 fail_timeout=30s;
    server app3:3000 max_fails=3 fail_timeout=30s;
    keepalive 32;
}

server {
    listen 80;
    server_name example.com;

    # Compression
    gzip on;
    gzip_vary on;
    gzip_types text/plain text/css text/xml text/javascript application/javascript application/xml+rss application/json;
    gzip_min_length 1000;

    # Caching for static assets
    location ~* \.(js|css|png|jpg|jpeg|gif|ico|svg|woff|woff2|ttf|eot)$ {
        expires 1y;
        add_header Cache-Control "public, immutable";
        add_header Vary Accept-Encoding;
    }

    # API routes
    location /api/ {
        proxy_pass http://coherent_app;
        proxy_http_version 1.1;
        proxy_set_header Upgrade $http_upgrade;
        proxy_set_header Connection 'upgrade';
        proxy_set_header Host $host;
        proxy_set_header X-Forwarded-For $proxy_add_x_forwarded_for;
        proxy_set_header X-Forwarded-Proto $scheme;
        proxy_cache_bypass $http_upgrade;
    }

    # HTML pages with server-side caching
    location / {
        proxy_pass http://coherent_app;
        proxy_http_version 1.1;
        proxy_set_header Connection "";
        proxy_set_header Host $host;
        proxy_set_header X-Forwarded-For $proxy_add_x_forwarded_for;
        proxy_set_header X-Forwarded-Proto $scheme;

        # Cache HTML for 5 minutes (only for pages without per-user content)
        proxy_cache html_cache;
        proxy_cache_valid 200 5m;
        proxy_cache_use_stale error timeout updating http_500 http_502 http_503 http_504;
        proxy_cache_background_update on;
        proxy_cache_lock on;
    }
}
```

Behind this proxy, the app sees nginx's address. Tell your framework to read the client from `X-Forwarded-For` (`app.set('trust proxy', 1)` in Express), and set `trustProxy: 1` on the `@coherent.js/api` router, so that per-client rate limits do not collapse into one shared budget.
