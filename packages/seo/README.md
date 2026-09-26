# @coherent.js/seo

SEO helpers for Coherent.js applications: meta tags (including Open Graph and
Twitter cards), XML sitemaps and JSON-LD structured data.

- ESM-only, Node 22.12+
- Every helper returns plain Coherent.js nodes (or an XML string), so the output
  goes through core's renderer and its escaping like any other component.

## Installation

```bash
pnpm add @coherent.js/seo
```

## Exports

| Import path | Exports |
| --- | --- |
| `@coherent.js/seo` | everything below |
| `@coherent.js/seo/meta` | `MetaBuilder`, `createMetaBuilder`, `generateMeta` |
| `@coherent.js/seo/sitemap` | `SitemapGenerator`, `createSitemapGenerator`, `generateSitemap` |
| `@coherent.js/seo/structured-data` | `StructuredDataBuilder`, `createStructuredData`, `generateStructuredData` |

Each subpath also has a default export: an object holding its three exports.

## Quick start

```javascript
import { render } from '@coherent.js/core';
import { generateMeta, generateStructuredData } from '@coherent.js/seo';

const head = {
  head: {
    children: [
      ...generateMeta({
        title: 'Pricing',
        titleTemplate: '%s | Acme',
        description: 'Plans for every team size',
        canonical: 'https://acme.example/pricing',
        image: { url: 'https://acme.example/og/pricing.png', width: 1200, height: 630 },
        siteName: 'Acme'
      }),
      generateStructuredData('organization', {
        name: 'Acme',
        url: 'https://acme.example'
      })
    ]
  }
};

const html = render({ html: { children: [head, { body: { text: 'Hello' } }] } });
```

## Meta tags

### `generateMeta(options)`

Returns an array of `title` / `meta` / `link` nodes in one call.

| Option | Emits |
| --- | --- |
| `title`, `titleTemplate` | `<title>`, `og:title`, `twitter:title`. The first `%s` in the template is replaced by the title (inserted literally). |
| `description` | `description`, `og:description`, `twitter:description` |
| `canonical` | `<link rel="canonical">`, `og:url` |
| `keywords` | `keywords` (an array is joined with `, `) |
| `image` | `{ url, width?, height?, alt? }` → `og:image*`, `twitter:image*` |
| `robots` | `robots` (string or array) |
| `article` | `og:type=article` plus `publishedTime`, `modifiedTime`, `author`, `section`, `tags` |
| `twitterCard` | `twitter:card` (default `'summary_large_image'`); `false` omits it |
| `locale`, `alternateLocales` | `og:locale`, `og:locale:alternate` |
| `siteName` | `og:site_name` |
| `defaults` | `{ siteName, siteUrl, locale, twitterHandle }` for the underlying builder; `twitterHandle` adds `twitter:site` |

### `MetaBuilder` / `createMetaBuilder(defaults)`

A chainable builder for the same tags. `build()` returns the accumulated nodes
and `reset()` clears them.

```javascript
import { createMetaBuilder } from '@coherent.js/seo';

const tags = createMetaBuilder({ twitterHandle: '@acme' })
  .title('Pricing', { template: '%s | Acme' })
  .description('Plans for every team size')
  .canonical('https://acme.example/pricing')
  .robots(['index', 'follow'])
  .twitterCard('summary')
  .meta({ name: 'theme-color', content: '#0a0a0a' })
  .link({ rel: 'alternate', hreflang: 'fr', href: 'https://acme.example/fr/pricing' })
  .build();
```

Other methods: `keywords()`, `og(property, content)`, `twitter(name, content)`,
`image(url, options)`, `article(options)`, `locale(locale, alternates)` and
`siteName(name)`.

## Sitemaps

### `generateSitemap(urls, options)`

Returns the sitemap XML as a string. Each entry is a path, an absolute URL, or
an object `{ url, lastmod?, changefreq?, priority? }`.

```javascript
import { generateSitemap } from '@coherent.js/seo';

const xml = generateSitemap(
  [
    { url: '/', changefreq: 'daily', priority: 1.0 },
    { url: '/pricing', lastmod: '2026-09-01', priority: 0.8 },
    '/about'
  ],
  { hostname: 'https://acme.example' }
);
```

- Relative URLs are appended to `hostname`; set it, since the sitemap protocol
  requires absolute URLs. Every `loc` is percent-encoded (`new URL(...).href`),
  and an absolute URL that is not `http:` or `https:` throws a `TypeError`.
- `lastmod` defaults to today, `changefreq` to `'weekly'` and `priority` to
  `0.5`; pass `null` to leave the element out.
- `changefreq` must be one of `always`, `hourly`, `daily`, `weekly`, `monthly`,
  `yearly`, `never`, and `priority` a number from 0.0 to 1.0; anything else
  throws a `RangeError`.
- Every value is XML-escaped.

Serve it with the XML content type, for example with Express:

```javascript
app.get('/sitemap.xml', (req, res) => {
  res.type('application/xml').send(xml);
});
```

### `SitemapGenerator` / `createSitemapGenerator(options)`

The incremental form: `add(url, options)`, `addMultiple(urls)`, `generate()`,
`count()` and `clear()`. Options are `hostname` and `xmlns`.

```javascript
import { createSitemapGenerator } from '@coherent.js/seo';

const sitemap = createSitemapGenerator({ hostname: 'https://acme.example' });
for (const post of posts) {
  sitemap.add(`/blog/${post.slug}`, { lastmod: post.updatedAt, changefreq: 'monthly' });
}
const xml = sitemap.generate();
```

## Structured data (JSON-LD)

### `generateStructuredData(type, data)`

Builds one schema.org object and returns a
`{ script: { type: 'application/ld+json', text } }` node, ready to place in the
head. `type` is one of `'organization'`, `'website'`, `'article'`, `'product'`,
`'breadcrumb'`, `'faq'` or `'person'`; any other value adds `data` as-is.

```javascript
import { generateStructuredData } from '@coherent.js/seo';

const breadcrumb = generateStructuredData('breadcrumb', [
  { name: 'Home', url: 'https://acme.example/' },
  { name: 'Pricing', url: 'https://acme.example/pricing' }
]);

const custom = generateStructuredData('custom', {
  '@context': 'https://schema.org',
  '@type': 'Event',
  name: 'Launch day'
});
```

### `StructuredDataBuilder` / `createStructuredData()`

Collects several schemas into one script node: `organization()`, `website()`,
`article()`, `product()`, `breadcrumb()`, `faq()`, `person()` and `add(schema)`
are chainable; `build()` returns the node (or `null` when empty) and `toJSON()`
the JSON string.

```javascript
import { createStructuredData } from '@coherent.js/seo';

const jsonLd = createStructuredData()
  .website({ name: 'Acme', url: 'https://acme.example' })
  .faq([{ question: 'Is there a free plan?', answer: 'Yes, for up to 3 users.' }])
  .build();
```

The JSON is written with `<`, `>`, `&`, U+2028 and U+2029 as `\uXXXX` escapes,
so no value can close the script element or swallow the rest of the page. It
parses to the same data.

## TypeScript

Type definitions ship with the package (`types/index.d.ts`).

## Related packages

- [@coherent.js/core](../core/README.md) - Core framework
- [@coherent.js/i18n](../i18n/README.md) - Internationalization

## License

MIT
