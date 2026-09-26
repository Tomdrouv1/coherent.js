/**
 * The seo helper `coherent create --packages seo` writes (src/utils/seo.js)
 * called generateSitemap() without a hostname, so every <loc> was a bare path
 * ("/about"), which search engines reject: sitemap URLs must be absolute.
 */

import { describe, it, expect, afterAll } from 'vitest';
import { mkdtemp, rm, mkdir, writeFile } from 'node:fs/promises';
import { join } from 'node:path';
import { tmpdir } from 'node:os';
import { pathToFileURL } from 'node:url';
import { generateSeoScaffolding } from '../src/generators/package-scaffold.js';

let dir;

afterAll(async () => {
  delete process.env.BASE_URL;
  if (dir) await rm(dir, { recursive: true, force: true });
});

const locs = (xml) => [...xml.matchAll(/<loc>([^<]*)<\/loc>/g)].map((match) => match[1]);

describe('generated seo helper', () => {
  it('builds a sitemap of absolute URLs on BASE_URL, with a placeholder fallback', async () => {
    dir = await mkdtemp(join(tmpdir(), 'coherent-seo-scaffold-'));
    const scaffolding = generateSeoScaffolding('Shop');
    await mkdir(join(dir, 'src/utils'), { recursive: true });
    await writeFile(join(dir, 'src/utils/seo.js'), scaffolding['src/utils/seo.js']);
    const { getSitemap, getPageMeta } = await import(pathToFileURL(join(dir, 'src/utils/seo.js')).href);

    delete process.env.BASE_URL;
    expect(locs(getSitemap())).toEqual([
      'https://example.com/',
      'https://example.com/about',
      'https://example.com/contact'
    ]);

    process.env.BASE_URL = 'https://shop.example.org/';
    const xml = getSitemap();
    expect(xml).toMatch(/^<\?xml version="1.0" encoding="UTF-8"\?>/);
    expect(locs(xml)).toEqual([
      'https://shop.example.org/',
      'https://shop.example.org/about',
      'https://shop.example.org/contact'
    ]);
    expect(xml).toContain('<priority>0.8</priority>');

    // The meta helper uses the same origin
    expect(JSON.stringify(getPageMeta('about'))).toContain('https://shop.example.org/about');
  });
});
