/**
 * Coherent.js SEO TypeScript Definitions
 * @module @coherent.js/seo
 */

// ===== Meta Builder Types =====

export interface MetaTags {
  title?: string;
  description?: string;
  keywords?: string | string[];
  author?: string;
  robots?: string;
  canonical?: string;
  viewport?: string;
  charset?: string;
  language?: string;
  themeColor?: string;
  // Open Graph
  ogTitle?: string;
  ogDescription?: string;
  ogImage?: string;
  ogUrl?: string;
  ogType?: string;
  ogSiteName?: string;
  ogLocale?: string;
  // Twitter Card
  twitterCard?: 'summary' | 'summary_large_image' | 'app' | 'player';
  twitterSite?: string;
  twitterCreator?: string;
  twitterTitle?: string;
  twitterDescription?: string;
  twitterImage?: string;
  // Custom meta tags
  [key: string]: any;
}

export class MetaBuilder {
  constructor(tags?: MetaTags);
  setTitle(title: string): this;
  setDescription(description: string): this;
  setKeywords(keywords: string | string[]): this;
  setAuthor(author: string): this;
  setRobots(robots: string): this;
  setCanonical(url: string): this;
  setViewport(viewport: string): this;
  setOpenGraph(tags: Partial<MetaTags>): this;
  setTwitterCard(tags: Partial<MetaTags>): this;
  addCustomTag(name: string, content: string, type?: 'name' | 'property'): this;
  build(): object;
  render(): object;
  toHTML(): string;
}

export function createMetaBuilder(tags?: MetaTags): MetaBuilder;
export function generateMeta(tags: MetaTags): object;

// ===== Sitemap Generator Types =====

export interface SitemapEntry {
  url: string;
  lastmod?: string | Date;
  changefreq?: 'always' | 'hourly' | 'daily' | 'weekly' | 'monthly' | 'yearly' | 'never';
  priority?: number;
  images?: Array<{
    loc: string;
    title?: string;
    caption?: string;
  }>;
  videos?: Array<{
    thumbnail_loc: string;
    title: string;
    description: string;
    content_loc?: string;
    player_loc?: string;
  }>;
}

export interface SitemapOptions {
  hostname: string;
  cacheTime?: number;
  xmlNs?: Record<string, string>;
  xslUrl?: string;
}

export class SitemapGenerator {
  constructor(options: SitemapOptions);
  addUrl(entry: SitemapEntry): this;
  addUrls(entries: SitemapEntry[]): this;
  removeUrl(url: string): this;
  generate(): string;
  toXML(): string;
  toJSON(): SitemapEntry[];
}

export function createSitemapGenerator(options: SitemapOptions): SitemapGenerator;
export function generateSitemap(entries: SitemapEntry[], options: SitemapOptions): string;

// ===== Structured Data Types =====

export type StructuredDataType =
  | 'Article'
  | 'BlogPosting'
  | 'NewsArticle'
  | 'WebPage'
  | 'WebSite'
  | 'Organization'
  | 'Person'
  | 'Product'
  | 'Review'
  | 'Event'
  | 'Recipe'
  | 'BreadcrumbList'
  | 'LocalBusiness'
  | 'FAQPage'
  | 'HowTo'
  | 'VideoObject'
  | 'ImageObject';

export interface StructuredData {
  '@context': string;
  '@type': StructuredDataType | StructuredDataType[];
  [key: string]: any;
}

export class StructuredDataBuilder {
  constructor(type: StructuredDataType);
  setType(type: StructuredDataType): this;
  setProperty(key: string, value: any): this;
  setProperties(properties: Record<string, any>): this;
  addToArray(key: string, value: any): this;
  build(): StructuredData;
  toJSON(): string;
  toJSONLD(): object;
}

export function createStructuredData(type: StructuredDataType, properties?: Record<string, any>): StructuredDataBuilder;
export function generateStructuredData(type: StructuredDataType, properties: Record<string, any>): StructuredData;

// Helper types for common structured data

export interface ArticleData {
  headline: string;
  image: string | string[];
  datePublished: string;
  dateModified?: string;
  author: {
    '@type': 'Person' | 'Organization';
    name: string;
  };
  publisher: {
    '@type': 'Organization';
    name: string;
    logo: {
      '@type': 'ImageObject';
      url: string;
    };
  };
  description?: string;
  mainEntityOfPage?: string;
}

export interface ProductData {
  name: string;
  image: string | string[];
  description: string;
  brand?: {
    '@type': 'Brand';
    name: string;
  };
  offers?: {
    '@type': 'Offer';
    price: number;
    priceCurrency: string;
    availability?: string;
    url?: string;
  };
  aggregateRating?: {
    '@type': 'AggregateRating';
    ratingValue: number;
    reviewCount: number;
  };
}

export interface BreadcrumbData {
  itemListElement: Array<{
    '@type': 'ListItem';
    position: number;
    name: string;
    item?: string;
  }>;
}
