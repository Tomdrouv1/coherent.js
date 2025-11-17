# @coherent.js/seo

SEO optimization tools for Coherent.js applications - Meta tags, structured data, and search engine optimization utilities.

## Installation

```bash
npm install @coherent.js/seo
# or
pnpm add @coherent.js/seo
# or
yarn add @coherent.js/seo
```

## Overview

The `@coherent.js/seo` package provides comprehensive SEO tools for Coherent.js applications, including:

- Dynamic meta tag management
- Open Graph and Twitter Card support
- JSON-LD structured data generation
- Sitemap generation
- Robots.txt management
- SEO-friendly URL generation
- Canonical URL support
- Internationalization SEO

## Quick Start

```javascript
import { createSEOHooks } from '@coherent.js/seo';

// Create SEO hooks
const seo = createSEOHooks();

// Add to your Coherent.js component
function BlogPost({ post }) {
  // Set SEO metadata
  seo.setMetadata({
    title: `${post.title} - My Blog`,
    description: post.excerpt,
    keywords: post.tags,
    author: post.author.name,
    publishedTime: post.publishedAt,
    image: post.featuredImage
  });
  
  return {
    div: {
      children: [
        { h1: { text: post.title } },
        { div: { 
          innerHTML: post.content,
          className: 'post-content' 
        }}
      ]
    }
  };
}
```

## Features

### Dynamic Meta Tags

Automatically generate meta tags for search engines:

```javascript
import { createSEOHooks } from '@coherent.js/seo';

const seo = createSEOHooks();

function ProductPage({ product }) {
  seo.setMetadata({
    title: product.name,
    description: product.description,
    keywords: [product.category, product.brand, ...product.tags],
    image: product.images[0],
    locale: 'en_US',
    type: 'product',
    url: `https://example.com/products/${product.slug}`
  });
  
  return {
    div: {
      children: [
        { h1: { text: product.name } },
        { p: { text: product.description } },
        { img: { src: product.images[0], alt: product.name } }
      ]
    }
  };
}
```

### Open Graph Support

Generate Open Graph meta tags for social sharing:

```javascript
seo.setMetadata({
  title: 'Awesome Product',
  description: 'This product will change your life',
  image: 'https://example.com/product-image.jpg',
  type: 'product.item',
  siteName: 'My E-commerce Store',
  locale: 'en_US',
  
  // Open Graph specific
  og: {
    price: {
      amount: '29.99',
      currency: 'USD'
    },
    availability: 'instock'
  }
});
```

### Twitter Card Support

Generate Twitter Card meta tags:

```javascript
seo.setMetadata({
  title: 'Check out this awesome content!',
  description: 'You won\'t believe what happens next',
  image: 'https://example.com/twitter-card-image.jpg',
  
  // Twitter specific
  twitter: {
    card: 'summary_large_image',
    site: '@mywebsite',
    creator: '@author'
  }
});
```

### JSON-LD Structured Data

Generate structured data for rich search results:

```javascript
import { createArticleSchema, createBreadcrumbSchema } from '@coherent.js/seo';

function BlogPost({ post, breadcrumbs }) {
  // Add article structured data
  seo.addSchema(createArticleSchema({
    headline: post.title,
    description: post.excerpt,
    author: {
      name: post.author.name,
      url: `/authors/${post.author.slug}`
    },
    datePublished: post.publishedAt,
    dateModified: post.updatedAt,
    image: post.featuredImage,
    keywords: post.tags,
    articleBody: post.content
  }));
  
  // Add breadcrumb schema
  seo.addSchema(createBreadcrumbSchema(breadcrumbs));
  
  return {
    div: {
      children: [
        { h1: { text: post.title } },
        { div: { innerHTML: post.content } }
      ]
    }
  };
}
```

## SEO Hooks

### Basic Usage

```javascript
import { createSEOHooks } from '@coherent.js/seo';

const seo = createSEOHooks({
  defaultTitle: 'My Website',
  defaultDescription: 'Welcome to my awesome website',
  defaultImage: '/default-social-image.jpg',
  siteUrl: 'https://example.com'
});

function Page({ title, description }) {
  seo.setMetadata({
    title: title,
    description: description
  });
  
  return {
    div: {
      children: [
        { h1: { text: title } },
        { p: { text: description } }
      ]
    }
  };
}
```

### Advanced Configuration

```javascript
const seo = createSEOHooks({
  // Default metadata
  defaultTitle: 'My Website',
  defaultDescription: 'Default description',
  defaultImage: '/images/default.jpg',
  siteUrl: 'https://example.com',
  
  // SEO settings
  titleTemplate: '%s | My Website', // "Page Title | My Website"
  truncateTitle: 60,                // Truncate titles to 60 chars
  truncateDescription: 160,         // Truncate descriptions to 160 chars
  
  // Social media
  social: {
    twitter: '@mytwitterhandle',
    facebook: 'myfacebookpage',
    linkedin: 'mylinkedincompany'
  },
  
  // Default Open Graph
  og: {
    type: 'website',
    siteName: 'My Website'
  }
});
```

## Sitemap Generation

Generate dynamic sitemaps:

```javascript
import { createSitemap } from '@coherent.js/seo';

