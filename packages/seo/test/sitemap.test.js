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
