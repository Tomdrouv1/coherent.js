import { describe, it, expect, beforeEach } from 'vitest';
import { SitemapGenerator, createSitemapGenerator, generateSitemap } from '../src/sitemap.js';

describe('SitemapGenerator', () => {
  let generator;

  beforeEach(() => {
    generator = new SitemapGenerator({ hostname: 'https://example.com' });
  });

  it('adds URLs and generates XML', () => {
    generator.add('/about', { priority: 0.8 });
    const xml = generator.generate();

    expect(xml).toContain('<?xml version="1.0" encoding="UTF-8"?>');
    expect(xml).toContain('<urlset xmlns="http://www.sitemaps.org/schemas/sitemap/0.9">');
    expect(xml).toContain('<loc>https://example.com/about</loc>');
    expect(xml).toContain('<priority>0.8</priority>');
  });

  it('normalizes URLs with hostname', () => {
    generator.add('/page');
    const xml = generator.generate();
    expect(xml).toContain('<loc>https://example.com/page</loc>');
  });

  it('keeps absolute URLs unchanged', () => {
    generator.add('https://other.com/page');
    const xml = generator.generate();
    expect(xml).toContain('<loc>https://other.com/page</loc>');
  });

  it('adds paths without leading slash', () => {
    generator.add('about');
    const xml = generator.generate();
    expect(xml).toContain('<loc>https://example.com/about</loc>');
  });

  it('includes lastmod, changefreq, priority', () => {
    generator.add('/', {
      lastmod: '2024-01-15',
      changefreq: 'daily',
      priority: 1.0
    });
    const xml = generator.generate();
    expect(xml).toContain('<lastmod>2024-01-15</lastmod>');
    expect(xml).toContain('<changefreq>daily</changefreq>');
    expect(xml).toContain('<priority>1</priority>');
  });

  it('addMultiple handles string and object URLs', () => {
    generator.addMultiple([
      '/page1',
      { url: '/page2', priority: 0.9 }
    ]);
    expect(generator.count()).toBe(2);
  });

  it('escapes XML special characters', () => {
    generator.add('/search?q=a&b=c');
    const xml = generator.generate();
    expect(xml).toContain('&amp;');
    expect(xml).not.toContain('&b=');
  });

  it('clear removes all URLs', () => {
    generator.add('/a').add('/b');
    generator.clear();
    expect(generator.count()).toBe(0);
  });

  it('chains add calls', () => {
    generator.add('/a').add('/b').add('/c');
    expect(generator.count()).toBe(3);
  });

  it('strips trailing slash from hostname', () => {
    const g = new SitemapGenerator({ hostname: 'https://example.com/' });
    g.add('/page');
    const xml = g.generate();
    expect(xml).toContain('<loc>https://example.com/page</loc>');
  });
});