const sitemap = createSitemap({
  siteUrl: 'https://example.com',
  changefreq: 'daily',
  priority: 0.7,
  lastmod: new Date()
});

// Add URLs to sitemap
sitemap.add({
  url: '/',
  changefreq: 'daily',
  priority: 1.0
});

sitemap.add({
  url: '/about',
  changefreq: 'monthly',
  priority: 0.8
});

sitemap.add({
  url: '/blog',
  changefreq: 'weekly',
  priority: 0.9
});

// Generate sitemap XML
const sitemapXml = sitemap.toXML();
```

## Robots.txt Management

Generate robots.txt files:

```javascript
import { createRobotsTxt } from '@coherent.js/seo';

const robots = createRobotsTxt({
  userAgent: '*',              // Default user agent
  allow: ['/'],                // Allow all paths
  disallow: ['/admin', '/private'], // Disallow specific paths
  sitemap: 'https://example.com/sitemap.xml',
  host: 'https://example.com'
});

// Add custom rules
robots.addRule({
  userAgent: 'Googlebot',
  allow: ['/'],
  crawlDelay: 10
});

// Generate robots.txt content
const robotsTxt = robots.toString();
```

## Canonical URLs

Manage canonical URLs to prevent duplicate content issues:

```javascript
function ProductPage({ product, queryParams }) {
  // Set canonical URL without tracking parameters
  const canonicalUrl = `https://example.com/products/${product.slug}`;
  
  seo.setCanonical(canonicalUrl);
  
  // Add alternate URLs for internationalization
  seo.addAlternate({
    href: `https://example.com/en/products/${product.slug}`,
    hreflang: 'en'
  });
  
  seo.addAlternate({
    href: `https://example.com/es/products/${product.slug}`,
    hreflang: 'es'
  });
  
  return {
    div: {
      children: [
        { h1: { text: product.name } },
        { p: { text: product.description } }
      ]
    }
  };
}
```

## Internationalization SEO

Support for multilingual SEO:

```javascript
function MultilingualPage({ content, language, translations }) {
  // Set language
  seo.setLanguage(language);
  
  // Add alternate language versions
  Object.entries(translations).forEach(([lang, url]) => {
    seo.addAlternate({
      href: url,
      hreflang: lang
    });
  });
  
  // Set direction for RTL languages
  seo.setDirection(language === 'ar' || language === 'he' ? 'rtl' : 'ltr');
  
  return {
    div: {
      lang: language,
      children: [
        { h1: { text: content.title } },
        { div: { innerHTML: content.body } }
      ]
    }
  };
}
```

## API Reference

### createSEOHooks(options)

Create SEO hooks for metadata management.

**Parameters:**
- `options.defaultTitle` - Default page title
- `options.defaultDescription` - Default page description
- `options.defaultImage` - Default social image
- `options.siteUrl` - Base site URL
- `options.titleTemplate` - Title template string
- `options.truncateTitle` - Title character limit
- `options.truncateDescription` - Description character limit

**Returns:** SEO hooks object with methods

### SEO Hooks Methods

- `seo.setMetadata(metadata)` - Set page metadata
- `seo.setTitle(title)` - Set page title
- `seo.setDescription(description)` - Set page description
- `seo.setCanonical(url)` - Set canonical URL
- `seo.addAlternate(options)` - Add alternate language URL
- `seo.addSchema(schema)` - Add JSON-LD schema
- `seo.setLanguage(lang)` - Set page language
- `seo.setDirection(dir)` - Set text direction

### createSitemap(options)

Create a sitemap generator.

**Parameters:**
- `options.siteUrl` - Base site URL
- `options.changefreq` - Default change frequency
- `options.priority` - Default priority
- `options.lastmod` - Default last modified date

**Returns:** Sitemap generator object

### createRobotsTxt(options)

Create a robots.txt generator.

**Parameters:**
- `options.userAgent` - Default user agent
- `options.allow` - Allowed paths
- `options.disallow` - Disallowed paths
- `options.sitemap` - Sitemap URL
- `options.host` - Host URL

**Returns:** Robots.txt generator object

## Schema Generators

### createArticleSchema(options)

Generate Article JSON-LD schema.

**Parameters:**
- `options.headline` - Article headline
- `options.description` - Article description
- `options.author` - Author information
- `options.datePublished` - Publication date
- `options.dateModified` - Modification date
- `options.image` - Featured image
- `options.keywords` - Article keywords
- `options.articleBody` - Article content

### createBreadcrumbSchema(breadcrumbs)

Generate Breadcrumb JSON-LD schema.

**Parameters:**
- `breadcrumbs` - Array of breadcrumb objects with name and url

### createProductSchema(options)

Generate Product JSON-LD schema.

**Parameters:**
- `options.name` - Product name
- `options.description` - Product description
- `options.image` - Product images
- `options.offers` - Product offers/pricing
- `options.brand` - Product brand
- `options.category` - Product category
- `options.sku` - Product SKU

## Examples

### Blog with Full SEO

```javascript
import { 
  createSEOHooks, 
  createArticleSchema, 
  createBreadcrumbSchema 
} from '@coherent.js/seo';

