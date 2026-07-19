# @coherent.js/seo

SEO utilities for Coherent.js applications: meta tags, sitemaps, and
structured data.

```bash
pnpm add @coherent.js/seo
```

## Meta tags

`generateMeta(options)` returns an array of component nodes for the document
head — title, description, canonical, Open Graph/Twitter tags, and more:

```javascript
import { generateMeta } from '@coherent.js/seo';

const metaTags = generateMeta({
  title: 'Welcome',
  titleTemplate: '%s — My App',
  description: 'A Coherent.js application',
  canonical: 'https://example.com/',
  image: { url: 'https://example.com/og.jpg' },
  siteName: 'My App',
  locale: 'en_US'
});

// Drop the nodes into your head element:
const Head = () => ({ head: { children: metaTags } });
```

For incremental construction use the builder:

```javascript
import { createMetaBuilder } from '@coherent.js/seo';

const meta = createMetaBuilder()
  .title('Welcome', { template: '%s — My App' })
  .description('A Coherent.js application')
  .canonical('https://example.com/')
  .build();
```

## Sitemaps

`generateSitemap(urls, options)` produces a sitemap XML string:

```javascript
import { generateSitemap } from '@coherent.js/seo';

const xml = generateSitemap([
  { url: '/', priority: 1.0, changefreq: 'daily' },
  { url: '/about', priority: 0.8, changefreq: 'weekly' }
]);
```

Serve it from your framework of choice, e.g. with Fastify:

```javascript
fastify.get('/sitemap.xml', (request, reply) => {
  reply.type('application/xml').send(xml);
});
```

## Structured data

JSON-LD structured data via `generateStructuredData` /
`createStructuredData` / `StructuredDataBuilder`:

```javascript
import { generateStructuredData } from '@coherent.js/seo';

// Returns a { script: { type: 'application/ld+json', ... } } component node
// ready to drop into your head element alongside the meta tags.
const jsonLd = generateStructuredData({
  '@type': 'Organization',
  name: 'My App',
  url: 'https://example.com'
});
```

## See also

- [Deployment guide](../deployment/index.md)
- [i18n package](i18n.md)
