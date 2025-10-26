/**
 * Coherent.js SEO Meta Tags
 * 
 * Utilities for generating SEO meta tags
 * 
 * @module seo/meta
 */

/**
 * Meta Tag Builder
 * Creates SEO-optimized meta tags
 */
export class MetaBuilder {
  constructor(defaults = {}) {
    this.defaults = {
      siteName: '',
      siteUrl: '',
      locale: 'en_US',
      twitterHandle: '',
      ...defaults
    };
    
    this.tags = [];
  }

  /**
   * Set page title
   */
  title(title, options = {}) {
    const fullTitle = options.template 
      ? options.template.replace('%s', title)
      : title;

    this.tags.push({ title: { text: fullTitle } });

    // Open Graph
    this.og('title', fullTitle);
    
    // Twitter
    this.twitter('title', fullTitle);

    return this;
  }

  /**
   * Set page description
   */
  description(description) {
    this.tags.push({
      meta: {
        name: 'description',
        content: description
      }
    });

    // Open Graph
    this.og('description', description);
    
    // Twitter
    this.twitter('description', description);

    return this;
  }

  /**
   * Set canonical URL
   */
  canonical(url) {
    this.tags.push({
      link: {
        rel: 'canonical',
        href: url
      }
    });

    // Open Graph
    this.og('url', url);

    return this;
  }

  /**
   * Set keywords
   */
  keywords(keywords) {
    const keywordString = Array.isArray(keywords) ? keywords.join(', ') : keywords;
    
    this.tags.push({
      meta: {
        name: 'keywords',
        content: keywordString
      }
    });

    return this;
  }

  /**
   * Set robots directives
   */
  robots(directives) {
    const content = Array.isArray(directives) ? directives.join(', ') : directives;
    
    this.tags.push({
      meta: {
        name: 'robots',
        content
      }
    });

    return this;
  }

  /**
   * Set Open Graph tag
   */
  og(property, content) {
    this.tags.push({
      meta: {
        property: `og:${property}`,
        content
      }
    });

    return this;
  }

  /**
   * Set Twitter Card tag
   */
  twitter(name, content) {
    this.tags.push({
      meta: {
        name: `twitter:${name}`,
        content
      }
    });

    return this;
  }

  /**
   * Set image for social sharing
   */
  image(url, options = {}) {
    // Open Graph
    this.og('image', url);
    
    if (options.width) this.og('image:width', options.width);
    if (options.height) this.og('image:height', options.height);
    if (options.alt) this.og('image:alt', options.alt);

    // Twitter
    this.twitter('image', url);
    if (options.alt) this.twitter('image:alt', options.alt);

    return this;
  }

  /**
   * Set article metadata
   */
  article(options = {}) {
    this.og('type', 'article');

    if (options.publishedTime) {
      this.og('article:published_time', options.publishedTime);
    }
    
    if (options.modifiedTime) {
      this.og('article:modified_time', options.modifiedTime);
    }
    
    if (options.author) {
      this.og('article:author', options.author);
    }
    
    if (options.section) {
      this.og('article:section', options.section);
    }
    
    if (options.tags) {
      options.tags.forEach(tag => this.og('article:tag', tag));
    }

    return this;
  }

  /**
   * Set Twitter Card type
   */
  twitterCard(type = 'summary_large_image') {
    this.twitter('card', type);
    
    if (this.defaults.twitterHandle) {
      this.twitter('site', this.defaults.twitterHandle);
    }

    return this;
  }

  /**
   * Set locale
   */
  locale(locale, alternates = []) {
    this.og('locale', locale);
    
    alternates.forEach(alt => {
      this.og('locale:alternate', alt);
    });

    return this;
  }

  /**
   * Set site name
   */
  siteName(name) {
    this.og('site_name', name || this.defaults.siteName);
    return this;
  }

  /**
   * Add custom meta tag
   */
  meta(attributes) {
    this.tags.push({ meta: attributes });
    return this;
  }

  /**
   * Add link tag
   */
  link(attributes) {
    this.tags.push({ link: attributes });
    return this;
  }

  /**
   * Build all meta tags
   */
  build() {
    return this.tags;
  }

  /**
   * Reset builder
   */
  reset() {
    this.tags = [];
    return this;
  }
}

/**
 * Create a meta builder
 */
export function createMetaBuilder(defaults = {}) {
  return new MetaBuilder(defaults);
}

/**
 * Quick meta tags generator
 */
export function generateMeta(options = {}) {
  const builder = new MetaBuilder(options.defaults);

  if (options.title) {
    builder.title(options.title, { template: options.titleTemplate });
  }

  if (options.description) {
    builder.description(options.description);
  }

  if (options.canonical) {
    builder.canonical(options.canonical);
  }

  if (options.keywords) {
    builder.keywords(options.keywords);
  }

  if (options.image) {
    builder.image(options.image.url, options.image);
  }

  if (options.robots) {
    builder.robots(options.robots);
  }

  if (options.article) {
    builder.article(options.article);
  }

  if (options.twitterCard !== false) {
    builder.twitterCard(options.twitterCard);
  }

  if (options.locale) {
    builder.locale(options.locale, options.alternateLocales);
  }

  if (options.siteName) {
    builder.siteName(options.siteName);
  }

  return builder.build();
}

export default {
  MetaBuilder,
  createMetaBuilder,
  generateMeta
};