const seo = createSEOHooks({
  siteUrl: 'https://myblog.com',
  defaultTitle: 'My Blog',
  titleTemplate: '%s | My Blog'
});

function BlogPost({ post }) {
  // Set basic metadata
  seo.setMetadata({
    title: post.title,
    description: post.excerpt,
    image: post.featuredImage,
    publishedTime: post.publishedAt,
    modifiedTime: post.updatedAt,
    type: 'article',
    author: post.author.name,
    tags: post.tags
  });
  
  // Add structured data
  seo.addSchema(createArticleSchema({
    headline: post.title,
    description: post.excerpt,
    author: {
      name: post.author.name,
      url: `/authors/${post.author.slug}`
    },
    datePublished: post.publishedAt,
    dateModified: post.updatedAt,
    image: post.featuredImage,
    keywords: post.tags,
    articleBody: post.content
  }));
  
  // Add breadcrumbs
  seo.addSchema(createBreadcrumbSchema([
    { name: 'Home', url: '/' },
    { name: 'Blog', url: '/blog' },
    { name: post.title, url: `/blog/${post.slug}` }
  ]));
  
  // Set canonical URL
  seo.setCanonical(`https://myblog.com/blog/${post.slug}`);
  
  return {
    article: {
      className: 'blog-post',
      children: [
        { h1: { text: post.title } },
        { 
          div: { 
            className: 'post-meta',
            children: [
              { span: { text: `By ${post.author.name}` } },
              { time: { 
                text: formatDate(post.publishedAt),
                datetime: post.publishedAt
              }}
            ]
          }
        },
        { div: { 
          className: 'post-content',
          innerHTML: post.content 
        }}
      ]
    }
  };
}
```

### E-commerce Product Page

```javascript
import { 
  createSEOHooks, 
  createProductSchema 
} from '@coherent.js/seo';

const seo = createSEOHooks({
  siteUrl: 'https://mystore.com'
});

function ProductPage({ product, reviews }) {
  // Basic SEO metadata
  seo.setMetadata({
    title: `${product.name} | My Store`,
    description: product.description,
    image: product.images[0],
    type: 'product.item',
    
    // Open Graph for social sharing
    og: {
      price: {
        amount: product.price.toString(),
        currency: product.currency
      },
      availability: product.inStock ? 'instock' : 'outofstock',
      condition: 'new'
    },
    
    // Twitter Card
    twitter: {
      card: 'summary_large_image',
      label1: 'Price',
      data1: `${product.currency} ${product.price}`,
      label2: 'Availability',
      data2: product.inStock ? 'In Stock' : 'Out of Stock'
    }
  });
  
  // Product structured data
  seo.addSchema(createProductSchema({
    name: product.name,
    description: product.description,
    image: product.images,
    offers: {
      price: product.price.toString(),
      priceCurrency: product.currency,
      availability: product.inStock ? 'InStock' : 'OutOfStock',
      url: `https://mystore.com/products/${product.slug}`,
      seller: {
        name: 'My Store'
      }
    },
    brand: product.brand,
    category: product.category,
    sku: product.sku,
    gtin: product.gtin,
    aggregateRating: {
      ratingValue: reviews.averageRating,
      reviewCount: reviews.count
    }
  }));
  
  // Set canonical and alternates
  seo.setCanonical(`https://mystore.com/products/${product.slug}`);
  
  return {
    div: {
      className: 'product-page',
      children: [
        { h1: { text: product.name } },
        { 
          div: { 
            className: 'product-images',
            children: product.images.map(img => ({
              img: { src: img, alt: product.name }
            }))
          }
        },
        { p: { text: product.description } },
        { p: { text: `${product.currency} ${product.price}` } },
        { 
          button: { 
            text: product.inStock ? 'Add to Cart' : 'Out of Stock',
            disabled: !product.inStock
          }
        }
      ]
    }
  };
}
```

## Best Practices

### 1. Unique Titles and Descriptions

```javascript
// Good: Unique for each page
seo.setMetadata({
  title: `How to Master Coherent.js | Developer Guide`,
  description: 'Learn advanced techniques for building high-performance Coherent.js applications with this comprehensive guide.'
});

// Avoid: Generic/duplicated content
seo.setMetadata({
  title: 'Page Title',
  description: 'This is a description'
});
```

### 2. Optimal Lengths

```javascript
// Title: 50-60 characters
// Description: 150-160 characters
seo.setMetadata({
  title: 'Coherent.js Performance Optimization Guide', // 42 chars - good
  description: 'Maximize your Coherent.js application performance with these proven optimization techniques and best practices.' // 117 chars - good
});
```

### 3. Image Optimization

```javascript
seo.setMetadata({
  // Use appropriately sized images
  image: {
    url: 'https://example.com/social-image.jpg',
    width: 1200,
    height: 630,
    alt: 'Description of image content'
  }
});
```

## Related Packages

- [@coherent.js/core](../core/README.md) - Core framework
- [@coherent.js/i18n](../i18n/README.md) - Internationalization
- [@coherent.js/client](../client/README.md) - Client-side utilities

## License

MIT
