import { describe, it, expect, beforeEach } from 'vitest';
import { MetaBuilder, createMetaBuilder, generateMeta } from '../src/meta.js';

describe('MetaBuilder', () => {
  let builder;

  beforeEach(() => {
    builder = new MetaBuilder();
  });

  it('creates with defaults', () => {
    const b = new MetaBuilder({ siteName: 'Test Site' });
    expect(b.defaults.siteName).toBe('Test Site');
  });

  it('sets title with og and twitter tags', () => {
    builder.title('My Page');
    const tags = builder.build();

    expect(tags).toContainEqual({ title: { text: 'My Page' } });
    expect(tags).toContainEqual({ meta: { property: 'og:title', content: 'My Page' } });
    expect(tags).toContainEqual({ meta: { name: 'twitter:title', content: 'My Page' } });
  });

  it('applies title template', () => {
    builder.title('My Page', { template: '%s | My Site' });
    const tags = builder.build();
    expect(tags).toContainEqual({ title: { text: 'My Page | My Site' } });
  });

  it('sets description with og and twitter tags', () => {
    builder.description('A test page');
    const tags = builder.build();

    expect(tags).toContainEqual({ meta: { name: 'description', content: 'A test page' } });
    expect(tags).toContainEqual({ meta: { property: 'og:description', content: 'A test page' } });
    expect(tags).toContainEqual({ meta: { name: 'twitter:description', content: 'A test page' } });
  });

  it('sets canonical URL and og:url', () => {
    builder.canonical('https://example.com/page');
    const tags = builder.build();

    expect(tags).toContainEqual({ link: { rel: 'canonical', href: 'https://example.com/page' } });
    expect(tags).toContainEqual({ meta: { property: 'og:url', content: 'https://example.com/page' } });
  });

  it('sets keywords from array', () => {
    builder.keywords(['js', 'framework', 'ssr']);
    const tags = builder.build();
    expect(tags).toContainEqual({ meta: { name: 'keywords', content: 'js, framework, ssr' } });
  });

  it('sets keywords from string', () => {
    builder.keywords('js, framework');
    const tags = builder.build();
    expect(tags).toContainEqual({ meta: { name: 'keywords', content: 'js, framework' } });
  });

  it('sets robots directives', () => {
    builder.robots(['index', 'follow']);
    const tags = builder.build();
    expect(tags).toContainEqual({ meta: { name: 'robots', content: 'index, follow' } });
  });

  it('sets image with dimensions', () => {
    builder.image('https://example.com/img.jpg', { width: '1200', height: '630', alt: 'Preview' });
    const tags = builder.build();

    expect(tags).toContainEqual({ meta: { property: 'og:image', content: 'https://example.com/img.jpg' } });
    expect(tags).toContainEqual({ meta: { property: 'og:image:width', content: '1200' } });
    expect(tags).toContainEqual({ meta: { property: 'og:image:alt', content: 'Preview' } });
    expect(tags).toContainEqual({ meta: { name: 'twitter:image', content: 'https://example.com/img.jpg' } });
  });

  it('sets article metadata', () => {
    builder.article({
      publishedTime: '2024-01-01',
      author: 'John',
      tags: ['tech', 'web']
    });
    const tags = builder.build();
    expect(tags).toContainEqual({ meta: { property: 'og:type', content: 'article' } });
    expect(tags).toContainEqual({ meta: { property: 'og:article:published_time', content: '2024-01-01' } });
    expect(tags).toContainEqual({ meta: { property: 'og:article:author', content: 'John' } });
  });

  it('sets twitter card type', () => {
    builder.twitterCard('summary');
    const tags = builder.build();
    expect(tags).toContainEqual({ meta: { name: 'twitter:card', content: 'summary' } });
  });

  it('includes twitter handle from defaults', () => {
    const b = new MetaBuilder({ twitterHandle: '@test' });
    b.twitterCard();
    const tags = b.build();
    expect(tags).toContainEqual({ meta: { name: 'twitter:site', content: '@test' } });
  });

  it('chains methods fluently', () => {
    const tags = builder
      .title('Test')
      .description('Desc')
      .canonical('https://example.com')
      .build();

    expect(tags.length).toBeGreaterThan(0);
  });

  it('reset clears all tags', () => {
    builder.title('Test');
    builder.reset();
    expect(builder.build()).toEqual([]);
  });
});

describe('createMetaBuilder', () => {
  it('returns MetaBuilder instance', () => {
    expect(createMetaBuilder()).toBeInstanceOf(MetaBuilder);
  });
});

describe('generateMeta', () => {
  it('generates meta tags from options', () => {
    const tags = generateMeta({
      title: 'My Page',
      description: 'A great page',
      canonical: 'https://example.com',
      keywords: ['js', 'ssr'],
      siteName: 'My Site'
    });

    expect(tags.length).toBeGreaterThan(0);
    expect(tags).toContainEqual({ title: { text: 'My Page' } });
    expect(tags).toContainEqual({ meta: { name: 'description', content: 'A great page' } });
  });

  it('supports title template', () => {
    const tags = generateMeta({
      title: 'About',
      titleTemplate: '%s - My Site'
    });
    expect(tags).toContainEqual({ title: { text: 'About - My Site' } });
  });

  it('generates image tags', () => {
    const tags = generateMeta({
      image: { url: 'https://example.com/img.jpg', width: '800' }
    });
    expect(tags).toContainEqual({ meta: { property: 'og:image', content: 'https://example.com/img.jpg' } });
  });
});