describe('SitemapGenerator output safety', () => {
  const INJECTION = '</lastmod></url><url><loc>https://evil.example/</loc>';

  it('escapes lastmod so it cannot inject extra <url> entries', () => {
    const g = new SitemapGenerator({ hostname: 'https://example.com' });
    g.add('/a', { lastmod: INJECTION, changefreq: 'daily', priority: 0.5 });

    expect(g.generate()).toBe(
      '<?xml version="1.0" encoding="UTF-8"?>\n' +
      '<urlset xmlns="http://www.sitemaps.org/schemas/sitemap/0.9">\n' +
      '  <url>\n' +
      '    <loc>https://example.com/a</loc>\n' +
      '    <lastmod>&lt;/lastmod&gt;&lt;/url&gt;&lt;url&gt;&lt;loc&gt;https://evil.example/&lt;/loc&gt;</lastmod>\n' +
      '    <changefreq>daily</changefreq>\n' +
      '    <priority>0.5</priority>\n' +
      '  </url>\n' +
      '</urlset>'
    );
    expect(g.generate().match(/<url>/g)).toHaveLength(1);
  });

  it('rejects a changefreq outside the sitemap enum', () => {
    const g = new SitemapGenerator({ hostname: 'https://example.com' });
    expect(() => g.add('/a', { changefreq: INJECTION })).toThrow(RangeError);
    expect(() => g.add('/a', { changefreq: 'fortnightly' })).toThrow(
      'Invalid sitemap changefreq "fortnightly"; expected one of always, hourly, daily, weekly, monthly, yearly, never'
    );
    expect(g.count()).toBe(0);
  });

  it('accepts every changefreq value the protocol defines', () => {
    const g = new SitemapGenerator({ hostname: 'https://example.com' });
    for (const changefreq of ['always', 'hourly', 'daily', 'weekly', 'monthly', 'yearly', 'never']) {
      g.add('/a', { changefreq });
    }
    expect(g.count()).toBe(7);
  });

  it('rejects a priority that is not a number from 0.0 to 1.0', () => {
    const g = new SitemapGenerator({ hostname: 'https://example.com' });
    expect(() => g.add('/a', { priority: INJECTION })).toThrow(RangeError);
    expect(() => g.add('/a', { priority: 1.5 })).toThrow(
      'Invalid sitemap priority 1.5; expected a number from 0.0 to 1.0'
    );
    expect(() => g.add('/a', { priority: -0.1 })).toThrow(RangeError);
    expect(() => g.add('/a', { priority: Number.NaN })).toThrow(RangeError);
    expect(g.count()).toBe(0);
  });

  it('accepts priority bounds and numeric strings', () => {
    const g = new SitemapGenerator({ hostname: 'https://example.com' });
    g.add('/a', { priority: 0 }).add('/b', { priority: 1 }).add('/c', { priority: '0.3' });
    expect(g.urls.map(u => u.priority)).toEqual([0, 1, 0.3]);
    expect(g.generate()).toContain('<priority>0</priority>');
  });

  it('omits an element whose option is null', () => {
    const g = new SitemapGenerator({ hostname: 'https://example.com' });
    g.add('/a', { lastmod: null, changefreq: null, priority: null });
    expect(g.generate()).toContain('  <url>\n    <loc>https://example.com/a</loc>\n  </url>');
  });

  it('percent-encodes loc', () => {
    const g = new SitemapGenerator({ hostname: 'https://example.com' });
    g.add('/café menu?q=a b');
    expect(g.generate()).toContain('<loc>https://example.com/caf%C3%A9%20menu?q=a%20b</loc>');
  });

  it('percent-encodes a relative loc when no hostname is configured', () => {
    const g = new SitemapGenerator();
    g.add('/a b');
    expect(g.urls[0].loc).toBe('/a%20b');
  });

  it('escapes the XML-special characters left in an encoded loc', () => {
    const g = new SitemapGenerator({ hostname: 'https://example.com' });
    g.add("/it's?a=1&b=2");
    expect(g.generate()).toContain('<loc>https://example.com/it&apos;s?a=1&amp;b=2</loc>');
  });

  it('rejects non-http(s) absolute URLs', () => {
    const g = new SitemapGenerator({ hostname: 'https://example.com' });
    expect(() => g.add('javascript:alert(1)')).toThrow(
      'Sitemap URLs must use http or https, got "javascript:" in "javascript:alert(1)"'
    );
    expect(() => g.add('ftp://example.com/file')).toThrow(TypeError);
    expect(g.count()).toBe(0);
  });

  it('does not treat a path that merely starts with "http" as absolute', () => {
    const g = new SitemapGenerator({ hostname: 'https://example.com' });
    g.add('http-status');
    expect(g.urls[0].loc).toBe('https://example.com/http-status');
  });

  it('does not let options.loc override the normalized URL', () => {
    const g = new SitemapGenerator({ hostname: 'https://example.com' });
    g.add('/a', { loc: 'javascript:alert(1)' });
    expect(g.urls[0].loc).toBe('https://example.com/a');
  });

  it('escapes the xmlns attribute', () => {
    const g = new SitemapGenerator({ xmlns: 'x"><evil/>' });
    expect(g.generate()).toContain('<urlset xmlns="x&quot;&gt;&lt;evil/&gt;">');
  });
});

describe('createSitemapGenerator', () => {
  it('returns SitemapGenerator instance', () => {
    expect(createSitemapGenerator()).toBeInstanceOf(SitemapGenerator);
  });
});

describe('generateSitemap', () => {
  it('generates sitemap from URL array', () => {
    const xml = generateSitemap(
      ['/home', '/about', '/contact'],
      { hostname: 'https://example.com' }
    );
    expect(xml).toContain('<loc>https://example.com/home</loc>');
    expect(xml).toContain('<loc>https://example.com/about</loc>');
    expect(xml).toContain('<loc>https://example.com/contact</loc>');
  });
});
