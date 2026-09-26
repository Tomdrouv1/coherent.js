/**
 * Coherent.js Sitemap Generator
 *
 * Generate XML sitemaps for SEO
 *
 * @module seo/sitemap
 */

/** The `<changefreq>` values the sitemap protocol allows. */
const CHANGEFREQ_VALUES = ['always', 'hourly', 'daily', 'weekly', 'monthly', 'yearly', 'never'];

/** A URL that starts with a scheme (`https:`, `mailto:`, `javascript:` …). */
const SCHEME_RE = /^[a-z][a-z\d+.-]*:/i;

/**
 * Escape a value for use as XML text or a quoted attribute value.
 * @param {unknown} str
 * @returns {string}
 */
function escapeXml(str) {
  return String(str)
    .replace(/&/g, '&amp;')
    .replace(/</g, '&lt;')
    .replace(/>/g, '&gt;')
    .replace(/"/g, '&quot;')
    .replace(/'/g, '&apos;');
}

/**
 * `null`, `false` and `''` leave an optional sitemap element out.
 * @param {unknown} value
 */
function isOmitted(value) {
  return value === undefined || value === null || value === false || value === '';
}

/**
 * Parse an absolute URL, insisting on http(s), and return its serialized,
 * percent-encoded `href`.
 * @param {string} url
 * @returns {string}
 */
function toHttpHref(url) {
  let parsed;
  try {
    parsed = new URL(url);
  } catch {
    throw new TypeError(`Sitemap URL is not a valid URL: ${JSON.stringify(url)}`);
  }
  if (parsed.protocol !== 'http:' && parsed.protocol !== 'https:') {
    throw new TypeError(
      `Sitemap URLs must use http or https, got ${JSON.stringify(parsed.protocol)} in ${JSON.stringify(url)}`
    );
  }
  return parsed.href;
}

/**
 * @param {unknown} value
 * @returns {string}
 */
function validateChangefreq(value) {
  if (typeof value !== 'string' || !CHANGEFREQ_VALUES.includes(value)) {
    throw new RangeError(
      `Invalid sitemap changefreq ${JSON.stringify(value)}; expected one of ${CHANGEFREQ_VALUES.join(', ')}`
    );
  }
  return value;
}

/**
 * Accepts a number (or numeric string) from 0.0 to 1.0.
 * @param {unknown} value
 * @returns {number}
 */
function validatePriority(value) {
  const number = typeof value === 'string' && value.trim() !== '' ? Number(value) : value;
  if (typeof number !== 'number' || !Number.isFinite(number) || number < 0 || number > 1) {
    throw new RangeError(
      `Invalid sitemap priority ${JSON.stringify(value)}; expected a number from 0.0 to 1.0`
    );
  }
  return number;
}

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
   * Add URL to sitemap.
   *
   * `lastmod`, `changefreq` and `priority` default to today, `'weekly'` and
   * `0.5`; pass `null` to leave that element out. `changefreq` must be one of
   * the sitemap protocol's values and `priority` a number from 0.0 to 1.0,
   * otherwise this throws a `RangeError`.
   */
  add(url, options = {}) {
    // `loc` is always derived from `url`, never taken verbatim from options.
    const { loc: _loc, lastmod, changefreq, priority, ...rest } = options;

    const entry = {
      ...rest,
      loc: this.normalizeUrl(url),
      lastmod: lastmod === undefined ? new Date().toISOString().split('T')[0] : lastmod,
      changefreq: changefreq === undefined ? 'weekly' : changefreq,
      priority: priority === undefined ? 0.5 : priority
    };

    if (!isOmitted(entry.changefreq)) {
      validateChangefreq(entry.changefreq);
    }
    if (!isOmitted(entry.priority)) {
      entry.priority = validatePriority(entry.priority);
    }

    this.urls.push(entry);

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
   * Normalize URL.
   *
   * Absolute URLs must use http(s) (anything else throws a `TypeError`);
   * relative ones are appended to the configured `hostname`. The result is
   * percent-encoded, as `new URL(...).href` serializes it. Without a hostname a
   * relative URL stays relative (only its path is encoded).
   */
  normalizeUrl(url) {
    if (typeof url !== 'string') {
      throw new TypeError(`Sitemap URL must be a string, got ${url === null ? 'null' : typeof url}`);
    }

    if (SCHEME_RE.test(url)) {
      return toHttpHref(url);
    }

    const hostname = String(this.options.hostname || '').replace(/\/$/, '');
    const path = url.startsWith('/') ? url : `/${url}`;

    if (!hostname) {
      // Encode the path as a URL parser would, but keep it relative.
      const resolved = new URL(path, 'http://sitemap.invalid');
      return `${resolved.pathname}${resolved.search}${resolved.hash}`;
    }

    return toHttpHref(`${hostname}${path}`);
  }

  /**
   * Generate XML sitemap
   */
  generate() {
    const urlEntries = this.urls.map(url => {
      const entries = [`    <loc>${this.escapeXml(url.loc)}</loc>`];

      if (!isOmitted(url.lastmod)) {
        entries.push(`    <lastmod>${this.escapeXml(url.lastmod)}</lastmod>`);
      }

      if (!isOmitted(url.changefreq)) {
        entries.push(`    <changefreq>${this.escapeXml(url.changefreq)}</changefreq>`);
      }

      if (!isOmitted(url.priority)) {
        entries.push(`    <priority>${this.escapeXml(url.priority)}</priority>`);
      }

      return `  <url>\n${entries.join('\n')}\n  </url>`;
    }).join('\n');

    return `<?xml version="1.0" encoding="UTF-8"?>
<urlset xmlns="${this.escapeXml(this.options.xmlns)}">
${urlEntries}
</urlset>`;
  }

  /**
   * Escape XML special characters
   */
  escapeXml(str) {
    return escapeXml(str);
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
