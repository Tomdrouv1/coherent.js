import { describe, it, expect, beforeEach } from 'vitest';
import { StructuredDataBuilder, createStructuredData, generateStructuredData } from '../src/structured-data.js';

describe('StructuredDataBuilder', () => {
  let builder;

  beforeEach(() => {
    builder = new StructuredDataBuilder();
  });

  it('builds null when empty', () => {
    expect(builder.build()).toBeNull();
  });

  it('creates Organization schema', () => {
    builder.organization({ name: 'Acme Inc', url: 'https://acme.com' });
    const result = builder.build();

    expect(result.script.type).toBe('application/ld+json');
    const data = JSON.parse(result.script.text);
    expect(data['@type']).toBe('Organization');
    expect(data.name).toBe('Acme Inc');
  });

  it('creates Article schema with author', () => {
    builder.article({
      headline: 'Test Article',
      description: 'About testing',
      author: { name: 'John', url: 'https://john.com' },
      datePublished: '2024-01-01'
    });
    const data = JSON.parse(builder.toJSON());

    expect(data['@type']).toBe('Article');
    expect(data.headline).toBe('Test Article');
    expect(data.author['@type']).toBe('Person');
    expect(data.author.name).toBe('John');
  });

  it('creates Product schema with offers and rating', () => {
    builder.product({
      name: 'Widget',
      description: 'A great widget',
      brand: 'Acme',
      offers: { price: '29.99', currency: 'USD' },
      rating: { value: 4.5, count: 100 }
    });
    const data = JSON.parse(builder.toJSON());

    expect(data['@type']).toBe('Product');
    expect(data.brand['@type']).toBe('Brand');
    expect(data.brand.name).toBe('Acme');
    expect(data.offers.price).toBe('29.99');
    expect(data.aggregateRating.ratingValue).toBe(4.5);
  });

  it('creates WebSite schema with search action', () => {
    builder.website({
      name: 'My Site',
      url: 'https://example.com',
      searchAction: { target: 'https://example.com/search?q={search_term_string}' }
    });
    const data = JSON.parse(builder.toJSON());

    expect(data['@type']).toBe('WebSite');
    expect(data.potentialAction['@type']).toBe('SearchAction');
  });

  it('creates BreadcrumbList schema', () => {
    builder.breadcrumb([
      { name: 'Home', url: '/' },
      { name: 'Products', url: '/products' },
      { name: 'Widget', url: '/products/widget' }
    ]);
    const data = JSON.parse(builder.toJSON());

    expect(data['@type']).toBe('BreadcrumbList');
    expect(data.itemListElement).toHaveLength(3);
    expect(data.itemListElement[0].position).toBe(1);
    expect(data.itemListElement[2].name).toBe('Widget');
  });

  it('creates FAQ schema', () => {
    builder.faq([
      { question: 'What is Coherent?', answer: 'A JS framework' },
      { question: 'Is it fast?', answer: 'Yes!' }
    ]);
    const data = JSON.parse(builder.toJSON());

    expect(data['@type']).toBe('FAQPage');
    expect(data.mainEntity).toHaveLength(2);
    expect(data.mainEntity[0]['@type']).toBe('Question');
    expect(data.mainEntity[0].acceptedAnswer.text).toBe('A JS framework');
  });

  it('creates Person schema', () => {
    builder.person({
      name: 'Jane',
      jobTitle: 'Developer',
      organization: 'Acme'
    });
    const data = JSON.parse(builder.toJSON());

    expect(data['@type']).toBe('Person');
    expect(data.worksFor['@type']).toBe('Organization');
    expect(data.worksFor.name).toBe('Acme');
  });

  it('builds array for multiple schemas', () => {
    builder.organization({ name: 'Acme' });
    builder.website({ name: 'My Site', url: 'https://example.com' });

    const result = builder.build();
    const data = JSON.parse(result.script.text);
    expect(Array.isArray(data)).toBe(true);
    expect(data).toHaveLength(2);
  });

  it('clear removes all schemas', () => {
    builder.organization({ name: 'Acme' });
    builder.clear();
    expect(builder.build()).toBeNull();
  });

  it('chains method calls', () => {
    const result = builder
      .organization({ name: 'Acme' })
      .website({ name: 'Site', url: 'https://example.com' })
      .build();

    expect(result.script.type).toBe('application/ld+json');
  });
});

describe('createStructuredData', () => {
  it('returns StructuredDataBuilder instance', () => {
    expect(createStructuredData()).toBeInstanceOf(StructuredDataBuilder);
  });
});

describe('generateStructuredData', () => {
  it('generates organization data', () => {
    const result = generateStructuredData('organization', { name: 'Acme' });
    const data = JSON.parse(result.script.text);
    expect(data['@type']).toBe('Organization');
  });

  it('generates article data', () => {
    const result = generateStructuredData('article', { headline: 'Test' });
    const data = JSON.parse(result.script.text);
    expect(data['@type']).toBe('Article');
  });

  it('generates product data', () => {
    const result = generateStructuredData('product', { name: 'Widget' });
    const data = JSON.parse(result.script.text);
    expect(data['@type']).toBe('Product');
  });

  it('generates breadcrumb data', () => {
    const result = generateStructuredData('breadcrumb', [{ name: 'Home', url: '/' }]);
    const data = JSON.parse(result.script.text);
    expect(data['@type']).toBe('BreadcrumbList');
  });

  it('generates faq data', () => {
    const result = generateStructuredData('faq', [{ question: 'Q?', answer: 'A' }]);
    const data = JSON.parse(result.script.text);
    expect(data['@type']).toBe('FAQPage');
  });

  it('handles unknown type by adding raw data', () => {
    const result = generateStructuredData('custom', { '@type': 'Custom', name: 'test' });
    const data = JSON.parse(result.script.text);
    expect(data['@type']).toBe('Custom');
  });
});
