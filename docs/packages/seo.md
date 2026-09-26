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

const xml = generateSitemap(
  [
    { url: '/', priority: 1.0, changefreq: 'daily' },
    { url: '/about', priority: 0.8, changefreq: 'weekly' }
  ],
  { hostname: 'https://example.com' } // relative URLs are resolved against it
);
```

Every value is XML-escaped and each `loc` is percent-encoded. A `changefreq`
outside `always | hourly | daily | weekly | monthly | yearly | never` or a
`priority` outside 0.0–1.0 throws a `RangeError`, and an absolute URL that is
not `http:` or `https:` throws a `TypeError`. Pass `null` for `lastmod`,
`changefreq` or `priority` to leave the element out.

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

// Returns a { script: { type: 'application/ld+json', text } } component node
// ready to drop into your head element alongside the meta tags.
const jsonLd = generateStructuredData('organization', {
  name: 'My App',
  url: 'https://example.com'
});

// Any other type name adds the object as-is
const event = generateStructuredData('custom', {
  '@context': 'https://schema.org',
  '@type': 'Event',
  name: 'Launch day'
});
```

The JSON is written with `<`, `>`, `&`, U+2028 and U+2029 escaped, so no value
can close the `<script>` element; it parses to the same data. Titles are
inserted into `titleTemplate` literally (`$&` or `$'` in a title stay as
written).

## See also

- [Deployment guide](../deployment/index.md)
- [i18n package](i18n.md)
