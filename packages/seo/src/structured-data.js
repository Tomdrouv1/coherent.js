/**
 * Coherent.js Structured Data
 * 
 * Generate JSON-LD structured data for SEO
 * 
 * @module seo/structured-data
 */

/**
 * Structured Data Builder
 * Creates JSON-LD structured data
 */
export class StructuredDataBuilder {
  constructor() {
    this.schemas = [];
  }

  /**
   * Add schema
   */
  add(schema) {
    this.schemas.push(schema);
    return this;
  }

  /**
   * Create Organization schema
   */
  organization(data) {
    return this.add({
      '@context': 'https://schema.org',
      '@type': 'Organization',
      name: data.name,
      url: data.url,
      logo: data.logo,
      description: data.description,
      contactPoint: data.contactPoint,
      sameAs: data.socialLinks
    });
  }

  /**
   * Create WebSite schema
   */
  website(data) {
    return this.add({
      '@context': 'https://schema.org',
      '@type': 'WebSite',
      name: data.name,
      url: data.url,
      description: data.description,
      potentialAction: data.searchAction ? {
        '@type': 'SearchAction',
        target: data.searchAction.target,
        'query-input': data.searchAction.queryInput || 'required name=search_term_string'
      } : undefined
    });
  }

  /**
   * Create Article schema
   */
  article(data) {
    return this.add({
      '@context': 'https://schema.org',
      '@type': 'Article',
      headline: data.headline,
      description: data.description,
      image: data.image,
      author: data.author ? {
        '@type': 'Person',
        name: data.author.name,
        url: data.author.url
      } : undefined,
      publisher: data.publisher ? {
        '@type': 'Organization',
        name: data.publisher.name,
        logo: data.publisher.logo ? {
          '@type': 'ImageObject',
          url: data.publisher.logo
        } : undefined
      } : undefined,
      datePublished: data.datePublished,
      dateModified: data.dateModified
    });
  }

  /**
   * Create Product schema
   */
  product(data) {
    return this.add({
      '@context': 'https://schema.org',
      '@type': 'Product',
      name: data.name,
      description: data.description,
      image: data.image,
      brand: data.brand ? {
        '@type': 'Brand',
        name: data.brand
      } : undefined,
      offers: data.offers ? {
        '@type': 'Offer',
        price: data.offers.price,
        priceCurrency: data.offers.currency || 'USD',
        availability: data.offers.availability || 'https://schema.org/InStock',
        url: data.offers.url
      } : undefined,
      aggregateRating: data.rating ? {
        '@type': 'AggregateRating',
        ratingValue: data.rating.value,
        reviewCount: data.rating.count
      } : undefined
    });
  }

  /**
   * Create BreadcrumbList schema
   */
  breadcrumb(items) {
    return this.add({
      '@context': 'https://schema.org',
      '@type': 'BreadcrumbList',
      itemListElement: items.map((item, index) => ({
        '@type': 'ListItem',
        position: index + 1,
        name: item.name,
        item: item.url
      }))
    });
  }

  /**
   * Create FAQ schema
   */
  faq(questions) {
    return this.add({
      '@context': 'https://schema.org',
      '@type': 'FAQPage',
      mainEntity: questions.map(q => ({
        '@type': 'Question',
        name: q.question,
        acceptedAnswer: {
          '@type': 'Answer',
          text: q.answer
        }
      }))
    });
  }

  /**
   * Create Person schema
   */
  person(data) {
    return this.add({
      '@context': 'https://schema.org',
      '@type': 'Person',
      name: data.name,
      url: data.url,
      image: data.image,
      jobTitle: data.jobTitle,
      worksFor: data.organization ? {
        '@type': 'Organization',
        name: data.organization
      } : undefined,
      sameAs: data.socialLinks
    });
  }

  /**
   * Build JSON-LD script tag
   */
  build() {
    if (this.schemas.length === 0) {
      return null;
    }

    const data = this.schemas.length === 1 ? this.schemas[0] : this.schemas;

    return {
      script: {
        type: 'application/ld+json',
        text: JSON.stringify(data, null, 2)
      }
    };
  }

  /**
   * Build as JSON string
   */
  toJSON() {
    const data = this.schemas.length === 1 ? this.schemas[0] : this.schemas;
    return JSON.stringify(data, null, 2);
  }

  /**
   * Clear all schemas
   */
  clear() {
    this.schemas = [];
    return this;
  }
}

/**
 * Create a structured data builder
 */
export function createStructuredData() {
  return new StructuredDataBuilder();
}

/**
 * Quick structured data generation
 */
export function generateStructuredData(type, data) {
  const builder = new StructuredDataBuilder();
  
  switch (type) {
    case 'organization':
      builder.organization(data);
      break;
    case 'website':
      builder.website(data);
      break;
    case 'article':
      builder.article(data);
      break;
    case 'product':
      builder.product(data);
      break;
    case 'breadcrumb':
      builder.breadcrumb(data);
      break;
    case 'faq':
      builder.faq(data);
      break;
    case 'person':
      builder.person(data);
      break;
    default:
      builder.add(data);
  }
  
  return builder.build();
}

export default {
  StructuredDataBuilder,
  createStructuredData,
  generateStructuredData
};
