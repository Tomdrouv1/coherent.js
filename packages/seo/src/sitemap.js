/**
 * Coherent.js Sitemap Generator
 * 
 * Generate XML sitemaps for SEO
 * 
 * @module seo/sitemap
 */

/**
 * Sitemap Generator
 * Creates XML sitemaps
 */
export class SitemapGenerator {
  constructor(options = {}) {
    this.options = {
      hostname: '',
      xmlns: 'http://www.sitemaps.org/schemas/sitemap/0.9',
      ...options
    };
    
    this.urls = [];
  }

  /**
   * Add URL to sitemap
   */
  add(url, options = {}) {
    this.urls.push({
      loc: this.normalizeUrl(url),
      lastmod: options.lastmod || new Date().toISOString().split('T')[0],
      changefreq: options.changefreq || 'weekly',
      priority: options.priority !== undefined ? options.priority : 0.5,
      ...options
    });

    return this;
  }

  /**
   * Add multiple URLs
   */
  addMultiple(urls) {
    urls.forEach(url => {
      if (typeof url === 'string') {
        this.add(url);
      } else {
        this.add(url.url, url);
      }
    });

    return this;
  }

  /**
   * Normalize URL
   */
  normalizeUrl(url) {
    if (url.startsWith('http')) {
      return url;
    }
    
    const hostname = this.options.hostname.replace(/\/$/, '');
    const path = url.startsWith('/') ? url : `/${url}`;
    
    return `${hostname}${path}`;
  }

  /**
   * Generate XML sitemap
   */
  generate() {
    const urlEntries = this.urls.map(url => {
      const entries = [`    <loc>${this.escapeXml(url.loc)}</loc>`];
      
      if (url.lastmod) {
        entries.push(`    <lastmod>${url.lastmod}</lastmod>`);
      }
      
      if (url.changefreq) {
        entries.push(`    <changefreq>${url.changefreq}</changefreq>`);
      }
      
      if (url.priority !== undefined) {
        entries.push(`    <priority>${url.priority}</priority>`);
      }
      
      return `  <url>\n${entries.join('\n')}\n  </url>`;
    }).join('\n');

    return `<?xml version="1.0" encoding="UTF-8"?>
<urlset xmlns="${this.options.xmlns}">
${urlEntries}
</urlset>`;
  }

  /**
   * Escape XML special characters
   */
  escapeXml(str) {
    return String(str)
      .replace(/&/g, '&amp;')
      .replace(/</g, '&lt;')
      .replace(/>/g, '&gt;')
      .replace(/"/g, '&quot;')
      .replace(/'/g, '&apos;');
  }

  /**
   * Clear all URLs
   */
  clear() {
    this.urls = [];
    return this;
  }

  /**
   * Get URL count
   */
  count() {
    return this.urls.length;
  }
}

/**
 * Create a sitemap generator
 */
export function createSitemapGenerator(options = {}) {
  return new SitemapGenerator(options);
}

/**
 * Quick sitemap generation
 */
export function generateSitemap(urls, options = {}) {
  const generator = new SitemapGenerator(options);
  generator.addMultiple(urls);
  return generator.generate();
}

export default {
  SitemapGenerator,
  createSitemapGenerator,
  generateSitemap
};
